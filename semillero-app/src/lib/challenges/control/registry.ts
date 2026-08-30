import { C0_STEP_IDS } from "@/lib/challenges/control/c0";
import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const CONTROL_CHALLENGE_NODE_IDS = [
  "C0",
] as const;

export type ControlChallengeNodeId = (typeof CONTROL_CHALLENGE_NODE_IDS)[number];

function definition(
  nodeId: ControlChallengeNodeId,
  stepIds: readonly string[]
): ChallengeProgressDefinition {
  return {
    nodeId,
    stepIds,
    maximumHintsByStep: Object.fromEntries(
      stepIds.map((stepId) => [stepId, 3])
    ),
  };
}

export const CONTROL_CHALLENGE_PROGRESS: Readonly<
  Record<ControlChallengeNodeId, ChallengeProgressDefinition>
> = {
  C0: definition("C0", C0_STEP_IDS),
};

const IMPLEMENTED_NODE_SET = new Set<string>(CONTROL_CHALLENGE_NODE_IDS);

export function isControlChallengeNodeId(value: string): value is ControlChallengeNodeId {
  return IMPLEMENTED_NODE_SET.has(value);
}

export function getControlChallengeProgressDefinition(nodeId: string): ChallengeProgressDefinition | null {
  return isControlChallengeNodeId(nodeId) ? CONTROL_CHALLENGE_PROGRESS[nodeId] : null;
}
