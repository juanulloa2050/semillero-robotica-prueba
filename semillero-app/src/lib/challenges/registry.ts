import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";
import {
  ELECTRONICS_CHALLENGE_NODE_IDS,
  ELECTRONICS_CHALLENGE_PROGRESS,
  getElectronicsChallengeProgressDefinition,
} from "@/lib/challenges/electronics/registry";
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

export const IMPLEMENTED_CHALLENGE_NODE_IDS = [
  ...ELECTRONICS_CHALLENGE_NODE_IDS,
  ...SYSTEMS_CHALLENGE_NODE_IDS,
  ...SOFTWARE_CHALLENGE_NODE_IDS,
] as const;

export const IMPLEMENTED_CHALLENGE_PROGRESS: Readonly<Record<string, ChallengeProgressDefinition>> = {
  ...ELECTRONICS_CHALLENGE_PROGRESS,
  ...SYSTEMS_CHALLENGE_PROGRESS,
  ...SOFTWARE_CHALLENGE_PROGRESS,
};

export function getChallengeProgressDefinition(nodeId: string) {
  return getElectronicsChallengeProgressDefinition(nodeId) ?? getSystemsChallengeProgressDefinition(nodeId) ?? getSoftwareChallengeProgressDefinition(nodeId);
}

export function isImplementedChallengeNodeId(nodeId: string) {
  return Boolean(getChallengeProgressDefinition(nodeId));
}
