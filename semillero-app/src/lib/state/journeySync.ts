import type { AppState, NodeStatus } from "../types";
import { IMPLEMENTED_CHALLENGE_NODE_IDS, IMPLEMENTED_CHALLENGE_PROGRESS } from "../challenges/registry";
import { mergeNodeChallengeProgress } from "../challenges/progress";

export interface CachedJourney {
  state: AppState;
  savedAt: number;
}

export function candidateStorageKey(userId: string): string {
  return `semillero-app-state-v3:${userId}`;
}

// Preserve work done offline or during a failed request. A submitted run is
// authoritative: a cached draft must never reopen it.
export function reconcileJourneys(
  remote: AppState | null,
  remoteUpdatedAt: number,
  cached: CachedJourney | null
): AppState | null {
  if (!remote) return cached?.state ?? null;
  if (!cached || remote.submitted) return remote;

  const local = cached.state;
  const localIsNewer = cached.savedAt > remoteUpdatedAt;
  const progress: Record<string, NodeStatus> = { ...remote.progress };
  const completedAt = { ...remote.completedAt };
  for (const [nodeId, status] of Object.entries(local.progress)) {
    if (status === "completed") {
      progress[nodeId] = "completed";
      completedAt[nodeId] = Math.max(completedAt[nodeId] ?? 0, local.completedAt[nodeId] ?? 0);
    }
  }

  const challengeProgress = { ...remote.challengeProgress };
  for (const nodeId of IMPLEMENTED_CHALLENGE_NODE_IDS) {
    const localChallenge = local.challengeProgress[nodeId];
    if (!localChallenge) continue;
    const remoteChallenge = challengeProgress[nodeId];
    // mergeNodeChallengeProgress keeps attempts from both copies and uses the
    // newer challenge for editable drafts/current step.
    const older = remoteChallenge && remoteChallenge.updatedAt > localChallenge.updatedAt
      ? localChallenge : remoteChallenge;
    const newer = older === localChallenge ? remoteChallenge : localChallenge;
    const merged = newer && mergeNodeChallengeProgress(
      older,
      newer,
      IMPLEMENTED_CHALLENGE_PROGRESS[nodeId]
    );
    if (merged) challengeProgress[nodeId] = merged;
  }

  const introduction = [...remote.introduction];
  for (const item of local.introduction) {
    if (!introduction.some((existing) => existing.id === item.id)) introduction.push(item);
  }

  return {
    ...remote,
    profile: localIsNewer ? local.profile : remote.profile,
    registrationStep: localIsNewer ? local.registrationStep : remote.registrationStep,
    onboardingCompleted: remote.onboardingCompleted || local.onboardingCompleted,
    progress,
    completedAt,
    challengeProgress,
    introduction,
    submitted: local.submitted,
    submittedAt: local.submitted ? local.submittedAt : remote.submittedAt,
  };
}

// A single writer prevents an older network request from overwriting a newer
// snapshot. Calls made while a write is in flight are collapsed to the latest.
export function createJourneyWriter(save: (state: AppState) => Promise<void>) {
  let pending: { state: AppState; onResult: (error?: unknown) => void } | null = null;
  let running = false;

  async function drain() {
    if (running) return;
    running = true;
    while (pending) {
      const current = pending;
      pending = null;
      try {
        await save(current.state);
        if (!pending) current.onResult();
      } catch (error) {
        // Keep the latest snapshot for the next retry, rather than writing an
        // older failed snapshot over edits that happened during the request.
        pending ??= current;
        pending.onResult(error);
        break;
      }
    }
    running = false;
  }

  return (state: AppState, onResult: (error?: unknown) => void) => {
    pending = { state, onResult };
    void drain();
  };
}
