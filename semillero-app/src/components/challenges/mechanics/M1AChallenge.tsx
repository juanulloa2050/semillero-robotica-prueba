"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  M1A_CHALLENGE,
  M1A_STEP_IDS,
  M1A_STEPS,
  evaluateM1AStep,
  isM1AComplete,
  type M1ANumericSubmission,
  type M1AStepDefinition,
  type M1AStepEvaluation,
  type M1AStepId,
  type M1AStepSubmission,
} from "@/lib/challenges/mechanics/m1a";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface M1AChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<M1AStepId, M1AStepEvaluation>>;

export function M1AChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: M1AChallengeProps) {
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
  const activeStepIdRef = useRef<M1AStepId>(toStepId(progress.currentStepId));
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
  const currentStep = M1A_STEPS.find((step) => step.id === currentStepId) ?? M1A_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as M1AStepSubmission;
  const currentEvaluation = evaluations[currentStepId];
  const completedStepIds = getCompletedStepIds(progress);
  const completedCount = completedStepIds.length;
  const currentIndex = M1A_STEP_IDS.indexOf(currentStepId);
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

  const changeDraft = (draft: M1AStepSubmission) => {
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
    const evaluation = evaluateM1AStep(submission);
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
        id: `M1A-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "M1A",
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
      completedChallenge = isM1AComplete(solvedIds);

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

  const goToStep = (stepId: M1AStepId) => {
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
    setAnnouncement(`Paso ${M1A_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const nextStepId = M1A_STEP_IDS[currentIndex + 1];
  const previousStepId = M1A_STEP_IDS[currentIndex - 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#8FC7E8]/30 bg-[#8FC7E8]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">
                M1A · Subhabilidad
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2 id="skill-detail-title" className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {M1A_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {M1A_CHALLENGE.introduction}
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
              Paso {currentStep.order} de {M1A_CHALLENGE.totalSteps}
            </span>
            <span className="text-slate-400">
              {completedCount}/4 resueltos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto M1A"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={currentStep.order}
            aria-valuetext={`Paso ${currentStep.order} de 4; ${completedCount} pasos resueltos`}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4E7CA6] to-[#8FC7E8] transition-[width] duration-500"
              style={{ width: `${currentStep.order * 25}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Pasos del reto de estática"
        className="border-b border-white/10 bg-[#0e222b] px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {M1A_STEPS.map((step) => {
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
            <NumericSetForm
              step={currentStep}
              draft={currentDraft}
              evaluation={currentEvaluation}
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
                Reto M1A completado
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

function NumericSetForm({
  step,
  draft,
  evaluation,
  disabled,
  onChange,
}: {
  step: M1AStepDefinition;
  draft: M1ANumericSubmission;
  evaluation?: M1AStepEvaluation;
  disabled: boolean;
  onChange: (draft: M1AStepSubmission) => void;
}) {
  const questions = step.questions;

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
              htmlFor={`M1A-${question.id}`}
              className="block text-sm font-semibold leading-6 text-white"
            >
              <span className="mr-2 text-[#9FD3EE]">{index + 1}.</span>
              {question.prompt}
            </label>
            <p className="mt-1 font-mono text-xs text-slate-400">{question.formula}</p>
            <div className="mt-4 flex gap-2">
              <input
                id={`M1A-${question.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    stepId: step.id,
                    answers: { ...draft.answers, [question.id]: event.target.value },
                  })
                }
                aria-describedby={`M1A-${question.id}-help`}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#04131d] px-3 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#8FC7E8]/60 focus:ring-2 focus:ring-[#8FC7E8]/15 disabled:opacity-65"
                placeholder={question.placeholder}
              />
              {question.unit && (
                <span className="flex min-w-14 items-center justify-center rounded-xl border border-white/15 bg-[#12222b] px-3 text-sm font-bold text-white">
                  {question.unit}
                </span>
              )}
            </div>
            <p id={`M1A-${question.id}-help`} className="mt-2 text-xs leading-5 text-slate-400">
              Se acepta punto o coma decimal.
            </p>
            {evaluationItem && <ItemFeedback evaluation={evaluationItem} />}
          </div>
        );
      })}
    </div>
  );
}

function StepVisual({ stepId }: { stepId: M1AStepId }) {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#071820]">
      <div className="flex justify-center p-4 sm:p-6">
        {stepId === "reactions" && <BeamReactionsDiagram />}
        {stepId === "moment" && <DoorMomentDiagram />}
        {stepId === "torque" && <WrenchTorqueDiagram />}
        {stepId === "lever-arm" && <CrowbarDiagram />}
      </div>
      <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400">
        Usa el diagrama como referencia y registra tus decisiones en las tarjetas de abajo.
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

function BeamReactionsDiagram() {
  return (
    <svg viewBox="0 0 340 170" className="h-auto w-full max-w-lg" role="img" aria-label="Viga de 4 metros apoyada en A y B, con una carga de 600 newtons aplicada a 1.5 metros del apoyo A.">
      <line x1={30} y1={70} x2={310} y2={70} stroke="#8FC7E8" strokeWidth={4} strokeLinecap="round" />

      <path d="M30,70 l-12,22 h24 Z" fill="#4E7CA6" />
      <line x1={10} y1={92} x2={50} y2={92} stroke="#4E7CA6" strokeWidth={3} strokeLinecap="round" />
      <DiagramLabel x={30} y={112}>A</DiagramLabel>

      <path d="M310,70 l-12,22 h24 Z" fill="none" stroke="#4E7CA6" strokeWidth={2.5} />
      <circle cx={302} cy={95} r={4} fill="none" stroke="#4E7CA6" strokeWidth={2.5} />
      <circle cx={318} cy={95} r={4} fill="none" stroke="#4E7CA6" strokeWidth={2.5} />
      <line x1={288} y1={99} x2={332} y2={99} stroke="#4E7CA6" strokeWidth={3} strokeLinecap="round" />
      <DiagramLabel x={310} y={119}>B</DiagramLabel>

      <line x1={135} y1={30} x2={135} y2={70} stroke="#F0B65B" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M129,56 l6,14 l6,-14" fill="none" stroke="#F0B65B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={135} y={20}>600 N</DiagramLabel>

      <line x1={30} y1={140} x2={135} y2={140} stroke="#64748b" strokeWidth={1} />
      <DiagramLabel x={82} y={155}>1.5 m</DiagramLabel>
      <line x1={30} y1={150} x2={310} y2={150} stroke="#64748b" strokeWidth={1} />
      <DiagramLabel x={170} y={165}>4 m (longitud total)</DiagramLabel>

      <DiagramLabel x={30} y={50}>R_A = ?</DiagramLabel>
      <DiagramLabel x={310} y={50}>R_B = ?</DiagramLabel>
    </svg>
  );
}

function DoorMomentDiagram() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full max-w-md" role="img" aria-label="Vista superior de una puerta con bisagra a la izquierda, abierta 15 grados respecto a una línea horizontal; una fuerza de 150 newtons se aplica perpendicular a la hoja, primero a 0.4 metros y luego a 0.15 metros de la bisagra.">
      <circle cx={40} cy={100} r={6} fill="#8FC7E8" />
      <DiagramLabel x={40} y={122}>Bisagra</DiagramLabel>

      <line x1={40} y1={100} x2={214} y2={100} stroke="#4E7CA6" strokeWidth={1.5} strokeDasharray="2,4" />
      <DiagramLabel x={80} y={92}>15°</DiagramLabel>

      <line x1={40} y1={100} x2={214} y2={53} stroke="#BEE3F5" strokeWidth={4} strokeLinecap="round" />

      {/* Force arrows are rotated -15°, the same tilt as the door, so they
          render exactly perpendicular to the door line (not just vertical) -
          matching the "perpendicular a la hoja" premise the torque math relies on. */}
      <g transform="translate(153 69.7) rotate(-15)">
        <line x1={0} y1={0} x2={0} y2={-32} stroke="#F0B65B" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M-6,-18 l6,-14 l6,14" fill="none" stroke="#F0B65B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <DiagramLabel x={145} y={28}>150 N</DiagramLabel>
      <DiagramLabel x={141} y={90}>0.4 m</DiagramLabel>

      <g transform="translate(95.6 85.1) rotate(-15)">
        <line x1={0} y1={0} x2={0} y2={-32} stroke="#9FD3EE" strokeWidth={2} strokeLinecap="round" strokeDasharray="3,3" />
        <path d="M-6,-18 l6,-14 l6,14" fill="none" stroke="#9FD3EE" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <DiagramLabel x={96} y={175}>0.15 m (más cerca)</DiagramLabel>
    </svg>
  );
}

function WrenchTorqueDiagram() {
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full max-w-md" role="img" aria-label="Llave de 0.25 metros de brazo sobre un perno, con una fuerza de 40 newtons perpendicular aplicada en el extremo.">
      <circle cx={50} cy={90} r={16} fill="none" stroke="#8FC7E8" strokeWidth={3} />
      <circle cx={50} cy={90} r={4} fill="#8FC7E8" />
      <DiagramLabel x={50} y={122}>Perno</DiagramLabel>

      <path d="M62,80 L230,50 L236,64 L66,94 Z" fill="none" stroke="#BEE3F5" strokeWidth={2.5} />

      {/* Rotated by the handle's own tilt (-10.12°) so the arrow renders
          exactly perpendicular to the wrench, matching "F perpendicular al mango". */}
      <g transform="translate(230 57) rotate(-10.12)">
        <line x1={0} y1={0} x2={0} y2={-32} stroke="#F0B65B" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M-6,-18 l6,-14 l6,14" fill="none" stroke="#F0B65B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <DiagramLabel x={224} y={16}>40 N</DiagramLabel>

      <line x1={50} y1={112} x2={230} y2={112} stroke="#64748b" strokeWidth={1} />
      <DiagramLabel x={140} y={128}>0.25 m</DiagramLabel>
    </svg>
  );
}

function CrowbarDiagram() {
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full max-w-lg" role="img" aria-label="Barra de 0.6 metros con el apoyo a 0.05 metros del extremo que hace contacto con una piedra; la fuerza de 80 newtons se aplica en el extremo lejano.">
      <line x1={30} y1={80} x2={290} y2={60} stroke="#8FC7E8" strokeWidth={5} strokeLinecap="round" />

      <path d="M270,64 l-10,20 h20 Z" fill="#4E7CA6" />
      <DiagramLabel x={270} y={104}>Apoyo</DiagramLabel>

      <rect x={280} y={60} width={26} height={26} rx={4} fill="none" stroke="#BEE3F5" strokeWidth={2.5} />
      <DiagramLabel x={293} y={104}>Piedra</DiagramLabel>

      <line x1={30} y1={80} x2={30} y2={45} stroke="#F0B65B" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M24,55 l6,-14 l6,14" fill="none" stroke="#F0B65B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={30} y={35}>80 N</DiagramLabel>

      <line x1={30} y1={120} x2={270} y2={120} stroke="#64748b" strokeWidth={1} />
      <DiagramLabel x={150} y={135}>0.55 m (brazo del esfuerzo)</DiagramLabel>
      <line x1={270} y1={100} x2={306} y2={100} stroke="#64748b" strokeWidth={1} />
      <DiagramLabel x={288} y={40}>0.05 m</DiagramLabel>
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

function EvaluationBanner({ evaluation }: { evaluation: M1AStepEvaluation }) {
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

function ItemFeedback({ evaluation }: { evaluation: M1AStepEvaluation["items"][number] }) {
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
    M1A_STEP_IDS.map((stepId) => {
      const savedStep = saved?.nodeId === "M1A" ? saved.steps?.[stepId] : undefined;
      return [stepId, normalizeStepProgress(stepId, savedStep)];
    })
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIdsFromSteps(steps);
  const fallbackCurrent = M1A_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ?? M1A_STEP_IDS[3];
  const savedCurrent = saved?.currentStepId;
  const firstIncompleteIndex = M1A_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isStepId(savedCurrent) ? M1A_STEP_IDS.indexOf(savedCurrent) : -1;
  const safeCurrent =
    isStepId(savedCurrent) &&
    (completedIds.length === M1A_STEP_IDS.length || savedCurrentIndex <= firstIncompleteIndex)
      ? savedCurrent
      : fallbackCurrent;

  return {
    nodeId: "M1A",
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
        : isM1AComplete(completedIds)
          ? now
          : null,
    steps,
    analytics: buildAnalytics(
      saved?.nodeId === "M1A" ? saved.analytics : {},
      steps,
      "challenge_opened",
      safeCurrent
    ),
  };
}

function normalizeStepProgress(stepId: M1AStepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  const hintLimit = M1A_STEPS.find((step) => step.id === stepId)?.hints.length ?? 0;

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

function normalizeDraft(stepId: M1AStepId, raw: unknown): M1AStepSubmission {
  const record = isRecord(raw) ? raw : {};
  const answers = isRecord(record.answers) ? record.answers : {};

  const normalizedAnswers: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string" || typeof value === "number") normalizedAnswers[key] = value;
  }
  return { stepId, answers: normalizedAnswers };
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const evaluations: EvaluationMap = {};

  for (const stepId of M1A_STEP_IDS) {
    const attempts = progress.steps[stepId]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt || !isRecord(lastAttempt.answer)) continue;
    if (lastAttempt.answer.stepId !== stepId) continue;

    try {
      evaluations[stepId] = evaluateM1AStep(lastAttempt.answer as unknown as M1AStepSubmission);
    } catch {
      // Ignore malformed legacy drafts; the normalized live draft remains usable.
    }
  }

  return evaluations;
}

function isDraftReady(draft: M1AStepSubmission): boolean {
  const step = M1A_STEPS.find((candidate) => candidate.id === draft.stepId);
  if (!step) return false;
  return step.questions.every((question) => {
    const value = draft.answers[question.id];
    return typeof value === "string" ? value.length > 0 : typeof value === "number";
  });
}

function canVisitStep(progress: NodeChallengeProgress, stepId: M1AStepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const targetIndex = M1A_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = M1A_STEP_IDS.findIndex((id) => !hasSolvedTimestamp(progress.steps[id]));
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(progress: NodeChallengeProgress): M1AStepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(steps: Record<string, ChallengeStepProgress>): M1AStepId[] {
  return M1A_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step: ChallengeStepProgress | undefined): boolean {
  return typeof step?.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}

function buildAnalytics(
  previous: NodeChallengeProgress["analytics"],
  steps: Record<string, ChallengeStepProgress>,
  event: string,
  stepId: M1AStepId,
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
    completionPercent: solvedSteps * 25,
    currentStepOrder: M1A_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function stepTitle(stepId: M1AStepId): string {
  return M1A_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

function toStepId(value: string): M1AStepId {
  return isStepId(value) ? value : "reactions";
}

function isStepId(value: unknown): value is M1AStepId {
  return typeof value === "string" && M1A_STEP_IDS.includes(value as M1AStepId);
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

export default M1AChallenge;
