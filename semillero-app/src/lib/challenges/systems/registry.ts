import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const SYSTEMS_CHALLENGE_NODE_IDS = [
  "SI0", "SI1A", "SI1B", "SI2", "SI3A", "SI3B", "SI4", "SI5", "SI6",
] as const;

export type SystemsChallengeNodeId = (typeof SYSTEMS_CHALLENGE_NODE_IDS)[number];

export const SYSTEMS_CHALLENGE_PROGRESS = Object.fromEntries(
  SYSTEMS_CHALLENGE_NODE_IDS.map((nodeId) => [
    nodeId,
    { nodeId, stepIds: ["mission"], maximumHintsByStep: { mission: 3 } },
  ])
) as unknown as Readonly<Record<SystemsChallengeNodeId, ChallengeProgressDefinition>>;

const NODE_SET = new Set<string>(SYSTEMS_CHALLENGE_NODE_IDS);

export function isSystemsChallengeNodeId(value: string): value is SystemsChallengeNodeId {
  return NODE_SET.has(value);
}

export function getSystemsChallengeProgressDefinition(nodeId: string) {
  return isSystemsChallengeNodeId(nodeId) ? SYSTEMS_CHALLENGE_PROGRESS[nodeId] : null;
}
