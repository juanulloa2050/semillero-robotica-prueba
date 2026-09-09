import { D0_STEP_IDS } from "@/lib/challenges/design/d0";
import { D1A_STEP_IDS } from "@/lib/challenges/design/d1a";
import { D1B_STEP_IDS } from "@/lib/challenges/design/d1b";
import { D1C_STEP_IDS } from "@/lib/challenges/design/d1c";
import { D2_STEP_IDS } from "@/lib/challenges/design/d2";
import { D4_STEP_IDS } from "@/lib/challenges/design/d4";
import { D5_STEP_IDS } from "@/lib/challenges/design/d5";
import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const DESIGN_CHALLENGE_NODE_IDS = ["D0", "D1A", "D1B", "D1C", "D2", "D4", "D5"] as const;

function definition(nodeId: string, stepIds: readonly string[]): ChallengeProgressDefinition {
  return {
    nodeId,
    stepIds,
    maximumHintsByStep: Object.fromEntries(stepIds.map((stepId) => [stepId, 1])),
  };
}

export const DESIGN_CHALLENGE_PROGRESS: Readonly<Record<string, ChallengeProgressDefinition>> = {
  D0: definition("D0", D0_STEP_IDS),
  D1A: definition("D1A", D1A_STEP_IDS),
  D1B: definition("D1B", D1B_STEP_IDS),
  D1C: definition("D1C", D1C_STEP_IDS),
  D2: definition("D2", D2_STEP_IDS),
  D4: definition("D4", D4_STEP_IDS),
  D5: definition("D5", D5_STEP_IDS),
};

export function getDesignChallengeProgressDefinition(nodeId: string): ChallengeProgressDefinition | null {
  return DESIGN_CHALLENGE_PROGRESS[nodeId] ?? null;
}
