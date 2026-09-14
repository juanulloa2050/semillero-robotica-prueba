"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  M3B_CATALOG,
  M3B_CHALLENGE,
  M3B_STEP_IDS,
  M3B_STEPS,
  evaluateM3BStep,
  getDeterministicChoiceOptions,
  getM3BStepTitle,
  isM3BComplete,
  type M3BChoiceOption,
  type M3BQuestionDefinition,
  type M3BStepDefinition,
  type M3BStepEvaluation,
  type M3BStepId,
  type M3BStepSubmission,
} from "@/lib/challenges/mechanics/m3b";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface M3BChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type EvaluationMap = Partial<Record<M3BStepId, M3BStepEvaluation>>;

export function M3BChallenge({ savedProgress, readOnly, onSave, onComplete }: M3BChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() => createInitialProgress(savedProgress));
  const [evaluations, setEvaluations] = useState<EvaluationMap>(() =>
    deriveEvaluations(createInitialProgress(savedProgress))
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(savedProgress?.updatedAt ?? progress.updatedAt);
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(progress.completedAt));
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef<M3BStepId>(toStepId(progress.currentStepId));
  const activeStartedAtRef = useRef<number | null>(null);
  const activeRemainderMsRef = useRef(0);

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
    setLastSavedAt(next.updatedAt);
    onSaveRef.current(next);
    return next;
  }, []);

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
      const next = { ...timed, updatedAt: now, analytics: buildAnalytics(timed.analytics, timed.steps, event, stepId) };
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
    if (!readOnly && !progressRef.current.completedAt) onSaveRef.current(progressRef.current);
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
      if (document.visibilityState === "hidden") pauseClock("visibility_hidden", true);
      else resumeClock();
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
  const currentStep = M3B_STEPS.find((step) => step.id === currentStepId) ?? M3B_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = currentStepProgress.draft as unknown as M3BStepSubmission;
  const currentEvaluation = evaluations[currentStepId];
  const completedStepIds = getCompletedStepIds(progress);
  const completedCount = completedStepIds.length;
  const currentIndex = M3B_STEP_IDS.indexOf(currentStepId);
  const currentSolved = hasSolvedTimestamp(currentStepProgress);
  const totalAttempts = Object.values(progress.steps).reduce((total, step) => total + step.attempts.length, 0);
  const totalHints = Object.values(progress.steps).reduce((total, step) => total + step.revealedHints, 0);
  const totalSeconds = Object.values(progress.steps).reduce((total, step) => total + step.totalActiveSeconds, 0);

  const changeDraft = (draft: M3BStepSubmission) => {
    if (readOnly || currentSolved || draft.stepId !== currentStepId) return;
    setEvaluations((current) => ({ ...current, [currentStepId]: undefined }));
    commit((current) => {
      const now = Date.now();
      const stepsNext = { ...current.steps, [currentStepId]: { ...current.steps[currentStepId], draft: toJsonValue(draft) } };
      return { ...current, steps: stepsNext, updatedAt: now, analytics: buildAnalytics(current.analytics, stepsNext, "answer_changed", currentStepId) };
    });
  };

  const revealHint = () => {
    if (readOnly || currentSolved || currentStepProgress.revealedHints >= currentStep.hints.length) return;
    const nextHintNumber = currentStepProgress.revealedHints + 1;
    commit((current) => {
      const now = Date.now();
      const stepsNext = { ...current.steps, [currentStepId]: { ...current.steps[currentStepId], revealedHints: nextHintNumber } };
      return {
        ...current,
        steps: stepsNext,
        updatedAt: now,
        analytics: buildAnalytics(current.analytics, stepsNext, "hint_revealed", currentStepId, { lastHintNumber: nextHintNumber }),
      };
    });
    setAnnouncement(`Pista ${nextHintNumber} disponible.`);
  };

  const submitStep = () => {
    if (readOnly || currentSolved || !isDraftReady(currentStep, currentDraft)) return;
    const submission = currentDraft;
    const evaluation = evaluateM3BStep(currentStep, submission);
    const now = Date.now();
    let completedChallenge = false;

    const finalProgress = commit((current) => {
      const timedCurrent = consumeActiveTime(current, now);
      const previousStep = timedCurrent.steps[currentStepId];
      const attemptNumber = previousStep.attempts.length + 1;
      const previousAttemptSeconds = previousStep.attempts.reduce((total, attempt) => total + attempt.durationSeconds, 0);
      const durationSeconds = Math.max(0, previousStep.totalActiveSeconds - previousAttemptSeconds);
      const attempt: ChallengeAttempt = {
        id: `M3B-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "M3B",
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
          correctItems: evaluation.items.filter((item) => item.isCorrect === true).length,
          reviewerRequired: true,
        },
      };
      const stepsNext = {
        ...timedCurrent.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(submission),
          attempts: [...previousStep.attempts, attempt],
          solvedAt: evaluation.isComplete && previousStep.solvedAt === null ? now : previousStep.solvedAt,
        },
      };
      const solvedIds = getCompletedStepIdsFromSteps(stepsNext);
      completedChallenge = isM3BComplete(solvedIds);
      return {
        ...timedCurrent,
        steps: stepsNext,
        updatedAt: now,
        completedAt: completedChallenge ? (timedCurrent.completedAt ?? now) : null,
        analytics: buildAnalytics(
          timedCurrent.analytics,
          stepsNext,
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

  const goToStep = (stepId: M3BStepId) => {
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
          analytics: buildAnalytics(timedCurrent.analytics, timedCurrent.steps, "step_navigated", stepId),
        };
      });
    }
    setAnnouncement(`Paso ${M3B_STEP_IDS.indexOf(stepId) + 1}: ${getM3BStepTitle(stepId)}.`);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const nextStepId = M3B_STEP_IDS[currentIndex + 1];
  const previousStepId = M3B_STEP_IDS[currentIndex - 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#4E7CA6]/25 bg-[#0B1B22] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(78,124,166,0.24),transparent_45%),linear-gradient(135deg,#132a35,#0c1e26)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#8FC7E8]/30 bg-[#8FC7E8]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#BEE3F5]">
                M3B · Profundización
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2 id="skill-detail-title" className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {M3B_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {M3B_CHALLENGE.introduction}
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
            <span className="font-semibold text-white">Paso {currentStep.order} de {M3B_CHALLENGE.totalSteps}</span>
            <span className="text-slate-400">
              {completedCount}/3 resueltos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto M3B"
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

      <nav aria-label="Pasos del reto de síntesis de mecanismos" className="border-b border-white/10 bg-[#0e222b] px-4 py-3 sm:px-6 lg:px-8">
        <ol className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {M3B_STEPS.map((step) => {
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
                      solved ? "bg-emerald-400/15 text-emerald-300" : selected ? "bg-[#8FC7E8]/15 text-[#BEE3F5]" : "bg-white/5"
                    }`}
                    aria-hidden="true"
                  >
                    {solved ? <CheckIcon /> : step.order}
                  </span>
                  <span className="hidden min-w-0 text-[11px] font-semibold leading-4 sm:block lg:text-xs">{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9FD3EE]">{currentStep.eyebrow}</p>
          <h3 ref={stepHeadingRef} tabIndex={-1} className="mt-2 font-heading text-2xl font-semibold text-white outline-none">
            {currentStep.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{currentStep.statement}</p>
        </header>

        <div className="space-y-6">
          <StepVisual step={currentStep} />
          <CatalogTable />

          <div className="min-w-0">
            <QuestionSet
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
                disabled={!isDraftReady(currentStep, currentDraft)}
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
                Reto M3B completado
              </div>
            )}
            {readOnly && !currentSolved && <p className="text-xs text-slate-400">Este paso aún no tiene una solución registrada.</p>}
          </div>
        </footer>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function StepVisual({ step }: { step: M3BStepDefinition }) {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#071820]">
      <div className="flex justify-center p-4 sm:p-6">
        <ScenarioDiagram step={step} />
      </div>
      <figcaption className="grid grid-cols-2 gap-3 border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-400 sm:grid-cols-4">
        <span><strong className="text-slate-200">Recorrido:</strong> {step.travelMm} mm</span>
        <span><strong className="text-slate-200">Envolvente:</strong> {step.envelope}</span>
        <span><strong className="text-slate-200">Precisión:</strong> {step.precisionRequirement}</span>
        <span><strong className="text-slate-200">Presupuesto:</strong> {step.budgetNote}</span>
      </figcaption>
    </figure>
  );
}

function DiagramLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-slate-300" style={{ fontSize: 11, fontWeight: 600 }}>
      {children}
    </text>
  );
}

function ScenarioDiagram({ step }: { step: M3BStepDefinition }) {
  if (step.diagram === "hatch") {
    return (
      <svg viewBox="0 0 260 170" className="h-auto w-full max-w-md" role="img" aria-label="Escotilla rectangular que debe girar 90 grados sobre una bisagra para abrir un compartimento.">
        <rect x={40} y={30} width={90} height={110} rx={6} fill="none" stroke="#8FC7E8" strokeWidth={2.5} strokeDasharray="4,4" />
        <line x1={40} y1={140} x2={40} y2={30} stroke="#BEE3F5" strokeWidth={5} strokeLinecap="round" />
        <path d="M40,140 A 100 100 0 0 0 130 60" fill="none" stroke="#4E7CA6" strokeWidth={1.5} strokeDasharray="2,4" />
        <DiagramLabel x={150} y={100}>90°</DiagramLabel>
        <circle cx={40} cy={140} r={5} fill="#F0B65B" />
        <DiagramLabel x={40} y={160}>bisagra</DiagramLabel>
      </svg>
    );
  }
  if (step.diagram === "gripper") {
    return (
      <svg viewBox="0 0 260 140" className="h-auto w-full max-w-md" role="img" aria-label="Dos dedos de una pinza separándose 40 milímetros para sujetar una pieza pequeña.">
        <rect x={100} y={55} width={30} height={30} rx={4} fill="none" stroke="#F0B65B" strokeWidth={2} />
        <line x1={95} y1={40} x2={60} y2={20} stroke="#BEE3F5" strokeWidth={4} strokeLinecap="round" />
        <line x1={95} y1={90} x2={60} y2={110} stroke="#BEE3F5" strokeWidth={4} strokeLinecap="round" />
        <line x1={135} y1={40} x2={170} y2={20} stroke="#BEE3F5" strokeWidth={4} strokeLinecap="round" />
        <line x1={135} y1={90} x2={170} y2={110} stroke="#BEE3F5" strokeWidth={4} strokeLinecap="round" />
        <path d="M60,20 L40,20" stroke="#4E7CA6" strokeWidth={1.5} strokeDasharray="2,4" />
        <path d="M170,20 L190,20" stroke="#4E7CA6" strokeWidth={1.5} strokeDasharray="2,4" />
        <DiagramLabel x={115} y={128}>40 mm de apertura</DiagramLabel>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 260 140" className="h-auto w-full max-w-md" role="img" aria-label="Plataforma que debe deslizarse 150 milímetros en línea recta dentro de un volumen reducido.">
      <rect x={20} y={40} width={220} height={60} rx={8} fill="none" stroke="#8FC7E8" strokeWidth={2} strokeDasharray="4,4" />
      <rect x={35} y={58} width={30} height={24} rx={4} fill="#F0B65B" opacity={0.85} />
      <line x1={70} y1={70} x2={200} y2={70} stroke="#4E7CA6" strokeWidth={2} strokeDasharray="3,3" />
      <path d="M190,64 l10,6 l-10,6" fill="none" stroke="#4E7CA6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <DiagramLabel x={130} y={116}>150 mm de recorrido</DiagramLabel>
    </svg>
  );
}

function CatalogTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.1em] text-slate-400">
            <th className="px-3 py-2.5 font-bold">Mecanismo</th>
            <th className="px-3 py-2.5 font-bold">Carrera</th>
            <th className="px-3 py-2.5 font-bold">Precisión</th>
            <th className="px-3 py-2.5 font-bold">Costo</th>
            <th className="px-3 py-2.5 font-bold">Complejidad</th>
          </tr>
        </thead>
        <tbody>
          {M3B_CATALOG.map((mechanism) => (
            <tr key={mechanism.id} className="border-b border-white/[0.05] text-slate-300 last:border-b-0">
              <td className="px-3 py-2.5 font-semibold text-white">{mechanism.name}</td>
              <td className="px-3 py-2.5">{mechanism.travel}</td>
              <td className="px-3 py-2.5">{mechanism.precision}</td>
              <td className="px-3 py-2.5">{mechanism.cost}</td>
              <td className="px-3 py-2.5">{mechanism.complexity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionSet({
  step,
  draft,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  step: M3BStepDefinition;
  draft: M3BStepSubmission;
  evaluation?: M3BStepEvaluation;
  seed: number;
  disabled: boolean;
  onChange: (draft: M3BStepSubmission) => void;
}) {
  const setAnswer = (questionId: string, value: string) => {
    onChange({ ...draft, answers: { ...draft.answers, [questionId]: value } });
  };

  return (
    <div className="space-y-4">
      {step.questions.map((question, index) => {
        const itemEvaluation = evaluation?.items.find((item) => item.questionId === question.id);
        return (
          <QuestionCard
            key={question.id}
            index={index}
            question={question}
            stepId={step.id}
            value={draft.answers[question.id]}
            evaluation={itemEvaluation}
            seed={seed}
            disabled={disabled}
            onChange={(value) => setAnswer(question.id, value)}
          />
        );
      })}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  stepId,
  value,
  evaluation,
  seed,
  disabled,
  onChange,
}: {
  index: number;
  question: M3BQuestionDefinition;
  stepId: M3BStepId;
  value: string | undefined;
  evaluation?: M3BStepEvaluation["items"][number];
  seed: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (question.type === "open_text") {
    const text = value ?? "";
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <label htmlFor={`M3B-${question.id}`} className="block text-sm font-semibold leading-6 text-white">
          <span className="mr-2 text-[#9FD3EE]">{index + 1}.</span>
          {question.prompt}
        </label>
        <textarea
          id={`M3B-${question.id}`}
          rows={5}
          value={text}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder}
          className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-[#04131d] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-[#8FC7E8]/60 focus:ring-2 focus:ring-[#8FC7E8]/15 disabled:opacity-65"
        />
        <p className={`mt-2 text-xs ${text.trim().length >= question.minCharacters ? "text-emerald-300" : "text-slate-400"}`}>
          {text.trim().length >= question.minCharacters
            ? `${text.trim().length} caracteres · listo para continuar`
            : "Escribe tu justificación para poder continuar"}
        </p>
        {evaluation && (
          <p className="mt-3 rounded-xl border border-[#8FC7E8]/20 bg-[#8FC7E8]/[0.06] px-3 py-2.5 text-xs leading-5 text-[#BEE3F5]">
            {evaluation.feedback}
          </p>
        )}
      </div>
    );
  }

  const options = getDeterministicChoiceOptions(question, stepId, seed);
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <legend className="sr-only">{question.prompt}</legend>
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
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
        ))}
      </div>
      {evaluation && <ItemFeedback evaluation={evaluation} />}
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
  option: M3BChoiceOption;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-xs leading-5 transition sm:text-sm ${
        checked ? "border-[#8FC7E8]/45 bg-[#4E7CA6]/12 text-white" : "border-white/10 bg-[#04131d]/65 text-slate-300 hover:border-white/20"
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
          <p className="mt-1 text-xs text-slate-400">Se muestran en orden y quedan registradas en tu proceso.</p>
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
            <li key={hint} className="flex gap-3 rounded-xl border border-white/[0.07] bg-[#04131d]/55 px-3 py-3 text-xs leading-5 text-slate-300">
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

function EvaluationBanner({ evaluation }: { evaluation: M3BStepEvaluation }) {
  return (
    <section
      aria-live="polite"
      className={`mt-5 rounded-2xl border p-4 ${
        evaluation.isComplete ? "border-emerald-400/30 bg-emerald-400/[0.08]" : "border-amber-300/25 bg-amber-300/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            evaluation.isComplete ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-300/10 text-amber-200"
          }`}
          aria-hidden="true"
        >
          {evaluation.isComplete ? <CheckIcon /> : <RefreshIcon />}
        </span>
        <div>
          <p className="text-sm font-bold text-white">{evaluation.isComplete ? "Paso resuelto" : "Buen intento: puedes ajustar"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{evaluation.feedback}</p>
        </div>
      </div>
    </section>
  );
}

function ItemFeedback({ evaluation }: { evaluation: M3BStepEvaluation["items"][number] }) {
  return (
    <p
      className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
        evaluation.isCorrect ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.05] text-amber-100"
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
  const stepsState = Object.fromEntries(
    M3B_STEP_IDS.map((stepId) => {
      const savedStep = saved?.nodeId === "M3B" ? saved.steps?.[stepId] : undefined;
      return [stepId, normalizeStepProgress(stepId, savedStep)];
    })
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIdsFromSteps(stepsState);
  const fallbackCurrent = M3B_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ?? M3B_STEP_IDS[2];
  const savedCurrent = saved?.currentStepId;
  const firstIncompleteIndex = M3B_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isStepId(savedCurrent) ? M3B_STEP_IDS.indexOf(savedCurrent) : -1;
  const safeCurrent =
    isStepId(savedCurrent) && (completedIds.length === M3B_STEP_IDS.length || savedCurrentIndex <= firstIncompleteIndex)
      ? savedCurrent
      : fallbackCurrent;

  return {
    nodeId: "M3B",
    currentStepId: safeCurrent,
    shuffleSeed: typeof saved?.shuffleSeed === "number" && Number.isFinite(saved.shuffleSeed) ? saved.shuffleSeed : now % 2_147_483_647,
    startedAt: typeof saved?.startedAt === "number" && Number.isFinite(saved.startedAt) ? saved.startedAt : now,
    updatedAt: typeof saved?.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : now,
    completedAt:
      typeof saved?.completedAt === "number" && Number.isFinite(saved.completedAt)
        ? saved.completedAt
        : isM3BComplete(completedIds)
          ? now
          : null,
    steps: stepsState,
    analytics: buildAnalytics(saved?.nodeId === "M3B" ? saved.analytics : {}, stepsState, "challenge_opened", safeCurrent),
  };
}

function normalizeStepProgress(stepId: M3BStepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  const hintLimit = 2;
  return {
    draft: toJsonValue(normalizeDraft(stepId, saved?.draft)),
    attempts: Array.isArray(saved?.attempts) ? saved.attempts : [],
    revealedHints: typeof saved?.revealedHints === "number" ? Math.max(0, Math.min(hintLimit, Math.floor(saved.revealedHints))) : 0,
    totalActiveSeconds: typeof saved?.totalActiveSeconds === "number" ? Math.max(0, Math.floor(saved.totalActiveSeconds)) : 0,
    solvedAt: typeof saved?.solvedAt === "number" && Number.isFinite(saved.solvedAt) ? saved.solvedAt : null,
  };
}

function normalizeDraft(stepId: M3BStepId, raw: unknown): M3BStepSubmission {
  const record = isRecord(raw) ? raw : {};
  const answers = isRecord(record.answers) ? record.answers : {};
  const normalizedAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string") normalizedAnswers[key] = value;
  }
  return { stepId, answers: normalizedAnswers };
}

function deriveEvaluations(progress: NodeChallengeProgress): EvaluationMap {
  const evaluations: EvaluationMap = {};
  for (const step of M3B_STEPS) {
    const attempts = progress.steps[step.id]?.attempts ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    if (!lastAttempt || !isRecord(lastAttempt.answer)) continue;
    if (lastAttempt.answer.stepId !== step.id) continue;
    try {
      evaluations[step.id] = evaluateM3BStep(step, lastAttempt.answer as unknown as M3BStepSubmission);
    } catch {
      // Ignore malformed legacy drafts; the normalized live draft remains usable.
    }
  }
  return evaluations;
}

function isDraftReady(step: M3BStepDefinition, draft: M3BStepSubmission): boolean {
  if (draft.stepId !== step.id) return false;
  return step.questions.every((question) => {
    const value = draft.answers[question.id];
    if (question.type === "open_text") return typeof value === "string" && value.trim().length >= question.minCharacters;
    return typeof value === "string" && value.length > 0;
  });
}

function canVisitStep(progress: NodeChallengeProgress, stepId: M3BStepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const targetIndex = M3B_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = M3B_STEP_IDS.findIndex((id) => !hasSolvedTimestamp(progress.steps[id]));
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(progress: NodeChallengeProgress): M3BStepId[] {
  return getCompletedStepIdsFromSteps(progress.steps);
}

function getCompletedStepIdsFromSteps(steps: Record<string, ChallengeStepProgress>): M3BStepId[] {
  return M3B_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step: ChallengeStepProgress | undefined): boolean {
  return typeof step?.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}

function buildAnalytics(
  previous: NodeChallengeProgress["analytics"],
  steps: Record<string, ChallengeStepProgress>,
  event: string,
  stepId: M3BStepId,
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
    completionPercent: Math.round((solvedSteps / M3B_STEP_IDS.length) * 100),
    currentStepOrder: M3B_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function toStepId(value: string): M3BStepId {
  return isStepId(value) ? value : "platform";
}

function isStepId(value: unknown): value is M3BStepId {
  return typeof value === "string" && M3B_STEP_IDS.includes(value as M3BStepId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export default M3BChallenge;
