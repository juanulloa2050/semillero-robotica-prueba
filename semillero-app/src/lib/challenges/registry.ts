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
  CONTROL_CHALLENGE_NODE_IDS,
  CONTROL_CHALLENGE_PROGRESS,
  getControlChallengeProgressDefinition,
} from "@/lib/challenges/control/registry";

export const IMPLEMENTED_CHALLENGE_NODE_IDS = [
  ...ELECTRONICS_CHALLENGE_NODE_IDS,
  ...SYSTEMS_CHALLENGE_NODE_IDS,
  ...CONTROL_CHALLENGE_NODE_IDS,
] as const;

export const IMPLEMENTED_CHALLENGE_PROGRESS: Readonly<Record<string, ChallengeProgressDefinition>> = {
  ...ELECTRONICS_CHALLENGE_PROGRESS,
  ...SYSTEMS_CHALLENGE_PROGRESS,
  ...CONTROL_CHALLENGE_PROGRESS,
};

export function getChallengeProgressDefinition(nodeId: string) {
  return (
    getElectronicsChallengeProgressDefinition(nodeId) ??
    getSystemsChallengeProgressDefinition(nodeId) ??
    getControlChallengeProgressDefinition(nodeId)
  );
}

export function isImplementedChallengeNodeId(nodeId: string) {
  return Boolean(getChallengeProgressDefinition(nodeId));
}

