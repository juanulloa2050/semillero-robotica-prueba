import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";
import {
  DESIGN_CHALLENGE_NODE_IDS,
  DESIGN_CHALLENGE_PROGRESS,
  getDesignChallengeProgressDefinition,
} from "@/lib/challenges/design/registry";
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
  SOFTWARE_CHALLENGE_NODE_IDS,
  SOFTWARE_CHALLENGE_PROGRESS,
  getSoftwareChallengeProgressDefinition,
} from "@/lib/challenges/software/registry";
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
  FINAL_SUBMISSION_NODE_ID,
  ...DESIGN_CHALLENGE_NODE_IDS,
  ...ELECTRONICS_CHALLENGE_NODE_IDS,
  ...MECHANICS_CHALLENGE_NODE_IDS,
  ...SYSTEMS_CHALLENGE_NODE_IDS,
  ...SOFTWARE_CHALLENGE_NODE_IDS,
  ...INTEGRATION_CHALLENGE_NODE_IDS,
  ...AI_CHALLENGE_NODE_IDS,
] as const;

export const IMPLEMENTED_CHALLENGE_PROGRESS: Readonly<
  Record<string, ChallengeProgressDefinition>
> = {
  [FINAL_SUBMISSION_NODE_ID]: {
    nodeId: FINAL_SUBMISSION_NODE_ID,
    stepIds: [FINAL_REFLECTION_STEP_ID],
    maximumHintsByStep: { [FINAL_REFLECTION_STEP_ID]: 0 },
  },
  ...DESIGN_CHALLENGE_PROGRESS,
  ...ELECTRONICS_CHALLENGE_PROGRESS,
  ...MECHANICS_CHALLENGE_PROGRESS,
  ...SYSTEMS_CHALLENGE_PROGRESS,
  ...SOFTWARE_CHALLENGE_PROGRESS,
  ...INTEGRATION_CHALLENGE_PROGRESS,
  ...AI_CHALLENGE_PROGRESS,
};

export function getChallengeProgressDefinition(
  nodeId: string
): ChallengeProgressDefinition | null {
  if (nodeId === FINAL_SUBMISSION_NODE_ID) {
    return IMPLEMENTED_CHALLENGE_PROGRESS[nodeId];
  }
  return (
    getDesignChallengeProgressDefinition(nodeId) ??
    getElectronicsChallengeProgressDefinition(nodeId) ??
    getMechanicsChallengeProgressDefinition(nodeId) ??
    getSystemsChallengeProgressDefinition(nodeId) ??
    getSoftwareChallengeProgressDefinition(nodeId) ??
    getIntegrationChallengeProgressDefinition(nodeId) ??
    getAiChallengeProgressDefinition(nodeId)
  );
}

export function isImplementedChallengeNodeId(nodeId: string): boolean {
  return Boolean(getChallengeProgressDefinition(nodeId));
}
