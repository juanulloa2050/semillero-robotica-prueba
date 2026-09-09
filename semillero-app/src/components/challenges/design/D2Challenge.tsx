"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import {
  D2_CHALLENGE,
  createD2Draft,
  validateD2,
  type D2Submission,
  type D2Validation,
} from "@/lib/challenges/design/d2";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type {
  ChallengeAttempt,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface D2ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

const STEP_ID = "delivery";

export function D2Challenge({ savedProgress, readOnly, onSave, onComplete }: D2ChallengeProps) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [validation, setValidation] = useState<D2Validation | null>(() => {
    const last = initial.steps[STEP_ID].attempts.at(-1);
    return last ? validateD2(normalizeDraft(last.answer)) : null;
  });
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const startedAtRef = useRef<number | null>(null);
  // D2 has unlimited attempts and can be replaced later, so completion
  // notifications are re-armed on every fresh submission rather than once.

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
    if (readOnly) return;
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
  }, [checkpoint, readOnly]);

  const stepProgress = progress.steps[STEP_ID];
  const draft = normalizeDraft(stepProgress.draft);

  const changeDraft = (patch: Partial<D2Submission>) => {
    if (readOnly) return;
    setValidation(null);
    const nextDraft: D2Submission = { ...draft, ...patch, stepId: STEP_ID };
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: { ...current.steps, [STEP_ID]: { ...current.steps[STEP_ID], draft: toJson(nextDraft) } },
      analytics: { ...current.analytics, lastEvent: "answer_changed" },
    }));
  };

  const submit = () => {
    if (readOnly) return;
    const result = validateD2(draft);
    setValidation(result);
    if (!result.isComplete) {
      setAnnouncement("Aún faltan campos o evidencia obligatoria. Revisa los mensajes del formulario.");
      return;
    }

    const now = new Date().getTime();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "D2",
      stepId: STEP_ID,
      attemptNumber: stepProgress.attempts.length + 1,
      startedAt: Math.max(progress.startedAt, now - stepProgress.totalActiveSeconds * 1_000),
      submittedAt: now,
      durationSeconds: stepProgress.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: null,
      hintsUsed: 0,
      metadata: {
        reviewerRequired: true,
        evidenceCount: draft.files.length,
      },
    };
    const next = commit((current) => ({
      ...current,
      updatedAt: now,
      completedAt: now,
      steps: {
        ...current.steps,
        [STEP_ID]: { ...current.steps[STEP_ID], attempts: [...current.steps[STEP_ID].attempts, attempt], solvedAt: now },
      },
      analytics: { ...current.analytics, lastEvent: "challenge_completed", reviewerRequired: true },
    }));
    setAnnouncement("Entrega registrada.");
    onCompleteRef.current(next);
  };

  const content = D2_CHALLENGE.steps.delivery;
  const errors = validation?.errors ?? {};
  const submitted = stepProgress.solvedAt !== null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">Diseño / CAD · D2 · Aplicación</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">{D2_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-slate-300">{content.statement}</p>
          </div>
          <Metric label="Entregas" value={String(stepProgress.attempts.length)} />
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-sm leading-6 text-slate-300">{D2_CHALLENGE.introduction}</p>

        <div className="mt-5">
          <TextField label="¿En qué programa modelaste?" value={draft.software} disabled={readOnly} error={errors.software} onChange={(value) => changeDraft({ software: value })} />
        </div>

        <div className="mt-5">
          <TextArea
            label="¿Qué archivo corresponde a cada reto?"
            description="Por ejemplo: «volumen.f3d es la pieza del plano; toolblock.f3d es la del Tool Block»."
            value={draft.inventory}
            max={800}
            rows={3}
            disabled={readOnly}
            error={errors.inventory}
            onChange={(value) => changeDraft({ inventory: value })}
          />
        </div>

        <div className="mt-5">
          <TextArea
            label="¿Cómo construiste los modelos?"
            description="Qué operaciones usaste, en qué orden, qué decidiste parametrizar y qué te costó más trabajo."
            value={draft.process}
            max={4000}
            rows={7}
            disabled={readOnly}
            error={errors.process}
            wordMinimum={content.minimums.processWords}
            onChange={(value) => changeDraft({ process: value })}
          />
        </div>

        <section className="mt-6 space-y-4">
          <LocalEvidenceUploader
            nodeId="D2"
            fieldId="cad"
            label="Tus archivos CAD"
            description="Sube el archivo nativo de Fusion 360 (.f3d), Inventor (.ipt / .iam) o SolidWorks (.sldprt / .sldasm). Si usas otro programa, exporta un STEP (.step) o comprime la carpeta en un .zip."
            accept={content.acceptedEvidence.cad}
            value={[...draft.files]}
            onChange={(files) => changeDraft({ files })}
            multiple
            maxFiles={6}
            disabled={readOnly}
            required
          />
          {errors.evidence && <ErrorText>{errors.evidence}</ErrorText>}

          <UrlField label="O un enlace a tu proyecto" placeholder="https://..." value={draft.filesUrl} error={errors.filesUrl} disabled={readOnly} onChange={(value) => changeDraft({ filesUrl: value })} />
        </section>

        <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-white">Pistas ({content.hints.length})</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
            {content.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </details>

        {validation && (
          <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${validation.isComplete ? "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-100" : "border-rose-400/30 bg-rose-400/[0.07] text-rose-100"}`}>
            {validation.feedback}
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-xs leading-5 text-slate-400">Intentos ilimitados: puedes reemplazar tu entrega cuando quieras.</p>
          {!readOnly ? (
            <button type="button" onClick={submit} className="min-h-11 rounded-xl bg-gradient-to-r from-[#3C6386] to-[#4E7CA6] px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(78,124,166,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BEE3F5]">
              {submitted ? "Actualizar entrega" : "Entregar mis modelos"}
            </button>
          ) : (
            submitted && (
              <span className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Modelos entregados</span>
            )
          )}
        </footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-sm font-semibold text-white">{label}</span>
      <input value={value} disabled={disabled} maxLength={120} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 bg-[#04131d] px-3 text-sm text-white outline-none focus:border-[#8FC7E8]/60" />
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function TextArea({
  label,
  description,
  value,
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
      {wordMinimum ? (
        <span className="mt-1 block text-right text-[11px] text-slate-400">{words}/{wordMinimum} palabras mínimo</span>
      ) : null}
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
  const validSaved = saved?.nodeId === "D2" ? saved : undefined;
  const savedStep = validSaved?.steps?.[STEP_ID];
  const draft = normalizeDraft(savedStep?.draft);
  const attempts = Array.isArray(savedStep?.attempts)
    ? savedStep.attempts.filter((attempt) => attempt.nodeId === "D2" && attempt.stepId === STEP_ID)
    : [];
  const solvedAt = typeof savedStep?.solvedAt === "number" && savedStep.solvedAt > 0 ? savedStep.solvedAt : null;
  return {
    nodeId: "D2",
    currentStepId: STEP_ID,
    shuffleSeed: validSaved?.shuffleSeed ?? now,
    startedAt: validSaved?.startedAt && validSaved.startedAt > 0 ? validSaved.startedAt : now,
    updatedAt: validSaved?.updatedAt && validSaved.updatedAt > 0 ? validSaved.updatedAt : now,
    completedAt: solvedAt ? (validSaved?.completedAt ?? solvedAt) : null,
    steps: {
      [STEP_ID]: {
        draft: toJson(draft),
        attempts,
        revealedHints: 0,
        totalActiveSeconds: Math.max(0, savedStep?.totalActiveSeconds ?? 0),
        solvedAt,
      },
    },
    analytics: validSaved?.analytics ?? { lastEvent: "challenge_started", reviewerRequired: true },
  };
}

function normalizeDraft(raw: unknown): D2Submission {
  const fallback = createD2Draft();
  if (!isRecord(raw)) return fallback;
  return {
    stepId: STEP_ID,
    software: text(raw.software),
    inventory: text(raw.inventory),
    process: text(raw.process),
    files: normalizeFiles(raw.files),
    filesUrl: text(raw.filesUrl),
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
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export default D2Challenge;
