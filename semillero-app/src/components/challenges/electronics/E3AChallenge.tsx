"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  E3A_CHALLENGE,
  E3A_CONSUMPTION_ROWS,
  E3A_QUESTIONS,
  E3A_RESEARCH_MIN_CHARS,
  E3A_RESEARCH_TOPICS,
  E3A_STEP_IDS,
  createE3ADraft,
  evaluateE3A,
  type E3ADimensioningSubmission,
  type E3AEvaluation,
  type E3AResearchSubmission,
  type E3ASeparationSubmission,
  type E3AStepId,
  type E3ASubmission,
} from "@/lib/challenges/electronics/e3a";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E3AChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<E3AStepId, E3AEvaluation>>;
const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function E3AChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E3AChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() =>
    createInitialProgress(savedProgress)
  );
  const [evaluations, setEvaluations] = useState<EvaluationMap>(() =>
    deriveEvaluations(createInitialProgress(savedProgress))
  );
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completedNotifiedRef = useRef(Boolean(progress.completedAt));
  const activeStartedAtRef = useRef(new Date().getTime());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const signalSaved = useCallback(() => {
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState("saved"), 420);
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const commit = useCallback(
    (mutate: (current: NodeChallengeProgress) => NodeChallengeProgress) => {
      const next = mutate(progressRef.current);
      progressRef.current = next;
      setProgress(next);
      onSaveRef.current(next);
      signalSaved();
      return next;
    },
    [signalSaved]
  );

  const addActiveTime = useCallback(
    (current: NodeChallengeProgress, now: number): NodeChallengeProgress => {
      const stepId = toStepId(current.currentStepId);
      const elapsed = readOnly
        ? 0
        : Math.max(0, Math.floor((now - activeStartedAtRef.current) / 1_000));
      activeStartedAtRef.current = now;
      if (elapsed === 0) return current;
      return {
        ...current,
        steps: {
          ...current.steps,
          [stepId]: {
            ...current.steps[stepId],
            totalActiveSeconds:
              current.steps[stepId].totalActiveSeconds + elapsed,
          },
        },
      };
    },
    [readOnly]
  );

  useEffect(() => {
    if (readOnly || progressRef.current.completedAt) return;

    const checkpoint = () => {
      const now = Date.now();
      const timed = addActiveTime(progressRef.current, now);
      const next = {
        ...timed,
        updatedAt: now,
        analytics: buildAnalytics(timed, "challenge_paused"),
      };
      progressRef.current = next;
      onSaveRef.current(next);
    };
    window.addEventListener("pagehide", checkpoint);
    return () => {
      window.removeEventListener("pagehide", checkpoint);
      checkpoint();
    };
  }, [addActiveTime, readOnly]);

  useEffect(() => {
    if (!readOnly && !progressRef.current.completedAt) {
      onSaveRef.current(progressRef.current);
    }
  }, [readOnly]);

  const currentStepId = toStepId(progress.currentStepId);
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as E3ASubmission;
  const currentEvaluation = evaluations[currentStepId];
  const currentSolved = isSolved(currentStepProgress);
  const completedCount = E3A_STEP_IDS.filter((id) => isSolved(progress.steps[id])).length;
  const totalAttempts = E3A_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].attempts.length,
    0
  );
  const totalHints = E3A_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].revealedHints,
    0
  );
  const totalSeconds = E3A_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].totalActiveSeconds,
    0
  );
  const hints = E3A_CHALLENGE.steps[currentStepId].hints;

  const changeDraft = (draft: E3ASubmission) => {
    if (readOnly || currentSolved || draft.stepId !== currentStepId) return;
    setEvaluations((current) => ({ ...current, [currentStepId]: undefined }));
    commit((current) => {
      const now = Date.now();
      const steps = {
        ...current.steps,
        [currentStepId]: {
          ...current.steps[currentStepId],
          draft: toJsonValue(draft),
        },
      };
      const next = { ...current, steps, updatedAt: now };
      return { ...next, analytics: buildAnalytics(next, "answer_changed") };
    });
  };

  const revealHint = () => {
    if (
      readOnly ||
      currentSolved ||
      currentStepProgress.revealedHints >= hints.length
    ) {
      return;
    }
    const revealedHints = currentStepProgress.revealedHints + 1;
    commit((current) => {
      const now = Date.now();
      const steps = {
        ...current.steps,
        [currentStepId]: {
          ...current.steps[currentStepId],
          revealedHints,
        },
      };
      const next = { ...current, steps, updatedAt: now };
      return {
        ...next,
        analytics: {
          ...buildAnalytics(next, "hint_revealed"),
          lastHintNumber: revealedHints,
        },
      };
    });
    setAnnouncement(`Pista ${revealedHints} disponible.`);
  };

  const submitStep = () => {
    if (readOnly || currentSolved || !isDraftReady(currentDraft)) return;
    const evaluation = evaluateE3A(currentDraft);
    const now = new Date().getTime();
    let challengeComplete = false;

    const finalProgress = commit((current) => {
      const timed = addActiveTime(current, now);
      const previousStep = timed.steps[currentStepId];
      const attemptNumber = previousStep.attempts.length + 1;
      const usedSeconds = previousStep.attempts.reduce(
        (total, attempt) => total + attempt.durationSeconds,
        0
      );
      const attempt: ChallengeAttempt = {
        id: `E3A-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "E3A",
        stepId: currentStepId,
        attemptNumber,
        startedAt: now - Math.max(0, previousStep.totalActiveSeconds - usedSeconds) * 1_000,
        submittedAt: now,
        durationSeconds: Math.max(0, previousStep.totalActiveSeconds - usedSeconds),
        answer: toJsonValue(currentDraft),
        isCorrect: evaluation.isCorrect,
        hintsUsed: previousStep.revealedHints,
        score: evaluation.score,
        metadata: { maxScore: evaluation.maxScore },
      };
      const steps = {
        ...timed.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(currentDraft),
          attempts: [...previousStep.attempts, attempt],
          solvedAt: evaluation.isComplete
            ? previousStep.solvedAt ?? now
            : previousStep.solvedAt,
        },
      };
      challengeComplete = E3A_STEP_IDS.every((id) => isSolved(steps[id]));
      const next = {
        ...timed,
        steps,
        updatedAt: now,
        completedAt: challengeComplete ? timed.completedAt ?? now : null,
      };
      return {
        ...next,
        analytics: {
          ...buildAnalytics(next, evaluation.isComplete ? "step_solved" : "attempt_submitted"),
          lastAttemptCorrect: evaluation.isComplete,
          lastAttemptScore: evaluation.score,
          lastAttemptNumber: attemptNumber,
        },
      };
    });

    setEvaluations((current) => ({ ...current, [currentStepId]: evaluation }));
    setAnnouncement(evaluation.feedback);
    if (challengeComplete && !completedNotifiedRef.current) {
      completedNotifiedRef.current = true;
      onCompleteRef.current(finalProgress);
    }
  };

  const goToStep = (stepId: E3AStepId) => {
    if (stepId === currentStepId || !canVisit(progress, stepId, readOnly)) return;
    if (readOnly) {
      const next = { ...progressRef.current, currentStepId: stepId };
      progressRef.current = next;
      setProgress(next);
    } else {
      commit((current) => {
        const now = Date.now();
        const timed = addActiveTime(current, now);
        const next = { ...timed, currentStepId: stepId, updatedAt: now };
        return { ...next, analytics: buildAnalytics(next, "step_changed") };
      });
    }
    activeStartedAtRef.current = new Date().getTime();
    setAnnouncement(`Paso ${E3A_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-line bg-night/70 text-ink shadow-2xl shadow-black/20">
      <div className="border-b border-line bg-gradient-to-br from-surface/80 to-night px-4 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">E3A · Ingeniería de potencia</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{E3A_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-muted">{E3A_CHALLENGE.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="Pasos" value={`${completedCount}/${E3A_STEP_IDS.length}`} />
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Pistas" value={totalHints} />
            <Stat label="Tiempo" value={formatDuration(totalSeconds)} />
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-cyan transition-[width] duration-500" style={{ width: `${(completedCount / E3A_STEP_IDS.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Pasos del reto" className="flex flex-wrap gap-2">
            {E3A_STEP_IDS.map((stepId, index) => {
              const solved = isSolved(progress.steps[stepId]);
              const enabled = canVisit(progress, stepId, readOnly);
              return (
                <button
                  key={stepId}
                  type="button"
                  disabled={!enabled}
                  aria-current={stepId === currentStepId ? "step" : undefined}
                  onClick={() => goToStep(stepId)}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${stepId === currentStepId ? "border-cyan/50 bg-cyan/15 text-ink" : solved ? "border-ok/25 bg-ok/10 text-ok" : enabled ? "border-line bg-surface/45 text-muted hover:text-ink" : "cursor-not-allowed border-line bg-surface/20 text-muted/45"}`}
                >
                  {solved ? "✓ " : ""}{index + 1}. {stepTitle(stepId)}
                </button>
              );
            })}
          </nav>
          <p role="status" className="text-xs text-muted">{saveState === "saving" ? "Guardando…" : "Guardado en este dispositivo"}</p>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        <h3 ref={headingRef} tabIndex={-1} className="font-heading text-xl font-bold outline-none sm:text-2xl">
          Paso {E3A_STEP_IDS.indexOf(currentStepId) + 1} · {stepTitle(currentStepId)}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{E3A_CHALLENGE.steps[currentStepId].statement}</p>

        {currentStepId === "research" ? (
          <ResearchStep
            draft={currentDraft as E3AResearchSubmission}
            evaluation={currentEvaluation}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        ) : currentStepId === "dimensioning" ? (
          <DimensioningStep
            draft={currentDraft as E3ADimensioningSubmission}
            evaluation={currentEvaluation}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        ) : (
          <SeparationStep
            draft={currentDraft as E3ASeparationSubmission}
            evaluation={currentEvaluation}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        )}

        <HintPanel hints={hints} revealed={currentStepProgress.revealedHints} disabled={readOnly || currentSolved} onReveal={revealHint} />
        {currentEvaluation && <EvaluationBanner evaluation={currentEvaluation} />}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={E3A_STEP_IDS.indexOf(currentStepId) === 0}
            onClick={() => goToStep(E3A_STEP_IDS[E3A_STEP_IDS.indexOf(currentStepId) - 1])}
            className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            Paso anterior
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {!readOnly && !currentSolved && (
              <button
                type="button"
                disabled={!isDraftReady(currentDraft)}
                onClick={submitStep}
                className="min-h-11 rounded-xl bg-action px-5 text-sm font-bold text-white transition hover:bg-tech focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitLabel(currentStepId)}
              </button>
            )}
            {currentSolved && E3A_STEP_IDS.indexOf(currentStepId) < E3A_STEP_IDS.length - 1 && (
              <button type="button" onClick={() => goToStep(E3A_STEP_IDS[E3A_STEP_IDS.indexOf(currentStepId) + 1])} className="min-h-11 rounded-xl bg-action px-5 text-sm font-bold text-white hover:bg-tech focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
                Continuar al siguiente paso
              </button>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

function ResearchStep({ draft, evaluation, disabled, onChange }: { draft: E3AResearchSubmission; evaluation?: E3AEvaluation; disabled: boolean; onChange: (draft: E3AResearchSubmission) => void }) {
  return (
    <div className="mt-6 space-y-4">
      {E3A_RESEARCH_TOPICS.map((topic) => {
        const value = draft.answers[topic.id] ?? "";
        const remaining = Math.max(0, E3A_RESEARCH_MIN_CHARS - value.trim().length);
        const item = evaluation?.items.find((candidate) => candidate.id === topic.id);
        const fieldId = `e3a-research-${topic.id}`;
        return (
          <div key={topic.id} className="rounded-2xl border border-line bg-surface/25 p-4 sm:p-5">
            <label htmlFor={fieldId} className="text-sm font-semibold text-ink">{topic.title}</label>
            <p id={`${fieldId}-help`} className="mt-1 text-xs leading-5 text-muted">{topic.prompt}</p>
            <textarea
              id={fieldId}
              value={value}
              disabled={disabled}
              rows={4}
              aria-describedby={`${fieldId}-help ${fieldId}-count`}
              onChange={(event) => onChange({ ...draft, answers: { ...draft.answers, [topic.id]: event.target.value } })}
              className="mt-3 w-full resize-y rounded-xl border border-line bg-night/55 px-4 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted/55 focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15 disabled:opacity-75"
              placeholder="Resume lo que investigaste…"
            />
            <p id={`${fieldId}-count`} className={`mt-2 text-right text-xs ${remaining === 0 ? "text-ok" : "text-muted"}`}>{remaining === 0 ? "Extensión mínima cumplida" : `Faltan ${remaining} caracteres`}</p>
            {item && <ItemFeedback correct={item.isCorrect === true} text={item.feedback} />}
          </div>
        );
      })}
    </div>
  );
}

function DimensioningStep({ draft, evaluation, disabled, onChange }: { draft: E3ADimensioningSubmission; evaluation?: E3AEvaluation; disabled: boolean; onChange: (draft: E3ADimensioningSubmission) => void }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-[640px] w-full border-collapse text-left text-sm">
          <caption className="sr-only">Consumos pico del robot</caption>
          <thead className="bg-surface/70 text-xs uppercase tracking-[0.12em] text-cyan"><tr><th className="px-4 py-3">Componente</th><th className="px-4 py-3">Voltaje</th><th className="px-4 py-3">Pico unitario</th><th className="px-4 py-3">Pico total</th></tr></thead>
          <tbody>{E3A_CONSUMPTION_ROWS.map((row) => <tr key={row.id} className="border-t border-line"><td className="px-4 py-3 font-semibold text-ink">{row.component}</td><td className="px-4 py-3 text-muted">{row.voltage}</td><td className="px-4 py-3 text-muted">{row.peakPerUnit}</td><td className="px-4 py-3 font-bold text-ice">{row.totalPeak}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {E3A_QUESTIONS.map((question) => {
          const item = evaluation?.items.find((candidate) => candidate.id === question.id);
          return (
            <fieldset key={question.id} className="rounded-2xl border border-line bg-surface/25 p-4 sm:p-5">
              <legend className="sr-only">{question.prompt}</legend>
              <p aria-hidden="true" className="text-sm font-semibold leading-6 text-ink">{question.prompt}</p>
              <div className="mt-3 space-y-2">{question.options.map((option) => <label key={option.id} className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 text-sm leading-5 ${draft.answers[question.id] === option.id ? "border-cyan/45 bg-cyan/10 text-ink" : "border-line bg-night/35 text-muted hover:text-ink"} ${disabled ? "cursor-default opacity-75" : ""}`}><input type="radio" name={`e3a-${question.id}`} value={option.id} checked={draft.answers[question.id] === option.id} disabled={disabled} onChange={() => onChange({ ...draft, answers: { ...draft.answers, [question.id]: option.id } })} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan" /><span>{option.label}</span></label>)}</div>
              {item && <ItemFeedback correct={item.isCorrect === true} text={item.feedback} />}
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

function SeparationStep({ draft, evaluation, disabled, onChange }: { draft: E3ASeparationSubmission; evaluation?: E3AEvaluation; disabled: boolean; onChange: (draft: E3ASeparationSubmission) => void }) {
  const step = E3A_CHALLENGE.steps["rail-separation"];
  const remaining = Math.max(0, step.minimumCharacters - draft.explanation.trim().length);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,.95fr)]">
      <figure className="overflow-hidden rounded-2xl border border-line bg-surface/30">
        <Image src={`${PUBLIC_BASE_PATH}${step.asset.src}`} alt={step.asset.alt} width={1190} height={640} className="h-auto w-full" />
        <figcaption className="border-t border-line px-4 py-3 text-xs leading-5 text-muted">
          <span className="block font-semibold text-ink">Distribución sugerida entre motores, lógica y servos.</span>
          <span className="mt-1 block">La separación de rieles no elimina la necesidad de diseñar correctamente referencias, retornos y protecciones.</span>
        </figcaption>
      </figure>
      <div className="rounded-2xl border border-line bg-surface/25 p-4 sm:p-5">
        <label htmlFor="e3a-separation" className="text-sm font-semibold text-ink">Defiende la arquitectura</label>
        <p id="e3a-separation-help" className="mt-1 text-xs leading-5 text-muted">Incluye ruido, transitorios, brownouts o caídas de tensión y estabilidad. La revisión de contenido será manual.</p>
        <textarea id="e3a-separation" value={draft.explanation} disabled={disabled} rows={10} aria-describedby="e3a-separation-help e3a-separation-count" onChange={(event) => onChange({ ...draft, explanation: event.target.value })} className="mt-4 w-full resize-y rounded-xl border border-line bg-night/55 px-4 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted/55 focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15 disabled:opacity-75" placeholder="Explica qué perturbaciones esperas y cómo la separación protege el procesamiento…" />
        <p id="e3a-separation-count" className={`mt-2 text-right text-xs ${remaining === 0 ? "text-ok" : "text-muted"}`}>{remaining === 0 ? "Extensión mínima cumplida" : `Faltan ${remaining} caracteres`}</p>
        {evaluation?.items[0] && <ItemFeedback correct={evaluation.isComplete} text={evaluation.items[0].feedback} />}
      </div>
    </div>
  );
}

function HintPanel({ hints, revealed, disabled, onReveal }: { hints: readonly string[]; revealed: number; disabled: boolean; onReveal: () => void }) {
  return <aside className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-ink">¿Necesitas una pista?</h4><p className="mt-1 text-xs text-muted">Hay una pista disponible y su consulta queda registrada.</p></div>{!disabled && revealed < hints.length && <button type="button" onClick={onReveal} className="min-h-10 rounded-xl border border-amber-300/30 px-4 text-xs font-bold text-amber-100 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Ver pista</button>}</div>{revealed > 0 && <p className="mt-4 rounded-xl border border-line bg-night/35 p-3 text-xs leading-5 text-muted">{hints[0]}</p>}</aside>;
}

function EvaluationBanner({ evaluation }: { evaluation: E3AEvaluation }) {
  return <div aria-live="polite" className={`mt-5 rounded-2xl border p-4 ${evaluation.isComplete ? "border-ok/30 bg-ok/[0.08]" : "border-amber-300/25 bg-amber-300/[0.06]"}`}><p className="text-sm font-bold text-ink">{evaluation.isComplete ? "Paso resuelto" : "Revisa tu intento"}</p><p className="mt-1 text-xs leading-5 text-muted">{evaluation.feedback}</p><p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Resultado {evaluation.score}/{evaluation.maxScore}{evaluation.isCorrect === null ? " · revisión manual" : ""}</p></div>;
}

function ItemFeedback({ correct, text }: { correct: boolean; text: string }) {
  return <p role="status" className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${correct ? "border-ok/25 bg-ok/[0.07] text-ok" : "border-amber-300/25 bg-amber-300/[0.06] text-amber-100"}`}>{text}</p>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <dl className="min-w-20 rounded-xl border border-line bg-night/25 px-3 py-2"><dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{label}</dt><dd className="mt-1 text-sm font-bold text-ink">{value}</dd></dl>;
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const source = saved?.nodeId === "E3A" ? saved : undefined;
  const steps = Object.fromEntries(E3A_STEP_IDS.map((id) => [id, normalizeStep(id, source?.steps[id])])) as Record<string, ChallengeStepProgress>;
  const firstIncomplete = E3A_STEP_IDS.find((id) => !isSolved(steps[id])) ?? E3A_STEP_IDS[E3A_STEP_IDS.length - 1];
  const requested = isStepId(source?.currentStepId) ? source.currentStepId : firstIncomplete;
  const safeCurrent = E3A_STEP_IDS.indexOf(requested) <= E3A_STEP_IDS.indexOf(firstIncomplete) ? requested : firstIncomplete;
  const allSolved = E3A_STEP_IDS.every((id) => isSolved(steps[id]));
  const progress: NodeChallengeProgress = { nodeId: "E3A", currentStepId: safeCurrent, shuffleSeed: finite(source?.shuffleSeed) ?? now % 2_147_483_647, startedAt: finite(source?.startedAt) ?? now, updatedAt: finite(source?.updatedAt) ?? now, completedAt: allSolved ? finite(source?.completedAt) ?? now : null, steps, analytics: source?.analytics ?? {} };
  return { ...progress, analytics: buildAnalytics(progress, "challenge_opened") };
}

function normalizeStep(id: E3AStepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  const hintLimit = E3A_CHALLENGE.steps[id].hints.length;
  return { draft: toJsonValue(normalizeDraft(id, saved?.draft)), attempts: Array.isArray(saved?.attempts) ? saved.attempts : [], revealedHints: Math.min(hintLimit, Math.max(0, Math.floor(finite(saved?.revealedHints) ?? 0))), totalActiveSeconds: Math.max(0, Math.floor(finite(saved?.totalActiveSeconds) ?? 0)), solvedAt: positive(saved?.solvedAt) };
}

function normalizeDraft(id: E3AStepId, raw: unknown): E3ASubmission {
  if (!isRecord(raw) || raw.stepId !== id) return createE3ADraft(id);
  if (id === "rail-separation") {
    return { stepId: id, explanation: typeof raw.explanation === "string" ? raw.explanation : "" };
  }
  const answers = isRecord(raw.answers) ? Object.fromEntries(Object.entries(raw.answers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  return { stepId: id, answers } as E3ASubmission;
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const result: EvaluationMap = {};
  for (const id of E3A_STEP_IDS) {
    const last = progress.steps[id].attempts.at(-1)?.answer;
    if (!isRecord(last) || last.stepId !== id) continue;
    try { result[id] = evaluateE3A(last as unknown as E3ASubmission); } catch { /* Ignore malformed legacy attempts. */ }
  }
  return result;
}

function isDraftReady(draft: E3ASubmission): boolean {
  if (draft.stepId === "research") {
    return E3A_RESEARCH_TOPICS.every((topic) => (draft.answers[topic.id] ?? "").trim().length >= E3A_RESEARCH_MIN_CHARS);
  }
  if (draft.stepId === "dimensioning") {
    return E3A_QUESTIONS.every((question) => Boolean(draft.answers[question.id]));
  }
  return draft.explanation.trim().length >= E3A_CHALLENGE.steps["rail-separation"].minimumCharacters;
}

function submitLabel(stepId: E3AStepId): string {
  if (stepId === "dimensioning") return "Comprobar decisiones";
  return stepId === "research" ? "Registrar investigación" : "Registrar explicación";
}

function canVisit(progress: NodeChallengeProgress, target: E3AStepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const firstIncomplete = E3A_STEP_IDS.findIndex((id) => !isSolved(progress.steps[id]));
  return firstIncomplete === -1 || E3A_STEP_IDS.indexOf(target) <= firstIncomplete;
}

function buildAnalytics(progress: NodeChallengeProgress, event: string): NodeChallengeProgress["analytics"] {
  return { ...progress.analytics, attemptsTotal: E3A_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].attempts.length, 0), hintsTotal: E3A_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].revealedHints, 0), totalActiveSeconds: E3A_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].totalActiveSeconds, 0), solvedSteps: E3A_STEP_IDS.filter((id) => isSolved(progress.steps[id])).length, currentStepOrder: E3A_STEP_IDS.indexOf(toStepId(progress.currentStepId)) + 1, lastEvent: event };
}

function isSolved(step?: ChallengeStepProgress): boolean { return positive(step?.solvedAt) !== null; }
function positive(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null; }
function finite(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function isStepId(value: unknown): value is E3AStepId { return typeof value === "string" && E3A_STEP_IDS.includes(value as E3AStepId); }
function toStepId(value: unknown): E3AStepId { return isStepId(value) ? value : E3A_STEP_IDS[0]; }
function stepTitle(id: E3AStepId): string { return E3A_CHALLENGE.steps[id].title; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function toJsonValue(value: unknown): JsonValue { return JSON.parse(JSON.stringify(value)) as JsonValue; }
function formatDuration(seconds: number): string { const minutes = Math.floor(seconds / 60); return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`; }

export default E3AChallenge;
