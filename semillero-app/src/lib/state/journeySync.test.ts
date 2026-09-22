import { describe, expect, it, vi } from "vitest";
import type { AppState, ChallengeAttempt, NodeChallengeProgress } from "../types";
import { candidateStorageKey, createJourneyWriter, reconcileJourneys } from "./journeySync";

const profile: AppState["profile"] = {
  fullName: "Aspirante", email: "aspirante@example.com", program: "Sistemas",
  semester: "4", cumulativeAverage: "4.0", studentCode: "", github: "",
  linkedin: "", portfolio: "", website: "", instagram: "",
  consentData: true, consentFiles: true,
};

function state(): AppState {
  return {
    schemaVersion: 3, profile: { ...profile }, introduction: [],
    registrationStep: 2, onboardingCompleted: true, progress: {},
    completedAt: {}, challengeProgress: {}, submitted: false, submittedAt: null,
  };
}

function challenge(answer: string, updatedAt: number): NodeChallengeProgress {
  const attempt: ChallengeAttempt = {
    id: answer, nodeId: "SI0", stepId: "mission", attemptNumber: 1,
    startedAt: 1000, submittedAt: updatedAt, durationSeconds: 1,
    answer, isCorrect: null, hintsUsed: 0,
  };
  return {
    nodeId: "SI0", currentStepId: "mission", shuffleSeed: 1,
    startedAt: 1000, updatedAt, completedAt: null, analytics: {},
    steps: { mission: { draft: answer, attempts: [attempt], revealedHints: 0, totalActiveSeconds: 1, solvedAt: null } },
  };
}

describe("candidate journey synchronization", () => {
  it("isolates browser caches by account", () => {
    expect(candidateStorageKey("one")).not.toBe(candidateStorageKey("two"));
  });

  it("recovers unsynced answers without losing answers already on the server", () => {
    const remote = state();
    const local = state();
    remote.challengeProgress.SI0 = challenge("remote", 2000);
    local.challengeProgress.SI0 = challenge("local", 3000);
    local.progress.SI0 = "completed";
    local.completedAt.SI0 = 3000;
    const merged = reconcileJourneys(remote, 2000, { state: local, savedAt: 3000 });
    expect(merged?.challengeProgress.SI0.steps.mission.draft).toBe("local");
    expect(merged?.challengeProgress.SI0.steps.mission.attempts.map((attempt) => attempt.answer)).toEqual(["remote", "local"]);
    expect(merged?.progress.SI0).toBe("completed");
  });

  it("does not reopen a submitted remote run from an old local draft", () => {
    const remote = state();
    remote.submitted = true;
    remote.submittedAt = 4000;
    const local = state();
    local.challengeProgress.SI0 = challenge("stale", 3000);
    expect(reconcileJourneys(remote, 4000, { state: local, savedAt: 5000 })).toBe(remote);
  });

  it("keeps a newer remote draft while recovering local attempts", () => {
    const remote = state();
    const local = state();
    remote.challengeProgress.SI0 = challenge("newer-remote", 4000);
    local.challengeProgress.SI0 = challenge("older-local", 3000);
    const merged = reconcileJourneys(remote, 4000, { state: local, savedAt: 3000 });
    expect(merged?.challengeProgress.SI0.steps.mission.draft).toBe("newer-remote");
    expect(merged?.challengeProgress.SI0.steps.mission.attempts.map((attempt) => attempt.answer)).toEqual(["older-local", "newer-remote"]);
  });

  it("serializes writes and coalesces pending edits", async () => {
    const resolvers: Array<() => void> = [];
    const saved: AppState[] = [];
    const save = vi.fn((snapshot: AppState) => new Promise<void>((resolve) => {
      saved.push(snapshot);
      resolvers.push(resolve);
    }));
    const writer = createJourneyWriter(save);
    const first = state();
    const second = state();
    const latest = state();
    first.profile.fullName = "first";
    second.profile.fullName = "second";
    latest.profile.fullName = "latest";
    const result = vi.fn();
    writer(first, result);
    writer(second, result);
    writer(latest, result);
    expect(saved.map((item) => item.profile.fullName)).toEqual(["first"]);
    resolvers[0]();
    await vi.waitFor(() => expect(saved.map((item) => item.profile.fullName)).toEqual(["first", "latest"]));
    resolvers[1]();
    await vi.waitFor(() => expect(result).toHaveBeenCalledTimes(1));
    expect(result).toHaveBeenCalledWith();
  });

  it("retains a failed write for retry", async () => {
    const save = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const writer = createJourneyWriter(save);
    const result = vi.fn();
    writer(state(), result);
    await vi.waitFor(() => expect(result).toHaveBeenCalledWith(expect.any(Error)));
    writer(state(), result);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(result).toHaveBeenLastCalledWith());
  });
});
