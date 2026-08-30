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
  E0_CHALLENGE,
  E0_STEP_IDS,
  E0_STEPS,
  evaluateE0Step,
  getDeterministicChoiceOptions,
  getDeterministicSymbolLabels,
  isE0Complete,
  type E0ChoiceOption,
  type E0CurrentSubmission,
  type E0CurrentUnit,
  type E0MatchingQuestion,
  type E0OhmPowerSubmission,
  type E0PolaritySubmission,
  type E0PowerUnit,
  type E0SingleChoiceQuestion,
  type E0StepDefinition,
  type E0StepEvaluation,
  type E0StepId,
  type E0StepSubmission,
  type E0SymbolId,
  type E0SymbolsSubmission,
  type E0VoltageSubmission,
} from "@/lib/challenges/electronics/e0";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";
import { E0SymbolIcon } from "./E0SymbolIcon";

export interface E0ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<E0StepId, E0StepEvaluation>>;

const SYMBOL_QUESTION = E0_STEPS[4].questions[0] as E0MatchingQuestion;
const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SYMBOL_IDS = SYMBOL_QUESTION.pairs.map((pair) => pair.symbolId);

export function E0Challenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E0ChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() =>
    createInitialProgress(savedProgress)
  );
  const [evaluations, setEvaluations] = useState<EvaluationMap>(() =>
    deriveEvaluations(createInitialProgress(savedProgress))
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    savedProgress?.updatedAt ?? progress.updatedAt
  );
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(progress.completedAt));
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef<E0StepId>(toStepId(progress.currentStepId));
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

      const elapsedMs =
        activeRemainderMsRef.current + Math.max(0, now - startedAt);
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
        analytics: buildAnalytics(
          timed.analytics,
          timed.steps,
          event,
          stepId
        ),
      };

      progressRef.current = next;
      if (updateView) {
        setProgress(next);
        setLastSavedAt(now);
      }
      onSaveRef.current(next);
      return next;
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
      if (progressRef.current.completedAt || activeStartedAtRef.current !== null) return;
      const now = Date.now();
      activeStepIdRef.current = toStepId(progressRef.current.currentStepId);
      activeStartedAtRef.current = now;
    };
    const pauseClock = (event: string, updateView: boolean) => {
      if (activeStartedAtRef.current === null) return;
      persistActiveCheckpoint(event, updateView);
      activeStartedAtRef.current = null;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseClock("visibility_hidden", true);
      } else {
        resumeClock();
      }
    };
    const handlePageHide = () => pauseClock("page_hidden", false);
    if (document.visibilityState === "visible") resumeClock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      pauseClock("challenge_closed", false);
    };
  }, [persistActiveCheckpoint, progress.completedAt, readOnly]);

  const currentStepId = toStepId(progress.currentStepId);
  const currentStep = E0_STEPS.find((step) => step.id === currentStepId) ?? E0_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as E0StepSubmission;
  const currentEvaluation = evaluations[currentStepId];
  const completedStepIds = getCompletedStepIds(progress);
  const completedCount = completedStepIds.length;
  const currentIndex = E0_STEP_IDS.indexOf(currentStepId);
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

  const changeDraft = (draft: E0StepSubmission) => {
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
        analytics: buildAnalytics(
          current.analytics,
          steps,
          "answer_changed",
          currentStepId
        ),
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

    const nextHintNumber = currentStepProgress.revealedHints + 1;
    commit((current) => {
      const now = Date.now();
      const steps = {
        ...current.steps,
        [currentStepId]: {
          ...current.steps[currentStepId],
          revealedHints: nextHintNumber,
        },
      };

      return {
        ...current,
        steps,
        updatedAt: now,
        analytics: buildAnalytics(
          current.analytics,
          steps,
          "hint_revealed",
          currentStepId,
          { lastHintNumber: nextHintNumber }
        ),
      };
    });
    setAnnouncement(`Pista ${nextHintNumber} disponible.`);
  };

  const submitStep = () => {
    if (readOnly || currentSolved || !isDraftReady(currentDraft)) return;

    const submission: E0StepSubmission =
      currentDraft.stepId === "symbols"
        ? {
            ...currentDraft,
            attemptNumber: currentStepProgress.attempts.length + 1,
          }
        : currentDraft;
    const evaluation = evaluateE0Step(submission);
    const now = Date.now();
    let completedChallenge = false;

    const finalProgress = commit((current) => {
      const timedCurrent = consumeActiveTime(current, now);
      const previousStep = timedCurrent.steps[currentStepId];
      const attemptNumber = previousStep.attempts.length + 1;
      const previousAttemptSeconds = previousStep.attempts.reduce(
        (total, attempt) => total + attempt.durationSeconds,
        0
      );
      const durationSeconds = Math.max(
        0,
        previousStep.totalActiveSeconds - previousAttemptSeconds
      );
      const attempt: ChallengeAttempt = {
        id: `E0-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "E0",
        stepId: currentStepId,
        attemptNumber,
        startedAt: now - durationSeconds * 1_000,
        submittedAt: now,
        durationSeconds,
        answer: toJsonValue(submission),
        isCorrect: evaluation.isComplete,
        hintsUsed: previousStep.revealedHints,
        score: evaluation.score,
        metadata: {
          maxScore: evaluation.maxScore,
          correctItems: evaluation.items.filter((item) => item.isCorrect).length,
          ...evaluation.metadata,
        },
      };
      const steps = {
        ...timedCurrent.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(submission),
          attempts: [...previousStep.attempts, attempt],
          solvedAt:
            evaluation.isComplete && previousStep.solvedAt === null
              ? now
              : previousStep.solvedAt,
        },
      };
      const solvedIds = getCompletedStepIdsFromSteps(steps);
      completedChallenge = isE0Complete(solvedIds);
      const analyticsExtras: Record<string, string | number | boolean> = {
        lastAttemptNumber: attemptNumber,
        lastAttemptScore: evaluation.score,
        lastAttemptMaxScore: evaluation.maxScore,
        lastAttemptCorrect: evaluation.isComplete,
      };

      if (currentStepId === "current") {
        const choseMisconception =
          evaluation.metadata?.currentSourceMisconception === true;
        const understoodCapacity =
          evaluation.metadata?.sourceCapacityUnderstood === true;
        const wasDetected =
          timedCurrent.analytics.currentSourceMisconceptionDetected === true;
        analyticsExtras.currentSourceMisconceptionDetected =
          wasDetected || choseMisconception;
        analyticsExtras.currentSourceMisconceptionCorrected =
          timedCurrent.analytics.currentSourceMisconceptionCorrected === true ||
          (wasDetected && understoodCapacity);
      }

      return {
        ...timedCurrent,
        steps,
        updatedAt: now,
        completedAt: completedChallenge ? timedCurrent.completedAt ?? now : null,
        analytics: buildAnalytics(
          timedCurrent.analytics,
          steps,
          evaluation.isComplete ? "step_solved" : "attempt_submitted",
          currentStepId,
          analyticsExtras
        ),
      };
    });

    setEvaluations((current) => ({ ...current, [currentStepId]: evaluation }));
    setAnnouncement(evaluation.feedback);

    if (completedChallenge && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(finalProgress);
    }
  };

  const goToStep = (stepId: E0StepId) => {
    if (stepId === currentStepId || !canVisitStep(progress, stepId, readOnly)) return;

    if (readOnly) {
      const next = { ...progressRef.current, currentStepId: stepId };
      progressRef.current = next;
      setProgress(next);
    } else {
      commit((current) => {
        const now = Date.now();
        const timedCurrent = consumeActiveTime(current, now);
        activeStepIdRef.current = stepId;
        activeStartedAtRef.current = now;
        return {
          ...timedCurrent,
          currentStepId: stepId,
          updatedAt: now,
          analytics: buildAnalytics(
            timedCurrent.analytics,
            timedCurrent.steps,
            "step_navigated",
            stepId
          ),
        };
      });
    }
    setAnnouncement(`Paso ${E0_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const nextStepId = E0_STEP_IDS[currentIndex + 1];
  const previousStepId = E0_STEP_IDS[currentIndex - 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#0A84C7]/25 bg-[#061925] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(10,132,199,0.24),transparent_45%),linear-gradient(135deg,#09283a,#071b28)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#39C8F0]/30 bg-[#39C8F0]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8FE8FF]">
                E0 · Fundamentos
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2 id="skill-detail-title" className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {E0_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {E0_CHALLENGE.introduction}
            </p>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Pistas" value={totalHints} />
            <Stat label="Tiempo" value={formatDuration(totalSeconds)} />
          </dl>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-white">
              Paso {currentStep.order} de {E0_CHALLENGE.totalSteps}
            </span>
            <span className="text-slate-400">
              {completedCount}/5 resueltos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto E0"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={currentStep.order}
            aria-valuetext={`Paso ${currentStep.order} de 5; ${completedCount} pasos resueltos`}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0A84C7] to-[#39C8F0] transition-[width] duration-500"
              style={{ width: `${currentStep.order * 20}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Pasos del reto de fundamentos eléctricos"
        className="border-b border-white/10 bg-[#071c29] px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {E0_STEPS.map((step) => {
            const solved = hasSolvedTimestamp(progress.steps[step.id]);
            const selected = step.id === currentStepId;
            const accessible = canVisitStep(progress, step.id, readOnly);

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={!accessible}
                  aria-current={selected ? "step" : undefined}
                  aria-label={`Paso ${step.order}: ${step.title}${solved ? ", resuelto" : accessible ? "" : ", bloqueado"}`}
                  className={`group flex min-h-14 w-full items-center gap-2 rounded-xl border px-2 text-left transition sm:px-3 ${
                    selected
                      ? "border-[#39C8F0]/55 bg-[#0A84C7]/18 text-white"
                      : solved
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100 hover:bg-emerald-400/10"
                        : accessible
                          ? "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                          : "cursor-not-allowed border-transparent bg-transparent text-slate-600"
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      solved
                        ? "bg-emerald-400/15 text-emerald-300"
                        : selected
                          ? "bg-[#39C8F0]/15 text-[#8FE8FF]"
                          : "bg-white/5"
                    }`}
                    aria-hidden="true"
                  >
                    {solved ? <CheckIcon /> : step.order}
                  </span>
                  <span className="hidden min-w-0 text-[11px] font-semibold leading-4 sm:block lg:text-xs">
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#64D8F6]">
            {currentStep.eyebrow}
          </p>
          <h3
            ref={stepHeadingRef}
            tabIndex={-1}
            className="mt-2 font-heading text-2xl font-semibold text-white outline-none"
          >
            {currentStep.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {currentStep.statement}
          </p>
        </header>

        <div className="space-y-6">
          {currentStepId !== "symbols" && <StepVisual step={currentStep} />}

          <div className="min-w-0">
            <StepForm
              step={currentStep}
              draft={currentDraft}
              evaluation={currentEvaluation}
              seed={progress.shuffleSeed}
              disabled={readOnly || currentSolved}
              onChange={changeDraft}
            />

            {currentEvaluation && (
              <EvaluationBanner evaluation={currentEvaluation} />
            )}

            <HintPanel
              hints={currentStep.hints}
              revealed={currentStepProgress.revealedHints}
              disabled={readOnly || currentSolved}
              onReveal={revealHint}
            />
          </div>
        </div>

        <footer className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {previousStepId && canVisitStep(progress, previousStepId, readOnly) ? (
              <button
                type="button"
                onClick={() => goToStep(previousStepId)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
              >
                <ArrowLeftIcon />
                Paso anterior
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                Los pasos se habilitan en orden.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {!currentSolved && !readOnly && (
              <button
                type="button"
                onClick={submitStep}
                disabled={!isDraftReady(currentDraft)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6FAD] to-[#0A84C7] px-6 text-sm font-bold text-white shadow-[0_12px_32px_rgba(10,132,199,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(10,132,199,0.34)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7DE4FF]"
              >
                {currentStepProgress.attempts.length > 0
                  ? "Comprobar de nuevo"
                  : "Comprobar respuestas"}
                <SparkIcon />
              </button>
            )}

            {currentSolved && nextStepId && (
              <button
                type="button"
                onClick={() => goToStep(nextStepId)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087F68] to-[#0A9A7E] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(10,154,126,0.22)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Continuar al paso {currentStep.order + 1}
                <ArrowRightIcon />
              </button>
            )}

            {currentSolved && !nextStepId && (
              <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 text-sm font-bold text-emerald-200">
                <CheckIcon />
                Reto E0 completado
              </div>
            )}

            {readOnly && !currentSolved && (
              <p className="text-xs text-slate-400">
                Este paso aún no tiene una solución registrada.
              </p>
            )}
          </div>
        </footer>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}

function StepForm({
  step,
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  step: E0StepDefinition;
  draft: E0StepSubmission;
  evaluation?: E0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: E0StepSubmission) => void;
}) {
  if (step.id === "voltage" && draft.stepId === "voltage") {
    return (
      <ChoiceSetForm
        step={step}
        draft={draft}
        evaluation={evaluation}
        seed={seed}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (step.id === "current" && draft.stepId === "current") {
    return (
      <ChoiceSetForm
        step={step}
        draft={draft}
        evaluation={evaluation}
        seed={seed}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (step.id === "polarity" && draft.stepId === "polarity") {
    return (
      <PolarityForm
        step={step}
        draft={draft}
        evaluation={evaluation}
        seed={seed}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (step.id === "ohm-power" && draft.stepId === "ohm-power") {
    return (
      <OhmPowerForm
        step={step}
        draft={draft}
        evaluation={evaluation}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (step.id === "symbols" && draft.stepId === "symbols") {
    return (
      <SymbolsForm
        draft={draft}
        evaluation={evaluation}
        seed={seed}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  return null;
}

function ChoiceSetForm({
  step,
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  step: E0StepDefinition;
  draft: E0VoltageSubmission | E0CurrentSubmission;
  evaluation?: E0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: E0StepSubmission) => void;
}) {
  const questions = step.questions.filter(
    (question): question is E0SingleChoiceQuestion =>
      question.type === "single_choice"
  );

  const setAnswer = (questionId: string, optionId: string) => {
    onChange({
      ...draft,
      answers: { ...draft.answers, [questionId]: optionId },
    } as E0VoltageSubmission | E0CurrentSubmission);
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const itemEvaluation = evaluation?.items.find(
          (item) => item.questionId === question.id
        );
        const options = getDeterministicChoiceOptions(question.id, seed);

        return (
          <fieldset
            key={question.id}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
          >
            <legend className="sr-only">
              Pregunta {index + 1}: {question.prompt}
            </legend>
            <p className="text-sm font-semibold leading-6 text-white">
              <span className="mr-2 text-[#64D8F6]">{index + 1}.</span>
              {question.prompt}
            </p>
            <div className="mt-4 space-y-2.5">
              {options.map((option) => (
                <ChoiceRow
                  key={option.id}
                  type="radio"
                  name={question.id}
                  option={option}
                  checked={draft.answers[question.id as keyof typeof draft.answers] === option.id}
                  disabled={disabled}
                  onChange={() => setAnswer(question.id, option.id)}
                />
              ))}
            </div>
            {itemEvaluation && <ItemFeedback evaluation={itemEvaluation} />}
          </fieldset>
        );
      })}
    </div>
  );
}

function PolarityForm({
  step,
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  step: E0StepDefinition;
  draft: E0PolaritySubmission;
  evaluation?: E0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: E0StepSubmission) => void;
}) {
  const multipleQuestion = step.questions.find(
    (question) => question.type === "multiple_choice"
  );
  const ledQuestion = step.questions.find(
    (question): question is E0SingleChoiceQuestion =>
      question.type === "single_choice"
  );

  if (!multipleQuestion || !ledQuestion) return null;

  const toggleComponent = (id: string) => {
    const selected = new Set(draft.sensitiveComponentIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    onChange({ ...draft, sensitiveComponentIds: [...selected] });
  };

  return (
    <div className="space-y-4">
      <fieldset className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <legend className="sr-only">
          Pregunta 1: {multipleQuestion.prompt}
        </legend>
        <p className="text-sm font-semibold leading-6 text-white">
          1. {multipleQuestion.prompt}
        </p>
        <p className="mt-2 text-xs text-slate-400">Puedes elegir más de una opción.</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {multipleQuestion.options.map((option) => (
            <ChoiceRow
              key={option.id}
              type="checkbox"
              name={multipleQuestion.id}
              option={option}
              checked={draft.sensitiveComponentIds.includes(option.id)}
              disabled={disabled}
              onChange={() => toggleComponent(option.id)}
            />
          ))}
        </div>
        {evaluation?.items[0] && <ItemFeedback evaluation={evaluation.items[0]} />}
      </fieldset>

      <fieldset className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <legend className="sr-only">
          Pregunta 2: {ledQuestion.prompt}
        </legend>
        <p className="text-sm font-semibold leading-6 text-white">
          2. {ledQuestion.prompt}
        </p>
        <div className="mt-4 space-y-2.5">
          {getDeterministicChoiceOptions(ledQuestion.id, seed).map((option) => (
            <ChoiceRow
              key={option.id}
              type="radio"
              name={ledQuestion.id}
              option={option}
              checked={draft.invertedLedOptionId === option.id}
              disabled={disabled}
              onChange={() => onChange({ ...draft, invertedLedOptionId: option.id })}
            />
          ))}
        </div>
        {evaluation?.items[1] && <ItemFeedback evaluation={evaluation.items[1]} />}
      </fieldset>
    </div>
  );
}

function OhmPowerForm({
  step,
  draft,
  evaluation,
  disabled,
  onChange,
}: {
  step: E0StepDefinition;
  draft: E0OhmPowerSubmission;
  evaluation?: E0StepEvaluation;
  disabled: boolean;
  onChange: (draft: E0StepSubmission) => void;
}) {
  const questions = step.questions.filter(
    (question) => question.type === "numeric"
  );

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const isCurrent = question.quantity === "current";
        const answer = isCurrent ? draft.current : draft.power;
        const evaluationItem = evaluation?.items.find(
          (item) => item.questionId === question.id
        );

        return (
          <div
            key={question.id}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
          >
            <label
              htmlFor={`E0-${question.id}`}
              className="block text-sm font-semibold leading-6 text-white"
            >
              <span className="mr-2 text-[#64D8F6]">{index + 1}.</span>
              {question.prompt}
            </label>
            <p className="mt-1 font-mono text-xs text-slate-400">{question.formula}</p>
            <div className="mt-4 flex gap-2">
              <input
                id={`E0-${question.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={answer?.value ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  if (isCurrent) {
                    onChange({
                      ...draft,
                      current: {
                        value: event.target.value,
                        unit: draft.current?.unit ?? "mA",
                      },
                    });
                  } else {
                    onChange({
                      ...draft,
                      power: {
                        value: event.target.value,
                        unit: draft.power?.unit ?? "W",
                      },
                    });
                  }
                }}
                aria-describedby={`E0-${question.id}-help`}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#04131d] px-3 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#39C8F0]/60 focus:ring-2 focus:ring-[#39C8F0]/15 disabled:opacity-65"
                placeholder={isCurrent ? "Ej. 120" : "Ej. 1,5"}
              />
              <select
                aria-label={`Unidad de ${question.quantity === "current" ? "corriente" : "potencia"}`}
                value={answer?.unit ?? (isCurrent ? "mA" : "W")}
                disabled={disabled}
                onChange={(event) => {
                  if (isCurrent) {
                    onChange({
                      ...draft,
                      current: {
                        value: draft.current?.value ?? "",
                        unit: event.target.value as E0CurrentUnit,
                      },
                    });
                  } else {
                    onChange({
                      ...draft,
                      power: {
                        value: draft.power?.value ?? "",
                        unit: event.target.value as E0PowerUnit,
                      },
                    });
                  }
                }}
                className="rounded-xl border border-white/15 bg-[#092231] px-3 text-sm font-bold text-white outline-none focus:border-[#39C8F0]/60 focus:ring-2 focus:ring-[#39C8F0]/15 disabled:opacity-65"
              >
                {question.acceptedUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <p id={`E0-${question.id}-help`} className="mt-2 text-xs leading-5 text-slate-400">
              Se acepta punto o coma decimal y cualquiera de las unidades disponibles.
            </p>
            {evaluationItem && <ItemFeedback evaluation={evaluationItem} />}
          </div>
        );
      })}
    </div>
  );
}

function SymbolsForm({
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  draft: E0SymbolsSubmission;
  evaluation?: E0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: E0StepSubmission) => void;
}) {
  const [draggedSymbol, setDraggedSymbol] = useState<E0SymbolId | null>(null);
  const labels = useMemo(() => getDeterministicSymbolLabels(seed), [seed]);

  const assign = (symbolId: E0SymbolId, labelId: E0SymbolId | "") => {
    if (disabled) return;
    const matches = { ...draft.matches };

    for (const existingSymbol of SYMBOL_IDS) {
      if (matches[existingSymbol] === labelId) delete matches[existingSymbol];
    }

    if (labelId) matches[symbolId] = labelId;
    else delete matches[symbolId];
    onChange({ ...draft, matches });
  };

  const assignedSymbolFor = (labelId: E0SymbolId) =>
    SYMBOL_IDS.find((symbolId) => draft.matches[symbolId] === labelId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#39C8F0]/20 bg-[#0A84C7]/[0.07] px-4 py-3 text-xs leading-5 text-slate-300">
        <strong className="text-white">Cómo relacionar:</strong> arrastra una figura hasta su nombre en escritorio. Con teclado o en móvil, usa el selector debajo de cada figura. Un nombre solo puede pertenecer a un símbolo.
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]">
        <section aria-labelledby="symbol-figures-title">
          <h4 id="symbol-figures-title" className="text-xs font-bold uppercase tracking-[0.16em] text-[#64D8F6]">
            Figuras
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SYMBOL_QUESTION.pairs.map((pair, index) => {
              const itemEvaluation = evaluation?.items.find(
                (item) => item.questionId === `symbol-matching:${pair.symbolId}`
              );
              const selectedLabel = labels.find(
                (label) => label.labelId === draft.matches[pair.symbolId]
              );

              return (
                <article
                  key={pair.symbolId}
                  draggable={!disabled}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/e0-symbol", pair.symbolId);
                    setDraggedSymbol(pair.symbolId);
                  }}
                  onDragEnd={() => setDraggedSymbol(null)}
                  className={`rounded-2xl border p-3 transition ${
                    draggedSymbol === pair.symbolId
                      ? "border-[#39C8F0]/70 bg-[#39C8F0]/10 opacity-75"
                      : itemEvaluation
                        ? itemEvaluation.isCorrect
                          ? "border-emerald-400/35 bg-emerald-400/[0.07]"
                          : "border-rose-400/35 bg-rose-400/[0.06]"
                        : "border-white/10 bg-white/[0.035]"
                  } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Figura {index + 1}
                    </span>
                    {selectedLabel && (
                      <span className="max-w-28 truncate rounded-full bg-[#39C8F0]/10 px-2 py-1 text-[10px] font-semibold text-[#8FE8FF]">
                        {selectedLabel.label}
                      </span>
                    )}
                  </div>
                  <div
                    role="img"
                    aria-label={`Figura ${index + 1}. ${pair.visualDescription}`}
                    className="mt-2 flex min-h-24 items-center justify-center rounded-xl border border-white/[0.07] bg-[#04131d] text-[#8FE8FF]"
                  >
                    <E0SymbolIcon symbolId={pair.symbolId} />
                  </div>
                  <p className="mt-2 min-h-10 text-[11px] leading-5 text-slate-400">
                    {pair.visualDescription}
                  </p>
                  <label className="mt-2 block text-[11px] font-semibold text-slate-300">
                    Nombre del símbolo
                    <select
                      value={draft.matches[pair.symbolId] ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        assign(pair.symbolId, event.target.value as E0SymbolId | "")
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-[#092231] px-3 text-xs text-white outline-none focus:border-[#39C8F0]/60 focus:ring-2 focus:ring-[#39C8F0]/15 disabled:opacity-65"
                    >
                      <option value="">Selecciona un nombre</option>
                      {labels.map((label) => (
                        <option key={label.labelId} value={label.labelId}>
                          {label.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {itemEvaluation && (
                    <p
                      className={`mt-2 text-[11px] font-semibold ${
                        itemEvaluation.isCorrect ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {itemEvaluation.isCorrect ? "Asociación correcta" : "Revisa esta asociación"}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="symbol-labels-title">
          <h4 id="symbol-labels-title" className="text-xs font-bold uppercase tracking-[0.16em] text-[#64D8F6]">
            Nombres · zonas para soltar
          </h4>
          <div className="mt-3 space-y-2.5">
            {labels.map((label) => {
              const assignedSymbol = assignedSymbolFor(label.labelId);
              return (
                <div
                  key={label.labelId}
                  onDragOver={(event) => {
                    if (disabled) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const symbolId = event.dataTransfer.getData(
                      "text/e0-symbol"
                    ) as E0SymbolId;
                    if (SYMBOL_IDS.includes(symbolId)) assign(symbolId, label.labelId);
                    setDraggedSymbol(null);
                  }}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2 transition ${
                    draggedSymbol
                      ? "border-[#39C8F0]/60 bg-[#39C8F0]/10"
                      : assignedSymbol
                        ? "border-[#0A84C7]/35 bg-[#0A84C7]/10"
                        : "border-white/15 bg-white/[0.025]"
                  }`}
                >
                  <span className="text-xs font-semibold text-white">{label.label}</span>
                  <span className="text-right text-[10px] text-slate-400">
                    {assignedSymbol
                      ? `Figura ${SYMBOL_IDS.indexOf(assignedSymbol) + 1}`
                      : "Suelta una figura"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            Primer intento: necesitas al menos 7 de 9. Si reintentas, deberás completar las 9 asociaciones.
          </p>
        </section>
      </div>
    </div>
  );
}

function StepVisual({ step }: { step: E0StepDefinition }) {
  if (step.id === "ohm-power") return <OhmPowerDiagram />;

  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#04131d]">
      <Image
        src={`${PUBLIC_BASE_PATH}${step.asset.src}`}
        alt={step.asset.alt}
        width={1600}
        height={900}
        priority={step.order === 1}
        className="h-auto w-full"
      />
      <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400">
        Usa el diagrama como referencia y registra tus decisiones en las tarjetas de abajo.
      </figcaption>
    </figure>
  );
}

function OhmPowerDiagram() {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#071c29] p-5 sm:p-6">
      <div className="rounded-2xl border border-[#39C8F0]/20 bg-[#04131d] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-xl border border-[#0A84C7]/45 bg-[#0A84C7]/10 px-4 py-3 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fuente DC</span>
            <strong className="mt-1 block font-heading text-2xl text-white">5 V</strong>
          </div>
          <div className="relative h-1 flex-1 bg-[#39C8F0]/65" aria-hidden="true">
            <span className="absolute -right-1 -top-1.5 h-4 w-4 rotate-45 border-r-2 border-t-2 border-[#39C8F0]" />
          </div>
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Resistencia</span>
            <strong className="mt-1 block font-heading text-2xl text-white">100 Ω</strong>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <FormulaCard label="Corriente" formula="I = V / R" />
          <FormulaCard label="Potencia" formula="P = V × I" />
        </div>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-slate-400">
        Calcula primero la corriente. Después usa ese valor para hallar la potencia que disipa la resistencia.
      </figcaption>
    </figure>
  );
}

function FormulaCard({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <strong className="mt-1 block font-mono text-sm text-[#8FE8FF]">{formula}</strong>
    </div>
  );
}

function ChoiceRow({
  type,
  name,
  option,
  checked,
  disabled,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  option: E0ChoiceOption;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-xs leading-5 transition sm:text-sm ${
        checked
          ? "border-[#39C8F0]/45 bg-[#0A84C7]/12 text-white"
          : "border-white/10 bg-[#04131d]/65 text-slate-300 hover:border-white/20"
      } ${disabled ? "cursor-default opacity-75" : ""}`}
    >
      <input
        type={type}
        name={name}
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#39C8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
      />
      <span>{option.label}</span>
    </label>
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
          <p className="mt-1 text-xs text-slate-400">
            Se muestran en orden y quedan registradas en tu proceso.
          </p>
        </div>
        {!disabled && revealed < hints.length && (
          <button
            type="button"
            onClick={onReveal}
            className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Ver pista
          </button>
        )}
      </div>
      {revealed > 0 && (
        <ol className="mt-4 space-y-2">
          {hints.slice(0, revealed).map((hint, index) => (
            <li
              key={hint}
              className="flex gap-3 rounded-xl border border-white/[0.07] bg-[#04131d]/55 px-3 py-3 text-xs leading-5 text-slate-300"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-[10px] font-bold text-amber-200">
                {index + 1}
              </span>
              {hint}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function EvaluationBanner({ evaluation }: { evaluation: E0StepEvaluation }) {
  return (
    <section
      aria-live="polite"
      className={`mt-5 rounded-2xl border p-4 ${
        evaluation.isComplete
          ? "border-emerald-400/30 bg-emerald-400/[0.08]"
          : "border-amber-300/25 bg-amber-300/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            evaluation.isComplete
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-amber-300/10 text-amber-200"
          }`}
          aria-hidden="true"
        >
          {evaluation.isComplete ? <CheckIcon /> : <RefreshIcon />}
        </span>
        <div>
          <p className="text-sm font-bold text-white">
            {evaluation.isComplete ? "Paso resuelto" : "Buen intento: puedes ajustar"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{evaluation.feedback}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Resultado: {evaluation.score}/{evaluation.maxScore}
          </p>
        </div>
      </div>
    </section>
  );
}

function ItemFeedback({
  evaluation,
}: {
  evaluation: E0StepEvaluation["items"][number];
}) {
  return (
    <p
      className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
        evaluation.isCorrect
          ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
          : "border-amber-300/20 bg-amber-300/[0.05] text-amber-100"
      }`}
    >
      <strong>{evaluation.isCorrect ? "Correcto. " : "Revisa. "}</strong>
      {evaluation.feedback}
    </p>
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
  const steps = Object.fromEntries(
    E0_STEP_IDS.map((stepId) => {
      const savedStep = saved?.nodeId === "E0" ? saved.steps?.[stepId] : undefined;
      return [stepId, normalizeStepProgress(stepId, savedStep)];
    })
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIdsFromSteps(steps);
  const fallbackCurrent =
    E0_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ?? E0_STEP_IDS[4];
  const savedCurrent = saved?.currentStepId;
  const firstIncompleteIndex = E0_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isStepId(savedCurrent)
    ? E0_STEP_IDS.indexOf(savedCurrent)
    : -1;
  const safeCurrent =
    isStepId(savedCurrent) &&
    (completedIds.length === E0_STEP_IDS.length || savedCurrentIndex <= firstIncompleteIndex)
      ? savedCurrent
      : fallbackCurrent;

  return {
    nodeId: "E0",
    currentStepId: safeCurrent,
    shuffleSeed:
      typeof saved?.shuffleSeed === "number" && Number.isFinite(saved.shuffleSeed)
        ? saved.shuffleSeed
        : now % 2_147_483_647,
    startedAt:
      typeof saved?.startedAt === "number" && Number.isFinite(saved.startedAt)
        ? saved.startedAt
        : now,
    updatedAt:
      typeof saved?.updatedAt === "number" && Number.isFinite(saved.updatedAt)
        ? saved.updatedAt
        : now,
    completedAt:
      typeof saved?.completedAt === "number" && Number.isFinite(saved.completedAt)
        ? saved.completedAt
        : isE0Complete(completedIds)
          ? now
          : null,
    steps,
    analytics: buildAnalytics(
      saved?.nodeId === "E0" ? saved.analytics : {},
      steps,
      "challenge_opened",
      safeCurrent
    ),
  };
}

function normalizeStepProgress(
  stepId: E0StepId,
  saved?: ChallengeStepProgress
): ChallengeStepProgress {
  const hintLimit =
    E0_STEPS.find((step) => step.id === stepId)?.hints.length ?? 0;

  return {
    draft: toJsonValue(normalizeDraft(stepId, saved?.draft)),
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
      typeof saved?.solvedAt === "number" && Number.isFinite(saved.solvedAt)
        ? saved.solvedAt
        : null,
  };
}

function normalizeDraft(stepId: E0StepId, raw: unknown): E0StepSubmission {
  const record = isRecord(raw) ? raw : {};

  if (stepId === "voltage") {
    return {
      stepId,
      answers: stringMap(record.answers),
    } as E0VoltageSubmission;
  }

  if (stepId === "current") {
    return {
      stepId,
      answers: stringMap(record.answers),
    } as E0CurrentSubmission;
  }

  if (stepId === "polarity") {
    return {
      stepId,
      sensitiveComponentIds: Array.isArray(record.sensitiveComponentIds)
        ? record.sensitiveComponentIds.filter(
            (item): item is string => typeof item === "string"
          )
        : [],
      invertedLedOptionId:
        typeof record.invertedLedOptionId === "string"
          ? record.invertedLedOptionId
          : undefined,
    };
  }

  if (stepId === "ohm-power") {
    const current = isRecord(record.current) ? record.current : undefined;
    const power = isRecord(record.power) ? record.power : undefined;
    return {
      stepId,
      current:
        current && isNumericValue(current.value)
          ? {
              value: current.value,
              unit: current.unit === "A" ? "A" : "mA",
            }
          : undefined,
      power:
        power && isNumericValue(power.value)
          ? {
              value: power.value,
              unit: power.unit === "mW" ? "mW" : "W",
            }
          : undefined,
    };
  }

  const rawMatches = stringMap(record.matches);
  const matches: Partial<Record<E0SymbolId, E0SymbolId>> = {};
  for (const symbolId of SYMBOL_IDS) {
    const labelId = rawMatches[symbolId];
    if (isSymbolId(labelId)) matches[symbolId] = labelId;
  }
  return {
    stepId: "symbols",
    attemptNumber:
      typeof record.attemptNumber === "number" && record.attemptNumber > 0
        ? Math.floor(record.attemptNumber)
        : 1,
    matches,
  };
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const evaluations: EvaluationMap = {};

  for (const stepId of E0_STEP_IDS) {
    const attempts = progress.steps[stepId]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt || !isRecord(lastAttempt.answer)) continue;
    if (lastAttempt.answer.stepId !== stepId) continue;

    try {
      evaluations[stepId] = evaluateE0Step(
        lastAttempt.answer as unknown as E0StepSubmission
      );
    } catch {
      // Ignore malformed legacy drafts; the normalized live draft remains usable.
    }
  }

  return evaluations;
}

function isDraftReady(draft: E0StepSubmission): boolean {
  if (draft.stepId === "voltage") {
    return ["voltage-led", "voltage-motor", "voltage-sensor"].every(
      (id) => Boolean(draft.answers[id as keyof typeof draft.answers])
    );
  }
  if (draft.stepId === "current") {
    return ["current-source-capacity", "current-overload"].every(
      (id) => Boolean(draft.answers[id as keyof typeof draft.answers])
    );
  }
  if (draft.stepId === "polarity") {
    return draft.sensitiveComponentIds.length > 0 && Boolean(draft.invertedLedOptionId);
  }
  if (draft.stepId === "ohm-power") {
    return (
      isNonEmptyNumericValue(draft.current?.value) &&
      isNonEmptyNumericValue(draft.power?.value)
    );
  }
  return SYMBOL_IDS.every((symbolId) => Boolean(draft.matches[symbolId]));
}

function canVisitStep(
  progress: NodeChallengeProgress,
  stepId: E0StepId,
  readOnly: boolean
): boolean {
  if (readOnly) return true;
  const targetIndex = E0_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = E0_STEP_IDS.findIndex(
    (id) => !hasSolvedTimestamp(progress.steps[id])
  );
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(progress: NodeChallengeProgress): E0StepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(
  steps: Record<string, ChallengeStepProgress>
): E0StepId[] {
  return E0_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(
  step: ChallengeStepProgress | undefined
): boolean {
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
  stepId: E0StepId,
  extras: Record<string, string | number | boolean> = {}
): NodeChallengeProgress["analytics"] {
  const solvedSteps = getCompletedStepIdsFromSteps(steps).length;
  const attemptsTotal = Object.values(steps).reduce(
    (total, step) => total + step.attempts.length,
    0
  );
  const hintsTotal = Object.values(steps).reduce(
    (total, step) => total + step.revealedHints,
    0
  );
  const activeSeconds = Object.values(steps).reduce(
    (total, step) => total + step.totalActiveSeconds,
    0
  );

  return {
    ...previous,
    attemptsTotal,
    hintsTotal,
    totalActiveSeconds: activeSeconds,
    solvedSteps,
    completionPercent: solvedSteps * 20,
    currentStepOrder: E0_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function stepTitle(stepId: E0StepId): string {
  return E0_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

function toStepId(value: string): E0StepId {
  return isStepId(value) ? value : "voltage";
}

function isStepId(value: unknown): value is E0StepId {
  return typeof value === "string" && E0_STEP_IDS.includes(value as E0StepId);
}

function isSymbolId(value: unknown): value is E0SymbolId {
  return typeof value === "string" && SYMBOL_IDS.includes(value as E0SymbolId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

/** Drafts and attempts cross the persistence boundary, so remove optional
 * `undefined` fields and keep the payload strictly JSON-compatible. */
function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function isNumericValue(value: unknown): value is string | number {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function isNonEmptyNumericValue(value: unknown): boolean {
  return isNumericValue(value) && String(value).trim().length > 0;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m4 10 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m10 2 1.3 4.7L16 8l-4.7 1.3L10 14l-1.3-4.7L4 8l4.7-1.3L10 2Z" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M15 7a6 6 0 1 0 .5 5M15 3v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M16 10H4m0 0 4-4m-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10h12m0 0-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default E0Challenge;
