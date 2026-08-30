import { E0_STEP_IDS } from "@/lib/challenges/electronics/e0";
import { E1A_STEP_IDS } from "@/lib/challenges/electronics/e1a";
import { E1B_STEP_IDS } from "@/lib/challenges/electronics/e1b";
import { E2_STEP_IDS } from "@/lib/challenges/electronics/e2";
import { E3A_STEP_IDS } from "@/lib/challenges/electronics/e3a";
import { E3B_STEP_IDS } from "@/lib/challenges/electronics/e3b";
import { E4_STEP_IDS } from "@/lib/challenges/electronics/e4";
import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const ELECTRONICS_CHALLENGE_NODE_IDS = [
  "E0",
  "E1A",
  "E1B",
  "E2",
  "E3A",
  "E3B",
  "E4",
] as const;

export type ElectronicsChallengeNodeId =
  (typeof ELECTRONICS_CHALLENGE_NODE_IDS)[number];

function definition(
  nodeId: ElectronicsChallengeNodeId,
  stepIds: readonly string[]
): ChallengeProgressDefinition {
  return {
    nodeId,
    stepIds,
    maximumHintsByStep: Object.fromEntries(
      stepIds.map((stepId) => [stepId, 1])
    ),
  };
}
export const ELECTRONICS_CHALLENGE_PROGRESS: Readonly<
  Record<ElectronicsChallengeNodeId, ChallengeProgressDefinition>
> = {
  E0: definition("E0", E0_STEP_IDS),
  E1A: definition("E1A", E1A_STEP_IDS),
  E1B: definition("E1B", E1B_STEP_IDS),
  E2: definition("E2", E2_STEP_IDS),
  E3A: definition("E3A", E3A_STEP_IDS),
  E3B: definition("E3B", E3B_STEP_IDS),
  E4: definition("E4", E4_STEP_IDS),
};

const IMPLEMENTED_NODE_SET = new Set<string>(ELECTRONICS_CHALLENGE_NODE_IDS);

export function isElectronicsChallengeNodeId(
  value: string
): value is ElectronicsChallengeNodeId {
  return IMPLEMENTED_NODE_SET.has(value);
}

export function getElectronicsChallengeProgressDefinition(
  nodeId: string
): ChallengeProgressDefinition | null {
  return isElectronicsChallengeNodeId(nodeId)
    ? ELECTRONICS_CHALLENGE_PROGRESS[nodeId]
    : null;
}
