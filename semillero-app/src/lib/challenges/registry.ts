import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";
import {
  ELECTRONICS_CHALLENGE_NODE_IDS,
  ELECTRONICS_CHALLENGE_PROGRESS,
  getElectronicsChallengeProgressDefinition,
} from "@/lib/challenges/electronics/registry";
import {
  MECHANICS_CHALLENGE_NODE_IDS,
  MECHANICS_CHALLENGE_PROGRESS,
  getMechanicsChallengeProgressDefinition,
} from "@/lib/challenges/mechanics/registry";
import {
  SYSTEMS_CHALLENGE_NODE_IDS,
  SYSTEMS_CHALLENGE_PROGRESS,
  getSystemsChallengeProgressDefinition,
} from "@/lib/challenges/systems/registry";
import {
  INTEGRATION_CHALLENGE_NODE_IDS,
  INTEGRATION_CHALLENGE_PROGRESS,
  getIntegrationChallengeProgressDefinition,
} from "@/lib/challenges/integration/registry";
import {
  AI_CHALLENGE_NODE_IDS,
  AI_CHALLENGE_PROGRESS,
  getAiChallengeProgressDefinition,
} from "@/lib/challenges/ai/registry";
import {
  FINAL_REFLECTION_STEP_ID,
  FINAL_SUBMISSION_NODE_ID,
} from "@/lib/finalSubmission";

export const IMPLEMENTED_CHALLENGE_NODE_IDS = [
  "D0",
  FINAL_SUBMISSION_NODE_ID,
  ...ELECTRONICS_CHALLENGE_NODE_IDS,
  ...MECHANICS_CHALLENGE_NODE_IDS,
  ...SYSTEMS_CHALLENGE_NODE_IDS,
  ...INTEGRATION_CHALLENGE_NODE_IDS,
  ...AI_CHALLENGE_NODE_IDS,
] as const;

export const IMPLEMENTED_CHALLENGE_PROGRESS: Readonly<
  Record<string, ChallengeProgressDefinition>
> = {
  D0: {
    nodeId: "D0",
    stepIds: ["submission"],
    maximumHintsByStep: { submission: 0 },
  },
  [FINAL_SUBMISSION_NODE_ID]: {
    nodeId: FINAL_SUBMISSION_NODE_ID,
    stepIds: [FINAL_REFLECTION_STEP_ID],
    maximumHintsByStep: { [FINAL_REFLECTION_STEP_ID]: 0 },
  },
  ...ELECTRONICS_CHALLENGE_PROGRESS,
  ...MECHANICS_CHALLENGE_PROGRESS,
  ...SYSTEMS_CHALLENGE_PROGRESS,
  ...INTEGRATION_CHALLENGE_PROGRESS,
  ...AI_CHALLENGE_PROGRESS,
};

export function getChallengeProgressDefinition(
  nodeId: string
): ChallengeProgressDefinition | null {
  if (nodeId === "D0" || nodeId === FINAL_SUBMISSION_NODE_ID) {
    return IMPLEMENTED_CHALLENGE_PROGRESS[nodeId];
  }
  return (
    getElectronicsChallengeProgressDefinition(nodeId) ??
    getMechanicsChallengeProgressDefinition(nodeId) ??
    getSystemsChallengeProgressDefinition(nodeId) ??
    getIntegrationChallengeProgressDefinition(nodeId) ??
    getAiChallengeProgressDefinition(nodeId)
  );
}

export function isImplementedChallengeNodeId(nodeId: string): boolean {
  return Boolean(getChallengeProgressDefinition(nodeId));
}
