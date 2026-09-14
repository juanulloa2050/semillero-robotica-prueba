"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppState, NodeChallengeProgress } from "@/lib/types";
import { RunEvidencePanel } from "@/components/evaluator/RunEvidencePanel";
import { EvaluatorSkillTree } from "@/components/evaluator/EvaluatorSkillTree";
import { useEvaluatorSession } from "@/lib/evaluator/session";

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
  const localEvaluator = useEvaluatorSession();
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
    if (auth.loading || !localEvaluator.hydrated) return;
    if (!auth.configured) {
      if (!localEvaluator.evaluator) router.replace("/evaluador/login");
      return;
    }
    if (!auth.user) router.replace("/login");
    else if (auth.role === "candidate") router.replace("/skills");
    else if (auth.role === "admin") router.replace("/admin");
    else if (auth.role === "evaluator") void Promise.resolve().then(loadRuns);
  }, [
    auth.configured,
    auth.loading,
    auth.role,
    auth.user,
    loadRuns,
    localEvaluator.evaluator,
    localEvaluator.hydrated,
    router,
  ]);

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

  if (auth.loading || !localEvaluator.hydrated) {
    return <PanelLoading label="Cargando aspirantes…" />;
  }
  if (!auth.configured) {
    if (!localEvaluator.evaluator) return <PanelLoading label="Abriendo acceso de evaluador…" />;
    return (
      <LocalEvaluatorDashboard
        username={localEvaluator.evaluator.username}
        onLogout={() => {
          localEvaluator.logout();
          router.replace("/evaluador/login");
        }}
      />
    );
  }
  if (loading && runs.length === 0) return <PanelLoading label="Cargando aspirantes…" />;

  return (
    <div className="min-h-[calc(100svh-4rem)] w-full px-4 py-7 sm:px-6 lg:px-7 2xl:px-9">
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

      <div className="mt-5 grid min-h-[38rem] gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)]">
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

function LocalEvaluatorDashboard({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-[calc(100svh-4rem)] w-full px-5 py-10 sm:px-8">
      <header className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Modo local</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-ink">Panel de evaluación</h1>
          <p className="mt-2 text-sm text-muted">Sesión activa: {username}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="min-h-10 rounded-lg border border-line px-4 text-xs font-semibold text-muted transition-colors hover:border-cyan/45 hover:text-ink"
        >
          Cerrar sesión
        </button>
      </header>
      <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-line bg-surface/70 p-6">
        <p className="text-sm font-semibold text-ice">Todavía no hay candidatos sincronizados</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          El panel local permite validar el acceso de evaluador. Configura Supabase para consultar recorridos enviados,
          evidencias y evaluaciones compartidas.
        </p>
      </section>
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
  const completedNodes = Object.values(snapshot?.progress ?? {}).filter((status) => status === "completed").length;
  const challenges = Object.values(snapshot?.challengeProgress ?? {});
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface/40 p-5">
        <div><h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-ink">{run.candidate?.fullName || "Aspirante"}</h2><p className="mt-1 text-sm text-muted">{run.candidate?.email}</p><p className="mt-2 text-xs text-muted">{[run.candidate?.program, run.candidate?.semester && `Semestre ${run.candidate.semester}`, run.candidate?.studentCode && `Código ${run.candidate.studentCode}`].filter(Boolean).join(" · ") || "Perfil académico sin completar"}</p></div>
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={run.status} /><span className="text-xs text-muted">{completedNodes} retos · {countAttempts(challenges)} intentos · {countHints(challenges)} pistas</span></div>
      </div>

      <EvaluatorSkillTree runId={run.id} candidateName={run.candidate?.fullName || "Aspirante"} snapshot={snapshot} />

      <div className="mt-5 rounded-2xl border border-line bg-surface/40 p-5 sm:p-7">
        <RunEvidencePanel runId={run.id} snapshotIntroduction={snapshot?.introduction} showEvidence={false} />
        {run.status === "draft" ? <div className="mt-7 rounded-xl border border-line bg-night/30 p-5"><p className="text-sm font-semibold text-ink">Recorrido en curso</p><p className="mt-1 text-xs leading-5 text-muted">Puedes consultar el progreso, pero la evaluación se habilita cuando el aspirante envíe su recorrido.</p></div> : <EvaluationForm runId={run.id} evaluatorId={evaluatorId} onSaved={onSaved} />}
      </div>
    </section>
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
function StatusBadge({ status }: { status: RunStatus }) { return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${status === "evaluated" ? "border-ok/30 bg-ok/10 text-ok" : status === "submitted" ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-line bg-night/35 text-muted"}`}>{FILTER_LABELS[status]}</span>; }
function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) { return <div className={`rounded-xl border border-dashed border-line text-center ${compact ? "p-5" : "p-9"}`}><p className="text-sm font-semibold text-ice">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div>; }
function PanelLoading({ label }: { label: string }) { return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">{label}</div>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>; }
