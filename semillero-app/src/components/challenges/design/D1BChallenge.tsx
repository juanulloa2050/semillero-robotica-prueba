"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  D1B_CHALLENGE,
  createD1BDraft,
  evaluateD1B,
  type D1BSubmission,
} from "@/lib/challenges/design/d1b";
import {
  DesignChallengeShell,
  DesignFooter,
  DesignHintPanel,
  DesignResultBanner,
  DesignVisual,
} from "@/components/challenges/design/shared";
import type { ChallengeAttempt, JsonValue, NodeChallengeProgress } from "@/lib/types";

const NODE_ID = "D1B";
const STEP_ID = "volume";

interface Props {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

export function D1BChallenge({ savedProgress, readOnly, onSave, onComplete, onExit }: Props) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const step = progress.steps[STEP_ID];
  const draft = normalizeDraft(step.draft);
  const solved = Boolean(step.solvedAt);

  const persist = useCallback((next: NodeChallengeProgress) => {
    progressRef.current = next;
    setProgress(next);
    onSaveRef.current(next);
  }, []);

  function changeValue(value: string) {
    if (readOnly || solved) return;
    const nextDraft: D1BSubmission = { stepId: "volume", value };
    const next: NodeChallengeProgress = {
      ...progressRef.current,
      updatedAt: Date.now(),
      steps: {
        ...progressRef.current.steps,
        [STEP_ID]: { ...progressRef.current.steps[STEP_ID], draft: toJson(nextDraft) },
      },
    };
    persist(next);
  }

  function revealHint() {
    if (readOnly || solved) return;
    const current = progressRef.current.steps[STEP_ID];
    const next: NodeChallengeProgress = {
      ...progressRef.current,
      updatedAt: Date.now(),
      steps: {
        ...progressRef.current.steps,
        [STEP_ID]: { ...current, revealedHints: Math.min(current.revealedHints + 1, D1B_CHALLENGE.steps.volume.hints.length) },
      },
    };
    persist(next);
  }

  function submit() {
    if (readOnly || solved) return;
    const evaluation = evaluateD1B(draft);
    // eslint-disable-next-line react-hooks/purity -- submit() is an event handler, not render logic.
    const now = Date.now();
    const current = progressRef.current.steps[STEP_ID];
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: NODE_ID,
      stepId: STEP_ID,
      attemptNumber: current.attempts.length + 1,
      startedAt: progress.startedAt,
      submittedAt: now,
      durationSeconds: current.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: evaluation.isCorrect,
      hintsUsed: current.revealedHints,
    };
    const nextStep = {
      ...current,
      attempts: [...current.attempts, attempt],
      solvedAt: evaluation.isCorrect ? now : current.solvedAt,
    };
    const next: NodeChallengeProgress = {
      ...progressRef.current,
      updatedAt: now,
      completedAt: evaluation.isCorrect ? now : progressRef.current.completedAt,
      steps: { ...progressRef.current.steps, [STEP_ID]: nextStep },
    };
    persist(next);
    setLastResult({ isCorrect: evaluation.isCorrect, message: evaluation.feedback });
    if (evaluation.isCorrect) onCompleteRef.current(next);
  }

  const totalAttempts = step.attempts.length;

  return (
    <DesignChallengeShell
      nodeId={NODE_ID}
      categoryLabel={D1B_CHALLENGE.subtitle.split("·")[0].trim()}
      title={D1B_CHALLENGE.title}
      introduction={D1B_CHALLENGE.introduction}
      readOnly={readOnly}
      attempts={totalAttempts}
      hintsUsed={step.revealedHints}
      solved={solved}
    >
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9FD3EE]">
          {D1B_CHALLENGE.steps.volume.eyebrow}
        </p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">
          {D1B_CHALLENGE.steps.volume.title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          {D1B_CHALLENGE.steps.volume.statement}
        </p>
      </header>

      <div className="space-y-6">
        <DesignVisual src={D1B_CHALLENGE.steps.volume.image.src} alt={D1B_CHALLENGE.steps.volume.image.alt} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <label htmlFor="D1B-volume" className="block text-sm font-semibold leading-6 text-white">
            Volumen ({D1B_CHALLENGE.steps.volume.unit})
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="D1B-volume"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.value}
              disabled={readOnly || solved}
              onChange={(e) => changeValue(e.target.value)}
              placeholder="Ej. 123456789"
              className="w-full rounded-lg border border-white/15 bg-[#03152f] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#8CA0F0] disabled:opacity-60"
              style={{ borderColor: undefined }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">Tolerancia de ±2% sobre el valor de referencia.</p>
        </div>

        {lastResult && <DesignResultBanner isCorrect={lastResult.isCorrect} message={lastResult.message} />}

        <DesignHintPanel
          hints={D1B_CHALLENGE.steps.volume.hints}
          revealed={step.revealedHints}
          disabled={readOnly || solved}
          onReveal={revealHint}
        />
      </div>

      <DesignFooter
        solved={solved}
        readOnly={readOnly}
        canSubmit={draft.value.trim().length > 0}
        submitLabel={totalAttempts > 0 ? "Comprobar de nuevo" : "Comprobar respuesta"}
        onSubmit={submit}
        onExit={onExit}
      />
    </DesignChallengeShell>
  );
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  if (saved) return saved;
  const now = Date.now();
  return {
    nodeId: NODE_ID,
    currentStepId: STEP_ID,
    shuffleSeed: now,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    steps: {
      [STEP_ID]: {
        draft: toJson(createD1BDraft()),
        attempts: [],
        revealedHints: 0,
        totalActiveSeconds: 0,
        solvedAt: null,
      },
    },
    analytics: {},
  };
}

function normalizeDraft(raw: JsonValue): D1BSubmission {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && typeof (raw as { value?: unknown }).value === "string") {
    return { stepId: "volume", value: (raw as { value: string }).value };
  }
  return createD1BDraft();
}

function toJson(value: D1BSubmission): JsonValue {
  return { stepId: value.stepId, value: value.value };
}
