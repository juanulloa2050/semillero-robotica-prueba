"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppState, JsonValue, NodeChallengeProgress } from "@/lib/types";
import { nodeById } from "@/lib/data/nodes";

type RunStatus = "draft" | "submitted" | "evaluated";
type StatusFilter = "all" | RunStatus;

interface CandidateRun {
  id: string;
  candidateId: string;
  status: RunStatus;
  updatedAt: string;
  submittedAt: string | null;
  snapshot: AppState | null;
  evaluationCount: number;
  candidate: {
    fullName: string;
    email: string;
    program: string;
    semester: string;
    studentCode: string;
  } | null;
}

export default function EvaluadorPage() {
  const router = useRouter();
  const auth = useAuth();
  const [runs, setRuns] = useState<CandidateRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("submitted");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !auth.user || auth.role !== "evaluator") return;
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("assessment_runs")
      .select("id,candidate_id,status,updated_at,submitted_at,snapshot,candidate:profiles!assessment_runs_candidate_id_fkey!inner(id,full_name,email,role,candidate_profiles(program,semester,student_code)),evaluations(id)")
      .eq("candidate.role", "candidate")
      .order("updated_at", { ascending: false });

    if (queryError) setError(queryError.message);
    else {
      const normalized = (data ?? []).map((value) => normalizeRun(value as unknown as Record<string, unknown>));
      setRuns(normalized);
      setSelectedId((current) => normalized.some((run) => run.id === current) ? current : normalized[0]?.id ?? null);
    }
    setLoading(false);
  }, [auth.role, auth.user]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (auth.role === "candidate") router.replace("/skills");
    else if (auth.role === "admin") router.replace("/admin");
    else if (auth.role === "evaluator") void Promise.resolve().then(loadRuns);
  }, [auth.loading, auth.role, auth.user, loadRuns, router]);

  const counts = useMemo(() => ({
    all: runs.length,
    draft: runs.filter((run) => run.status === "draft").length,
    submitted: runs.filter((run) => run.status === "submitted").length,
    evaluated: runs.filter((run) => run.status === "evaluated").length,
  }), [runs]);

  const visibleRuns = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return runs.filter((run) => {
      if (filter !== "all" && run.status !== filter) return false;
      if (!term) return true;
      const haystack = `${run.candidate?.fullName ?? ""} ${run.candidate?.email ?? ""} ${run.candidate?.studentCode ?? ""}`.toLocaleLowerCase("es");
      return haystack.includes(term);
    });
  }, [filter, runs, search]);

  const effectiveSelectedId = visibleRuns.some((run) => run.id === selectedId)
    ? selectedId
    : visibleRuns[0]?.id ?? null;
  const selected = visibleRuns.find((run) => run.id === effectiveSelectedId) ?? null;

  if (auth.loading || (loading && runs.length === 0)) return <PanelLoading label="Cargando aspirantes…" />;
  if (!auth.configured) return <EmptyState title="Supabase no está configurado" body="Conecta el proyecto para abrir el panel de evaluación." />;

  return (
    <div className="mx-auto min-h-[calc(100svh-4rem)] max-w-[90rem] px-4 py-7 sm:px-7 lg:px-9">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
        <div className="max-w-2xl">
          <h1 className="text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Banco de aspirantes</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Elige libremente un recorrido enviado, revisa la evidencia y registra tu criterio. Las respuestas originales permanecen en sólo lectura.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadRuns()} className="min-h-10 rounded-lg border border-line px-4 text-xs font-semibold text-ice transition-colors hover:border-cyan/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Actualizar</button>
          <button type="button" onClick={() => void auth.signOut()} className="min-h-10 rounded-lg bg-surface-raised px-4 text-xs font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Cerrar sesión</button>
        </div>
      </header>

      {error && <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">No pudimos cargar los recorridos. {error}</p>}

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface/45 p-1" aria-label="Filtrar aspirantes por estado">
          {(["submitted", "evaluated", "draft", "all"] as StatusFilter[]).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${filter === value ? "bg-cyan/15 text-cyan" : "text-muted hover:bg-night/35 hover:text-ink"}`}>
              {FILTER_LABELS[value]} <span className="ml-1 tabular-nums opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full xl:max-w-sm">
          <span className="sr-only">Buscar aspirante</span>
          <SearchIcon />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o código" className="min-h-11 w-full rounded-xl border border-line bg-night/45 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-cyan" />
        </label>
      </div>

      <div className="mt-5 grid min-h-[38rem] gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="min-h-0" aria-label="Lista de aspirantes">
          <div className="max-h-[calc(100svh-15rem)] space-y-2 overflow-y-auto pr-1">
            {visibleRuns.length === 0 && <EmptyState title="No hay resultados" body="Cambia el filtro o la búsqueda para ver otros aspirantes." compact />}
            {visibleRuns.map((run) => <CandidateRow key={run.id} run={run} selected={run.id === effectiveSelectedId} onSelect={() => setSelectedId(run.id)} />)}
          </div>
        </aside>
        <main className="min-w-0">{selected ? <RunDetail run={selected} evaluatorId={auth.user?.id ?? ""} onSaved={loadRuns} /> : <EmptyState title="Selecciona un aspirante" body="El detalle del recorrido aparecerá aquí." />}</main>
      </div>
    </div>
  );
}

function CandidateRow({ run, selected, onSelect }: { run: CandidateRun; selected: boolean; onSelect: () => void }) {
  const completed = Object.values(run.snapshot?.progress ?? {}).filter((value) => value === "completed").length;
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${selected ? "border-cyan/55 bg-cyan/[0.09]" : "border-line bg-surface/35 hover:border-cyan/30 hover:bg-surface/55"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{run.candidate?.fullName || "Sin nombre"}</p><p className="mt-1 truncate text-xs text-muted">{run.candidate?.email}</p></div>
        <StatusBadge status={run.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted"><span>{completed} retos completados</span><span>{run.evaluationCount} evaluaciones</span></div>
    </button>
  );
}

function RunDetail({ run, evaluatorId, onSaved }: { run: CandidateRun; evaluatorId: string; onSaved: () => Promise<void> }) {
  const snapshot = run.snapshot;
  const completedNodes = Object.entries(snapshot?.progress ?? {}).filter(([, status]) => status === "completed");
  const challenges = Object.values(snapshot?.challengeProgress ?? {});
  return (
    <section className="rounded-2xl border border-line bg-surface/40 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div><h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-ink">{run.candidate?.fullName || "Aspirante"}</h2><p className="mt-1 text-sm text-muted">{run.candidate?.email}</p><p className="mt-2 text-xs text-muted">{[run.candidate?.program, run.candidate?.semester && `Semestre ${run.candidate.semester}`, run.candidate?.studentCode && `Código ${run.candidate.studentCode}`].filter(Boolean).join(" · ") || "Perfil académico sin completar"}</p></div>
        <StatusBadge status={run.status} />
      </div>

      <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-xl border border-line sm:grid-cols-4 sm:divide-y-0">
        <Metric label="Retos" value={String(completedNodes.length)} />
        <Metric label="Intentos" value={String(countAttempts(challenges))} />
        <Metric label="Pistas" value={String(countHints(challenges))} />
        <Metric label="Enviado" value={run.submittedAt ? formatDate(run.submittedAt) : "Pendiente"} />
      </dl>

      <section className="mt-7">
        <h3 className="text-sm font-semibold text-ink">Recorrido completado</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {completedNodes.length === 0 && <p className="text-sm text-muted">Todavía no hay retos completados.</p>}
          {completedNodes.map(([nodeId]) => <span key={nodeId} className="rounded-full border border-line bg-night/45 px-3 py-1.5 text-xs text-ice">{nodeId} · {nodeById(nodeId)?.title ?? "Reto"}</span>)}
        </div>
      </section>

      <section className="mt-7">
        <h3 className="text-sm font-semibold text-ink">Evidencia por reto</h3>
        <div className="mt-3 space-y-2">{challenges.length ? challenges.map((challenge) => <ChallengeSummary key={challenge.nodeId} challenge={challenge} />) : <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Este recorrido todavía no contiene intentos detallados.</p>}</div>
      </section>

      {run.status === "draft" ? <div className="mt-7 rounded-xl border border-line bg-night/30 p-5"><p className="text-sm font-semibold text-ink">Recorrido en curso</p><p className="mt-1 text-xs leading-5 text-muted">Puedes consultar el progreso, pero la evaluación se habilita cuando el aspirante envíe su recorrido.</p></div> : <EvaluationForm runId={run.id} evaluatorId={evaluatorId} onSaved={onSaved} />}
    </section>
  );
}

function ChallengeSummary({ challenge }: { challenge: NodeChallengeProgress }) {
  const attempts = Object.values(challenge.steps).flatMap((step) => step.attempts);
  const seconds = Object.values(challenge.steps).reduce((sum, step) => sum + step.totalActiveSeconds, 0);
  return (
    <details className="group rounded-xl border border-line bg-night/35 open:bg-night/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"><span>{challenge.nodeId} · {nodeById(challenge.nodeId)?.title ?? "Reto"}</span><span className="shrink-0 text-xs font-normal text-muted">{attempts.length} intentos · {Math.round(seconds / 60)} min</span></summary>
      <ol className="space-y-2 border-t border-line p-4 text-xs text-muted">
        {attempts.map((attempt) => <li key={attempt.id} className="rounded-lg bg-surface/55 p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ice">{attempt.stepId}</span><AnswerStatus value={attempt.isCorrect} /><span>{attempt.durationSeconds}s</span></div><pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">{formatAnswer(attempt.answer)}</pre></li>)}
      </ol>
    </details>
  );
}

function EvaluationForm({ runId, evaluatorId, onSaved }: { runId: string; evaluatorId: string; onSaved: () => Promise<void> }) {
  const [score, setScore] = useState("80");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !evaluatorId) return;
    let active = true;
    void supabase.from("evaluations").select("score,comment").eq("run_id", runId).eq("evaluator_id", evaluatorId).eq("criterion", "evaluacion_general").maybeSingle().then(({ data }) => {
      if (!active || !data) return;
      setScore(String(data.score));
      setComment(data.comment ?? "");
    });
    return () => { active = false; };
  }, [evaluatorId, runId]);

  async function save() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const value = Number(score);
    if (!Number.isFinite(value) || value < 0 || value > 100) { setMessage("El puntaje debe estar entre 0 y 100."); return; }
    if (comment.trim().length < 20) { setMessage("Explica tu criterio en al menos 20 caracteres."); return; }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("evaluations").upsert({ run_id: runId, node_id: "GENERAL", evaluator_id: evaluatorId, criterion: "evaluacion_general", score: value, comment: comment.trim(), updated_at: new Date().toISOString() }, { onConflict: "run_id,node_id,evaluator_id,criterion" });
    if (error) setMessage(error.message);
    else {
      const { error: statusError } = await supabase.rpc("mark_run_evaluated", { target_run: runId });
      setMessage(statusError ? statusError.message : "Evaluación guardada y recorrido marcado como evaluado.");
      if (!statusError) await onSaved();
    }
    setSaving(false);
  }

  return (
    <section className="mt-7 border-t border-line pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold text-ink">Evaluación general</h3><p className="mt-1 text-xs leading-5 text-muted">Tu evaluación es independiente de la de otros evaluadores.</p></div><span className="text-xs text-muted">Puntaje de 0 a 100</span></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[9rem_1fr]">
        <label className="text-xs font-semibold text-ice">Puntaje<input type="number" min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-night px-3 text-lg font-semibold tabular-nums text-ink outline-none focus:border-cyan" /></label>
        <label className="text-xs font-semibold text-ice">Comentario<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-lg border border-line bg-night p-3 text-sm leading-6 text-ink outline-none placeholder:text-muted/65 focus:border-cyan" placeholder="Describe fortalezas, decisiones observadas y oportunidades de mejora." /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 rounded-lg bg-action px-5 text-sm font-semibold text-white transition-colors hover:bg-tech disabled:cursor-not-allowed disabled:opacity-55">{saving ? "Guardando…" : "Guardar evaluación"}</button><p role="status" className="text-xs text-muted">{message}</p></div>
    </section>
  );
}

const FILTER_LABELS: Record<StatusFilter, string> = { all: "Todos", draft: "En curso", submitted: "Por evaluar", evaluated: "Evaluados" };

function normalizeRun(value: Record<string, unknown>): CandidateRun {
  const rawCandidate = firstRelation(value.candidate);
  const rawAcademic = firstRelation(rawCandidate?.candidate_profiles);
  return {
    id: String(value.id), candidateId: String(value.candidate_id), status: value.status as RunStatus,
    updatedAt: String(value.updated_at), submittedAt: typeof value.submitted_at === "string" ? value.submitted_at : null,
    snapshot: value.snapshot as AppState | null,
    evaluationCount: Array.isArray(value.evaluations) ? value.evaluations.length : 0,
    candidate: rawCandidate ? { fullName: String(rawCandidate.full_name ?? ""), email: String(rawCandidate.email ?? ""), program: String(rawAcademic?.program ?? ""), semester: String(rawAcademic?.semester ?? ""), studentCode: String(rawAcademic?.student_code ?? "") } : null,
  };
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : null;
}
function countAttempts(challenges: NodeChallengeProgress[]) { return challenges.reduce((total, challenge) => total + Object.values(challenge.steps).reduce((sum, step) => sum + step.attempts.length, 0), 0); }
function countHints(challenges: NodeChallengeProgress[]) { return challenges.reduce((total, challenge) => total + Object.values(challenge.steps).reduce((sum, step) => sum + step.revealedHints, 0), 0); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatAnswer(value: JsonValue) { return typeof value === "string" ? value : JSON.stringify(value, null, 2); }
function StatusBadge({ status }: { status: RunStatus }) { return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${status === "evaluated" ? "border-ok/30 bg-ok/10 text-ok" : status === "submitted" ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-line bg-night/35 text-muted"}`}>{FILTER_LABELS[status]}</span>; }
function AnswerStatus({ value }: { value: boolean | null }) { return <span className={value === null ? "text-cyan" : value ? "text-ok" : "text-danger"}>{value === null ? "Revisión manual" : value ? "Correcto" : "Incorrecto"}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-night/35 p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt><dd className="mt-2 text-lg font-semibold tabular-nums text-ink">{value}</dd></div>; }
function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) { return <div className={`rounded-xl border border-dashed border-line text-center ${compact ? "p-5" : "p-9"}`}><p className="text-sm font-semibold text-ice">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div>; }
function PanelLoading({ label }: { label: string }) { return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">{label}</div>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>; }
