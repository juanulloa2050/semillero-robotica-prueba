import { AI_STEP_ID } from "@/lib/challenges/ai/schema";
import type { ChallengeProgressDefinition } from "@/lib/challenges/progress";

export const AI_CHALLENGE_NODE_IDS = [
  "A0",
  "A1",
  "A2_YOLO",
  "A2_OPENCV",
  "A3",
  "A4_RL",
  "A4_GENERAL",
] as const;

export type AiChallengeNodeId = (typeof AI_CHALLENGE_NODE_IDS)[number];

function definition(nodeId: AiChallengeNodeId): ChallengeProgressDefinition {
  return {
    nodeId,
    stepIds: [AI_STEP_ID],
    maximumHintsByStep: { [AI_STEP_ID]: 0 },
  };
}

export const AI_CHALLENGE_PROGRESS: Readonly<Record<AiChallengeNodeId, ChallengeProgressDefinition>> = {
  A0: definition("A0"),
  A1: definition("A1"),
  A2_YOLO: definition("A2_YOLO"),
  A2_OPENCV: definition("A2_OPENCV"),
  A3: definition("A3"),
  A4_RL: definition("A4_RL"),
  A4_GENERAL: definition("A4_GENERAL"),
};

const IMPLEMENTED_NODE_SET = new Set<string>(AI_CHALLENGE_NODE_IDS);

export function isAiChallengeNodeId(value: string): value is AiChallengeNodeId {
  return IMPLEMENTED_NODE_SET.has(value);
}

export function getAiChallengeProgressDefinition(nodeId: string): ChallengeProgressDefinition | null {
  return isAiChallengeNodeId(nodeId) ? AI_CHALLENGE_PROGRESS[nodeId] : null;
}
