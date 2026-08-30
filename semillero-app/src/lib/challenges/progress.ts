import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isPositiveTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

export function normalizeJsonValue(
  value: unknown,
  depth = 0
): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (depth >= 12) return undefined;

  if (Array.isArray(value)) {
    const normalized: JsonValue[] = [];
    for (const item of value.slice(0, 1_000)) {
      const safeItem = normalizeJsonValue(item, depth + 1);
      if (safeItem !== undefined) normalized.push(safeItem);
    }
    return normalized;
  }
  if (!isRecord(value)) return undefined;

  const normalized: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value).slice(0, 1_000)) {
    const safeItem = normalizeJsonValue(item, depth + 1);
    if (safeItem !== undefined) normalized[key] = safeItem;
  }
  return normalized;
}

function normalizePrimitiveRecord(
  value: unknown
): Record<string, string | number | boolean> {
  if (!isRecord(value)) return {};
  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "string" ||
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
    ) {
      normalized[key] = item;
    }
  }
  return normalized;
}

function normalizeAttempt(
  value: unknown,
  nodeId: string,
  stepId: string,
  now: number
): ChallengeAttempt | null {
  if (!isRecord(value)) return null;
  const answer = normalizeJsonValue(value.answer);
  if (
    typeof value.id !== "string" ||
    !value.id ||
    value.nodeId !== nodeId ||
    value.stepId !== stepId ||
    typeof value.attemptNumber !== "number" ||
    !Number.isSafeInteger(value.attemptNumber) ||
    value.attemptNumber < 1 ||
    !isPositiveTimestamp(value.startedAt) ||
    !isPositiveTimestamp(value.submittedAt) ||
    answer === undefined ||
    !(value.isCorrect === null || typeof value.isCorrect === "boolean")
  ) {
    return null;
  }

  const score =
    typeof value.score === "number" && Number.isFinite(value.score)
      ? value.score
      : undefined;
  return {
    id: value.id,
    nodeId,
    stepId,
    attemptNumber: value.attemptNumber,
    startedAt: Math.min(value.startedAt, now),
    submittedAt: Math.min(value.submittedAt, now),
    durationSeconds: finiteNonNegative(value.durationSeconds),
    answer,
    isCorrect: value.isCorrect,
    hintsUsed: Math.max(0, Math.trunc(finiteNonNegative(value.hintsUsed))),
    ...(score === undefined ? {} : { score }),
    metadata: normalizePrimitiveRecord(value.metadata),
  };
}

function normalizeStepProgress(
  value: unknown,
  nodeId: string,
  stepId: string,
  now: number,
  maximumHints: number
): ChallengeStepProgress | null {
  if (!isRecord(value)) return null;
  const draft = normalizeJsonValue(value.draft);
  const attempts = Array.isArray(value.attempts)
    ? value.attempts
        .map((attempt) => normalizeAttempt(attempt, nodeId, stepId, now))
        .filter((attempt): attempt is ChallengeAttempt => attempt !== null)
        .sort((left, right) => left.submittedAt - right.submittedAt)
    : [];

  return {
    draft: draft ?? null,
    attempts,
    revealedHints: Math.max(
      0,
      Math.min(maximumHints, Math.trunc(finiteNonNegative(value.revealedHints)))
    ),
    totalActiveSeconds: finiteNonNegative(value.totalActiveSeconds),
    solvedAt: isPositiveTimestamp(value.solvedAt)
      ? Math.min(value.solvedAt, now)
      : null,
  };
}

export interface ChallengeProgressDefinition {
  nodeId: string;
  stepIds: readonly string[];
  maximumHintsByStep?: Readonly<Record<string, number>>;
}

export function normalizeNodeChallengeProgress(
  value: unknown,
  definition: ChallengeProgressDefinition,
  now = Date.now()
): NodeChallengeProgress | null {
  if (
    !isRecord(value) ||
    value.nodeId !== definition.nodeId ||
    !isRecord(value.steps) ||
    definition.stepIds.length === 0
  ) {
    return null;
  }

  const steps: Record<string, ChallengeStepProgress> = {};
  for (const stepId of definition.stepIds) {
    const maximumHints = Math.max(
      0,
      Math.trunc(definition.maximumHintsByStep?.[stepId] ?? 3)
    );
    const normalized = normalizeStepProgress(
      value.steps[stepId],
      definition.nodeId,
      stepId,
      now,
      maximumHints
    );
    if (normalized) steps[stepId] = normalized;
  }

  const startedAt = isPositiveTimestamp(value.startedAt)
    ? Math.min(value.startedAt, now)
    : now;
  const updatedAt = isPositiveTimestamp(value.updatedAt)
    ? Math.min(value.updatedAt, now)
    : startedAt;
  const completedAt = isPositiveTimestamp(value.completedAt)
    ? Math.min(value.completedAt, now)
    : null;
  const currentStepId =
    typeof value.currentStepId === "string" &&
    definition.stepIds.includes(value.currentStepId)
      ? value.currentStepId
      : definition.stepIds.find(
          (stepId) => !isPositiveTimestamp(steps[stepId]?.solvedAt)
        ) ?? definition.stepIds[0];

  return {
    nodeId: definition.nodeId,
    currentStepId,
    shuffleSeed:
      typeof value.shuffleSeed === "number" && Number.isFinite(value.shuffleSeed)
        ? Math.trunc(value.shuffleSeed)
        : Math.trunc(now),
    startedAt,
    updatedAt,
    completedAt,
    steps,
    analytics: normalizePrimitiveRecord(value.analytics),
  };
}

export function mergeNodeChallengeProgress(
  current: NodeChallengeProgress | undefined,
  incoming: NodeChallengeProgress,
  definition: ChallengeProgressDefinition
): NodeChallengeProgress | null {
  const now = Date.now();
  const safeIncoming = normalizeNodeChallengeProgress(incoming, definition, now);
  const safeCurrent = normalizeNodeChallengeProgress(current, definition, now);
  if (!safeIncoming) return safeCurrent;
  if (!safeCurrent) return safeIncoming;
  if (safeIncoming.updatedAt < safeCurrent.updatedAt) return safeCurrent;

  const steps = { ...safeCurrent.steps };
  for (const [stepId, nextStep] of Object.entries(safeIncoming.steps)) {
    const previousStep = safeCurrent.steps[stepId];
    if (!previousStep) {
      steps[stepId] = nextStep;
      continue;
    }

    const attempts = new Map(
      [...previousStep.attempts, ...nextStep.attempts].map((attempt) => [
        attempt.id,
        attempt,
      ])
    );
    steps[stepId] = {
      ...nextStep,
      attempts: [...attempts.values()].sort(
        (left, right) => left.submittedAt - right.submittedAt
      ),
      revealedHints: Math.max(
        previousStep.revealedHints,
        nextStep.revealedHints
      ),
      totalActiveSeconds: Math.max(
        previousStep.totalActiveSeconds,
        nextStep.totalActiveSeconds
      ),
      solvedAt: previousStep.solvedAt ?? nextStep.solvedAt,
    };
  }

  return {
    ...safeIncoming,
    shuffleSeed: safeCurrent.shuffleSeed,
    startedAt: Math.min(safeCurrent.startedAt, safeIncoming.startedAt),
    completedAt: safeCurrent.completedAt ?? safeIncoming.completedAt,
    steps,
    analytics: { ...safeCurrent.analytics, ...safeIncoming.analytics },
  };
}

export function hasCompletedChallenge(
  progress: NodeChallengeProgress | undefined,
  definition: ChallengeProgressDefinition
): boolean {
  return Boolean(
    progress?.nodeId === definition.nodeId &&
      definition.stepIds.every((stepId) =>
        isPositiveTimestamp(progress.steps?.[stepId]?.solvedAt)
      )
  );
}
