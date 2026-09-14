"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import {
  D4_CHALLENGE,
  createD4Draft,
  validateD4,
  type D4Submission,
  type D4Validation,
} from "@/lib/challenges/design/d4";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface D4ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

const STEP_ID = "open-project";

export function D4Challenge({ savedProgress, readOnly, onSave, onComplete }: D4ChallengeProps) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [validation, setValidation] = useState<D4Validation | null>(() => {
    const last = initial.steps[STEP_ID].attempts.at(-1);
    return last ? validateD4(normalizeDraft(last.answer)) : null;
  });
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const startedAtRef = useRef<number | null>(null);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const commit = useCallback((mutate: (current: NodeChallengeProgress) => NodeChallengeProgress) => {
    const next = mutate(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    onSaveRef.current(next);
    return next;
  }, []);

  const checkpoint = useCallback((eventName: string, updateView = true) => {
    const now = Date.now();
    const elapsed = startedAtRef.current === null ? 0 : Math.max(0, Math.floor((now - startedAtRef.current) / 1_000));
    if (startedAtRef.current !== null) startedAtRef.current = now;
    const current = progressRef.current;
    const next: NodeChallengeProgress = {
      ...current,
      updatedAt: now,
      steps: {
        ...current.steps,
        [STEP_ID]: { ...current.steps[STEP_ID], totalActiveSeconds: current.steps[STEP_ID].totalActiveSeconds + elapsed },
      },
      analytics: { ...current.analytics, lastEvent: eventName },
    };
    progressRef.current = next;
    if (updateView) setProgress(next);
    onSaveRef.current(next);
  }, []);

  useEffect(() => {
    if (readOnly || progress.completedAt) return;
    if (document.visibilityState === "visible") startedAtRef.current = Date.now();
    onSaveRef.current(progressRef.current);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        checkpoint("visibility_hidden");
        startedAtRef.current = null;
      } else {
        startedAtRef.current = Date.now();
      }
    };
    const onPageHide = () => checkpoint("page_hidden", false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      checkpoint("challenge_closed", false);
      startedAtRef.current = null;
    };
  }, [checkpoint, progress.completedAt, readOnly]);

  const stepProgress = progress.steps[STEP_ID];
  const draft = normalizeDraft(stepProgress.draft);
  const solved = hasSolved(stepProgress);

  const changeDraft = (patch: Partial<D4Submission>) => {
    if (readOnly || solved) return;
    setValidation(null);
    const nextDraft: D4Submission = { ...draft, ...patch, stepId: STEP_ID };
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: { ...current.steps, [STEP_ID]: { ...current.steps[STEP_ID], draft: toJson(nextDraft) } },
      analytics: { ...current.analytics, lastEvent: "answer_changed" },
    }));
  };

  const revealHint = () => {
    if (readOnly || solved || stepProgress.revealedHints > 0) return;
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: { ...current.steps, [STEP_ID]: { ...current.steps[STEP_ID], revealedHints: 1 } },
      analytics: { ...current.analytics, lastEvent: "hint_opened" },
    }));
    setAnnouncement("Pista disponible al final del formulario.");
  };

  const submit = () => {
    if (readOnly || solved) return;
    const result = validateD4(draft);
    setValidation(result);
    if (!result.isComplete) {
      setAnnouncement("Aún faltan campos o evidencias obligatorias. Revisa los mensajes del formulario.");
      return;
    }

    const now = new Date().getTime();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "D4",
      stepId: STEP_ID,
      attemptNumber: stepProgress.attempts.length + 1,
      startedAt: Math.max(progress.startedAt, now - stepProgress.totalActiveSeconds * 1_000),
      submittedAt: now,
      durationSeconds: stepProgress.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: null,
      hintsUsed: stepProgress.revealedHints,
      score: result.score,
      metadata: {
        maxScore: result.maxScore,
        reviewerRequired: true,
        evidenceCount: draft.viewFiles.length + draft.cadFiles.length,
      },
    };
    const next = commit((current) => ({
      ...current,
      updatedAt: now,
      completedAt: current.completedAt ?? now,
      steps: {
        ...current.steps,
        [STEP_ID]: { ...current.steps[STEP_ID], attempts: [...current.steps[STEP_ID].attempts, attempt], solvedAt: now },
      },
      analytics: { ...current.analytics, lastEvent: "challenge_completed", reviewerRequired: true },
    }));
    setAnnouncement("Diseño registrado para revisión.");
    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  };

  const content = D4_CHALLENGE.steps[STEP_ID];
  const errors = validation?.errors ?? {};

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">Diseño / CAD · D4 · Reto libre</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">{D4_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-slate-300">{D4_CHALLENGE.subtitle} {content.statement}</p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <Metric label="Intentos" value={String(stepProgress.attempts.length)} />
            <Metric label="Tiempo" value={formatTime(stepProgress.totalActiveSeconds)} />
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <EvidenceOverview />

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <TextField label="Nombre de la pieza o mecanismo" value={draft.title} min={content.minimums.title} max={120} disabled={readOnly || solved} error={errors.title} onChange={(value) => changeDraft({ title: value })} />
          <TextField label="Material asignado" value={draft.material} min={2} max={80} disabled={readOnly || solved} error={errors.material} onChange={(value) => changeDraft({ material: value })} />
          <div className="lg:col-span-2">
            <TextArea label="¿Qué problema resuelve?" description="Explica para qué sirve la pieza dentro de un robot." value={draft.problem} min={content.minimums.problem} max={1200} rows={4} disabled={readOnly || solved} error={errors.problem} onChange={(value) => changeDraft({ problem: value })} />
          </div>
          <div className="lg:col-span-2">
            <TextArea label="¿Por qué la diseñaste así?" description="Explica tus decisiones de forma, tolerancias y detalles técnicos que incluiste por iniciativa propia." value={draft.explanation} min={0} max={4000} rows={7} disabled={readOnly || solved} error={errors.explanation} onChange={(value) => changeDraft({ explanation: value })} wordMinimum={content.minimums.explanationWords} />
          </div>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <TextArea label="Proceso de manufactura (opcional)" description="Impresión 3D, mecanizado, láminas dobladas, etc." value={draft.manufacturingProcess} min={0} max={1000} rows={4} disabled={readOnly || solved} onChange={(value) => changeDraft({ manufacturingProcess: value })} />
          <TextArea label="Limitaciones o mejoras futuras (opcional)" description="Limitaciones conocidas del diseño e ideas de mejora." value={draft.limitations} min={0} max={1000} rows={4} disabled={readOnly || solved} onChange={(value) => changeDraft({ limitations: value })} />
        </section>

        <section className="mt-6 space-y-4">
          <LocalEvidenceUploader nodeId="D4" fieldId="view" label="Capturas del modelo" description="Sube al menos 2 capturas: una isométrica y una con cotas o vista técnica." accept={content.acceptedEvidence.view} value={[...draft.viewFiles]} onChange={(files) => changeDraft({ viewFiles: files })} multiple maxFiles={6} disabled={readOnly || solved} required />
          {errors.viewFiles && <ErrorText>{errors.viewFiles}</ErrorText>}

          <LocalEvidenceUploader nodeId="D4" fieldId="cad" label="Archivo CAD" description="Adjunta el archivo (SolidWorks, Fusion 360, STEP, FreeCAD, etc.) o comparte un enlace en el campo de abajo." accept={content.acceptedEvidence.cad} value={[...draft.cadFiles]} onChange={(files) => changeDraft({ cadFiles: files })} multiple maxFiles={5} disabled={readOnly || solved} />
          {errors.cadEvidence && <ErrorText>{errors.cadEvidence}</ErrorText>}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <UrlField label="Modelo CAD en línea" placeholder="https://cad.onshape.com/..." value={draft.cadUrl} error={errors.cadUrl} disabled={readOnly || solved} onChange={(value) => changeDraft({ cadUrl: value })} />
          <UrlField label="Enlace adicional" placeholder="https://..." value={draft.additionalUrl} error={errors.additionalUrl} disabled={readOnly || solved} onChange={(value) => changeDraft({ additionalUrl: value })} />
        </section>

        {stepProgress.revealedHints > 0 && (
          <aside className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100">
            <span className="font-semibold text-amber-200">Pista:</span> {content.hints[0]}
          </aside>
        )}
        {validation && (
          <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${validation.isComplete ? "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-100" : "border-rose-400/30 bg-rose-400/[0.07] text-rose-100"}`}>
            {validation.feedback}
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button type="button" onClick={revealHint} disabled={readOnly || solved || stepProgress.revealedHints > 0} className="min-h-11 rounded-xl border border-white/12 px-4 text-xs font-semibold text-slate-300 hover:border-[#8FC7E8]/40 hover:text-[#BEE3F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC7E8] disabled:opacity-45">
            {stepProgress.revealedHints ? "Pista consultada" : "Ver pista"}
          </button>
          {!solved && !readOnly ? (
            <button type="button" onClick={submit} className="min-h-11 rounded-xl bg-gradient-to-r from-[#3C6386] to-[#4E7CA6] px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(78,124,166,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BEE3F5]">
              Registrar diseño
            </button>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Diseño registrado</span>
          )}
        </footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

function EvidenceOverview() {
  const items: { icon: ReactNode; label: string }[] = [
    { icon: <CubeIcon />, label: "Modelo CAD" },
    { icon: <CameraIcon />, label: "Capturas" },
    { icon: <DiagramIcon />, label: "Material" },
    { icon: <TextIcon />, label: "Explicación" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#071820] p-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8FC7E8]/10 text-[#8FC7E8]">{item.icon}</span>
          <span className="text-[11px] font-semibold leading-4 text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DiagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x={3} y={4} width={8} height={6} rx={1.2} />
      <rect x={13} y={14} width={8} height={6} rx={1.2} />
      <path d="M7 10v4a2 2 0 0 0 2 2h1m7-2v-1a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <circle cx={12} cy={13} r={3.2} />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5h16M4 9h16M4 13h10" strokeLinecap="round" />
    </svg>
  );
}
function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 3 8v8l9 5 9-5V8Z" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5M12 13v8" strokeLinejoin="round" />
    </svg>
  );
}

function TextField({
  label,
  value,
  min,
  max,
  disabled,
  error,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-sm font-semibold text-white">{label}</span>
      <input value={value} disabled={disabled} maxLength={max} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 bg-[#04131d] px-3 text-sm text-white outline-none focus:border-[#8FC7E8]/60" />
      <span className="mt-1 block text-right text-[11px] text-slate-400">{value.trim().length}/{min} mínimo</span>
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function TextArea({
  label,
  description,
  value,
  min,
  max,
  rows,
  disabled,
  error,
  onChange,
  wordMinimum,
}: {
  label: string;
  description: string;
  value: string;
  min: number;
  max: number;
  rows: number;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  wordMinimum?: number;
}) {
  const words = value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
      <textarea value={value} disabled={disabled} maxLength={max} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-[#04131d] p-3 text-sm leading-6 text-white outline-none focus:border-[#8FC7E8]/60" />
      <span className="mt-1 block text-right text-[11px] text-slate-400">
        {wordMinimum ? `${words}/${wordMinimum} palabras mínimo` : `${value.trim().length}/${min} mínimo`}
      </span>
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function UrlField({
  label,
  placeholder,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-sm font-semibold text-white">
        {label} <span className="font-normal text-slate-400">(opcional)</span>
      </span>
      <input type="url" value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 bg-[#04131d] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#8FC7E8]/60" />
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-xs leading-5 text-rose-300" role="alert">
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-center">
      <strong className="block text-sm text-white">{value}</strong>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const validSaved = saved?.nodeId === "D4" ? saved : undefined;
  const savedStep = validSaved?.steps?.[STEP_ID];
  const draft = normalizeDraft(savedStep?.draft);
  const attempts = Array.isArray(savedStep?.attempts)
    ? savedStep.attempts.filter((attempt) => attempt.nodeId === "D4" && attempt.stepId === STEP_ID)
    : [];
  const solvedAt = typeof savedStep?.solvedAt === "number" && savedStep.solvedAt > 0 ? savedStep.solvedAt : null;
  return {
    nodeId: "D4",
    currentStepId: STEP_ID,
    shuffleSeed: validSaved?.shuffleSeed ?? now,
    startedAt: validSaved?.startedAt && validSaved.startedAt > 0 ? validSaved.startedAt : now,
    updatedAt: validSaved?.updatedAt && validSaved.updatedAt > 0 ? validSaved.updatedAt : now,
    completedAt: solvedAt ? (validSaved?.completedAt ?? solvedAt) : null,
    steps: {
      [STEP_ID]: {
        draft: toJson(draft),
        attempts,
        revealedHints: Math.max(0, Math.min(1, savedStep?.revealedHints ?? 0)),
        totalActiveSeconds: Math.max(0, savedStep?.totalActiveSeconds ?? 0),
        solvedAt,
      },
    },
    analytics: validSaved?.analytics ?? { lastEvent: "challenge_started", reviewerRequired: true },
  };
}

function normalizeDraft(raw: unknown): D4Submission {
  const fallback = createD4Draft();
  if (!isRecord(raw)) return fallback;
  return {
    stepId: STEP_ID,
    title: text(raw.title),
    problem: text(raw.problem),
    material: text(raw.material),
    explanation: text(raw.explanation),
    manufacturingProcess: text(raw.manufacturingProcess),
    limitations: text(raw.limitations),
    viewFiles: normalizeFiles(raw.viewFiles),
    cadFiles: normalizeFiles(raw.cadFiles),
    cadUrl: text(raw.cadUrl),
    additionalUrl: text(raw.additionalUrl),
  };
}

function normalizeFiles(value: unknown): LocalEvidenceFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.nodeId !== "string" ||
      typeof item.fieldId !== "string" ||
      typeof item.name !== "string" ||
      typeof item.mimeType !== "string" ||
      typeof item.size !== "number" ||
      typeof item.lastModified !== "number" ||
      typeof item.storedAt !== "number"
    ) {
      return [];
    }
    return [{ id: item.id, nodeId: item.nodeId, fieldId: item.fieldId, name: item.name, mimeType: item.mimeType, size: item.size, lastModified: item.lastModified, storedAt: item.storedAt }];
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasSolved(step: ChallengeStepProgress): boolean {
  return typeof step.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return safe < 60 ? `${safe}s` : `${Math.floor(safe / 60)}m`;
}

export default D4Challenge;
