"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  E1B_BOARD_ASSET,
  E1B_CHALLENGE,
  E1B_DATASHEET_QUESTIONS,
  E1B_INTERFACE_OPTIONS,
  E1B_PERIPHERALS,
  E1B_STEPS,
  E1B_STEP_IDS,
  E1B_VOLTAGE_OPTIONS,
  createEmptyE1BSubmission,
  evaluateE1BStep,
  isE1BDraftReady,
  normalizeE1BSubmission,
  type E1BDatasheetSubmission,
  type E1BInterfacesSubmission,
  type E1BStepEvaluation,
  type E1BStepId,
  type E1BStepSubmission,
} from "@/lib/challenges/electronics/e1b";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E1BChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function E1BChallenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E1BChallengeProps) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [evaluations, setEvaluations] = useState<
    Partial<Record<E1BStepId, E1BStepEvaluation>>
  >(() => deriveEvaluations(initial));
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const activeStartedAtRef = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
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
    const stepId = toStepId(progressRef.current.currentStepId);
    const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1_000));
    activeStartedAtRef.current = startedAt === null ? null : now;
    const current = progressRef.current;
    const step = current.steps[stepId];
    const next: NodeChallengeProgress = {
      ...current,
      updatedAt: now,
      steps: step
        ? {
            ...current.steps,
            [stepId]: {
              ...step,
              totalActiveSeconds: step.totalActiveSeconds + elapsed,
            },
          }
        : current.steps,
      analytics: {
        ...current.analytics,
        lastEvent: eventName,
        lastStepId: stepId,
        datasheetOpened:
          current.analytics.datasheetOpened === true || stepId === "datasheet",
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

  const stepId = toStepId(progress.currentStepId);
  const stepIndex = E1B_STEP_IDS.indexOf(stepId);
  const stepDefinition = E1B_STEPS[stepIndex];
  const stepProgress = progress.steps[stepId];
  const draft = normalizeE1BSubmission(stepId, stepProgress.draft);
  const evaluation = evaluations[stepId];
  const solved = hasSolved(stepProgress);
  const completedCount = E1B_STEP_IDS.filter((id) => hasSolved(progress.steps[id])).length;
  const attempts = Object.values(progress.steps).reduce(
    (total, item) => total + item.attempts.length,
    0
  );
  const totalSeconds = Object.values(progress.steps).reduce(
    (total, item) => total + item.totalActiveSeconds,
    0
  );

  const changeDraft = (nextDraft: E1BStepSubmission) => {
    if (readOnly || solved || nextDraft.stepId !== stepId) return;
    setEvaluations((current) => ({ ...current, [stepId]: undefined }));
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        [stepId]: { ...current.steps[stepId], draft: toJson(nextDraft) },
      },
      analytics: { ...current.analytics, lastEvent: "answer_changed" },
    }));
  };

  const revealHint = () => {
    if (readOnly || solved || stepProgress.revealedHints >= stepDefinition.hints.length) return;
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        [stepId]: {
          ...current.steps[stepId],
          revealedHints: Math.min(
            stepDefinition.hints.length,
            current.steps[stepId].revealedHints + 1
          ),
        },
      },
      analytics: { ...current.analytics, lastEvent: "hint_opened" },
    }));
    setAnnouncement("Pista disponible debajo de la actividad.");
  };

  const submit = () => {
    if (readOnly || solved || !isE1BDraftReady(draft)) {
      setAnnouncement("Completa todos los campos antes de comprobar tu respuesta.");
      return;
    }

    const result = evaluateE1BStep(draft);
    const now = Date.now();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "E1B",
      stepId,
      attemptNumber: stepProgress.attempts.length + 1,
      startedAt: Math.max(progress.startedAt, now - stepProgress.totalActiveSeconds * 1_000),
      submittedAt: now,
      durationSeconds: stepProgress.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: result.isComplete,
      hintsUsed: stepProgress.revealedHints,
      score: result.score,
      metadata: { maxScore: result.maxScore, ...result.metadata },
    };
    setEvaluations((current) => ({ ...current, [stepId]: result }));

    const next = commit((current) => {
      const nextSteps = {
        ...current.steps,
        [stepId]: {
          ...current.steps[stepId],
          attempts: [...current.steps[stepId].attempts, attempt],
          solvedAt: result.isComplete ? now : null,
        },
      };
      const allComplete = E1B_STEP_IDS.every((id) => hasSolved(nextSteps[id]));
      return {
        ...current,
        updatedAt: now,
        completedAt: allComplete ? current.completedAt ?? now : current.completedAt,
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
  };

  const goToStep = (target: E1BStepId) => {
    if (target === stepId) return;
    if (!readOnly && !progress.completedAt) checkpoint("step_changed");
    commit((current) => ({ ...current, currentStepId: target, updatedAt: Date.now() }));
    window.setTimeout(() => headingRef.current?.focus(), 0);
  };

  const nextStep = E1B_STEP_IDS[stepIndex + 1];

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface/45 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
      <header className="border-b border-line bg-gradient-to-r from-[#0c3155] to-[#0a2945] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan">
              Electrónica · E1B
            </p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-ink sm:text-3xl">
              {E1B_CHALLENGE.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-muted">
              {E1B_CHALLENGE.subtitle} Resuelve ambos pasos para completar el reto.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <Metric label="Pasos" value={`${completedCount}/2`} />
            <Metric label="Intentos" value={String(attempts)} />
            <Metric label="Tiempo" value={formatTime(totalSeconds)} />
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-night/60" role="progressbar" aria-label="Progreso interno" aria-valuemin={0} aria-valuemax={2} aria-valuenow={completedCount}>
          <div className="h-full rounded-full bg-gradient-to-r from-action to-cyan transition-[width]" style={{ width: `${(completedCount / 2) * 100}%` }} />
        </div>
      </header>

      <div className="grid min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Pasos del reto" className="border-b border-line bg-night/25 p-3 lg:border-b-0 lg:border-r lg:p-4">
          <ol className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {E1B_STEPS.map((item, index) => {
              const itemSolved = hasSolved(progress.steps[item.id]);
              const enabled = readOnly || index <= completedCount;
              return (
                <li key={item.id}>
                  <button type="button" disabled={!enabled} onClick={() => goToStep(item.id)} className={`w-full rounded-xl border px-3 py-3 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-45 ${item.id === stepId ? "border-cyan/40 bg-cyan/10 text-ink" : "border-line bg-surface/35 text-muted hover:text-ink"}`}>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan">Paso {index + 1}</span>
                    <span className="mt-1 block font-semibold">{item.title}</span>
                    <span className="mt-1 block text-[10px]">{itemSolved ? "Completado" : enabled ? "Disponible" : "Bloqueado"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan">{stepDefinition.eyebrow} · Paso {stepIndex + 1} de 2</p>
          <h3 ref={headingRef} tabIndex={-1} className="mt-2 font-heading text-2xl font-semibold text-ink outline-none">{stepDefinition.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{stepDefinition.statement}</p>

          <div className="mt-6">
            {stepId === "datasheet" ? (
              <DatasheetStep draft={draft as E1BDatasheetSubmission} readOnly={readOnly || solved} onChange={changeDraft} evaluation={evaluation} />
            ) : (
              <InterfacesStep draft={draft as E1BInterfacesSubmission} readOnly={readOnly || solved} onChange={changeDraft} evaluation={evaluation} />
            )}
          </div>

          {stepProgress.revealedHints > 0 && (
            <aside className="mt-5 rounded-2xl border border-cyan/25 bg-cyan/[0.07] p-4 text-sm leading-6 text-ice">
              <span className="font-semibold text-cyan">Pista:</span> {stepDefinition.hints[0]}
            </aside>
          )}

          {evaluation && (
            <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${evaluation.isComplete ? "border-ok/30 bg-ok/[0.07] text-ok" : "border-danger/30 bg-danger/[0.07] text-ice"}`}>
              {evaluation.feedback}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button type="button" onClick={revealHint} disabled={readOnly || solved || stepProgress.revealedHints >= stepDefinition.hints.length} className="min-h-11 rounded-xl border border-line px-4 text-xs font-semibold text-muted hover:border-cyan/30 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-45">
              {stepProgress.revealedHints > 0 ? "Pista consultada" : "Ver pista"}
            </button>
            <div className="flex flex-wrap gap-2">
              {stepIndex > 0 && <button type="button" onClick={() => goToStep(E1B_STEP_IDS[stepIndex - 1])} className="min-h-11 rounded-xl border border-line px-4 text-xs font-semibold text-ice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Anterior</button>}
              {!solved && !readOnly && <button type="button" onClick={submit} disabled={!isE1BDraftReady(draft)} className="min-h-11 rounded-xl bg-gradient-to-r from-action to-tech px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(2,56,125,.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-45">Comprobar respuesta</button>}
              {solved && nextStep && <button type="button" onClick={() => goToStep(nextStep)} className="min-h-11 rounded-xl bg-gradient-to-r from-action to-tech px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Continuar al siguiente paso</button>}
              {progress.completedAt && <span className="inline-flex min-h-11 items-center rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-semibold text-ok">Reto completado</span>}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
      </div>
    </article>
  );
}

function DatasheetStep({ draft, readOnly, onChange, evaluation }: { draft: E1BDatasheetSubmission; readOnly: boolean; onChange: (draft: E1BDatasheetSubmission) => void; evaluation?: E1BStepEvaluation }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-cyan/25 bg-cyan/[0.07] p-5">
        <p className="text-sm font-semibold text-ink">Tu tarea: encontrar el datasheet oficial</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Busca el documento <span className="font-semibold text-ice">ESP32 Series Datasheet</span> publicado por Espressif. Consulta allí los niveles eléctricos, el ADC y las interfaces de comunicación antes de responder.
        </p>
        <p className="mt-4 rounded-xl border border-white/10 bg-night/35 px-4 py-3 text-xs leading-5 text-slate-300">
          Verifica que el documento provenga del fabricante y usa sus especificaciones para justificar tus respuestas.
        </p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {E1B_DATASHEET_QUESTIONS.map((question) => (
          <fieldset key={question.id} disabled={readOnly} className="rounded-2xl border border-line bg-night/25 p-4">
            <legend className="sr-only">{question.prompt}</legend>
            <p aria-hidden="true" className="text-sm font-semibold leading-6 text-ink">{question.prompt}</p>
            <div className="mt-3 space-y-2">
              {question.options.map((option) => <Choice key={option.id} name={question.id} checked={draft.closedAnswers[question.id] === option.id} label={option.label} disabled={readOnly} onChange={() => onChange({ ...draft, closedAnswers: { ...draft.closedAnswers, [question.id]: option.id } })} />)}
            </div>
            {evaluation && <p className={`mt-3 text-xs ${evaluation.items.find((item) => item.itemId === question.id)?.isCorrect ? "text-ok" : "text-danger"}`}>{evaluation.items.find((item) => item.itemId === question.id)?.feedback}</p>}
          </fieldset>
        ))}
        <label className="block rounded-2xl border border-line bg-night/25 p-4">
          <span className="text-sm font-semibold leading-6 text-ink">¿Qué revisarías antes de conectar un sensor?</span>
          <span className="mt-1 block text-xs leading-5 text-muted">Explica tu respuesta teniendo en cuenta alimentación, niveles lógicos, referencia de GND y adaptación si fuera necesaria.</span>
          <textarea value={draft.compatibilityReview} disabled={readOnly} onChange={(event) => onChange({ ...draft, compatibilityReview: event.target.value })} rows={5} maxLength={1500} className="mt-3 w-full rounded-xl border border-line bg-night/45 p-3 text-sm leading-6 text-ink outline-none focus:border-cyan/50 disabled:opacity-70" />
        </label>
      </div>
    </div>
  );
}

function InterfacesStep({ draft, readOnly, onChange, evaluation }: { draft: E1BInterfacesSubmission; readOnly: boolean; onChange: (draft: E1BInterfacesSubmission) => void; evaluation?: E1BStepEvaluation }) {
  return (
    <div className="space-y-5">
      <figure className="overflow-hidden rounded-2xl border border-line bg-night/30">
        <Image src={`${PUBLIC_BASE_PATH}${E1B_BOARD_ASSET.src}`} alt={E1B_BOARD_ASSET.alt} width={1600} height={900} className="h-auto w-full" />
      </figure>
      <div className="grid gap-3 md:grid-cols-2">
        {E1B_PERIPHERALS.map((peripheral) => (
          <label key={peripheral.id} className="rounded-2xl border border-line bg-night/25 p-4">
            <span className="text-sm font-semibold text-ink">{peripheral.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted">{peripheral.signalDescription}</span>
            <select value={draft.mappings[peripheral.id] ?? ""} disabled={readOnly} onChange={(event) => onChange({ ...draft, mappings: { ...draft.mappings, [peripheral.id]: event.target.value as E1BInterfacesSubmission["mappings"][typeof peripheral.id] } })} className="mt-3 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-cyan/50">
              <option value="">Selecciona una interfaz</option>
              {E1B_INTERFACE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <fieldset disabled={readOnly} className="rounded-2xl border border-line bg-night/25 p-4">
        <legend className="sr-only">Un sensor entrega señales de 5 V y el ESP32 trabaja a 3.3 V. ¿Qué harías antes de conectarlo?</legend>
        <p aria-hidden="true" className="text-sm font-semibold leading-6 text-ink">Un sensor entrega señales de 5 V y el ESP32 trabaja a 3.3 V. ¿Qué harías antes de conectarlo?</p>
        <div className="mt-3 space-y-2">{E1B_VOLTAGE_OPTIONS.map((option) => <Choice key={option.id} name="voltage-compatibility" checked={draft.voltageCompatibilityOptionId === option.id} label={option.label} disabled={readOnly} onChange={() => onChange({ ...draft, voltageCompatibilityOptionId: option.id })} />)}</div>
      </fieldset>
      {evaluation && <p className={`rounded-2xl border p-4 text-sm ${evaluation.isComplete ? "border-ok/30 bg-ok/[.06] text-ok" : "border-danger/30 bg-danger/[.06] text-ice"}`}>Resultado del conjunto: {evaluation.score}/{evaluation.maxScore}. {evaluation.feedback}</p>}
    </div>
  );
}

function Choice({ name, checked, label, disabled, onChange }: { name: string; checked: boolean; label: string; disabled: boolean; onChange: () => void }) {
  return <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-xs leading-5 transition-colors ${checked ? "border-cyan/40 bg-cyan/10 text-ink" : "border-line bg-surface/35 text-muted"}`}><input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="mt-1 accent-[#84b6d7]" /><span>{label}</span></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-night/35 px-3 py-2"><strong className="block text-sm text-ink">{value}</strong><span className="text-muted">{label}</span></div>;
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const steps: Record<string, ChallengeStepProgress> = {};
  for (const stepId of E1B_STEP_IDS) {
    const savedStep = saved?.nodeId === "E1B" ? saved.steps?.[stepId] : undefined;
    const draft = normalizeE1BSubmission(stepId, savedStep?.draft ?? createEmptyE1BSubmission(stepId));
    const attempts = Array.isArray(savedStep?.attempts)
      ? savedStep.attempts.filter((attempt) => attempt.nodeId === "E1B" && attempt.stepId === stepId)
      : [];
    steps[stepId] = {
      draft: toJson(draft),
      attempts,
      revealedHints: Math.max(0, Math.min(1, savedStep?.revealedHints ?? 0)),
      totalActiveSeconds: Math.max(0, savedStep?.totalActiveSeconds ?? 0),
      solvedAt: typeof savedStep?.solvedAt === "number" && savedStep.solvedAt > 0 ? savedStep.solvedAt : null,
    };
  }
  const firstIncomplete = E1B_STEP_IDS.find((id) => !hasSolved(steps[id])) ?? E1B_STEP_IDS[0];
  const requested = saved?.nodeId === "E1B" && E1B_STEP_IDS.includes(saved.currentStepId as E1BStepId) ? (saved.currentStepId as E1BStepId) : firstIncomplete;
  return {
    nodeId: "E1B",
    currentStepId: requested,
    shuffleSeed: saved?.nodeId === "E1B" && Number.isFinite(saved.shuffleSeed) ? saved.shuffleSeed : now,
    startedAt: saved?.nodeId === "E1B" && saved.startedAt > 0 ? saved.startedAt : now,
    updatedAt: saved?.nodeId === "E1B" && saved.updatedAt > 0 ? saved.updatedAt : now,
    completedAt: saved?.nodeId === "E1B" && saved.completedAt && E1B_STEP_IDS.every((id) => hasSolved(steps[id])) ? saved.completedAt : null,
    steps,
    analytics: saved?.nodeId === "E1B" ? saved.analytics ?? {} : { lastEvent: "challenge_started", datasheetOpened: true },
  };
}

function deriveEvaluations(progress: NodeChallengeProgress): Partial<Record<E1BStepId, E1BStepEvaluation>> {
  const result: Partial<Record<E1BStepId, E1BStepEvaluation>> = {};
  for (const stepId of E1B_STEP_IDS) {
    const attempt = progress.steps[stepId]?.attempts.at(-1);
    if (attempt) result[stepId] = evaluateE1BStep(normalizeE1BSubmission(stepId, attempt.answer));
  }
  return result;
}

function toStepId(value: string): E1BStepId {
  return E1B_STEP_IDS.includes(value as E1BStepId) ? (value as E1BStepId) : E1B_STEP_IDS[0];
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

export default E1BChallenge;
