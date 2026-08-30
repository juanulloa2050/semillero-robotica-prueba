"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  C0_CHALLENGE,
  C0_STEPS,
  evaluateC0Step,
  isC0DraftReady,
  normalizeC0Submission,
  type C0StepSubmission,
  type C0StepEvaluation,
} from "@/lib/challenges/control/c0";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface C0ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function C0Challenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: C0ChallengeProps) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [evaluation, setEvaluation] = useState<C0StepEvaluation | undefined>(() =>
    deriveEvaluation(initial)
  );
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const activeStartedAtRef = useRef<number | null>(null);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const commit = useCallback(
    (mutate: (current: NodeChallengeProgress) => NodeChallengeProgress) => {
      const next = mutate(progressRef.current);
      progressRef.current = next;
      setProgress(next);
      onSaveRef.current(next);
      return next;
    },
    []
  );

  const checkpoint = useCallback((eventName: string, updateView = true) => {
    const now = Date.now();
    const startedAt = activeStartedAtRef.current;
    const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1_000));
    activeStartedAtRef.current = startedAt === null ? null : now;
    const current = progressRef.current;
    const step = current.steps.reference;
    const next: NodeChallengeProgress = {
      ...current,
      updatedAt: now,
      steps: step
        ? {
            ...current.steps,
            reference: {
              ...step,
              totalActiveSeconds: step.totalActiveSeconds + elapsed,
            },
          }
        : current.steps,
      analytics: {
        ...current.analytics,
        lastEvent: eventName,
        lastStepId: "reference",
      },
    };
    progressRef.current = next;
    if (updateView) setProgress(next);
    onSaveRef.current(next);
  }, []);

  useEffect(() => {
    if (readOnly || progress.completedAt) return;
    if (document.visibilityState === "visible") activeStartedAtRef.current = Date.now();
    onSaveRef.current(progressRef.current);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        checkpoint("visibility_hidden");
        activeStartedAtRef.current = null;
      } else {
        activeStartedAtRef.current = Date.now();
      }
    };
    const onPageHide = () => checkpoint("page_hidden", false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      checkpoint("challenge_closed", false);
      activeStartedAtRef.current = null;
    };
  }, [checkpoint, progress.completedAt, readOnly]);

  const stepProgress = progress.steps.reference;
  const draft = normalizeC0Submission(stepProgress.draft);
  const solved = hasSolved(stepProgress);
  const attempts = stepProgress.attempts.length;
  const totalSeconds = stepProgress.totalActiveSeconds;

  const changeDraft = useCallback((nextDraft: C0StepSubmission) => {
    if (readOnly || solved) return;
    setEvaluation(undefined);
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        reference: { ...current.steps.reference, draft: toJson(nextDraft) },
      },
      analytics: { ...current.analytics, lastEvent: "answer_changed" },
    }));
  }, [readOnly, solved, commit]);

  const revealHint = useCallback(() => {
    if (readOnly || solved || stepProgress.revealedHints >= C0_STEPS[0].hints.length) return;
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        reference: {
          ...current.steps.reference,
          revealedHints: Math.min(
            C0_STEPS[0].hints.length,
            current.steps.reference.revealedHints + 1
          ),
        },
      },
      analytics: { ...current.analytics, lastEvent: "hint_opened" },
    }));
    setAnnouncement("Pista disponible debajo de la actividad.");
  }, [readOnly, solved, stepProgress.revealedHints, commit]);

  const submit = useCallback(() => {
    if (readOnly || solved || !isC0DraftReady(draft)) {
      setAnnouncement("Por favor selecciona una opción antes de comprobar tu respuesta.");
      return;
    }

    const result = evaluateC0Step(draft);
    const now = Date.now();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "C0",
      stepId: "reference",
      attemptNumber: stepProgress.attempts.length + 1,
      startedAt: Math.max(progress.startedAt, now - stepProgress.totalActiveSeconds * 1_000),
      submittedAt: now,
      durationSeconds: stepProgress.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: result.isComplete,
      hintsUsed: stepProgress.revealedHints,
      score: result.score,
      metadata: { ...result.metadata },
    };
    setEvaluation(result);

    const next = commit((current) => {
      const nextSteps = {
        ...current.steps,
        reference: {
          ...current.steps.reference,
          attempts: [...current.steps.reference.attempts, attempt],
          solvedAt: result.isComplete ? now : null,
        },
      };
      return {
        ...current,
        updatedAt: now,
        completedAt: result.isComplete ? current.completedAt ?? now : current.completedAt,
        steps: nextSteps,
        analytics: {
          ...current.analytics,
          lastEvent: result.isComplete ? "step_solved" : "attempt_failed",
          totalAttempts: attempts + 1,
        },
      };
    });

    setAnnouncement(result.feedback);
    if (next.completedAt && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  }, [readOnly, solved, draft, stepProgress, progress.startedAt, commit, attempts]);

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface/45 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
      <header className="border-b border-line bg-gradient-to-r from-[#0c3240] to-[#092530] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan">
              Control y Automatización · C0
            </p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-ink sm:text-3xl">
              {C0_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-muted">
              {C0_CHALLENGE.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
            <Metric label="Intentos" value={String(attempts)} />
            <Metric label="Tiempo" value={formatTime(totalSeconds)} />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 lg:grid-cols-[1.1fr_1fr] gap-6 p-4 sm:p-6 lg:p-8">
        {/* Left column: Video simulation */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#030b12] shadow-inner aspect-video flex items-center justify-center">
            <video
              src={`${PUBLIC_BASE_PATH}${C0_STEPS[0].videoAsset.src}`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-[#020b12]/80 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-mono text-cyan tracking-wider uppercase">
              Simulación en vivo
            </div>
          </div>
          <div className="rounded-2xl border border-cyan/20 bg-cyan/[0.03] p-4 text-xs leading-5 text-slate-300">
            <span className="font-semibold text-cyan">Contexto de la simulación:</span> En la simulación se observa un vehículo autónomo frente a una pared móvil. El sensor frontal mide continuamente la distancia. Si la distancia cambia, el sistema debe responder de inmediato para restaurar la referencia deseada de 50 cm.
          </div>
        </div>

        {/* Right column: Instructions & Question */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan">
              Paso 1 de 1 · {C0_STEPS[0].eyebrow}
            </p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-ink outline-none">
              {C0_STEPS[0].title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {C0_STEPS[0].statement}
            </p>

            <fieldset disabled={readOnly || solved} className="mt-6 space-y-3">
              <legend className="sr-only">{C0_STEPS[0].question.prompt}</legend>
              <p aria-hidden="true" className="text-sm font-semibold leading-6 text-ink mb-3">
                {C0_STEPS[0].question.prompt}
              </p>
              <div className="space-y-2.5">
                {C0_STEPS[0].question.options.map((option) => (
                  <Choice
                    key={option.id}
                    name="c0-option"
                    checked={draft.selectedOptionId === option.id}
                    label={option.label}
                    disabled={readOnly || solved}
                    onChange={() => changeDraft({ ...draft, selectedOptionId: option.id })}
                  />
                ))}
              </div>
            </fieldset>

            {stepProgress.revealedHints > 0 && (
              <div className="mt-5 space-y-2">
                {Array.from({ length: stepProgress.revealedHints }).map((_, i) => (
                  <aside key={i} className="rounded-2xl border border-cyan/25 bg-cyan/[0.07] p-4 text-xs leading-5 text-ice animate-fade-in">
                    <span className="font-semibold text-cyan">Pista {i + 1}:</span> {C0_STEPS[0].hints[i]}
                  </aside>
                ))}
              </div>
            )}

            {evaluation && (
              <div
                role="status"
                className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                  evaluation.isComplete
                    ? "border-ok/30 bg-ok/[0.07] text-ok"
                    : "border-danger/30 bg-danger/[0.07] text-ice"
                }`}
              >
                {evaluation.feedback}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={revealHint}
              disabled={readOnly || solved || stepProgress.revealedHints >= C0_STEPS[0].hints.length}
              className="min-h-11 rounded-xl border border-line px-4 text-xs font-semibold text-muted hover:border-cyan/30 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-45"
            >
              {stepProgress.revealedHints >= C0_STEPS[0].hints.length
                ? "Todas las pistas vistas"
                : stepProgress.revealedHints > 0
                ? `Ver pista ${stepProgress.revealedHints + 1}`
                : "Ver pista"}
            </button>
            <div className="flex gap-2">
              {!solved && !readOnly && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!isC0DraftReady(draft)}
                  className="min-h-11 rounded-xl bg-gradient-to-r from-action to-tech px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(2,56,125,.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Comprobar respuesta
                </button>
              )}
              {solved && (
                <span className="inline-flex min-h-11 items-center rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-semibold text-ok">
                  Reto completado
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </article>
  );
}

function Choice({
  name,
  checked,
  label,
  disabled,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-xs leading-5 transition-colors focus-within:ring-2 focus-within:ring-cyan/40 ${
        checked
          ? "border-cyan/40 bg-cyan/10 text-ink"
          : "border-line bg-surface/35 text-muted hover:bg-surface/50 hover:text-ink"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 accent-[#84b6d7] h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-night/35 px-3 py-2">
      <strong className="block text-sm text-ink">{value}</strong>
      <span className="text-muted">{label}</span>
    </div>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const savedStep = saved?.nodeId === "C0" ? saved.steps?.reference : undefined;
  const draft = normalizeC0Submission(savedStep?.draft);
  const attempts = Array.isArray(savedStep?.attempts)
    ? savedStep.attempts.filter((attempt) => attempt.nodeId === "C0" && attempt.stepId === "reference")
    : [];

  const steps = {
    reference: {
      draft: toJson(draft),
      attempts,
      revealedHints: Math.max(0, Math.min(3, savedStep?.revealedHints ?? 0)),
      totalActiveSeconds: Math.max(0, savedStep?.totalActiveSeconds ?? 0),
      solvedAt: typeof savedStep?.solvedAt === "number" && savedStep.solvedAt > 0 ? savedStep.solvedAt : null,
    },
  };

  return {
    nodeId: "C0",
    currentStepId: "reference",
    shuffleSeed: saved?.nodeId === "C0" && Number.isFinite(saved.shuffleSeed) ? saved.shuffleSeed : now,
    startedAt: saved?.nodeId === "C0" && saved.startedAt > 0 ? saved.startedAt : now,
    updatedAt: saved?.nodeId === "C0" && saved.updatedAt > 0 ? saved.updatedAt : now,
    completedAt: saved?.nodeId === "C0" && saved.completedAt && hasSolved(steps.reference) ? saved.completedAt : null,
    steps,
    analytics: saved?.nodeId === "C0" ? saved.analytics ?? {} : { lastEvent: "challenge_started" },
  };
}

function deriveEvaluation(progress: NodeChallengeProgress): C0StepEvaluation | undefined {
  const attempt = progress.steps.reference?.attempts.at(-1);
  if (attempt) return evaluateC0Step(normalizeC0Submission(attempt.answer));
  return undefined;
}

function hasSolved(step?: ChallengeStepProgress): boolean {
  return typeof step?.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return safe < 60 ? `${safe}s` : `${Math.floor(safe / 60)}m`;
}

export default C0Challenge;
