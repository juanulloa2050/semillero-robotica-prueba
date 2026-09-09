"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  D1C_CHALLENGE,
  D1C_STEPS,
  D1C_STEP_IDS,
  createD1CDraft,
  evaluateD1CStep,
  isD1CDraftReady,
  normalizeD1CDraft,
  type D1CStepId,
  type D1CSubmission,
} from "@/lib/challenges/design/d1c";
import {
  DESIGN_BRAND,
  DESIGN_BRAND_LIGHT,
  DesignFooter,
  DesignHintPanel,
  DesignOptionGrid,
  DesignResultBanner,
  DesignVisual,
} from "@/components/challenges/design/shared";
import type { ChallengeAttempt, JsonValue, NodeChallengeProgress } from "@/lib/types";

const NODE_ID = "D1C";

interface Props {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

export function D1CChallenge({ savedProgress, readOnly, onSave, onComplete, onExit }: Props) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const commit = useCallback((mutate: (current: NodeChallengeProgress) => NodeChallengeProgress) => {
    const next = mutate(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    onSaveRef.current(next);
    return next;
  }, []);

  const stepId = toStepId(progress.currentStepId);
  const stepIndex = D1C_STEP_IDS.indexOf(stepId);
  const stepDefinition = D1C_STEPS[stepId];
  const stepProgress = progress.steps[stepId];
  const draft = normalizeD1CDraft(stepId, stepProgress.draft);
  const solved = Boolean(stepProgress.solvedAt);
  const completedCount = D1C_STEP_IDS.filter((id) => Boolean(progress.steps[id].solvedAt)).length;
  const totalAttempts = Object.values(progress.steps).reduce((total, s) => total + s.attempts.length, 0);

  function updateDraft(next: D1CSubmission) {
    if (readOnly || solved) return;
    setLastResult(null);
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        [stepId]: { ...current.steps[stepId], draft: toJson(next) },
      },
    }));
  }

  function revealHint() {
    if (readOnly || solved) return;
    commit((current) => {
      const step = current.steps[stepId];
      return {
        ...current,
        updatedAt: Date.now(),
        steps: {
          ...current.steps,
          [stepId]: { ...step, revealedHints: Math.min(step.revealedHints + 1, stepDefinition.hints.length) },
        },
      };
    });
  }

  function submit() {
    if (readOnly || solved || !isD1CDraftReady(draft)) return;
    const evaluation = evaluateD1CStep(draft);
    // eslint-disable-next-line react-hooks/purity -- submit() is an event handler, not render logic.
    const now = Date.now();
    const current = progressRef.current.steps[stepId];
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: NODE_ID,
      stepId,
      attemptNumber: current.attempts.length + 1,
      startedAt: progressRef.current.startedAt,
      submittedAt: now,
      durationSeconds: current.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: evaluation.isCorrect,
      hintsUsed: current.revealedHints,
    };
    const next = commit((prev) => {
      const nextSteps = {
        ...prev.steps,
        [stepId]: {
          ...current,
          attempts: [...current.attempts, attempt],
          solvedAt: evaluation.isCorrect ? now : current.solvedAt,
        },
      };
      const allComplete = D1C_STEP_IDS.every((id) => Boolean(nextSteps[id].solvedAt));
      return {
        ...prev,
        updatedAt: now,
        completedAt: allComplete ? prev.completedAt ?? now : prev.completedAt,
        steps: nextSteps,
      };
    });
    setLastResult({ isCorrect: evaluation.isCorrect, message: evaluation.feedback });
    if (next.completedAt && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  }

  function goToStep(target: D1CStepId) {
    if (target === stepId) return;
    commit((current) => ({ ...current, currentStepId: target, updatedAt: Date.now() }));
    setLastResult(null);
  }

  const nextStepId = D1C_STEP_IDS[stepIndex + 1];

  return (
    <section
      className="overflow-hidden rounded-3xl border shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
      style={{ borderColor: `${DESIGN_BRAND}40`, background: "#0B1220" }}
    >
      <div
        className="border-b border-white/10 px-5 py-5 sm:px-7 lg:px-9"
        style={{
          background: `radial-gradient(circle at top right, ${DESIGN_BRAND}30, transparent 45%), linear-gradient(135deg,#101a35,#0b1428)`,
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: `${DESIGN_BRAND_LIGHT}4D`, background: `${DESIGN_BRAND_LIGHT}1A`, color: DESIGN_BRAND_LIGHT }}
              >
                {NODE_ID} · Subhabilidad
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
              {progress.completedAt && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">
                  Completado
                </span>
              )}
            </div>
            <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {D1C_CHALLENGE.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{D1C_CHALLENGE.introduction}</p>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
            <Stat label="Pasos" value={`${completedCount}/${D1C_STEP_IDS.length}`} />
            <Stat label="Intentos" value={totalAttempts} />
            <Stat label="Estado" value={progress.completedAt ? "✓" : "—"} />
          </dl>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-white">Paso {stepIndex + 1} de {D1C_STEP_IDS.length}</span>
            <span className="text-slate-400">{completedCount}/{D1C_STEP_IDS.length} resueltos</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={D1C_STEP_IDS.length}
            aria-valuenow={completedCount}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(8, (completedCount / D1C_STEP_IDS.length) * 100)}%`,
                background: `linear-gradient(90deg, ${DESIGN_BRAND}, ${DESIGN_BRAND_LIGHT})`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Pasos del reto" className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r lg:p-4">
          <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            {D1C_STEP_IDS.map((id, index) => {
              const s = D1C_STEPS[id];
              const itemSolved = Boolean(progress.steps[id].solvedAt);
              const enabled = readOnly || index <= completedCount;
              const active = id === stepId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => goToStep(id)}
                    className="w-full rounded-xl border px-3 py-3 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      borderColor: active ? `${DESIGN_BRAND_LIGHT}66` : "rgba(255,255,255,0.1)",
                      background: active ? `${DESIGN_BRAND}26` : "rgba(255,255,255,0.035)",
                      color: active ? "#fff" : "#cbd5e1",
                    }}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: DESIGN_BRAND_LIGHT }}>
                      Paso {index + 1}
                    </span>
                    <span className="mt-1 block font-semibold">{s.title}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {itemSolved ? "Completado" : enabled ? "Disponible" : "Bloqueado"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
          <header className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9FD3EE]">{stepDefinition.eyebrow}</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-white">{stepDefinition.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{stepDefinition.statement}</p>
          </header>

          <div className="space-y-6">
            {stepDefinition.image && (
              <DesignVisual src={stepDefinition.image.src} alt={stepDefinition.image.alt} />
            )}

            {stepDefinition.kind === "single_choice" ? (
              <DesignOptionGrid
                options={stepDefinition.options}
                selected={draft.kind === "single_choice" && draft.selectedOptionId ? [draft.selectedOptionId] : []}
                multi={false}
                disabled={readOnly || solved}
                onToggle={(id) => updateDraft({ stepId, kind: "single_choice", selectedOptionId: id })}
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                <label htmlFor={`D1C-${stepId}`} className="block text-sm font-semibold leading-6 text-white">
                  Masa total ({stepDefinition.unit})
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    id={`D1C-${stepId}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={draft.kind === "numeric" ? draft.value : ""}
                    disabled={readOnly || solved}
                    onChange={(e) => updateDraft({ stepId, kind: "numeric", value: e.target.value })}
                    placeholder="Ej. 939.54"
                    className="w-full rounded-lg border border-white/15 bg-[#03152f] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#8CA0F0] disabled:opacity-60"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Tolerancia de ±{Math.round(stepDefinition.tolerance * 1000) / 10}% sobre el valor de referencia.
                </p>
              </div>
            )}

            {lastResult && <DesignResultBanner isCorrect={lastResult.isCorrect} message={lastResult.message} />}

            <DesignHintPanel
              hints={stepDefinition.hints}
              revealed={stepProgress.revealedHints}
              disabled={readOnly || solved}
              onReveal={revealHint}
            />
          </div>

          <DesignFooter
            solved={solved}
            readOnly={readOnly}
            canSubmit={isD1CDraftReady(draft)}
            submitLabel={stepProgress.attempts.length > 0 ? "Comprobar de nuevo" : "Comprobar respuesta"}
            onSubmit={submit}
            onExit={onExit}
          />

          {solved && nextStepId && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => goToStep(nextStepId)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                style={{ background: `linear-gradient(90deg, #22318f, ${DESIGN_BRAND})` }}
              >
                Continuar al siguiente paso
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="font-heading text-base font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{label}</div>
    </div>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const steps: NodeChallengeProgress["steps"] = {};
  for (const id of D1C_STEP_IDS) {
    const savedStep = saved?.nodeId === NODE_ID ? saved.steps[id] : undefined;
    steps[id] = {
      draft: savedStep?.draft ?? toJson(createD1CDraft(id)),
      attempts: savedStep?.attempts ?? [],
      revealedHints: savedStep?.revealedHints ?? 0,
      totalActiveSeconds: savedStep?.totalActiveSeconds ?? 0,
      solvedAt: savedStep?.solvedAt ?? null,
    };
  }
  const firstIncomplete = D1C_STEP_IDS.find((id) => !steps[id].solvedAt) ?? D1C_STEP_IDS[0];
  const requestedCurrent =
    saved?.nodeId === NODE_ID && D1C_STEP_IDS.includes(saved.currentStepId as D1CStepId)
      ? (saved.currentStepId as D1CStepId)
      : firstIncomplete;
  return {
    nodeId: NODE_ID,
    currentStepId: requestedCurrent,
    shuffleSeed: saved?.nodeId === NODE_ID ? saved.shuffleSeed : now,
    startedAt: saved?.nodeId === NODE_ID ? saved.startedAt : now,
    updatedAt: saved?.nodeId === NODE_ID ? saved.updatedAt : now,
    completedAt:
      saved?.nodeId === NODE_ID && D1C_STEP_IDS.every((id) => steps[id].solvedAt) ? saved.completedAt : null,
    steps,
    analytics: saved?.nodeId === NODE_ID ? saved.analytics : {},
  };
}

function toStepId(value: string): D1CStepId {
  return D1C_STEP_IDS.includes(value as D1CStepId) ? (value as D1CStepId) : D1C_STEP_IDS[0];
}

function toJson(value: D1CSubmission): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
