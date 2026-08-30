"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import {
  E3B_CHALLENGE,
  E3B_MINIMUMS,
  E3B_MOTOR_STATES,
  E3B_STEP_IDS,
  createE3BDraft,
  isE3BStepId,
  validateE3B,
  type E3BCondition,
  type E3BExploreSubmission,
  type E3BMotorStateId,
  type E3BReflectSubmission,
  type E3BScenario,
  type E3BSimulateSubmission,
  type E3BSimulatorEntry,
  type E3BStepId,
  type E3BStepValidation,
  type E3BSubmission,
  type E3BTestSubmission,
} from "@/lib/challenges/electronics/e3b";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E3BChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

type ValidationMap = Partial<Record<E3BStepId, E3BStepValidation>>;

export function E3BChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E3BChallengeProps) {
  const [progress, setProgress] = useState<NodeChallengeProgress>(() =>
    createInitialProgress(savedProgress)
  );
  const [validations, setValidations] = useState<ValidationMap>(() =>
    deriveValidations(createInitialProgress(savedProgress))
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
            totalActiveSeconds: current.steps[stepId].totalActiveSeconds + elapsed,
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
  const currentDraft = currentStepProgress.draft as unknown as E3BSubmission;
  const currentValidation = validations[currentStepId];
  const currentSolved = isSolved(currentStepProgress);
  const completedCount = E3B_STEP_IDS.filter((id) => isSolved(progress.steps[id])).length;
  const totalAttempts = E3B_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].attempts.length,
    0
  );
  const totalHints = E3B_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].revealedHints,
    0
  );
  const totalSeconds = E3B_STEP_IDS.reduce(
    (total, id) => total + progress.steps[id].totalActiveSeconds,
    0
  );
  const hints = E3B_CHALLENGE.steps[currentStepId].hints;

  const changeDraft = (draft: E3BSubmission) => {
    if (readOnly || currentSolved || draft.stepId !== currentStepId) return;
    setValidations((current) => ({ ...current, [currentStepId]: undefined }));
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
    if (readOnly || currentSolved) return;
    const result = validateE3B(currentDraft);
    setValidations((current) => ({ ...current, [currentStepId]: result }));
    if (!result.isComplete) {
      setAnnouncement(result.feedback);
      return;
    }

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
        id: `E3B-${currentStepId}-${now}-${attemptNumber}`,
        nodeId: "E3B",
        stepId: currentStepId,
        attemptNumber,
        startedAt: now - Math.max(0, previousStep.totalActiveSeconds - usedSeconds) * 1_000,
        submittedAt: now,
        durationSeconds: Math.max(0, previousStep.totalActiveSeconds - usedSeconds),
        answer: toJsonValue(currentDraft),
        isCorrect: null,
        hintsUsed: previousStep.revealedHints,
        score: 1,
        metadata: { maxScore: 1, reviewerRequired: true },
      };
      const steps = {
        ...timed.steps,
        [currentStepId]: {
          ...previousStep,
          draft: toJsonValue(currentDraft),
          attempts: [...previousStep.attempts, attempt],
          solvedAt: previousStep.solvedAt ?? now,
        },
      };
      challengeComplete = E3B_STEP_IDS.every((id) => isSolved(steps[id]));
      const next = {
        ...timed,
        steps,
        updatedAt: now,
        completedAt: challengeComplete ? timed.completedAt ?? now : null,
      };
      return {
        ...next,
        analytics: { ...buildAnalytics(next, "step_solved"), reviewerRequired: true },
      };
    });

    setAnnouncement(result.feedback);
    if (challengeComplete && !completedNotifiedRef.current) {
      completedNotifiedRef.current = true;
      onCompleteRef.current(finalProgress);
    }
  };

  const goToStep = (stepId: E3BStepId) => {
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
    setAnnouncement(`Paso ${E3B_STEP_IDS.indexOf(stepId) + 1}: ${stepTitle(stepId)}.`);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const stepContent = E3B_CHALLENGE.steps[currentStepId];

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-line bg-night/70 text-ink shadow-2xl shadow-black/20">
      <div className="border-b border-line bg-gradient-to-br from-surface/80 to-night px-4 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">E3B · Laboratorio digital</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{E3B_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 max-w-2xl text-sm leading-6 text-muted">{E3B_CHALLENGE.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="Pasos" value={`${completedCount}/${E3B_STEP_IDS.length}`} />
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Pistas" value={totalHints} />
            <Stat label="Tiempo" value={formatDuration(totalSeconds)} />
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-cyan transition-[width] duration-500" style={{ width: `${(completedCount / E3B_STEP_IDS.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Pasos del laboratorio" className="flex flex-wrap gap-2">
            {E3B_STEP_IDS.map((stepId, index) => {
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
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{stepContent.badge}</Badge>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{stepContent.eyebrow}</p>
        </div>
        <h3 ref={headingRef} tabIndex={-1} className="mt-2 font-heading text-xl font-bold outline-none sm:text-2xl">
          {stepContent.title}
        </h3>
        {currentStepId === "simulate" && (
          <div role="alert" className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] p-4">
            <p className="text-sm font-bold text-amber-100">Importante</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/90">{E3B_CHALLENGE.steps.simulate.warning}</p>
          </div>
        )}

        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{stepContent.statement}</p>

        {currentStepId === "explore" ? (
          <ExploreStep
            draft={currentDraft as E3BExploreSubmission}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        ) : currentStepId === "simulate" ? (
          <SimulateStep
            draft={currentDraft as E3BSimulateSubmission}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        ) : currentStepId === "test" ? (
          <TestStep
            draft={currentDraft as E3BTestSubmission}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        ) : (
          <ReflectStep
            draft={currentDraft as E3BReflectSubmission}
            disabled={readOnly || currentSolved}
            onChange={changeDraft}
          />
        )}

        {hints.length > 0 && (
          <HintPanel
            hints={hints}
            revealed={currentStepProgress.revealedHints}
            disabled={readOnly || currentSolved}
            onReveal={revealHint}
          />
        )}
        {currentValidation && <ValidationBanner validation={currentValidation} />}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={E3B_STEP_IDS.indexOf(currentStepId) === 0}
            onClick={() => goToStep(E3B_STEP_IDS[E3B_STEP_IDS.indexOf(currentStepId) - 1])}
            className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            Paso anterior
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {!readOnly && !currentSolved && (
              <button
                type="button"
                onClick={submitStep}
                className="min-h-11 rounded-xl bg-action px-5 text-sm font-bold text-white transition hover:bg-tech focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                Registrar paso
              </button>
            )}
            {currentSolved && E3B_STEP_IDS.indexOf(currentStepId) < E3B_STEP_IDS.length - 1 && (
              <button type="button" onClick={() => goToStep(E3B_STEP_IDS[E3B_STEP_IDS.indexOf(currentStepId) + 1])} className="min-h-11 rounded-xl bg-action px-5 text-sm font-bold text-white hover:bg-tech focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
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

function ExploreStep({
  draft,
  disabled,
  onChange,
}: {
  draft: E3BExploreSubmission;
  disabled: boolean;
  onChange: (draft: E3BExploreSubmission) => void;
}) {
  const updateSimulator = (id: E3BSimulatorEntry["id"], patch: Partial<E3BSimulatorEntry>) => {
    onChange({
      ...draft,
      simulators: draft.simulators.map((simulator) => (simulator.id === id ? { ...simulator, ...patch } : simulator)),
    });
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {draft.simulators.map((simulator, index) => (
          <div key={simulator.id} className="rounded-2xl border border-line bg-surface/25 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan">Simulador {index + 1}</p>
            <MiniField
              label="Nombre"
              value={simulator.name}
              disabled={disabled}
              placeholder="Ej. Tinkercad Circuits"
              onChange={(value) => updateSimulator(simulator.id, { name: value })}
            />
            <MiniTextArea label="¿Qué permite simular?" value={simulator.whatCanSimulate} disabled={disabled} onChange={(value) => updateSimulator(simulator.id, { whatCanSimulate: value })} />
            <MiniTextArea label="Principal ventaja" value={simulator.advantage} disabled={disabled} onChange={(value) => updateSimulator(simulator.id, { advantage: value })} />
            <MiniTextArea label="Una limitación" value={simulator.limitation} disabled={disabled} onChange={(value) => updateSimulator(simulator.id, { limitation: value })} />
            <MiniTextArea label="¿En qué proyecto lo usarías?" value={simulator.useCase} disabled={disabled} onChange={(value) => updateSimulator(simulator.id, { useCase: value })} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniField
          label="Si tuvieras que simular la electrónica de un pequeño sistema robótico, ¿cuál de los tres escogerías?"
          value={draft.selectedSimulator}
          disabled={disabled}
          placeholder="Nombre del simulador elegido"
          onChange={(value) => onChange({ ...draft, selectedSimulator: value })}
        />
        <div className="mt-4">
          <MiniTextArea label="¿Por qué?" value={draft.selectionJustification} disabled={disabled} rows={4} onChange={(value) => onChange({ ...draft, selectionJustification: value })} />
          <CharCount value={draft.selectionJustification} min={E3B_MINIMUMS.selectionJustification} />
        </div>
      </div>
    </div>
  );
}

function SimulateStep({
  draft,
  disabled,
  onChange,
}: {
  draft: E3BSimulateSubmission;
  disabled: boolean;
  onChange: (draft: E3BSimulateSubmission) => void;
}) {
  const toggleSharedVideoState = (stateId: E3BMotorStateId) => {
    const next = draft.sharedVideoStateIds.includes(stateId)
      ? draft.sharedVideoStateIds.filter((id) => id !== stateId)
      : [...draft.sharedVideoStateIds, stateId];
    onChange({ ...draft, sharedVideoStateIds: next });
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniField label="¿Qué simulador utilizaste?" value={draft.simulatorUsed} disabled={disabled} onChange={(value) => onChange({ ...draft, simulatorUsed: value })} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniField label="Microcontrolador (opcional)" value={draft.microcontroller} disabled={disabled} onChange={(value) => onChange({ ...draft, microcontroller: value })} />
          <MiniField label="Driver de motores (opcional)" value={draft.motorDriver} disabled={disabled} onChange={(value) => onChange({ ...draft, motorDriver: value })} />
          <MiniField label="Tipo de motor (opcional)" value={draft.motorType} disabled={disabled} onChange={(value) => onChange({ ...draft, motorType: value })} />
          <MiniField label="Fuente de alimentación (opcional)" value={draft.powerSource} disabled={disabled} onChange={(value) => onChange({ ...draft, powerSource: value })} />
        </div>
      </div>

      <LocalEvidenceUploader
        nodeId="E3B"
        fieldId="simulate-overview"
        label="Evidencia general"
        description="Sube una captura donde se vean claramente los componentes electrónicos de tu simulación."
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        value={[...draft.overviewFiles]}
        onChange={(files) => onChange({ ...draft, overviewFiles: files })}
        disabled={disabled}
        required
      />

      <CodeBlock
        fieldId="simulate-code"
        codeText={draft.codeText}
        codeFiles={draft.codeFiles}
        disabled={disabled}
        onTextChange={(value) => onChange({ ...draft, codeText: value })}
        onFilesChange={(files) => onChange({ ...draft, codeFiles: files })}
      />

      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-ink">Evidencia de los cuatro estados</h4>
        <p className="mt-1 text-xs leading-5 text-muted">Sube evidencia de cada estado por separado, o un único video corto que los cubra todos y márcalo abajo.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {E3B_MOTOR_STATES.map((state) => (
            <div key={state.id} className="rounded-xl border border-line bg-surface/25 p-3">
              <p className="text-xs font-semibold text-ink">{state.title}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">{state.description}</p>
              <div className="mt-2">
                <LocalEvidenceUploader
                  nodeId="E3B"
                  fieldId={`state-${state.id}`}
                  label="Evidencia"
                  description="Foto, captura, video o PDF de este estado."
                  accept="image/*,video/*,application/pdf,.pdf"
                  value={[...(draft.stateFiles[state.id] ?? [])]}
                  onChange={(files) => onChange({ ...draft, stateFiles: { ...draft.stateFiles, [state.id]: files } })}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-line bg-surface/15 p-3">
          <p className="text-xs font-semibold text-ink">Alternativa: un solo video para varios estados</p>
          <div className="mt-2">
            <LocalEvidenceUploader
              nodeId="E3B"
              fieldId="state-shared-video"
              label="Video compartido (opcional)"
              description="Si un solo video cubre varios estados, súbelo aquí y marca cuáles."
              accept="video/*"
              value={[...draft.sharedVideoFiles]}
              onChange={(files) => onChange({ ...draft, sharedVideoFiles: files })}
              disabled={disabled}
            />
          </div>
          {draft.sharedVideoFiles.length > 0 && (
            <fieldset disabled={disabled} className="mt-3 flex flex-wrap gap-2">
              <legend className="mb-2 text-[11px] text-muted">¿Qué estados demuestra este video?</legend>
              {E3B_MOTOR_STATES.map((state) => (
                <label key={state.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${draft.sharedVideoStateIds.includes(state.id) ? "border-cyan/40 bg-cyan/10 text-ink" : "border-line text-muted"}`}>
                  <input type="checkbox" checked={draft.sharedVideoStateIds.includes(state.id)} onChange={() => toggleSharedVideoState(state.id)} className="h-3.5 w-3.5 accent-cyan" />
                  {state.title}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniTextArea
          label="¿Por qué utilizaste un driver entre el microcontrolador y los motores, en lugar de conectarlos directamente?"
          value={draft.driverExplanation}
          disabled={disabled}
          rows={5}
          onChange={(value) => onChange({ ...draft, driverExplanation: value })}
        />
        <CharCount value={draft.driverExplanation} min={E3B_MINIMUMS.driverExplanation} />
      </div>
    </div>
  );
}

function TestStep({
  draft,
  disabled,
  onChange,
}: {
  draft: E3BTestSubmission;
  disabled: boolean;
  onChange: (draft: E3BTestSubmission) => void;
}) {
  const updateCondition = (id: E3BCondition["id"], patch: Partial<E3BCondition>) => {
    onChange({ ...draft, conditions: draft.conditions.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition)) });
  };
  const updateScenario = (id: E3BScenario["id"], patch: Partial<E3BScenario>) => {
    onChange({ ...draft, scenarios: draft.scenarios.map((scenario) => (scenario.id === id ? { ...scenario, ...patch } : scenario)) });
  };
  const conditionLabels = ["Condición 1", "Condición 2", "Condición 3 · Opcional"];
  const scenarioLabels = ["Escenario A", "Escenario B", "Escenario C · Opcional"];

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 rounded-2xl border border-line bg-night/25 p-4 sm:grid-cols-2 sm:p-5">
        <MiniField label="¿Qué simulador utilizaste?" value={draft.simulatorUsed} disabled={disabled} onChange={(value) => onChange({ ...draft, simulatorUsed: value })} />
        <MiniField label="¿Qué sensor utilizaste?" value={draft.sensorUsed} disabled={disabled} onChange={(value) => onChange({ ...draft, sensorUsed: value })} />
      </div>

      <LocalEvidenceUploader
        nodeId="E3B"
        fieldId="test-overview"
        label="Captura general"
        description="Sube una captura general de la simulación con el sensor integrado."
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        value={[...draft.overviewFiles]}
        onChange={(files) => onChange({ ...draft, overviewFiles: files })}
        disabled={disabled}
        required
      />

      <CodeBlock
        fieldId="test-code"
        codeText={draft.codeText}
        codeFiles={draft.codeFiles}
        disabled={disabled}
        onTextChange={(value) => onChange({ ...draft, codeText: value })}
        onFilesChange={(files) => onChange({ ...draft, codeFiles: files })}
      />

      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-ink">Define el comportamiento esperado</h4>
        <p className="mt-1 text-xs leading-5 text-muted">Antes de subir evidencia, declara qué esperas que ocurra en cada condición del sensor.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {draft.conditions.map((condition, index) => (
            <div key={condition.id} className="rounded-xl border border-line bg-surface/25 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan">{conditionLabels[index]}</p>
              <MiniTextArea label="Condición del sensor" value={condition.sensorCondition} disabled={disabled} rows={3} onChange={(value) => updateCondition(condition.id, { sensorCondition: value })} />
              <MiniTextArea label="Comportamiento de los motores" value={condition.motorBehavior} disabled={disabled} rows={3} onChange={(value) => updateCondition(condition.id, { motorBehavior: value })} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-ink">Pon a prueba tu sistema</h4>
        <p className="mt-1 text-xs leading-5 text-muted">Modifica la entrada del sensor y demuestra que los motores responden de acuerdo con las reglas que definiste.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {draft.scenarios.map((scenario, index) => (
            <div key={scenario.id} className="rounded-xl border border-line bg-surface/25 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan">{scenarioLabels[index]}</p>
              <MiniField label="Valor/estado del sensor" value={scenario.sensorValue} disabled={disabled} onChange={(value) => updateScenario(scenario.id, { sensorValue: value })} />
              <MiniTextArea label="Comportamiento observado" value={scenario.observedBehavior} disabled={disabled} rows={3} onChange={(value) => updateScenario(scenario.id, { observedBehavior: value })} />
              <div className="mt-3">
                <LocalEvidenceUploader
                  nodeId="E3B"
                  fieldId={scenario.id}
                  label="Evidencia"
                  description="Foto, captura, video o PDF de este escenario."
                  accept="image/*,video/*,application/pdf,.pdf"
                  value={[...scenario.files]}
                  onChange={(files) => updateScenario(scenario.id, { files })}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniTextArea
          label="Explica con tus palabras cómo viaja la información desde el sensor hasta producir un cambio en los motores."
          value={draft.informationFlowExplanation}
          disabled={disabled}
          rows={5}
          onChange={(value) => onChange({ ...draft, informationFlowExplanation: value })}
        />
        <CharCount value={draft.informationFlowExplanation} min={E3B_MINIMUMS.informationFlowExplanation} />
      </div>
    </div>
  );
}

function ReflectStep({
  draft,
  disabled,
  onChange,
}: {
  draft: E3BReflectSubmission;
  disabled: boolean;
  onChange: (draft: E3BReflectSubmission) => void;
}) {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniTextArea
          label="¿Qué ventaja encuentras en simular un sistema electrónico antes de construirlo físicamente?"
          value={draft.simulationAdvantage}
          disabled={disabled}
          rows={5}
          onChange={(value) => onChange({ ...draft, simulationAdvantage: value })}
        />
        <CharCount value={draft.simulationAdvantage} min={E3B_MINIMUMS.reflectionAnswer} />
      </div>
      <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
        <MiniTextArea
          label="¿Qué crees que podría comportarse diferente cuando lleves esta simulación al hardware real?"
          value={draft.realWorldDifference}
          disabled={disabled}
          rows={5}
          onChange={(value) => onChange({ ...draft, realWorldDifference: value })}
        />
        <CharCount value={draft.realWorldDifference} min={E3B_MINIMUMS.reflectionAnswer} />
      </div>
    </div>
  );
}

function CodeBlock({
  fieldId,
  codeText,
  codeFiles,
  disabled,
  onTextChange,
  onFilesChange,
}: {
  fieldId: string;
  codeText: string;
  codeFiles: readonly LocalEvidenceFile[];
  disabled: boolean;
  onTextChange: (value: string) => void;
  onFilesChange: (files: LocalEvidenceFile[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
      <h4 className="text-sm font-semibold text-ink">Código</h4>
      <p className="mt-1 text-xs leading-5 text-muted">Pega tu código o adjunta un archivo. Con uno de los dos es suficiente.</p>
      <textarea
        value={codeText}
        disabled={disabled}
        rows={8}
        spellCheck={false}
        onChange={(event) => onTextChange(event.target.value)}
        className="mt-3 w-full resize-y rounded-xl border border-line bg-[#04131d] p-3 font-mono text-xs leading-5 text-[#8fe8ff] outline-none focus:border-cyan/50 disabled:opacity-70"
        placeholder="// Pega aquí tu código…"
      />
      <div className="mt-3">
        <LocalEvidenceUploader
          nodeId="E3B"
          fieldId={fieldId}
          label="Archivo de código (opcional)"
          description="Sube un .ino, .py, .cpp, .txt u otro archivo de código."
          accept=".ino,.cpp,.c,.py,.txt,.zip,text/*,application/zip"
          value={[...codeFiles]}
          onChange={onFilesChange}
          multiple
          maxFiles={3}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function MiniField({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block text-xs font-semibold text-ink first:mt-0">
      {label}
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-10 w-full rounded-lg border border-line bg-night/45 px-3 text-sm font-normal text-ink outline-none placeholder:text-muted/45 focus:border-cyan/50 disabled:opacity-70"
      />
    </label>
  );
}

function MiniTextArea({
  label,
  value,
  disabled,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block text-xs font-semibold text-ink first:mt-0">
      {label}
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-lg border border-line bg-night/45 p-2.5 text-xs font-normal leading-5 text-ink outline-none focus:border-cyan/50 disabled:opacity-70"
      />
    </label>
  );
}

function CharCount({ value, min }: { value: string; min: number }) {
  const remaining = Math.max(0, min - value.trim().length);
  return (
    <p className={`mt-2 text-right text-xs ${remaining === 0 ? "text-ok" : "text-muted"}`}>
      {remaining === 0 ? "Extensión mínima cumplida" : `Faltan ${remaining} caracteres`}
    </p>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan/35 bg-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan">
      {children}
    </span>
  );
}

function HintPanel({ hints, revealed, disabled, onReveal }: { hints: readonly string[]; revealed: number; disabled: boolean; onReveal: () => void }) {
  return (
    <aside className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">¿Necesitas una pista?</h4>
          <p className="mt-1 text-xs text-muted">Hay una pista disponible y su consulta queda registrada.</p>
        </div>
        {!disabled && revealed < hints.length && (
          <button type="button" onClick={onReveal} className="min-h-10 rounded-xl border border-amber-300/30 px-4 text-xs font-bold text-amber-100 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            Ver pista
          </button>
        )}
      </div>
      {revealed > 0 && <p className="mt-4 rounded-xl border border-line bg-night/35 p-3 text-xs leading-5 text-muted">{hints[0]}</p>}
    </aside>
  );
}

function ValidationBanner({ validation }: { validation: E3BStepValidation }) {
  return (
    <div aria-live="polite" className={`mt-5 rounded-2xl border p-4 ${validation.isComplete ? "border-ok/30 bg-ok/[0.08]" : "border-amber-300/25 bg-amber-300/[0.06]"}`}>
      <p className="text-sm font-bold text-ink">{validation.isComplete ? "Paso registrado" : "Aún faltan datos"}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{validation.feedback}</p>
      {validation.errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-100/90">
          {validation.errors.map((error) => (
            <li key={error}>• {error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <dl className="min-w-20 rounded-xl border border-line bg-night/25 px-3 py-2">
      <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </dl>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const source = saved?.nodeId === "E3B" ? saved : undefined;
  const steps = Object.fromEntries(
    E3B_STEP_IDS.map((id) => [id, normalizeStep(id, source?.steps[id])])
  ) as Record<string, ChallengeStepProgress>;
  const firstIncomplete = E3B_STEP_IDS.find((id) => !isSolved(steps[id])) ?? E3B_STEP_IDS[E3B_STEP_IDS.length - 1];
  const requested = isE3BStepId(source?.currentStepId) ? source.currentStepId : firstIncomplete;
  const safeCurrent = E3B_STEP_IDS.indexOf(requested) <= E3B_STEP_IDS.indexOf(firstIncomplete) ? requested : firstIncomplete;
  const allSolved = E3B_STEP_IDS.every((id) => isSolved(steps[id]));
  const progress: NodeChallengeProgress = {
    nodeId: "E3B",
    currentStepId: safeCurrent,
    shuffleSeed: finite(source?.shuffleSeed) ?? now % 2_147_483_647,
    startedAt: finite(source?.startedAt) ?? now,
    updatedAt: finite(source?.updatedAt) ?? now,
    completedAt: allSolved ? finite(source?.completedAt) ?? now : null,
    steps,
    analytics: source?.analytics ?? {},
  };
  return { ...progress, analytics: buildAnalytics(progress, "challenge_opened") };
}

function normalizeStep(id: E3BStepId, saved?: ChallengeStepProgress): ChallengeStepProgress {
  const hintLimit = E3B_CHALLENGE.steps[id].hints.length;
  return {
    draft: toJsonValue(normalizeDraft(id, saved?.draft)),
    attempts: Array.isArray(saved?.attempts) ? saved.attempts : [],
    revealedHints: Math.min(hintLimit, Math.max(0, Math.floor(finite(saved?.revealedHints) ?? 0))),
    totalActiveSeconds: Math.max(0, Math.floor(finite(saved?.totalActiveSeconds) ?? 0)),
    solvedAt: positive(saved?.solvedAt),
  };
}

function normalizeDraft(id: E3BStepId, raw: unknown): E3BSubmission {
  const fallback = createE3BDraft(id);
  if (!isRecord(raw) || raw.stepId !== id) return fallback;

  if (id === "explore") {
    const fallbackExplore = fallback as E3BExploreSubmission;
    const rawSimulators = Array.isArray(raw.simulators) ? raw.simulators : [];
    const simulators = fallbackExplore.simulators.map((emptySimulator, index) => {
      const rawSimulator = rawSimulators[index];
      if (!isRecord(rawSimulator)) return emptySimulator;
      return {
        id: emptySimulator.id,
        name: text(rawSimulator.name),
        whatCanSimulate: text(rawSimulator.whatCanSimulate),
        advantage: text(rawSimulator.advantage),
        limitation: text(rawSimulator.limitation),
        useCase: text(rawSimulator.useCase),
      };
    });
    return {
      stepId: "explore",
      simulators,
      selectedSimulator: text(raw.selectedSimulator),
      selectionJustification: text(raw.selectionJustification),
    };
  }

  if (id === "simulate") {
    const stateFilesRaw = isRecord(raw.stateFiles) ? raw.stateFiles : {};
    const stateFiles: Partial<Record<E3BMotorStateId, readonly LocalEvidenceFile[]>> = {};
    for (const state of E3B_MOTOR_STATES) {
      const files = normalizeFiles(stateFilesRaw[state.id]);
      if (files.length > 0) stateFiles[state.id] = files;
    }
    const sharedVideoStateIds = Array.isArray(raw.sharedVideoStateIds)
      ? raw.sharedVideoStateIds.filter((value): value is E3BMotorStateId =>
          typeof value === "string" && E3B_MOTOR_STATES.some((state) => state.id === value)
        )
      : [];
    return {
      stepId: "simulate",
      simulatorUsed: text(raw.simulatorUsed),
      microcontroller: text(raw.microcontroller),
      motorDriver: text(raw.motorDriver),
      motorType: text(raw.motorType),
      powerSource: text(raw.powerSource),
      overviewFiles: normalizeFiles(raw.overviewFiles),
      codeText: text(raw.codeText),
      codeFiles: normalizeFiles(raw.codeFiles),
      stateFiles,
      sharedVideoFiles: normalizeFiles(raw.sharedVideoFiles),
      sharedVideoStateIds,
      driverExplanation: text(raw.driverExplanation),
    };
  }

  if (id === "test") {
    const fallbackTest = fallback as E3BTestSubmission;
    const rawConditions = Array.isArray(raw.conditions) ? raw.conditions : [];
    const conditions = fallbackTest.conditions.map((emptyCondition, index) => {
      const rawCondition = rawConditions[index];
      if (!isRecord(rawCondition)) return emptyCondition;
      return {
        id: emptyCondition.id,
        sensorCondition: text(rawCondition.sensorCondition),
        motorBehavior: text(rawCondition.motorBehavior),
      };
    });
    const rawScenarios = Array.isArray(raw.scenarios) ? raw.scenarios : [];
    const scenarios = fallbackTest.scenarios.map((emptyScenario, index) => {
      const rawScenario = rawScenarios[index];
      if (!isRecord(rawScenario)) return emptyScenario;
      return {
        id: emptyScenario.id,
        sensorValue: text(rawScenario.sensorValue),
        observedBehavior: text(rawScenario.observedBehavior),
        files: normalizeFiles(rawScenario.files),
      };
    });
    return {
      stepId: "test",
      simulatorUsed: text(raw.simulatorUsed),
      sensorUsed: text(raw.sensorUsed),
      overviewFiles: normalizeFiles(raw.overviewFiles),
      codeText: text(raw.codeText),
      codeFiles: normalizeFiles(raw.codeFiles),
      conditions,
      scenarios,
      informationFlowExplanation: text(raw.informationFlowExplanation),
    };
  }

  return {
    stepId: "reflect",
    simulationAdvantage: text(raw.simulationAdvantage),
    realWorldDifference: text(raw.realWorldDifference),
  };
}

function deriveValidations(progress: NodeChallengeProgress): ValidationMap {
  const result: ValidationMap = {};
  for (const id of E3B_STEP_IDS) {
    const last = progress.steps[id].attempts.at(-1)?.answer;
    if (!isRecord(last) || last.stepId !== id) continue;
    try {
      result[id] = validateE3B(normalizeDraft(id, last));
    } catch {
      /* Ignore malformed legacy attempts. */
    }
  }
  return result;
}

function canVisit(progress: NodeChallengeProgress, target: E3BStepId, readOnly: boolean): boolean {
  if (readOnly) return true;
  const firstIncomplete = E3B_STEP_IDS.findIndex((id) => !isSolved(progress.steps[id]));
  return firstIncomplete === -1 || E3B_STEP_IDS.indexOf(target) <= firstIncomplete;
}

function buildAnalytics(progress: NodeChallengeProgress, event: string): NodeChallengeProgress["analytics"] {
  return {
    ...progress.analytics,
    attemptsTotal: E3B_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].attempts.length, 0),
    hintsTotal: E3B_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].revealedHints, 0),
    totalActiveSeconds: E3B_STEP_IDS.reduce((sum, id) => sum + progress.steps[id].totalActiveSeconds, 0),
    solvedSteps: E3B_STEP_IDS.filter((id) => isSolved(progress.steps[id])).length,
    currentStepOrder: E3B_STEP_IDS.indexOf(toStepId(progress.currentStepId)) + 1,
    lastEvent: event,
  };
}

function isSolved(step?: ChallengeStepProgress): boolean {
  return positive(step?.solvedAt) !== null;
}
function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function toStepId(value: unknown): E3BStepId {
  return isE3BStepId(value) ? value : E3B_STEP_IDS[0];
}
function stepTitle(id: E3BStepId): string {
  return E3B_CHALLENGE.steps[id].title;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
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
    return [
      {
        id: item.id,
        nodeId: item.nodeId,
        fieldId: item.fieldId,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        lastModified: item.lastModified,
        storedAt: item.storedAt,
      },
    ];
  });
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default E3BChallenge;
