import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";
import { IR_STEP_IDS } from "@/lib/challenges/integration/ir";

export const INTEGRATION_CHALLENGE_NODE_IDS = ["IR"] as const;

export const INTEGRATION_CHALLENGE_PROGRESS: Readonly<
  Record<string, ChallengeProgressDefinition>
> = {
  IR: {
    nodeId: "IR",
    stepIds: IR_STEP_IDS,
    maximumHintsByStep: { "research-proposal": 2 },
  },
};

export function getIntegrationChallengeProgressDefinition(
  nodeId: string
): ChallengeProgressDefinition | null {
  return nodeId === "IR" ? INTEGRATION_CHALLENGE_PROGRESS.IR : null;
}
