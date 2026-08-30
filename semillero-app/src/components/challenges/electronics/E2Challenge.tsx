"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import {
  E2_ARCHITECTURE_MIN_CHARS,
  E2_CHALLENGE,
  E2_COMPONENT_CATEGORIES,
  E2_REQUIRED_CATEGORY_IDS,
  E2_REQUIREMENTS,
  E2_STEP_IDS,
  E2_STEPS,
  createEmptyE2ComponentRow,
  createEmptyE2Draft,
  isE2Complete,
  isE2ComponentCategory,
  isE2StepId,
  isE2SupportedEvidenceType,
  validateE2Submission,
  type E2ArchitectureSubmission,
  type E2BriefSubmission,
  type E2ComponentRow,
  type E2ComponentsSubmission,
  type E2SchematicSubmission,
  type E2StepDefinition,
  type E2StepId,
  type E2StepSubmission,
  type E2StepValidation,
} from "@/lib/challenges/electronics/e2";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E2ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

interface SubmissionResult {
  stepId: E2StepId;
  attemptNumber: number;
  validation: E2StepValidation;
}

export function E2Challenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E2ChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() =>
    createInitialProgress(savedProgress)
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    savedProgress?.updatedAt ?? progress.updatedAt
  );
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(progress);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(savedProgress?.completedAt));
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeStepIdRef = useRef<E2StepId>(toStepId(progress.currentStepId));
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
    if (
      !readOnly &&
      progress.completedAt &&
      !completionNotifiedRef.current
    ) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(progressRef.current);
    }
  }, [progress.completedAt, readOnly]);

  useEffect(() => {
    if (readOnly || progress.completedAt) return;

    const resumeClock = () => {
      if (
        progressRef.current.completedAt ||
        activeStartedAtRef.current !== null
      ) {
        return;
      }
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
  const currentStep: E2StepDefinition =
    E2_STEPS.find((step) => step.id === currentStepId) ?? E2_STEPS[0];
  const currentStepProgress = progress.steps[currentStepId];
  const currentDraft = normalizeDraft(currentStepId, currentStepProgress.draft);
  const currentIndex = E2_STEP_IDS.indexOf(currentStepId);
  const completedCount = getCompletedStepIds(progress.steps).length;
  const currentSolved = hasSolvedTimestamp(currentStepProgress);
  const totalAttempts = Object.values(progress.steps).reduce(
    (total, step) => total + step.attempts.length,
    0
  );
  const totalSeconds = Object.values(progress.steps).reduce(
    (total, step) => total + step.totalActiveSeconds,
    0
  );

  const changeDraft = (draft: E2StepSubmission) => {
    if (readOnly || draft.stepId !== currentStepId) return;
    setSubmissionResult(null);
    commit((current) => {
      const now = Date.now();
      const steps = {
        ...current.steps,
        [currentStepId]: {
          ...current.steps[currentStepId],
          draft: toJsonValue(draft),
          solvedAt: null,
        },
      };
      return {
        ...current,
        steps,
        completedAt: null,
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

  const submitStep = () => {
    if (readOnly) return;
    const validation = validateE2Submission(currentDraft);
    const now = Date.now();
    let completedChallenge = false;
    let attemptNumber = 1;

    const finalProgress = commit((current) => {
      const timedCurrent = consumeActiveTime(current, now);
      const previousStep = timedCurrent.steps[currentStepId];
      attemptNumber = previousStep.attempts.length + 1;
      const previousAttemptSeconds = previousStep.attempts.reduce(
        (total, attempt) => total + attempt.durationSeconds,
        0
      );
      const durationSeconds = Math.max(
        0,
        previousStep.totalActiveSeconds - previousAttemptSeconds
      );
      const attempt: ChallengeAttempt = {
        id: `E2-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "E2",
        stepId: currentStepId,
        attemptNumber,
        startedAt: now - durationSeconds * 1_000,
        submittedAt: now,
        durationSeconds,
        answer: toJsonValue(currentDraft),
        isCorrect: validation.isComplete ? null : false,
        hintsUsed: 0,
        metadata: {
          validationPassed: validation.isComplete,
          validationErrorCount: validation.errors.length,
          ...attemptMetadata(currentDraft),
        },
      };
      const steps = {
        ...timedCurrent.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(currentDraft),
          attempts: [...previousStep.attempts, attempt],
          solvedAt: validation.isComplete
            ? previousStep.solvedAt ?? now
            : null,
        },
      };
      completedChallenge = isE2Complete(getCompletedStepIds(steps));

      return {
        ...timedCurrent,
        steps,
        completedAt: completedChallenge
          ? timedCurrent.completedAt ?? now
          : null,
        updatedAt: now,
        analytics: buildAnalytics(
          timedCurrent.analytics,
          steps,
          validation.isComplete ? "step_submitted" : "validation_failed",
          currentStepId,
          {
            lastAttemptNumber: attemptNumber,
            lastAttemptValid: validation.isComplete,
          }
        ),
      };
    });

    setSubmissionResult({ stepId: currentStepId, attemptNumber, validation });
    setAnnouncement(
      validation.isComplete
        ? completedChallenge
          ? "Propuesta completa y registrada para revisión."
          : "Paso guardado. Ya puedes continuar."
        : validation.errors.join(" ")
    );

    if (completedChallenge && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(finalProgress);
    }
  };

  const goToStep = (stepId: E2StepId) => {
    if (
      stepId === currentStepId ||
      !canVisitStep(progressRef.current, stepId, readOnly)
    ) {
      return;
    }

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
        activeRemainderMsRef.current = 0;
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

    setSubmissionResult(null);
    setAnnouncement(
      `Paso ${E2_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`
    );
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  };

  const previousStepId = E2_STEP_IDS[currentIndex - 1];
  const nextStepId = E2_STEP_IDS[currentIndex + 1];

  return (
    <section className="overflow-hidden rounded-3xl border border-[#0A84C7]/25 bg-[#061925] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(10,132,199,0.24),transparent_45%),linear-gradient(135deg,#09283a,#071b28)] px-5 py-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#39C8F0]/30 bg-[#39C8F0]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8FE8FF]">
                E2 · Aplicación
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
            </div>
            <h2
              id="skill-detail-title"
              className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl"
            >
              {E2_CHALLENGE.title}
            </h2>
            <p
              id="skill-detail-description"
              className="mt-2 max-w-2xl text-sm leading-6 text-slate-300"
            >
              {E2_CHALLENGE.introduction}
            </p>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Tiempo" value={formatDuration(totalSeconds)} />
            <Stat label="Revisión" value="10 pts" />
          </dl>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-white">
              Paso {currentStep.order} de {E2_CHALLENGE.totalSteps}
            </span>
            <span className="text-right text-slate-400">
              {completedCount}/4 listos · {lastSavedAt ? "Progreso guardado" : "Preparando guardado"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso dentro del reto E2"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={completedCount}
            aria-valuetext={`${completedCount} de 4 pasos listos`}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0A84C7] to-[#39C8F0] transition-[width] duration-500"
              style={{ width: `${completedCount * 25}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Pasos del reto Del problema al esquema electrónico"
        className="border-b border-white/10 bg-[#071c29] px-4 py-3 sm:px-6 lg:px-8"
      >
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {E2_STEPS.map((step) => {
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
                  aria-label={`Paso ${step.order}: ${step.title}${solved ? ", listo" : accessible ? "" : ", bloqueado"}`}
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
          <StepEditor
            draft={currentDraft}
            disabled={readOnly}
            onChange={changeDraft}
          />

          {submissionResult?.stepId === currentStepId && (
            <SubmissionBanner result={submissionResult} />
          )}

          <StepActions
            readOnly={readOnly}
            solved={currentSolved}
            previousStepId={previousStepId}
            nextStepId={nextStepId}
            isLast={currentIndex === E2_STEP_IDS.length - 1}
            onPrevious={() => previousStepId && goToStep(previousStepId)}
            onNext={() => nextStepId && goToStep(nextStepId)}
            onSubmit={submitStep}
          />
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

function StepEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: E2StepSubmission;
  disabled: boolean;
  onChange: (draft: E2StepSubmission) => void;
}) {
  switch (draft.stepId) {
    case "brief":
      return (
        <BriefEditor draft={draft} disabled={disabled} onChange={onChange} />
      );
    case "components":
      return (
        <ComponentsEditor
          draft={draft}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "schematic":
      return (
        <SchematicEditor
          draft={draft}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "architecture":
      return (
        <ArchitectureEditor
          draft={draft}
          disabled={disabled}
          onChange={onChange}
        />
      );
  }
}

function BriefEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: E2BriefSubmission;
  disabled: boolean;
  onChange: (draft: E2BriefSubmission) => void;
}) {
  const confirmed = new Set(draft.confirmedRequirementIds);

  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <legend className="sr-only">
        Requisitos que debe cubrir tu propuesta
      </legend>
      <p aria-hidden="true" className="text-sm font-semibold text-white">
        Requisitos que debe cubrir tu propuesta
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        Lee cada requisito con atención y márcalo cuando lo hayas entendido. Los cinco son obligatorios.
      </p>
      <div className="mt-4 space-y-3">
        {E2_REQUIREMENTS.map((requirement, index) => {
          const checked = confirmed.has(requirement.id);
          return (
            <label
              key={requirement.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition ${
                checked
                  ? "border-[#39C8F0]/45 bg-[#0A84C7]/12"
                  : "border-white/10 bg-[#04131d]/65 hover:border-white/20"
              } ${disabled ? "cursor-default opacity-75" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = checked
                    ? draft.confirmedRequirementIds.filter(
                        (id) => id !== requirement.id
                      )
                    : [...draft.confirmedRequirementIds, requirement.id];
                  onChange({ ...draft, confirmedRequirementIds: next });
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#39C8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
              />
              <span className="flex-1">
                <span
                  className={`block text-sm font-semibold leading-5 ${
                    checked ? "text-white" : "text-slate-200"
                  }`}
                >
                  {requirement.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  {requirement.description}
                </span>
              </span>
              <span
                className="mt-0.5 shrink-0 text-[10px] font-bold text-slate-500"
                aria-hidden="true"
              >
                0{index + 1}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ComponentsEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: E2ComponentsSubmission;
  disabled: boolean;
  onChange: (draft: E2ComponentsSubmission) => void;
}) {
  const validation = validateE2Submission(draft);
  const missing = new Set(validation.missingCategoryIds ?? []);

  const updateRow = (id: string, patch: Partial<E2ComponentRow>) => {
    onChange({
      ...draft,
      rows: draft.rows.map((row) =>
        row.id === id ? { ...row, ...patch, id: row.id } : row
      ),
    });
  };

  const addRow = () => {
    const id = `component-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onChange({
      ...draft,
      rows: [...draft.rows, createEmptyE2ComponentRow(id)],
    });
  };

  const removeRow = (id: string) => {
    onChange({ ...draft, rows: draft.rows.filter((row) => row.id !== id) });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-white">Cobertura mínima</h4>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Puedes elegir cualquier marca o modelo; lo importante es justificar la función.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Categorías obligatorias">
          {E2_COMPONENT_CATEGORIES.filter((category) => category.required).map(
            (category) => {
              const isMissing = missing.has(category.id);
              return (
                <li
                  key={category.id}
                  className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold ${
                    isMissing
                      ? "border-white/10 bg-white/[0.035] text-slate-400"
                      : "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
                  }`}
                >
                  <span aria-hidden="true">{isMissing ? "○" : "✓"}</span>
                  {category.label}
                </li>
              );
            }
          )}
        </ul>
      </section>

      <div className="space-y-4">
        {draft.rows.map((row, index) => (
          <fieldset
            key={row.id}
            className="rounded-2xl border border-white/10 bg-[#04131d]/55 p-4 sm:p-5"
          >
            <legend className="sr-only">
              Componente {index + 1}
            </legend>
            <p aria-hidden="true" className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-[#8FE8FF]">
              Componente {index + 1}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría" htmlFor={`${row.id}-category`}>
                <select
                  id={`${row.id}-category`}
                  value={row.category}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRow(row.id, {
                      category: isE2ComponentCategory(event.target.value)
                        ? event.target.value
                        : "",
                    })
                  }
                  className={inputClassName}
                >
                  <option value="">Selecciona una categoría</option>
                  {E2_COMPONENT_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                      {category.required ? " · obligatoria" : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Componente" htmlFor={`${row.id}-name`}>
                <input
                  id={`${row.id}-name`}
                  type="text"
                  value={row.componentName}
                  disabled={disabled}
                  autoComplete="off"
                  placeholder="Nombre genérico o modelo opcional"
                  onChange={(event) =>
                    updateRow(row.id, { componentName: event.target.value })
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Propósito" htmlFor={`${row.id}-purpose`}>
                <textarea
                  id={`${row.id}-purpose`}
                  value={row.purpose}
                  disabled={disabled}
                  rows={3}
                  placeholder="¿Qué función cumple en el robot?"
                  onChange={(event) =>
                    updateRow(row.id, { purpose: event.target.value })
                  }
                  className={`${inputClassName} resize-y`}
                />
              </Field>

              <Field label="Justificación" htmlFor={`${row.id}-justification`}>
                <textarea
                  id={`${row.id}-justification`}
                  value={row.justification}
                  disabled={disabled}
                  rows={3}
                  placeholder="¿Por qué es adecuado para este problema?"
                  onChange={(event) =>
                    updateRow(row.id, { justification: event.target.value })
                  }
                  className={`${inputClassName} resize-y`}
                />
              </Field>
            </div>
            {!disabled && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="min-h-9 rounded-lg px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                >
                  Quitar componente
                </button>
              </div>
            )}
          </fieldset>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#39C8F0]/30 bg-[#39C8F0]/[0.07] px-4 text-xs font-bold text-[#8FE8FF] transition hover:bg-[#39C8F0]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
        >
          <PlusIcon />
          Añadir componente
        </button>
      )}
    </div>
  );
}

function SchematicEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: E2SchematicSubmission;
  disabled: boolean;
  onChange: (draft: E2SchematicSubmission) => void;
}) {
  return (
    <LocalEvidenceUploader
      nodeId="E2"
      fieldId="schematic"
      label="Archivo del esquema"
      description="Sube un PNG, JPG o PDF legible. Podrás abrir la vista previa antes de registrar el paso."
      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
      value={[...draft.files]}
      onChange={(files) => onChange({ ...draft, files })}
      maxFiles={1}
      disabled={disabled}
      required
    />
  );
}

function ArchitectureEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: E2ArchitectureSubmission;
  disabled: boolean;
  onChange: (draft: E2ArchitectureSubmission) => void;
}) {
  const characters = draft.explanation.trim().length;
  const enough = characters >= E2_ARCHITECTURE_MIN_CHARS;
  const chain = ["Sensor", "Procesamiento", "Decisión", "Driver", "Actuador"];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <ol
        className="flex flex-wrap items-center gap-2"
        aria-label="Flujo que debe explicar la respuesta"
      >
        {chain.map((item, index) => (
          <li key={item} className="contents">
            <span className="rounded-full border border-[#39C8F0]/25 bg-[#39C8F0]/[0.07] px-3 py-1.5 text-[11px] font-semibold text-[#8FE8FF]">
              {item}
            </span>
            {index < chain.length - 1 && (
              <span className="text-slate-500" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <label htmlFor="e2-architecture" className="mt-5 block text-sm font-semibold text-white">
        Explicación de tu arquitectura
      </label>
      <p id="e2-architecture-help" className="mt-1 text-xs leading-5 text-slate-400">
        Describe el flujo completo y relaciónalo con los requisitos del robot. Mínimo {E2_ARCHITECTURE_MIN_CHARS} caracteres.
      </p>
      <textarea
        id="e2-architecture"
        value={draft.explanation}
        disabled={disabled}
        rows={9}
        aria-describedby="e2-architecture-help e2-architecture-count"
        placeholder="Explica qué detectan los sensores, cómo procesa y decide el microcontrolador, cómo interviene el driver y qué hacen los actuadores…"
        onChange={(event) =>
          onChange({ ...draft, explanation: event.target.value })
        }
        className={`${inputClassName} mt-4 min-h-48 resize-y`}
      />
      <p
        id="e2-architecture-count"
        className={`mt-2 text-right text-xs font-semibold ${
          enough ? "text-emerald-300" : "text-slate-400"
        }`}
      >
        {characters}/{E2_ARCHITECTURE_MIN_CHARS} caracteres mínimos
      </p>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-300">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-[#061925] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#39C8F0]/55 focus:ring-2 focus:ring-[#39C8F0]/15 disabled:cursor-default disabled:opacity-70";

function SubmissionBanner({ result }: { result: SubmissionResult }) {
  const valid = result.validation.isComplete;
  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border p-4 ${
        valid
          ? "border-emerald-400/30 bg-emerald-400/[0.08]"
          : "border-amber-300/25 bg-amber-300/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            valid
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-amber-300/10 text-amber-200"
          }`}
          aria-hidden="true"
        >
          {valid ? <CheckIcon /> : <RefreshIcon />}
        </span>
        <div>
          <p className="text-sm font-bold text-white">
            {valid ? "Paso listo para revisión" : "Completa lo que falta"}
          </p>
          {valid ? (
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Guardamos esta versión como tu intento {result.attemptNumber}. La evaluación del contenido será manual.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-100">
              {result.validation.errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function StepActions({
  readOnly,
  solved,
  previousStepId,
  nextStepId,
  isLast,
  onPrevious,
  onNext,
  onSubmit,
}: {
  readOnly: boolean;
  solved: boolean;
  previousStepId?: E2StepId;
  nextStepId?: E2StepId;
  isLast: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {previousStepId && (
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
          >
            <ArrowLeftIcon />
            Paso anterior
          </button>
        )}
      </div>

      {!readOnly && !solved && (
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A84C7] to-[#1267B1] px-5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(18,103,177,0.28)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
        >
          {isLast ? "Registrar propuesta" : "Guardar este paso"}
          <ArrowRightIcon />
        </button>
      )}

      {nextStepId && solved && (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A84C7] to-[#1267B1] px-5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(18,103,177,0.28)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39C8F0]"
        >
          Continuar
          <ArrowRightIcon />
        </button>
      )}

      {readOnly && !previousStepId && <span />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
      <dt className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const source = saved?.nodeId === "E2" ? saved : undefined;
  const steps = Object.fromEntries(
    E2_STEP_IDS.map((stepId) => [
      stepId,
      normalizeStepProgress(stepId, source?.steps?.[stepId]),
    ])
  ) as Record<string, ChallengeStepProgress>;
  const completedIds = getCompletedStepIds(steps);
  const fallbackCurrent =
    E2_STEP_IDS.find((stepId) => !completedIds.includes(stepId)) ??
    E2_STEP_IDS[E2_STEP_IDS.length - 1];
  const firstIncompleteIndex = E2_STEP_IDS.indexOf(fallbackCurrent);
  const savedCurrentIndex = isE2StepId(source?.currentStepId)
    ? E2_STEP_IDS.indexOf(source.currentStepId)
    : -1;
  const safeCurrent =
    isE2StepId(source?.currentStepId) &&
    (completedIds.length === E2_STEP_IDS.length ||
      savedCurrentIndex <= firstIncompleteIndex)
      ? source.currentStepId
      : fallbackCurrent;
  const completed = isE2Complete(completedIds);

  return {
    nodeId: "E2",
    currentStepId: safeCurrent,
    shuffleSeed:
      typeof source?.shuffleSeed === "number" &&
      Number.isFinite(source.shuffleSeed)
        ? source.shuffleSeed
        : now % 2_147_483_647,
    startedAt:
      typeof source?.startedAt === "number" && Number.isFinite(source.startedAt)
        ? source.startedAt
        : now,
    updatedAt:
      typeof source?.updatedAt === "number" && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : now,
    completedAt:
      completed &&
      typeof source?.completedAt === "number" &&
      Number.isFinite(source.completedAt)
        ? source.completedAt
        : completed
          ? now
          : null,
    steps,
    analytics: buildAnalytics(
      source?.analytics ?? {},
      steps,
      "challenge_opened",
      safeCurrent
    ),
  };
}

function normalizeStepProgress(
  stepId: E2StepId,
  saved?: ChallengeStepProgress
): ChallengeStepProgress {
  const draft = normalizeDraft(stepId, saved?.draft);
  const draftIsValid = validateE2Submission(draft).isComplete;
  return {
    draft: toJsonValue(draft),
    attempts: Array.isArray(saved?.attempts)
      ? saved.attempts.filter(
          (attempt) =>
            isChallengeAttempt(attempt) &&
            attempt.nodeId === "E2" &&
            attempt.stepId === stepId
        )
      : [],
    revealedHints: 0,
    totalActiveSeconds:
      typeof saved?.totalActiveSeconds === "number" &&
      Number.isFinite(saved.totalActiveSeconds)
        ? Math.max(0, Math.floor(saved.totalActiveSeconds))
        : 0,
    solvedAt:
      draftIsValid &&
      typeof saved?.solvedAt === "number" &&
      Number.isFinite(saved.solvedAt) &&
      saved.solvedAt > 0
        ? saved.solvedAt
        : null,
  };
}

function normalizeDraft(stepId: E2StepId, raw: unknown): E2StepSubmission {
  const record = isRecord(raw) ? raw : {};

  if (stepId === "brief") {
    const validIds = new Set<string>(
      E2_REQUIREMENTS.map((requirement) => requirement.id)
    );
    const confirmedRequirementIds = Array.isArray(record.confirmedRequirementIds)
      ? [...new Set(
          record.confirmedRequirementIds.filter(
            (id): id is string => typeof id === "string" && validIds.has(id)
          )
        )]
      : [];
    return { stepId, confirmedRequirementIds };
  }

  if (stepId === "components") {
    const rows = Array.isArray(record.rows)
      ? record.rows
          .map((row, index) => normalizeComponentRow(row, index))
          .filter((row): row is E2ComponentRow => row !== null)
      : [];
    return rows.length > 0
      ? { stepId, rows }
      : (createEmptyE2Draft(stepId) as E2ComponentsSubmission);
  }

  if (stepId === "schematic") {
    const files = Array.isArray(record.files)
      ? record.files
          .map(normalizeEvidenceFile)
          .filter((file): file is LocalEvidenceFile => file !== null)
          .slice(0, 1)
      : [];
    return { stepId, files };
  }

  return {
    stepId: "architecture",
    explanation:
      typeof record.explanation === "string" ? record.explanation : "",
  };
}

function normalizeComponentRow(
  value: unknown,
  index: number
): E2ComponentRow | null {
  if (!isRecord(value)) return null;
  return {
    id:
      typeof value.id === "string" && value.id.trim().length > 0
        ? value.id
        : `component-restored-${index + 1}`,
    category: isE2ComponentCategory(value.category) ? value.category : "",
    componentName:
      typeof value.componentName === "string" ? value.componentName : "",
    purpose: typeof value.purpose === "string" ? value.purpose : "",
    justification:
      typeof value.justification === "string" ? value.justification : "",
  };
}

function normalizeEvidenceFile(value: unknown): LocalEvidenceFile | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    value.nodeId !== "E2" ||
    value.fieldId !== "schematic" ||
    typeof value.name !== "string" ||
    !isE2SupportedEvidenceType(value.mimeType) ||
    typeof value.size !== "number" ||
    !Number.isFinite(value.size) ||
    value.size <= 0 ||
    typeof value.lastModified !== "number" ||
    !Number.isFinite(value.lastModified) ||
    typeof value.storedAt !== "number" ||
    !Number.isFinite(value.storedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    nodeId: "E2",
    fieldId: "schematic",
    name: value.name,
    mimeType: value.mimeType,
    size: value.size,
    lastModified: value.lastModified,
    storedAt: value.storedAt,
  };
}

function canVisitStep(
  progress: NodeChallengeProgress,
  stepId: E2StepId,
  readOnly: boolean
): boolean {
  if (readOnly) return true;
  const targetIndex = E2_STEP_IDS.indexOf(stepId);
  const firstIncompleteIndex = E2_STEP_IDS.findIndex(
    (id) => !hasSolvedTimestamp(progress.steps[id])
  );
  return firstIncompleteIndex === -1 || targetIndex <= firstIncompleteIndex;
}

function getCompletedStepIds(
  steps: Record<string, ChallengeStepProgress>
): E2StepId[] {
  return E2_STEP_IDS.filter((stepId) => hasSolvedTimestamp(steps[stepId]));
}

function hasSolvedTimestamp(step: ChallengeStepProgress | undefined): boolean {
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
  stepId: E2StepId,
  extras: Record<string, string | number | boolean> = {}
): NodeChallengeProgress["analytics"] {
  const solvedSteps = getCompletedStepIds(steps).length;
  const attemptsTotal = Object.values(steps).reduce(
    (total, step) => total + step.attempts.length,
    0
  );
  const totalActiveSeconds = Object.values(steps).reduce(
    (total, step) => total + step.totalActiveSeconds,
    0
  );
  return {
    ...previous,
    attemptsTotal,
    hintsTotal: 0,
    totalActiveSeconds,
    solvedSteps,
    completionPercent: solvedSteps * 25,
    currentStepOrder: E2_STEP_IDS.indexOf(stepId) + 1,
    lastEvent: event,
    ...extras,
  };
}

function attemptMetadata(
  draft: E2StepSubmission
): Record<string, string | number | boolean> {
  switch (draft.stepId) {
    case "brief":
      return { confirmedRequirements: draft.confirmedRequirementIds.length };
    case "components":
      return {
        componentRows: draft.rows.length,
        requiredCategories: E2_REQUIRED_CATEGORY_IDS.length,
      };
    case "schematic":
      return {
        evidenceCount: draft.files.length,
        evidenceType: draft.files[0]?.mimeType ?? "none",
      };
    case "architecture":
      return { architectureCharacters: draft.explanation.trim().length };
  }
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function stepTitle(stepId: E2StepId): string {
  return E2_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

function toStepId(value: string): E2StepId {
  return isE2StepId(value) ? value : "brief";
}

function isChallengeAttempt(value: unknown): value is ChallengeAttempt {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.nodeId === "string" &&
    typeof value.stepId === "string" &&
    typeof value.attemptNumber === "number" &&
    Array.isArray(value.answer) === false &&
    value.answer !== undefined
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path
        d="m4 10 4 4 8-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M15 7a6 6 0 1 0 .5 5M15 3v4h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M16 10H4m0 0 4-4m-4 4 4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M4 10h12m0 0-4-4m4 4-4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default E2Challenge;
