"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  E1A_BLOCKS,
  E1A_CHALLENGE,
  E1A_FAULT_CASES,
  E1A_FUNCTIONS,
  E1A_STEP_IDS,
  E1A_STEPS,
  evaluateE1AStep,
  isE1AComplete,
  isE1ADraftReady,
  normalizeE1ASubmission,
  type E1AAsset,
  type E1ABlocksSubmission,
  type E1AFaultCaseId,
  type E1AFaultQuestion,
  type E1AFaultQuestionAnswer,
  type E1AFaultsSubmission,
  type E1AFunctionId,
  type E1AInterpretationSubmission,
  type E1AStepDefinition,
  type E1AStepEvaluation,
  type E1AStepId,
  type E1AStepSubmission,
} from "@/lib/challenges/electronics/e1a";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E1AChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

type EvaluationMap = Partial<Record<E1AStepId, E1AStepEvaluation>>;

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function E1AChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
  onExit,
}: E1AChallengeProps) {
  const initialProgress = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initialProgress);
  const [evaluations, setEvaluations] = useState<EvaluationMap>(() =>
    deriveEvaluations(initialProgress)
  );
  const [lastSavedAt, setLastSavedAt] = useState(progress.updatedAt);
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(progress.completedAt));
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef<E1AStepId>(toStepId(progress.currentStepId));
  const activeStartedAtRef = useRef<number | null>(null);
  const activeRemainderMsRef = useRef(0);

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
      setLastSavedAt(next.updatedAt);
      onSaveRef.current(next);
      return next;
    },
    []
  );

  const consumeActiveTime = useCallback(
    (current: NodeChallengeProgress, now: number): NodeChallengeProgress => {
      const startedAt = activeStartedAtRef.current;
      const stepId = activeStepIdRef.current;
      if (startedAt === null || !current.steps[stepId]) return current;

      const elapsedMs = activeRemainderMsRef.current + Math.max(0, now - startedAt);
      const elapsedSeconds = Math.floor(elapsedMs / 1_000);
      activeRemainderMsRef.current = elapsedMs - elapsedSeconds * 1_000;
      activeStartedAtRef.current = now;
      if (elapsedSeconds === 0) return current;

      return {
        ...current,
        steps: {
          ...current.steps,
          [stepId]: {
            ...current.steps[stepId],
            totalActiveSeconds:
              current.steps[stepId].totalActiveSeconds + elapsedSeconds,
          },
        },
      };
    },
    []
  );

  const persistActiveCheckpoint = useCallback(
    (event: string, updateView: boolean) => {
      const now = Date.now();
      const timed = consumeActiveTime(progressRef.current, now);
      const stepId = activeStepIdRef.current;
      const next = {
        ...timed,
        updatedAt: now,
        analytics: buildAnalytics(timed.analytics, timed.steps, event, stepId),
      };
      progressRef.current = next;
      if (updateView) {
        setProgress(next);
        setLastSavedAt(now);
      }
      onSaveRef.current(next);
    },
    [consumeActiveTime]
  );

  useEffect(() => {
    if (!readOnly && !progressRef.current.completedAt) {
      onSaveRef.current(progressRef.current);
    }
  }, [readOnly]);

  useEffect(() => {
    if (readOnly || progress.completedAt) return;

    const resumeClock = () => {
      if (activeStartedAtRef.current !== null || progressRef.current.completedAt) return;
      activeStepIdRef.current = toStepId(progressRef.current.currentStepId);
      activeStartedAtRef.current = Date.now();
    };
    const pauseClock = (event: string, updateView: boolean) => {
      if (activeStartedAtRef.current === null) return;
      persistActiveCheckpoint(event, updateView);
      activeStartedAtRef.current = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") pauseClock("visibility_hidden", true);
      else resumeClock();
    };
    const handlePageHide = () => pauseClock("page_hidden", false);

    if (document.visibilityState === "visible") resumeClock();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      pauseClock("challenge_closed", false);
    };
  }, [persistActiveCheckpoint, progress.completedAt, readOnly]);

  const currentStepId = toStepId(progress.currentStepId);
  const currentStep = E1A_STEPS.find((step) => step.id === currentStepId) ?? E1A_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = normalizeE1ASubmission(currentStepId, currentStepProgress.draft);
  const currentEvaluation = evaluations[currentStepId];
  const currentIndex = E1A_STEP_IDS.indexOf(currentStepId);
  const completedStepIds = getCompletedStepIds(progress);
  const currentSolved = hasSolvedTimestamp(currentStepProgress);
  const totalAttempts = Object.values(progress.steps).reduce(
    (total, step) => total + step.attempts.length,
    0
  );
  const totalHints = Object.values(progress.steps).reduce(
    (total, step) => total + step.revealedHints,
    0
  );
  const totalSeconds = Object.values(progress.steps).reduce(
    (total, step) => total + step.totalActiveSeconds,
    0
  );

  const changeDraft = (draft: E1AStepSubmission) => {
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
      return {
        ...current,
        steps,
        updatedAt: now,
        analytics: buildAnalytics(current.analytics, steps, "answer_changed", currentStepId),
      };
    });
  };

  const revealHint = () => {
    if (
      readOnly ||
      currentSolved ||
      currentStepProgress.revealedHints >= currentStep.hints.length
    ) {
      return;
    }
    const nextHint = currentStepProgress.revealedHints + 1;
    commit((current) => {
      const now = Date.now();
      const steps = {
        ...current.steps,
        [currentStepId]: {
          ...current.steps[currentStepId],
          revealedHints: nextHint,
        },
      };
      return {
        ...current,
        steps,
        updatedAt: now,
        analytics: buildAnalytics(current.analytics, steps, "hint_revealed", currentStepId, {
          lastHintNumber: nextHint,
        }),
      };
    });
    setAnnouncement("Pista disponible.");
  };

  const submitStep = () => {
    if (readOnly || currentSolved || !isE1ADraftReady(currentDraft)) return;
    const evaluation = evaluateE1AStep(currentDraft);
    const now = new Date().getTime();
    let challengeCompleted = false;

    const finalProgress = commit((current) => {
      const timed = consumeActiveTime(current, now);
      const previousStep = timed.steps[currentStepId];
      const attemptNumber = previousStep.attempts.length + 1;
      const earlierAttemptSeconds = previousStep.attempts.reduce(
        (total, attempt) => total + attempt.durationSeconds,
        0
      );
      const durationSeconds = Math.max(
        0,
        previousStep.totalActiveSeconds - earlierAttemptSeconds
      );
      const attempt: ChallengeAttempt = {
        id: `E1A-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "E1A",
        stepId: currentStepId,
        attemptNumber,
        startedAt: now - durationSeconds * 1_000,
        submittedAt: now,
        durationSeconds,
        answer: toJsonValue(currentDraft),
        isCorrect: currentStepId === "interpretation" ? null : evaluation.isComplete,
        hintsUsed: previousStep.revealedHints,
        score: evaluation.score,
        metadata: {
          maxScore: evaluation.maxScore,
          ...evaluation.metadata,
        },
      };
      const steps = {
        ...timed.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(currentDraft),
          attempts: [...previousStep.attempts, attempt],
          solvedAt:
            evaluation.isComplete && previousStep.solvedAt === null
              ? now
              : previousStep.solvedAt,
        },
      };
      const solvedIds = getCompletedStepIdsFromSteps(steps);
      challengeCompleted = isE1AComplete(solvedIds);
      return {
        ...timed,
        steps,
        updatedAt: now,
        completedAt: challengeCompleted ? timed.completedAt ?? now : null,
        analytics: buildAnalytics(
          timed.analytics,
          steps,
          evaluation.isComplete ? "step_solved" : "attempt_submitted",
          currentStepId,
          {
            lastAttemptNumber: attemptNumber,
            lastAttemptScore: evaluation.score,
            lastAttemptCorrect: evaluation.isComplete,
          }
        ),
      };
    });

    setEvaluations((current) => ({ ...current, [currentStepId]: evaluation }));
    setAnnouncement(evaluation.feedback);
    if (challengeCompleted && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(finalProgress);
    }
  };

  const goToStep = (stepId: E1AStepId) => {
    if (stepId === currentStepId || !canVisitStep(progress, stepId, readOnly)) return;
    if (readOnly) {
      const next = { ...progressRef.current, currentStepId: stepId };
      progressRef.current = next;
      setProgress(next);
    } else {
      commit((current) => {
        const now = Date.now();
        const timed = consumeActiveTime(current, now);
        activeStepIdRef.current = stepId;
        activeStartedAtRef.current = now;
        return {
          ...timed,
          currentStepId: stepId,
          updatedAt: now,
          analytics: buildAnalytics(timed.analytics, timed.steps, "step_navigated", stepId),
        };
      });
    }
    setAnnouncement(`Paso ${E1A_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const previousStepId = E1A_STEP_IDS[currentIndex - 1];
  const nextStepId = E1A_STEP_IDS[currentIndex + 1];
  const readyToSubmit = isE1ADraftReady(currentDraft);

  return (
    <section className="overflow-hidden rounded-3xl border border-[#0A84C7]/25 bg-[#061925] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(57,200,240,0.2),transparent_42%),linear-gradient(135deg,#09283a,#071b28)] px-5 py-6 sm:px-7 lg:px-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#69dcf8]">
              Electrónica · E1A
            </p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">
              {E1A_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-slate-300">
              {E1A_CHALLENGE.subtitle}
            </p>
          </div>
          <dl className="flex flex-wrap gap-2">
            <Stat label="Resueltos" value={`${completedStepIds.length}/3`} />
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Pistas" value={totalHints} />
            <Stat label="Tiempo" value={formatDuration(totalSeconds)} />
          </dl>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0A84C7] to-[#5CE1FF] transition-[width] duration-500"
            style={{ width: `${(completedStepIds.length / E1A_STEP_IDS.length) * 100}%` }}
          />
        </div>
        <nav className="mt-4 grid grid-cols-3 gap-2" aria-label="Pasos de E1A">
          {E1A_STEPS.map((step) => {
            const solved = completedStepIds.includes(step.id);
            const active = step.id === currentStepId;
            const visitable = canVisitStep(progress, step.id, readOnly);
            return (
              <button
                key={step.id}
                type="button"
                disabled={!visitable}
                onClick={() => goToStep(step.id)}
                aria-current={active ? "step" : undefined}
                className={`min-h-12 rounded-xl border px-2 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CE1FF] ${
                  active
                    ? "border-[#5CE1FF]/55 bg-[#0A84C7]/20"
                    : solved
                      ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                      : visitable
                        ? "border-white/10 bg-white/[0.035] hover:border-white/20"
                        : "cursor-not-allowed border-white/[0.06] bg-black/10 opacity-45"
                }`}
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  {solved ? "Resuelto" : `Paso ${step.order}`}
                </span>
                <span className="mt-0.5 hidden text-xs font-semibold text-white sm:block">
                  {step.title}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#69dcf8]">
              {currentStep.eyebrow} · Paso {currentStep.order} de 3
            </p>
            <h3
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mt-2 font-heading text-xl font-bold text-white outline-none sm:text-2xl"
            >
              {currentStep.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{currentStep.statement}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold text-slate-300">
            {readOnly ? "Solo lectura" : `Guardado ${formatSavedTime(lastSavedAt)}`}
          </span>
        </div>

        <div className="mt-6">
          {currentDraft.stepId === "interpretation" && (
            <InterpretationStep
              step={currentStep}
              draft={currentDraft}
              disabled={readOnly || currentSolved}
              onChange={changeDraft}
            />
          )}
          {currentDraft.stepId === "blocks" && (
            <BlocksStep
              step={currentStep}
              draft={currentDraft}
              evaluation={currentEvaluation}
              disabled={readOnly || currentSolved}
              onChange={changeDraft}
            />
          )}
          {currentDraft.stepId === "faults" && (
            <FaultsStep
              draft={currentDraft}
              evaluation={currentEvaluation}
              disabled={readOnly || currentSolved}
              onChange={changeDraft}
            />
          )}
        </div>

        {currentEvaluation && <EvaluationBanner evaluation={currentEvaluation} />}
        <HintPanel
          hints={currentStep.hints}
          revealed={currentStepProgress.revealedHints}
          disabled={readOnly || currentSolved}
          onReveal={revealHint}
        />

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            disabled={!previousStepId}
            onClick={() => previousStepId && goToStep(previousStepId)}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-bold text-slate-300 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            ← Paso anterior
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            {!currentSolved && !readOnly && (
              <button
                type="button"
                disabled={!readyToSubmit}
                onClick={submitStep}
                className="min-h-11 rounded-xl bg-gradient-to-r from-[#0A84C7] to-[#16a9d5] px-5 text-xs font-bold text-white shadow-[0_10px_30px_rgba(10,132,199,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {currentStepId === "interpretation" ? "Guardar para revisión" : "Validar paso"}
              </button>
            )}
            {currentSolved && nextStepId && (
              <button
                type="button"
                onClick={() => goToStep(nextStepId)}
                className="min-h-11 rounded-xl border border-[#5CE1FF]/35 bg-[#0A84C7]/12 px-5 text-xs font-bold text-[#9cecff] transition hover:bg-[#0A84C7]/20"
              >
                Continuar →
              </button>
            )}
            {currentSolved && !nextStepId && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-xs font-bold text-emerald-200">
                  Reto completado ✓
                </span>
                {onExit && (
                  <button
                    type="button"
                    onClick={onExit}
                    className="min-h-11 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                  >
                    Volver al árbol
                  </button>
                )}
              </div>
            )}
          </div>
        </footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

function InterpretationStep({
  step,
  draft,
  disabled,
  onChange,
}: {
  step: E1AStepDefinition;
  draft: E1AInterpretationSubmission;
  disabled: boolean;
  onChange: (draft: E1AStepSubmission) => void;
}) {
  return (
    <div className="space-y-5">
      <ChallengeImage asset={step.asset} priority />
      <fieldset className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <legend className="sr-only">Tu lectura del esquema</legend>
        <p aria-hidden="true" className="text-sm font-bold text-white">Tu lectura del esquema</p>
        <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-300 sm:grid-cols-3">
          <PromptChip number="1" text="¿Qué hace el sistema?" />
          <PromptChip number="2" text="¿Cómo fluye la alimentación?" />
          <PromptChip number="3" text="¿Qué función cumple cada bloque?" />
        </div>
        <label className="mt-4 block">
          <span className="sr-only">Explicación completa del esquema</span>
          <textarea
            value={draft.response}
            disabled={disabled}
            onChange={(event) => onChange({ ...draft, response: event.target.value })}
            rows={8}
            placeholder="Describe el recorrido desde la fuente hasta los motores e identifica las ramas de comunicación e indicación…"
            className="w-full resize-y rounded-xl border border-white/10 bg-[#04131d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-[#5CE1FF]/55 focus:ring-2 focus:ring-[#0A84C7]/20 disabled:opacity-70"
          />
        </label>
        <p className="mt-2 text-[11px] text-slate-400">
          Se guarda automáticamente para el evaluador.
        </p>
      </fieldset>
    </div>
  );
}

function BlocksStep({
  step,
  draft,
  evaluation,
  disabled,
  onChange,
}: {
  step: E1AStepDefinition;
  draft: E1ABlocksSubmission;
  evaluation?: E1AStepEvaluation;
  disabled: boolean;
  onChange: (draft: E1AStepSubmission) => void;
}) {
  const assignedCount = E1A_BLOCKS.filter((block) => draft.assignments[block.id]).length;

  const assign = (blockId: (typeof E1A_BLOCKS)[number]["id"], functionId: E1AFunctionId) => {
    if (disabled) return;
    onChange({
      ...draft,
      assignments: { ...draft.assignments, [blockId]: functionId },
    });
  };

  return (
    <div className="space-y-5">
      <ChallengeImage asset={step.asset} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#69dcf8]">
              Componentes del plano
            </p>
            <h4 className="mt-1 text-base font-bold text-white">
              Elige la función principal de cada bloque
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Los nombres coinciden con el plano superior; no necesitas acertar por una zona invisible.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-[#04131d]/70 px-3 py-1.5 text-xs font-bold text-slate-300">
            {assignedCount} de {E1A_BLOCKS.length} asociados
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0A84C7] to-[#5CE1FF] transition-[width] duration-300"
            style={{ width: `${(assignedCount / E1A_BLOCKS.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {E1A_BLOCKS.map((block) => {
            const assignment = draft.assignments[block.id];
            const selectedFunction = E1A_FUNCTIONS.find((option) => option.id === assignment);
            const itemEvaluation = evaluation?.items.find((item) => item.itemId === block.id);

            return (
              <article
                key={block.id}
                className={`rounded-2xl border p-4 transition ${
                  itemEvaluation?.isCorrect
                    ? "border-emerald-400/25 bg-emerald-400/[0.055]"
                    : itemEvaluation
                      ? "border-amber-300/25 bg-amber-300/[0.045]"
                      : assignment
                        ? "border-[#5CE1FF]/25 bg-[#0A84C7]/[0.065]"
                        : "border-white/10 bg-[#04131d]/55"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#5CE1FF]/25 bg-[#0A84C7]/15 text-[10px] font-black text-[#8fe8ff]">
                    {block.shortLabel}
                  </span>
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-white">{block.componentName}</h5>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                      {block.componentDetail}
                    </p>
                  </div>
                </div>

                <label htmlFor={`e1a-function-${block.id}`} className="mt-4 block text-[11px] font-bold text-slate-300">
                  Función en el sistema
                </label>
                <select
                  id={`e1a-function-${block.id}`}
                  value={assignment ?? ""}
                  disabled={disabled}
                  onChange={(event) => assign(block.id, event.target.value as E1AFunctionId)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#061925] px-3 text-sm text-white outline-none transition focus:border-[#5CE1FF]/55 focus:ring-2 focus:ring-[#0A84C7]/20 disabled:opacity-70"
                >
                  <option value="" disabled>Selecciona una función</option>
                  {E1A_FUNCTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>

                {selectedFunction && (
                  <p className="mt-2 text-[11px] leading-4 text-slate-400">
                    {selectedFunction.description}
                  </p>
                )}
                {itemEvaluation && (
                  <p className={`mt-3 text-xs font-semibold ${itemEvaluation.isCorrect ? "text-emerald-200" : "text-amber-100"}`}>
                    {itemEvaluation.feedback}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {evaluation && !evaluation.isComplete && (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3 py-3 text-xs leading-5 text-amber-100">
            Resultado: {evaluation.score}/{evaluation.maxScore}. Las tarjetas marcan cuáles asociaciones debes revisar.
          </p>
        )}
      </section>
    </div>
  );
}

function FaultsStep({
  draft,
  evaluation,
  disabled,
  onChange,
}: {
  draft: E1AFaultsSubmission;
  evaluation?: E1AStepEvaluation;
  disabled: boolean;
  onChange: (draft: E1AStepSubmission) => void;
}) {
  const isCaseComplete = (caseId: E1AFaultCaseId) => {
    const faultCase = E1A_FAULT_CASES.find((item) => item.id === caseId);
    if (!faultCase) return false;
    const caseAnswers = draft.answers[caseId];
    return faultCase.questions.every((question) => {
      const answer = caseAnswers?.[question.id];
      if (question.kind === "open") return Boolean(answer?.text?.trim());
      return (answer?.selected ?? []).length > 0;
    });
  };

  const [activeCaseId, setActiveCaseId] = useState<E1AFaultCaseId>(
    E1A_FAULT_CASES.find((item) => !isCaseComplete(item.id))?.id ??
      E1A_FAULT_CASES[E1A_FAULT_CASES.length - 1].id
  );

  const faultCase = E1A_FAULT_CASES.find((item) => item.id === activeCaseId) ?? E1A_FAULT_CASES[0];
  const activeIndex = E1A_FAULT_CASES.findIndex((item) => item.id === activeCaseId);
  const caseAnswers = draft.answers[activeCaseId] ?? {};

  const updateQuestion = (questionId: string, next: E1AFaultQuestionAnswer) => {
    if (disabled) return;
    onChange({
      ...draft,
      answers: {
        ...draft.answers,
        [activeCaseId]: { ...caseAnswers, [questionId]: next },
      },
    });
  };

  const toggleOption = (question: E1AFaultQuestion, optionId: string) => {
    if (question.kind === "single") {
      updateQuestion(question.id, { selected: [optionId] });
      return;
    }
    const current = new Set(caseAnswers[question.id]?.selected ?? []);
    if (current.has(optionId)) current.delete(optionId);
    else current.add(optionId);
    updateQuestion(question.id, { selected: Array.from(current) });
  };

  const caseReady = isCaseComplete(activeCaseId);
  const allCasesReady = E1A_FAULT_CASES.every((item) => isCaseComplete(item.id));
  const canOpenCase = (index: number) =>
    index === 0 || E1A_FAULT_CASES.slice(0, index).every((item) => isCaseComplete(item.id));
  const nextCase = E1A_FAULT_CASES[activeIndex + 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Casos de diagnóstico">
        {E1A_FAULT_CASES.map((item, index) => {
          const complete = isCaseComplete(item.id);
          const available = canOpenCase(index);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === activeCaseId}
              disabled={!available}
              onClick={() => setActiveCaseId(item.id)}
              className={`min-h-14 rounded-xl border px-2 py-2 text-left transition ${
                item.id === activeCaseId
                  ? "border-[#5CE1FF]/55 bg-[#0A84C7]/18 text-white"
                  : complete
                    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
                    : available
                      ? "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20"
                      : "cursor-not-allowed border-white/[0.06] bg-black/10 text-slate-600"
              }`}
            >
              <span className="block text-[11px] font-bold text-white">
                {item.title}
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                {complete ? "Respondido" : "Sin resolver"}
              </span>
            </button>
          );
        })}
      </div>

      <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#69dcf8]">
            Diagnóstico {activeIndex + 1} de {E1A_FAULT_CASES.length}
          </p>
          <h4 className="mt-1 font-heading text-lg font-bold text-white">{faultCase.title}</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{faultCase.prompt}</p>
        </div>

        <div className="border-y border-white/10 bg-[#04131d] p-3 sm:p-5">
          <ChallengeImage asset={faultCase.asset} />
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          {faultCase.questions.map((question, qIndex) => {
            const answer = caseAnswers[question.id];
            const itemEvaluation = evaluation?.items.find(
              (item) => item.itemId === `${activeCaseId}:${question.id}`
            );
            return (
              <fieldset key={question.id}>
                <legend className="sr-only">{question.prompt}</legend>
                <p aria-hidden="true" className="text-sm font-bold text-white">
                  {qIndex + 1}. {question.prompt}
                </p>

                {question.kind === "open" && (
                  <textarea
                    value={answer?.text ?? ""}
                    disabled={disabled}
                    onChange={(event) => updateQuestion(question.id, { text: event.target.value })}
                    rows={4}
                    placeholder="Escribe tu respuesta…"
                    className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-[#04131d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-[#5CE1FF]/55 focus:ring-2 focus:ring-[#0A84C7]/20 disabled:opacity-70"
                  />
                )}

                {(question.kind === "single" || question.kind === "multiple") && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(question.options ?? []).map((option) => {
                      const selected = (answer?.selected ?? []).includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-3 text-xs leading-5 transition ${
                            selected
                              ? "border-[#5CE1FF]/45 bg-[#0A84C7]/15 text-white"
                              : "border-white/10 bg-[#04131d]/55 text-slate-300 hover:border-white/20"
                          } ${disabled ? "cursor-default opacity-70" : ""}`}
                        >
                          <input
                            type={question.kind === "single" ? "radio" : "checkbox"}
                            name={`fault-${activeCaseId}-${question.id}`}
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleOption(question, option.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#39C8F0]"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                )}

                {itemEvaluation && question.kind !== "open" && (
                  <p
                    className={`mt-3 rounded-xl border px-3 py-3 text-xs leading-5 ${
                      itemEvaluation.isCorrect
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
                        : "border-amber-300/20 bg-amber-300/[0.05] text-amber-100"
                    }`}
                  >
                    {itemEvaluation.feedback}
                  </p>
                )}
              </fieldset>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-400">
              {nextCase
                ? caseReady
                  ? "Caso respondido. Puedes continuar y volver después si quieres cambiarlo."
                  : "Responde todas las preguntas para abrir el siguiente caso."
                : allCasesReady
                  ? "Los tres casos están respondidos. Ahora valida el paso."
                  : "Completa las preguntas para terminar el diagnóstico."}
            </p>
            {nextCase && (
              <button
                type="button"
                disabled={!caseReady}
                onClick={() => setActiveCaseId(nextCase.id)}
                className="min-h-10 rounded-xl border border-[#5CE1FF]/30 bg-[#0A84C7]/12 px-4 text-xs font-bold text-[#9cecff] transition hover:bg-[#0A84C7]/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar al caso {activeIndex + 2} →
              </button>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function ChallengeImage({
  asset,
  priority = false,
}: {
  asset: E1AAsset;
  priority?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#04131d]">
      <a
        href={`${PUBLIC_BASE_PATH}${asset.src}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir el plano eléctrico en tamaño completo"
        className="block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#5CE1FF]"
      >
        <Image
          src={`${PUBLIC_BASE_PATH}${asset.src}`}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          priority={priority}
          className="h-auto w-full"
        />
      </a>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
        <span>Revisa el flujo completo de alimentación, control y retorno.</span>
        <a
          href={`${PUBLIC_BASE_PATH}${asset.src}`}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[#8fe8ff] underline decoration-[#5CE1FF]/35 underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CE1FF]"
        >
          Abrir plano completo ↗
        </a>
      </figcaption>
    </figure>
  );
}

function PromptChip({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-2 rounded-xl border border-white/[0.07] bg-[#04131d]/60 p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A84C7]/20 text-[10px] font-bold text-[#8fe8ff]">
        {number}
      </span>
      {text}
    </div>
  );
}

function HintPanel({
  hints,
  revealed,
  disabled,
  onReveal,
}: {
  hints: readonly string[];
  revealed: number;
  disabled: boolean;
  onReveal: () => void;
}) {
  return (
    <aside className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">¿Necesitas una pista?</h4>
          <p className="mt-1 text-xs text-slate-400">Se muestra en orden y queda registrada.</p>
        </div>
        {!disabled && revealed < hints.length && (
          <button
            type="button"
            onClick={onReveal}
            className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10"
          >
            Ver pista
          </button>
        )}
      </div>
      {revealed > 0 && (
        <p className="mt-4 rounded-xl border border-white/[0.07] bg-[#04131d]/55 px-3 py-3 text-xs leading-5 text-slate-300">
          {hints[0]}
        </p>
      )}
    </aside>
  );
}

function EvaluationBanner({ evaluation }: { evaluation: E1AStepEvaluation }) {
  return (
    <section
      aria-live="polite"
      className={`mt-5 rounded-2xl border p-4 ${
        evaluation.isComplete
          ? "border-emerald-400/30 bg-emerald-400/[0.08]"
          : "border-amber-300/25 bg-amber-300/[0.06]"
      }`}
    >
      <p className="text-sm font-bold text-white">
        {evaluation.isComplete ? "Paso resuelto" : "Ajusta y vuelve a validar"}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-300">{evaluation.feedback}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
        Resultado {evaluation.score}/{evaluation.maxScore}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
      <dt className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const validSaved = saved?.nodeId === "E1A" ? saved : undefined;
  const steps = Object.fromEntries(
    E1A_STEP_IDS.map((stepId) => [stepId, normalizeStepProgress(stepId, validSaved?.steps[stepId])])
  ) as Record<string, ChallengeStepProgress>;
  const solvedIds = getCompletedStepIdsFromSteps(steps);
  const fallback = E1A_STEP_IDS.find((stepId) => !solvedIds.includes(stepId)) ?? E1A_STEP_IDS[2];
  const savedCurrent = isStepId(validSaved?.currentStepId) ? validSaved.currentStepId : fallback;
  const firstIncomplete = E1A_STEP_IDS.indexOf(fallback);
  const safeCurrent =
    solvedIds.length === E1A_STEP_IDS.length || E1A_STEP_IDS.indexOf(savedCurrent) <= firstIncomplete
      ? savedCurrent
      : fallback;
  return {
    nodeId: "E1A",
    currentStepId: safeCurrent,
    shuffleSeed:
      typeof validSaved?.shuffleSeed === "number" && Number.isFinite(validSaved.shuffleSeed)
        ? validSaved.shuffleSeed
        : now % 2_147_483_647,
    startedAt:
      typeof validSaved?.startedAt === "number" && Number.isFinite(validSaved.startedAt)
        ? validSaved.startedAt
        : now,
    updatedAt:
      typeof validSaved?.updatedAt === "number" && Number.isFinite(validSaved.updatedAt)
        ? validSaved.updatedAt
        : now,
    completedAt:
      typeof validSaved?.completedAt === "number" && validSaved.completedAt > 0
        ? validSaved.completedAt
        : isE1AComplete(solvedIds)
          ? now
          : null,
    steps,
    analytics: buildAnalytics(validSaved?.analytics ?? {}, steps, "challenge_opened", safeCurrent),
  };
}

function normalizeStepProgress(
  stepId: E1AStepId,
  saved?: ChallengeStepProgress
): ChallengeStepProgress {
  const hintLimit = E1A_STEPS.find((step) => step.id === stepId)?.hints.length ?? 0;
  return {
    draft: toJsonValue(normalizeE1ASubmission(stepId, saved?.draft)),
    attempts: Array.isArray(saved?.attempts) ? saved.attempts : [],
    revealedHints:
      typeof saved?.revealedHints === "number"
        ? Math.max(0, Math.min(hintLimit, Math.floor(saved.revealedHints)))
        : 0,
    totalActiveSeconds:
      typeof saved?.totalActiveSeconds === "number"
        ? Math.max(0, Math.floor(saved.totalActiveSeconds))
        : 0,
    solvedAt:
      typeof saved?.solvedAt === "number" && Number.isFinite(saved.solvedAt) && saved.solvedAt > 0
        ? saved.solvedAt
        : null,
  };
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const result: EvaluationMap = {};
  for (const stepId of E1A_STEP_IDS) {
    const attempts = progress.steps[stepId]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt) continue;
    result[stepId] = evaluateE1AStep(normalizeE1ASubmission(stepId, lastAttempt.answer));
  }
  return result;
}

function canVisitStep(
  progress: NodeChallengeProgress,
  stepId: E1AStepId,
  readOnly: boolean
): boolean {
  if (readOnly) return true;
  const firstIncomplete = E1A_STEP_IDS.findIndex(
    (id) => !hasSolvedTimestamp(progress.steps[id])
  );
  return firstIncomplete === -1 || E1A_STEP_IDS.indexOf(stepId) <= firstIncomplete;
}

function getCompletedStepIds(progress: NodeChallengeProgress): E1AStepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(
  steps: Record<string, ChallengeStepProgress>
): E1AStepId[] {
  return E1A_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step?: ChallengeStepProgress): boolean {
  return (
    typeof step?.solvedAt === "number" &&
    Number.isFinite(step.solvedAt) &&
    step.solvedAt > 0
  );
}

function buildAnalytics(
  previous: NodeChallengeProgress["analytics"],
  steps: Record<string, ChallengeStepProgress>,
  event: string,
  stepId: E1AStepId,
  extras: Record<string, string | number | boolean> = {}
): NodeChallengeProgress["analytics"] {
  const solvedSteps = getCompletedStepIdsFromSteps(steps).length;
  return {
    ...previous,
    attemptsTotal: Object.values(steps).reduce((sum, step) => sum + step.attempts.length, 0),
    hintsTotal: Object.values(steps).reduce((sum, step) => sum + step.revealedHints, 0),
    totalActiveSeconds: Object.values(steps).reduce(
      (sum, step) => sum + step.totalActiveSeconds,
      0
    ),
    solvedSteps,
    completionPercent: Math.round((solvedSteps / E1A_STEP_IDS.length) * 100),
    currentStepOrder: E1A_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function toStepId(value: string): E1AStepId {
  return isStepId(value) ? value : "interpretation";
}

function isStepId(value: unknown): value is E1AStepId {
  return typeof value === "string" && E1A_STEP_IDS.includes(value as E1AStepId);
}

function stepTitle(stepId: E1AStepId): string {
  return E1A_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function formatSavedTime(timestamp: number): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export default E1AChallenge;
