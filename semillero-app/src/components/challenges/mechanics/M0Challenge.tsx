"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  M0_CHALLENGE,
  M0_STEP_IDS,
  M0_STEPS,
  evaluateM0Step,
  getDeterministicChoiceOptions,
  isM0Complete,
  type M0ChoiceOption,
  type M0ChoiceSubmission,
  type M0NumericSubmission,
  type M0StepDefinition,
  type M0StepEvaluation,
  type M0StepId,
  type M0StepSubmission,
} from "@/lib/challenges/mechanics/m0";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface M0ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<M0StepId, M0StepEvaluation>>;

export function M0Challenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: M0ChallengeProps) {
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
  const activeStepIdRef = useRef<M0StepId>(toStepId(progress.currentStepId));
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
            totalActiveSeconds: current.steps[stepId].totalActiveSeconds + elapsedSeconds,
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
  const currentStep = M0_STEPS.find((step) => step.id === currentStepId) ?? M0_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as M0StepSubmission;
  const currentEvaluation = evaluations[currentStepId];
  const completedStepIds = getCompletedStepIds(progress);
  const completedCount = completedStepIds.length;
  const currentIndex = M0_STEP_IDS.indexOf(currentStepId);
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

  const changeDraft = (draft: M0StepSubmission) => {
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
        analytics: buildAnalytics(current.analytics, steps, "hint_revealed", currentStepId, {
          lastHintNumber: nextHintNumber,
        }),
      };
    });
    setAnnouncement(`Pista ${nextHintNumber} disponible.`);
  };

  const submitStep = () => {
    if (readOnly || currentSolved || !isDraftReady(currentDraft)) return;

    const submission = currentDraft;
    const evaluation = evaluateM0Step(submission);
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
        id: `M0-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "M0",
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
      completedChallenge = isM0Complete(solvedIds);

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
          {
            lastAttemptNumber: attemptNumber,
            lastAttemptScore: evaluation.score,
            lastAttemptMaxScore: evaluation.maxScore,
            lastAttemptCorrect: evaluation.isComplete,
          }
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

  const goToStep = (stepId: M0StepId) => {
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
    setAnnouncement(`Paso ${M0_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const nextStepId = M0_STEP_IDS[currentIndex + 1];
  const previousStepId = M0_STEP_IDS[currentIndex - 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#8FC7E8]/30 bg-[#8FC7E8]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">
                M0 · Fundamentos
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2 id="skill-detail-title" className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {M0_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {M0_CHALLENGE.introduction}
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
              Paso {currentStep.order} de {M0_CHALLENGE.totalSteps}
            </span>
            <span className="text-slate-400">
              {completedCount}/5 resueltos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto M0"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={currentStep.order}
            aria-valuetext={`Paso ${currentStep.order} de 5; ${completedCount} pasos resueltos`}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4E7CA6] to-[#8FC7E8] transition-[width] duration-500"
              style={{ width: `${currentStep.order * 20}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Pasos del reto de intuición mecánica"
        className="border-b border-white/10 bg-[#0e222b] px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {M0_STEPS.map((step) => {
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
                      ? "border-[#8FC7E8]/55 bg-[#4E7CA6]/18 text-white"
                      : solved
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100 hover:bg-emerald-400/10"
                        : accessible
                          ? "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                          : "cursor-not-allowed border-transparent bg-transparent text-slate-600"
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC7E8]`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      solved
                        ? "bg-emerald-400/15 text-emerald-300"
                        : selected
                          ? "bg-[#8FC7E8]/15 text-[#BEE3F5]"
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
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9FD3EE]">
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
          <StepVisual stepId={currentStep.diagram} />

          <div className="min-w-0">
            <StepForm
              step={currentStep}
              draft={currentDraft}
              evaluation={currentEvaluation}
              seed={progress.shuffleSeed}
              disabled={readOnly || currentSolved}
              onChange={changeDraft}
            />

            {currentEvaluation && <EvaluationBanner evaluation={currentEvaluation} />}

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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC7E8]"
              >
                <ArrowLeftIcon />
                Paso anterior
              </button>
            ) : (
              <span className="text-xs text-slate-500">Los pasos se habilitan en orden.</span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {!currentSolved && !readOnly && (
              <button
                type="button"
                onClick={submitStep}
                disabled={!isDraftReady(currentDraft)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3C6386] to-[#4E7CA6] px-6 text-sm font-bold text-white shadow-[0_12px_32px_rgba(78,124,166,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(78,124,166,0.36)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BEE3F5]"
              >
                {currentStepProgress.attempts.length > 0 ? "Comprobar de nuevo" : "Comprobar respuestas"}
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
                Reto M0 completado
              </div>
            )}

            {readOnly && !currentSolved && (
              <p className="text-xs text-slate-400">Este paso aún no tiene una solución registrada.</p>
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
  step: M0StepDefinition;
  draft: M0StepSubmission;
  evaluation?: M0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: M0StepSubmission) => void;
}) {
  if (step.kind === "choice_set" && draft.stepId === step.id) {
    return (
      <ChoiceSetForm
        step={step}
        draft={draft as M0ChoiceSubmission}
        evaluation={evaluation}
        seed={seed}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (step.kind === "numeric_set" && draft.stepId === step.id) {
    return (
      <NumericSetForm
        step={step}
        draft={draft as M0NumericSubmission}
        evaluation={evaluation}
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
  step: M0StepDefinition;
  draft: M0ChoiceSubmission;
  evaluation?: M0StepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: M0StepSubmission) => void;
}) {
  const questions = step.questions.filter(
    (question): question is Extract<typeof question, { type: "single_choice" }> =>
      question.type === "single_choice"
  );

  const setAnswer = (questionId: string, optionId: string) => {
    onChange({ ...draft, answers: { ...draft.answers, [questionId]: optionId } });
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const itemEvaluation = evaluation?.items.find((item) => item.questionId === question.id);
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
              <span className="mr-2 text-[#9FD3EE]">{index + 1}.</span>
              {question.prompt}
            </p>
            <div className="mt-4 space-y-2.5">
              {options.map((option) => (
                <ChoiceRow
                  key={option.id}
                  name={question.id}
                  option={option}
                  checked={draft.answers[question.id] === option.id}
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

function NumericSetForm({
  step,
  draft,
  evaluation,
  disabled,
  onChange,
}: {
  step: M0StepDefinition;
  draft: M0NumericSubmission;
  evaluation?: M0StepEvaluation;
  disabled: boolean;
  onChange: (draft: M0StepSubmission) => void;
}) {
  const questions = step.questions.filter(
    (question): question is Extract<typeof question, { type: "numeric" }> =>
      question.type === "numeric"
  );

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const evaluationItem = evaluation?.items.find((item) => item.questionId === question.id);
        const rawValue = draft.answers[question.id];
        const value = typeof rawValue === "number" ? String(rawValue) : rawValue ?? "";

        return (
          <div
            key={question.id}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
          >
            <label
              htmlFor={`M0-${question.id}`}
              className="block text-sm font-semibold leading-6 text-white"
            >
              <span className="mr-2 text-[#9FD3EE]">{index + 1}.</span>
              {question.prompt}
            </label>
            <p className="mt-1 font-mono text-xs text-slate-400">{question.formula}</p>
            <div className="mt-4 flex gap-2">
              <input
                id={`M0-${question.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    answers: { ...draft.answers, [question.id]: event.target.value },
                  })
                }
                aria-describedby={`M0-${question.id}-help`}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#04131d] px-3 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#8FC7E8]/60 focus:ring-2 focus:ring-[#8FC7E8]/15 disabled:opacity-65"
                placeholder={question.placeholder}
              />
              {question.unit && (
                <span className="flex min-w-14 items-center justify-center rounded-xl border border-white/15 bg-[#12222b] px-3 text-sm font-bold text-white">
                  {question.unit}
                </span>
              )}
            </div>
            <p id={`M0-${question.id}-help`} className="mt-2 text-xs leading-5 text-slate-400">
              Se acepta punto o coma decimal.
            </p>
            {evaluationItem && <ItemFeedback evaluation={evaluationItem} />}
          </div>
        );
      })}
    </div>
  );
}

function StepVisual({ stepId }: { stepId: M0StepId }) {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#071820]">
      <div className="flex justify-center p-4 sm:p-6">
        {stepId === "gears" && <GearsDiagram />}
        {stepId === "pulleys" && <PulleysDiagram />}
        {stepId === "levers" && <LeversDiagram />}
        {stepId === "mechanical-advantage" && <MechanicalAdvantageDiagram />}
        {stepId === "speed-torque" && <SpeedTorqueDiagram />}
      </div>
      <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400">
        Usa el diagrama como referencia y registra tus decisiones en las tarjetas de abajo.
      </figcaption>
    </figure>
  );
}

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RotationArrow({
  id,
  cx,
  cy,
  r,
  clockwise,
  color = "#9FD3EE",
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  clockwise: boolean;
  color?: string;
}) {
  const a1 = clockwise ? -30 : 210;
  const a2 = clockwise ? 210 : -30;
  const start = polarPoint(cx, cy, r, a1);
  const end = polarPoint(cx, cy, r, a2);
  const sweep = clockwise ? 1 : 0;

  return (
    <g>
      <defs>
        <marker id={id} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
        </marker>
      </defs>
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 ${sweep} ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        markerEnd={`url(#${id})`}
      />
    </g>
  );
}

function GearIcon({
  cx,
  cy,
  r,
  teeth,
  color = "#BEE3F5",
}: {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  color?: string;
}) {
  const marks = Array.from({ length: teeth }, (_, index) => {
    const angle = (360 / teeth) * index;
    const inner = polarPoint(cx, cy, r, angle);
    const outer = polarPoint(cx, cy, r + 6, angle);
    return (
      <line
        key={index}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  });

  return (
    <g>
      {marks}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={4} fill={color} />
    </g>
  );
}

function DiagramLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className="fill-slate-300"
      style={{ fontSize: 11, fontWeight: 600 }}
    >
      {children}
    </text>
  );
}

function GearsDiagram() {
  const cy = 108;
  const rMotriz = 32;
  const rLoco = 36;
  const rConducido = 52;
  const cxMotriz = 60;
  const cxLoco = cxMotriz + rMotriz + rLoco;
  const cxConducido = cxLoco + rLoco + rConducido;

  return (
    <svg viewBox="0 0 300 230" className="h-auto w-full max-w-md" role="img" aria-label="Tres engranajes en línea: motriz girando en sentido horario, un engranaje loco intermedio girando en sentido antihorario, y el conducido girando de nuevo en sentido horario, el mismo sentido que el motriz.">
      <GearIcon cx={cxMotriz} cy={cy} r={rMotriz} teeth={10} color="#8FC7E8" />
      <RotationArrow id="arrow-motriz" cx={cxMotriz} cy={cy} r={rMotriz * 0.6} clockwise color="#8FC7E8" />
      <DiagramLabel x={cxMotriz} y={cy - rMotriz - 12}>Motriz</DiagramLabel>
      <DiagramLabel x={cxMotriz} y={cy + rMotriz + 20}>10 dientes</DiagramLabel>

      <GearIcon cx={cxLoco} cy={cy} r={rLoco} teeth={12} color="#9FD3EE" />
      <RotationArrow id="arrow-loco" cx={cxLoco} cy={cy} r={rLoco * 0.55} clockwise={false} color="#9FD3EE" />
      <DiagramLabel x={cxLoco} y={cy - rLoco - 12}>Loco</DiagramLabel>

      <GearIcon cx={cxConducido} cy={cy} r={rConducido} teeth={22} color="#BEE3F5" />
      <RotationArrow id="arrow-conducido" cx={cxConducido} cy={cy} r={rConducido * 0.6} clockwise color="#BEE3F5" />
      <DiagramLabel x={cxConducido} y={cy - rConducido - 12}>Conducido</DiagramLabel>
      <DiagramLabel x={cxConducido} y={cy + rConducido + 20}>40 dientes</DiagramLabel>
    </svg>
  );
}

function PulleyIcon({ cx, cy, r, color = "#BEE3F5" }: { cx: number; cy: number; r: number; color?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={2.5} fill={color} />
    </g>
  );
}

function PulleysDiagram() {
  return (
    <svg viewBox="0 0 400 200" className="h-auto w-full max-w-lg" role="img" aria-label="Tres configuraciones de poleas: una polea fija que solo cambia la dirección de la fuerza, una polea móvil que reduce la fuerza a la mitad, y un sistema con tres tramos de cuerda que reparte la carga entre ellos.">
      <g>
        <line x1={60} y1={20} x2={60} y2={35} stroke="#4E7CA6" strokeWidth={3} />
        <PulleyIcon cx={60} cy={45} r={12} />
        <line x1={50} y1={55} x2={50} y2={130} stroke="#8FC7E8" strokeWidth={2} />
        <line x1={70} y1={55} x2={70} y2={95} stroke="#8FC7E8" strokeWidth={2} />
        <path d="M66,90 l4,10 l4,-10" fill="none" stroke="#8FC7E8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={36} y={130} width={28} height={20} rx={3} fill="none" stroke="#BEE3F5" strokeWidth={2} />
        <DiagramLabel x={60} y={168}>Polea fija</DiagramLabel>
        <DiagramLabel x={60} y={182}>Cambia dirección</DiagramLabel>
      </g>

      <g>
        <line x1={200} y1={16} x2={200} y2={26} stroke="#4E7CA6" strokeWidth={3} />
        <line x1={180} y1={26} x2={220} y2={26} stroke="#4E7CA6" strokeWidth={3} />
        <line x1={180} y1={26} x2={180} y2={60} stroke="#8FC7E8" strokeWidth={2} />
        <line x1={220} y1={26} x2={220} y2={60} stroke="#8FC7E8" strokeWidth={2} />
        <PulleyIcon cx={200} cy={70} r={12} />
        <line x1={200} y1={82} x2={200} y2={100} stroke="#8FC7E8" strokeWidth={2} />
        <path d="M196,95 l4,10 l4,-10" fill="none" stroke="#8FC7E8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={186} y={130} width={28} height={20} rx={3} fill="none" stroke="#BEE3F5" strokeWidth={2} />
        <line x1={200} y1={100} x2={200} y2={130} stroke="#8FC7E8" strokeWidth={2} />
        <DiagramLabel x={200} y={168}>Polea móvil</DiagramLabel>
        <DiagramLabel x={200} y={182}>Mitad de fuerza</DiagramLabel>
      </g>

      <g>
        <line x1={340} y1={16} x2={340} y2={26} stroke="#4E7CA6" strokeWidth={3} />
        <line x1={322} y1={26} x2={358} y2={26} stroke="#4E7CA6" strokeWidth={3} />
        <PulleyIcon cx={322} cy={40} r={10} />
        <PulleyIcon cx={358} cy={40} r={10} />
        <PulleyIcon cx={340} cy={80} r={10} />
        <line x1={326} y1={30} x2={340} y2={70} stroke="#8FC7E8" strokeWidth={1.6} />
        <line x1={354} y1={30} x2={340} y2={70} stroke="#8FC7E8" strokeWidth={1.6} />
        <line x1={340} y1={90} x2={340} y2={130} stroke="#8FC7E8" strokeWidth={1.6} />
        <path d="M336,124 l4,10 l4,-10" fill="none" stroke="#8FC7E8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={326} y={130} width={28} height={20} rx={3} fill="none" stroke="#BEE3F5" strokeWidth={2} />
        <DiagramLabel x={340} y={168}>3 tramos</DiagramLabel>
        <DiagramLabel x={340} y={182}>Carga entre 3</DiagramLabel>
      </g>
    </svg>
  );
}

function LeversDiagram() {
  return (
    <svg viewBox="0 0 360 190" className="h-auto w-full max-w-lg" role="img" aria-label="Tres palancas: primera clase con el apoyo en el centro, segunda clase con la carga entre el apoyo y la fuerza, y una palanca con el brazo de la fuerza alargado.">
      <g>
        <line x1={20} y1={60} x2={100} y2={60} stroke="#8FC7E8" strokeWidth={4} strokeLinecap="round" />
        <path d="M60,60 l-8,16 h16 Z" fill="#4E7CA6" />
        <path d="M20,60 l0,-16" stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M15,48 l5,12 l5,-12" fill="none" stroke="#BEE3F5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M100,60 l0,-16" stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M95,48 l5,12 l5,-12" fill="none" stroke="#BEE3F5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <DiagramLabel x={60} y={104}>1ª clase</DiagramLabel>
        <DiagramLabel x={60} y={120}>Apoyo en el centro</DiagramLabel>
      </g>

      <g>
        <line x1={180} y1={60} x2={260} y2={60} stroke="#8FC7E8" strokeWidth={4} strokeLinecap="round" />
        <path d="M188,60 l-8,16 h16 Z" fill="#4E7CA6" />
        <path d="M220,60 l0,-16" stroke="#9FD3EE" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M215,48 l5,12 l5,-12" fill="none" stroke="#9FD3EE" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M260,60 l0,-16" stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M255,48 l5,12 l5,-12" fill="none" stroke="#BEE3F5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <DiagramLabel x={220} y={104}>2ª clase</DiagramLabel>
        <DiagramLabel x={220} y={120}>Carga en el medio</DiagramLabel>
      </g>

      <g>
        <line x1={70} y1={155} x2={260} y2={155} stroke="#8FC7E8" strokeWidth={4} strokeLinecap="round" />
        <line x1={260} y1={155} x2={280} y2={155} stroke="#8FC7E8" strokeWidth={4} strokeDasharray="2,4" strokeLinecap="round" />
        <path d="M110,155 l-8,16 h16 Z" fill="#4E7CA6" />
        <DiagramLabel x={175} y={184}>Brazo de la fuerza más largo</DiagramLabel>
      </g>
    </svg>
  );
}

function MechanicalAdvantageDiagram() {
  return (
    <svg viewBox="0 0 300 160" className="h-auto w-full max-w-md" role="img" aria-label="Palanca en equilibrio con el punto de apoyo en el centro, la carga de 60 newtons a 0.2 metros del apoyo y la fuerza aplicada a 0.6 metros del apoyo.">
      <line x1={30} y1={70} x2={270} y2={70} stroke="#8FC7E8" strokeWidth={4} strokeLinecap="round" />
      <path d="M150,70 l-10,20 h20 Z" fill="#4E7CA6" />

      <line x1={80} y1={70} x2={80} y2={40} stroke="#F0B65B" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M75,58 l5,12 l5,-12" fill="none" stroke="#F0B65B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={80} y={30}>60 N</DiagramLabel>
      <DiagramLabel x={115} y={100}>0.2 m</DiagramLabel>
      <line x1={80} y1={92} x2={150} y2={92} stroke="#64748b" strokeWidth={1} />

      <line x1={230} y1={70} x2={230} y2={40} stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M225,58 l5,12 l5,-12" fill="none" stroke="#BEE3F5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={230} y={30}>F = ?</DiagramLabel>
      <DiagramLabel x={190} y={100}>0.6 m</DiagramLabel>
      <line x1={150} y1={92} x2={230} y2={92} stroke="#64748b" strokeWidth={1} />
    </svg>
  );
}

function SpeedTorqueDiagram() {
  return (
    <svg viewBox="0 0 360 140" className="h-auto w-full max-w-lg" role="img" aria-label="Un motor a 1000 revoluciones por minuto y 2 newton metro conectado a una reducción 5 a 1, cuya salida se pregunta.">
      <rect x={16} y={45} width={104} height={50} rx={10} fill="none" stroke="#8FC7E8" strokeWidth={2.5} />
      <DiagramLabel x={68} y={64}>Motor</DiagramLabel>
      <text x={68} y={80} textAnchor="middle" className="fill-slate-300" style={{ fontSize: 9.5, fontWeight: 600 }}>
        1000 rpm · 2 N·m
      </text>

      <path d="M124,70 h30" stroke="#9FD3EE" strokeWidth={2.5} />
      <path d="M146,63 l10,7 l-10,7" fill="none" stroke="#9FD3EE" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      <rect x={162} y={45} width={90} height={50} rx={10} fill="none" stroke="#9FD3EE" strokeWidth={2.5} />
      <DiagramLabel x={207} y={64}>Reducción</DiagramLabel>
      <DiagramLabel x={207} y={80}>5 : 1</DiagramLabel>

      <path d="M254,70 h30" stroke="#BEE3F5" strokeWidth={2.5} />
      <path d="M276,63 l10,7 l-10,7" fill="none" stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={318} y={58}>Salida</DiagramLabel>
      <DiagramLabel x={318} y={74}>? rpm</DiagramLabel>
      <DiagramLabel x={318} y={90}>? N·m</DiagramLabel>
    </svg>
  );
}

function ChoiceRow({
  name,
  option,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  option: M0ChoiceOption;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-xs leading-5 transition sm:text-sm ${
        checked
          ? "border-[#8FC7E8]/45 bg-[#4E7CA6]/12 text-white"
          : "border-white/10 bg-[#04131d]/65 text-slate-300 hover:border-white/20"
      } ${disabled ? "cursor-default opacity-75" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#8FC7E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC7E8]"
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

function EvaluationBanner({ evaluation }: { evaluation: M0StepEvaluation }) {
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

function ItemFeedback({ evaluation }: { evaluation: M0StepEvaluation["items"][number] }) {
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
    M0_STEP_IDS.map((stepId) => {
      const savedStep = saved?.nodeId === "M0" ? saved.steps?.[stepId] : undefined;
      return [stepId, normalizeStepProgress(stepId, savedStep)];
    })
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIdsFromSteps(steps);
  const fallbackCurrent = M0_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ?? M0_STEP_IDS[4];
  const savedCurrent = saved?.currentStepId;
  const firstIncompleteIndex = M0_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isStepId(savedCurrent) ? M0_STEP_IDS.indexOf(savedCurrent) : -1;
  const safeCurrent =
    isStepId(savedCurrent) &&
    (completedIds.length === M0_STEP_IDS.length || savedCurrentIndex <= firstIncompleteIndex)
      ? savedCurrent
      : fallbackCurrent;

  return {
    nodeId: "M0",
    currentStepId: safeCurrent,
    shuffleSeed:
      typeof saved?.shuffleSeed === "number" && Number.isFinite(saved.shuffleSeed)
        ? saved.shuffleSeed
        : now % 2_147_483_647,
    startedAt:
      typeof saved?.startedAt === "number" && Number.isFinite(saved.startedAt) ? saved.startedAt : now,
    updatedAt:
      typeof saved?.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : now,
    completedAt:
      typeof saved?.completedAt === "number" && Number.isFinite(saved.completedAt)
        ? saved.completedAt
        : isM0Complete(completedIds)
          ? now
          : null,
    steps,
    analytics: buildAnalytics(
      saved?.nodeId === "M0" ? saved.analytics : {},
      steps,
      "challenge_opened",
      safeCurrent
    ),
  };
}

function normalizeStepProgress(stepId: M0StepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  const hintLimit = M0_STEPS.find((step) => step.id === stepId)?.hints.length ?? 0;

  return {
    draft: toJsonValue(normalizeDraft(stepId, saved?.draft)),
    attempts: Array.isArray(saved?.attempts) ? saved.attempts : [],
    revealedHints:
      typeof saved?.revealedHints === "number"
        ? Math.max(0, Math.min(hintLimit, Math.floor(saved.revealedHints)))
        : 0,
    totalActiveSeconds:
      typeof saved?.totalActiveSeconds === "number" ? Math.max(0, Math.floor(saved.totalActiveSeconds)) : 0,
    solvedAt:
      typeof saved?.solvedAt === "number" && Number.isFinite(saved.solvedAt) ? saved.solvedAt : null,
  };
}

function normalizeDraft(stepId: M0StepId, raw: unknown): M0StepSubmission {
  const record = isRecord(raw) ? raw : {};
  const answers = isRecord(record.answers) ? record.answers : {};

  if (stepId === "gears" || stepId === "pulleys" || stepId === "levers") {
    const normalizedAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === "string") normalizedAnswers[key] = value;
    }
    return { stepId, answers: normalizedAnswers };
  }

  const normalizedAnswers: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string" || typeof value === "number") normalizedAnswers[key] = value;
  }
  return { stepId, answers: normalizedAnswers };
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const evaluations: EvaluationMap = {};

  for (const stepId of M0_STEP_IDS) {
    const attempts = progress.steps[stepId]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt || !isRecord(lastAttempt.answer)) continue;
    if (lastAttempt.answer.stepId !== stepId) continue;

    try {
      evaluations[stepId] = evaluateM0Step(lastAttempt.answer as unknown as M0StepSubmission);
    } catch {
      // Ignore malformed legacy drafts; the normalized live draft remains usable.
    }
  }

  return evaluations;
}

function isDraftReady(draft: M0StepSubmission): boolean {
  const step = M0_STEPS.find((candidate) => candidate.id === draft.stepId);
  if (!step) return false;
  return step.questions.every((question) => {
    const value = draft.answers[question.id];
    return typeof value === "string" ? value.length > 0 : typeof value === "number";
  });
}

function canVisitStep(progress: NodeChallengeProgress, stepId: M0StepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const targetIndex = M0_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = M0_STEP_IDS.findIndex((id) => !hasSolvedTimestamp(progress.steps[id]));
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(progress: NodeChallengeProgress): M0StepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(steps: Record<string, ChallengeStepProgress>): M0StepId[] {
  return M0_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step: ChallengeStepProgress | undefined): boolean {
  return typeof step?.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}

function buildAnalytics(
  previous: NodeChallengeProgress["analytics"],
  steps: Record<string, ChallengeStepProgress>,
  event: string,
  stepId: M0StepId,
  extras: Record<string, string | number | boolean> = {}
): NodeChallengeProgress["analytics"] {
  const solvedSteps = getCompletedStepIdsFromSteps(steps).length;
  const attemptsTotal = Object.values(steps).reduce((total, step) => total + step.attempts.length, 0);
  const hintsTotal = Object.values(steps).reduce((total, step) => total + step.revealedHints, 0);
  const activeSeconds = Object.values(steps).reduce((total, step) => total + step.totalActiveSeconds, 0);

  return {
    ...previous,
    attemptsTotal,
    hintsTotal,
    totalActiveSeconds: activeSeconds,
    solvedSteps,
    completionPercent: solvedSteps * 20,
    currentStepOrder: M0_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function stepTitle(stepId: M0StepId): string {
  return M0_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

function toStepId(value: string): M0StepId {
  return isStepId(value) ? value : "gears";
}

function isStepId(value: unknown): value is M0StepId {
  return typeof value === "string" && M0_STEP_IDS.includes(value as M0StepId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Drafts and attempts cross the persistence boundary, so remove optional
 * `undefined` fields and keep the payload strictly JSON-compatible. */
function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
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

export default M0Challenge;
