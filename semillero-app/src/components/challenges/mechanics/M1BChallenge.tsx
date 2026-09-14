"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  M1B_CHALLENGE,
  M1B_STEP_IDS,
  evaluateM1BStep,
  generateM1BSteps,
  getDeterministicChoiceOptions,
  getM1BStepTitle,
  isM1BComplete,
  type M1BChoiceOption,
  type M1BChoiceSubmission,
  type M1BStepDefinition,
  type M1BStepEvaluation,
  type M1BStepId,
  type M1BStepSubmission,
} from "@/lib/challenges/mechanics/m1b";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface M1BChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<M1BStepId, M1BStepEvaluation>>;

export function M1BChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: M1BChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() =>
    createInitialProgress(savedProgress)
  );
  const steps = useMemo(() => generateM1BSteps(progress.shuffleSeed), [progress.shuffleSeed]);
  const [evaluations, setEvaluations] = useState<EvaluationMap>(() => {
    const initial = createInitialProgress(savedProgress);
    return deriveEvaluations(initial, generateM1BSteps(initial.shuffleSeed));
  });
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    savedProgress?.updatedAt ?? progress.updatedAt
  );
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(progress.completedAt));
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef<M1BStepId>(toStepId(progress.currentStepId));
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
  const currentStep = steps.find((step) => step.id === currentStepId) ?? steps[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as M1BStepSubmission;
  const currentEvaluation = evaluations[currentStepId];
  const completedStepIds = getCompletedStepIds(progress);
  const completedCount = completedStepIds.length;
  const currentIndex = M1B_STEP_IDS.indexOf(currentStepId);
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

  const changeDraft = (draft: M1BStepSubmission) => {
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
    const evaluation = evaluateM1BStep(currentStep, submission);
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
        id: `M1B-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "M1B",
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
      completedChallenge = isM1BComplete(solvedIds);

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

  const goToStep = (stepId: M1BStepId) => {
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
    setAnnouncement(`Paso ${M1B_STEP_IDS.indexOf(stepId) + 1}: ${getM1BStepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const nextStepId = M1B_STEP_IDS[currentIndex + 1];
  const previousStepId = M1B_STEP_IDS[currentIndex - 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#8FC7E8]/30 bg-[#8FC7E8]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">
                M1B · Subhabilidad
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2 id="skill-detail-title" className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {M1B_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {M1B_CHALLENGE.introduction}
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
              Paso {currentStep.order} de {M1B_CHALLENGE.totalSteps}
            </span>
            <span className="text-slate-400">
              {completedCount}/3 resueltos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto M1B"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={currentStep.order}
            aria-valuetext={`Paso ${currentStep.order} de 3; ${completedCount} pasos resueltos`}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4E7CA6] to-[#8FC7E8] transition-[width] duration-500"
              style={{ width: `${currentStep.order * (100 / 3)}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Pasos del reto de selección de reducción"
        className="border-b border-white/10 bg-[#0e222b] px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {steps.map((step) => {
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
          <StepVisual step={currentStep} />

          <div className="min-w-0">
            <ChoiceSetForm
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
                {currentStepProgress.attempts.length > 0 ? "Comprobar de nuevo" : "Comprobar respuesta"}
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
                Reto M1B completado
              </div>
            )}

            {readOnly && !currentSolved && (
              <p className="text-xs text-slate-400">Este paso aún no tiene una solución registrada.</p>
            )}
          </div>
        </footer>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function ChoiceSetForm({
  step,
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  step: M1BStepDefinition;
  draft: M1BChoiceSubmission;
  evaluation?: M1BStepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: M1BStepSubmission) => void;
}) {
  const question = step.questions[0];
  const itemEvaluation = evaluation?.items.find((item) => item.questionId === question.id);
  const options = getDeterministicChoiceOptions(step, seed);
  const selectedOptionId = draft.answers[question.id];

  const setAnswer = (optionId: string) => {
    onChange({ ...draft, answers: { ...draft.answers, [question.id]: optionId } });
  };

  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <legend className="sr-only">{question.prompt}</legend>
      <p className="text-sm font-semibold leading-6 text-white">{question.prompt}</p>
      <div className="mt-4 space-y-2.5">
        {options.map((option) => (
          <ChoiceRow
            key={option.id}
            name={question.id}
            option={option}
            checked={selectedOptionId === option.id}
            disabled={disabled}
            onChange={() => setAnswer(option.id)}
          />
        ))}
      </div>
      {itemEvaluation && <ItemFeedback evaluation={itemEvaluation} />}
    </fieldset>
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
  option: M1BChoiceOption;
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

function StepVisual({ step }: { step: M1BStepDefinition }) {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#071820]">
      <div className="flex justify-center p-4 sm:p-6">
        <TransmissionDiagram step={step} />
      </div>
      <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400">
        El motor y su torque son fijos; la reducción que elijas determina la velocidad y el torque que llegan a la carga.
      </figcaption>
    </figure>
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

function TransmissionDiagram({ step }: { step: M1BStepDefinition }) {
  return (
    <svg
      viewBox="0 0 380 150"
      className="h-auto w-full max-w-xl"
      role="img"
      aria-label={`Motor a ${step.motorRpm} revoluciones por minuto y ${step.motorTorque} newton metro, conectado a una reducción de relación desconocida, cuya salida debe alcanzar al menos ${step.minOutputRpm} revoluciones por minuto y ${step.minOutputTorque} newton metro para mover: ${step.loadLabel}.`}
    >
      <rect x={12} y={48} width={104} height={54} rx={10} fill="none" stroke="#8FC7E8" strokeWidth={2.5} />
      <DiagramLabel x={64} y={70}>Motor</DiagramLabel>
      <text x={64} y={87} textAnchor="middle" className="fill-slate-300" style={{ fontSize: 9.5, fontWeight: 600 }}>
        {step.motorRpm} rpm · {step.motorTorque} N·m
      </text>

      <path d="M120,75 h26" stroke="#9FD3EE" strokeWidth={2.5} />
      <path d="M140,68 l10,7 l-10,7" fill="none" stroke="#9FD3EE" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      <rect x={156} y={48} width={90} height={54} rx={10} fill="none" stroke="#9FD3EE" strokeWidth={2.5} />
      <DiagramLabel x={201} y={70}>Reducción</DiagramLabel>
      <DiagramLabel x={201} y={87}>i = ?</DiagramLabel>

      <path d="M248,75 h26" stroke="#BEE3F5" strokeWidth={2.5} />
      <path d="M268,68 l10,7 l-10,7" fill="none" stroke="#BEE3F5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      <rect x={284} y={40} width={92} height={70} rx={10} fill="none" stroke="#BEE3F5" strokeWidth={2.5} />
      <DiagramLabel x={330} y={60}>{step.loadLabel}</DiagramLabel>
      <text x={330} y={78} textAnchor="middle" className="fill-slate-300" style={{ fontSize: 9.5, fontWeight: 600 }}>
        mín. {step.minOutputRpm} rpm
      </text>
      <text x={330} y={93} textAnchor="middle" className="fill-slate-300" style={{ fontSize: 9.5, fontWeight: 600 }}>
        mín. {step.minOutputTorque} N·m
      </text>
    </svg>
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

function EvaluationBanner({ evaluation }: { evaluation: M1BStepEvaluation }) {
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

function ItemFeedback({ evaluation }: { evaluation: M1BStepEvaluation["items"][number] }) {
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
    M1B_STEP_IDS.map((stepId) => {
      const savedStep = saved?.nodeId === "M1B" ? saved.steps?.[stepId] : undefined;
      return [stepId, normalizeStepProgress(stepId, savedStep)];
    })
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIdsFromSteps(steps);
  const fallbackCurrent = M1B_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ?? M1B_STEP_IDS[2];
  const savedCurrent = saved?.currentStepId;
  const firstIncompleteIndex = M1B_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isStepId(savedCurrent) ? M1B_STEP_IDS.indexOf(savedCurrent) : -1;
  const safeCurrent =
    isStepId(savedCurrent) &&
    (completedIds.length === M1B_STEP_IDS.length || savedCurrentIndex <= firstIncompleteIndex)
      ? savedCurrent
      : fallbackCurrent;

  return {
    nodeId: "M1B",
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
        : isM1BComplete(completedIds)
          ? now
          : null,
    steps,
    analytics: buildAnalytics(
      saved?.nodeId === "M1B" ? saved.analytics : {},
      steps,
      "challenge_opened",
      safeCurrent
    ),
  };
}

function normalizeStepProgress(stepId: M1BStepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  // Every M1B step always exposes exactly 2 hints, regardless of the seed.
  const hintLimit = 2;

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

function normalizeDraft(stepId: M1BStepId, raw: unknown): M1BStepSubmission {
  const record = isRecord(raw) ? raw : {};
  const answers = isRecord(record.answers) ? record.answers : {};

  const normalizedAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string") normalizedAnswers[key] = value;
  }
  return { stepId, answers: normalizedAnswers };
}

function deriveEvaluations(
  progress: NodeChallengeProgress,
  steps: readonly M1BStepDefinition[]
): EvaluationMap {
  const evaluations: EvaluationMap = {};

  for (const step of steps) {
    const attempts = progress.steps[step.id]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt || !isRecord(lastAttempt.answer)) continue;
    if (lastAttempt.answer.stepId !== step.id) continue;

    try {
      evaluations[step.id] = evaluateM1BStep(step, lastAttempt.answer as unknown as M1BStepSubmission);
    } catch {
      // Ignore malformed legacy drafts; the normalized live draft remains usable.
    }
  }

  return evaluations;
}

function isDraftReady(draft: M1BStepSubmission): boolean {
  const values = Object.values(draft.answers);
  return values.length > 0 && values.every((value) => typeof value === "string" && value.length > 0);
}

function canVisitStep(progress: NodeChallengeProgress, stepId: M1BStepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const targetIndex = M1B_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = M1B_STEP_IDS.findIndex((id) => !hasSolvedTimestamp(progress.steps[id]));
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(progress: NodeChallengeProgress): M1BStepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(steps: Record<string, ChallengeStepProgress>): M1BStepId[] {
  return M1B_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step: ChallengeStepProgress | undefined): boolean {
  return typeof step?.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}

function buildAnalytics(
  previous: NodeChallengeProgress["analytics"],
  steps: Record<string, ChallengeStepProgress>,
  event: string,
  stepId: M1BStepId,
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
    completionPercent: Math.round((solvedSteps / M1B_STEP_IDS.length) * 100),
    currentStepOrder: M1B_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function toStepId(value: string): M1BStepId {
  return isStepId(value) ? value : "arm-lift";
}

function isStepId(value: unknown): value is M1BStepId {
  return typeof value === "string" && M1B_STEP_IDS.includes(value as M1BStepId);
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

export default M1BChallenge;
