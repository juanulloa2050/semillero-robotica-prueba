import { M0_STEP_IDS } from "@/lib/challenges/mechanics/m0";
import { M1A_STEP_IDS } from "@/lib/challenges/mechanics/m1a";
import { M1B_STEP_IDS } from "@/lib/challenges/mechanics/m1b";
import { M2_STEP_IDS } from "@/lib/challenges/mechanics/m2";
import { M3A_STEP_IDS } from "@/lib/challenges/mechanics/m3a";
import { M3B_STEP_IDS } from "@/lib/challenges/mechanics/m3b";
import { M4_STEP_IDS } from "@/lib/challenges/mechanics/m4";
import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const MECHANICS_CHALLENGE_NODE_IDS = ["M0", "M1A", "M1B", "M2", "M3A", "M3B", "M4"] as const;

export type MechanicsChallengeNodeId = (typeof MECHANICS_CHALLENGE_NODE_IDS)[number];

function definition(
  nodeId: MechanicsChallengeNodeId,
  stepIds: readonly string[],
  maximumHintsPerStep = 1
): ChallengeProgressDefinition {
  return {
    nodeId,
    stepIds,
    maximumHintsByStep: Object.fromEntries(
      stepIds.map((stepId) => [stepId, maximumHintsPerStep])
    ),
  };
}

export const MECHANICS_CHALLENGE_PROGRESS: Readonly<
  Record<MechanicsChallengeNodeId, ChallengeProgressDefinition>
> = {
  M0: definition("M0", M0_STEP_IDS),
  M1A: definition("M1A", M1A_STEP_IDS, 2),
  M1B: definition("M1B", M1B_STEP_IDS, 2),
  M2: definition("M2", M2_STEP_IDS, 2),
  M3A: definition("M3A", M3A_STEP_IDS, 2),
  M3B: definition("M3B", M3B_STEP_IDS, 2),
  M4: definition("M4", M4_STEP_IDS, 1),
};

const IMPLEMENTED_NODE_SET = new Set<string>(MECHANICS_CHALLENGE_NODE_IDS);

export function isMechanicsChallengeNodeId(
  value: string
): value is MechanicsChallengeNodeId {
  return IMPLEMENTED_NODE_SET.has(value);
}

export function getMechanicsChallengeProgressDefinition(
  nodeId: string
): ChallengeProgressDefinition | null {
  return isMechanicsChallengeNodeId(nodeId)
    ? MECHANICS_CHALLENGE_PROGRESS[nodeId]
    : null;
}
