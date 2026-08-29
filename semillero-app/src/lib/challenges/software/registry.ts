import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const SOFTWARE_CHALLENGE_NODE_IDS = ["S0", "S1A", "S1B", "S2", "S3A", "S3B", "S4"] as const;
export type SoftwareChallengeNodeId = (typeof SOFTWARE_CHALLENGE_NODE_IDS)[number];
export const SOFTWARE_CHALLENGE_PROGRESS = Object.fromEntries(SOFTWARE_CHALLENGE_NODE_IDS.map((nodeId) => [nodeId, { nodeId, stepIds: ["mission"], maximumHintsByStep: { mission: 3 } }])) as unknown as Readonly<Record<SoftwareChallengeNodeId, ChallengeProgressDefinition>>;
const NODE_SET = new Set<string>(SOFTWARE_CHALLENGE_NODE_IDS);
export function isSoftwareChallengeNodeId(value: string): value is SoftwareChallengeNodeId { return NODE_SET.has(value); }
export function getSoftwareChallengeProgressDefinition(nodeId: string) { return isSoftwareChallengeNodeId(nodeId) ? SOFTWARE_CHALLENGE_PROGRESS[nodeId] : null; }
