"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  D0_CHALLENGE,
  D0_OPTIONS,
  createD0Draft,
  evaluateD0,
  type D0Submission,
} from "@/lib/challenges/design/d0";
import {
  DesignChallengeShell,
  DesignFooter,
  DesignHintPanel,
  DesignOptionGrid,
  DesignResultBanner,
  DesignVisual,
} from "@/components/challenges/design/shared";
import type { ChallengeAttempt, JsonValue, NodeChallengeProgress } from "@/lib/types";

const NODE_ID = "D0";
const STEP_ID = "operations";

interface Props {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

export function D0Challenge({ savedProgress, readOnly, onSave, onComplete, onExit }: Props) {
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

  function toggleOption(id: string) {
    if (readOnly || solved) return;
    const nextSelected = draft.selected.includes(id)
      ? draft.selected.filter((v) => v !== id)
      : [...draft.selected, id];
    const nextDraft: D0Submission = { stepId: "operations", selected: nextSelected };
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
        [STEP_ID]: { ...current, revealedHints: Math.min(current.revealedHints + 1, D0_CHALLENGE.steps.operations.hints.length) },
      },
    };
    persist(next);
  }

  function submit() {
    if (readOnly || solved) return;
    const evaluation = evaluateD0(draft);
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
      categoryLabel={D0_CHALLENGE.subtitle.split("·")[0].trim()}
      title={D0_CHALLENGE.title}
      introduction={D0_CHALLENGE.introduction}
      readOnly={readOnly}
      attempts={totalAttempts}
      hintsUsed={step.revealedHints}
      solved={solved}
    >
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9FD3EE]">
          {D0_CHALLENGE.steps.operations.eyebrow}
        </p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">
          {D0_CHALLENGE.steps.operations.title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          {D0_CHALLENGE.steps.operations.statement}
        </p>
      </header>

      <div className="space-y-6">
        <DesignVisual src={D0_CHALLENGE.steps.operations.image.src} alt={D0_CHALLENGE.steps.operations.image.alt} />

        <DesignOptionGrid
          options={D0_OPTIONS}
          selected={draft.selected}
          multi
          disabled={readOnly || solved}
          onToggle={toggleOption}
        />

        {lastResult && <DesignResultBanner isCorrect={lastResult.isCorrect} message={lastResult.message} />}

        <DesignHintPanel
          hints={D0_CHALLENGE.steps.operations.hints}
          revealed={step.revealedHints}
          disabled={readOnly || solved}
          onReveal={revealHint}
        />
      </div>

      <DesignFooter
        solved={solved}
        readOnly={readOnly}
        canSubmit={draft.selected.length > 0}
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
        draft: toJson(createD0Draft()),
        attempts: [],
        revealedHints: 0,
        totalActiveSeconds: 0,
        solvedAt: null,
      },
    },
    analytics: {},
  };
}

function normalizeDraft(raw: JsonValue): D0Submission {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray((raw as { selected?: unknown }).selected)) {
    const selected = (raw as { selected: unknown[] }).selected.filter((v): v is string => typeof v === "string");
    return { stepId: "operations", selected };
  }
  return createD0Draft();
}

function toJson(value: D0Submission): JsonValue {
  return { stepId: value.stepId, selected: [...value.selected] };
}
