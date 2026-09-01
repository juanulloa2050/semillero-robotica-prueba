import { ALL_NODES, APPLICATION_NODE_IDS, IR_NODE, SKILL_NODES } from "@/lib/data/nodes";
import type { NodeChallengeProgress, NodeStatus } from "@/lib/types";

export const MIN_COMPLETED_NODES_TO_FINISH = 4;
export const MIN_EXPLORED_BRANCHES_TO_FINISH = 2;

/** A branch's "aplicación" gate for IR: either a single node id, or a group of
 * alternative ids (e.g. a branch that forks into two parallel application
 * nodes) where completing any one of them counts. */
export type ApplicationNodeGroup = string | readonly string[];

function groupIds(group: ApplicationNodeGroup): readonly string[] {
  return Array.isArray(group) ? group : [group as string];
}

function isApplicationGroupDone(
  group: ApplicationNodeGroup,
  progress: Record<string, NodeStatus>
): boolean {
  return groupIds(group).some((id) => progress[id] === "completed");
}

export function computeStatus(
  nodeId: string,
  progress: Record<string, NodeStatus>,
  challengeProgress: Record<string, NodeChallengeProgress> = {}
): NodeStatus {
  if (progress[nodeId] === "completed") return "completed";

  if (nodeId === IR_NODE.id) {
    const applicationBranchesDone = APPLICATION_NODE_IDS.filter((group) =>
      isApplicationGroupDone(group, progress)
    ).length;
    return applicationBranchesDone >= 2 ? "available" : "locked";
  }

  const node = SKILL_NODES.find((item) => item.id === nodeId);
  if (!node) return "locked";
  // `requires` contains every challenge from the preceding level in this
  // branch. A split level is a single gate: completing only one path must not
  // unlock the next level.
  const unlocked =
    node.requires.length === 0 ||
    node.requires.every((reqId) => progress[reqId] === "completed");
  if (!unlocked) return "locked";
  return challengeProgress[nodeId] ? "in_progress" : "available";
}

/** A node can be worked on/completed once unlocked, whether or not a draft
 * has already been saved (`"available"` or `"in_progress"`). */
export function isOpenForCompletion(status: NodeStatus): boolean {
  return status === "available" || status === "in_progress";
}

export function computeAllStatuses(
  progress: Record<string, NodeStatus>,
  challengeProgress: Record<string, NodeChallengeProgress> = {}
): Record<string, NodeStatus> {
  const statuses: Record<string, NodeStatus> = {};
  for (const node of ALL_NODES) {
    statuses[node.id] = computeStatus(node.id, progress, challengeProgress);
  }
  return statuses;
}

export function completedCount(progress: Record<string, NodeStatus>): number {
  return Object.values(progress).filter((status) => status === "completed").length;
}

export function branchesExplored(
  progress: Record<string, NodeStatus>
): number {
  const branches = new Set<string>();
  for (const node of SKILL_NODES) {
    if (progress[node.id] === "completed") branches.add(node.branchId);
  }
  return branches.size;
}

export function canFinishJourney(progress: Record<string, NodeStatus>): boolean {
  return (
    completedCount(progress) >= MIN_COMPLETED_NODES_TO_FINISH &&
    branchesExplored(progress) >= MIN_EXPLORED_BRANCHES_TO_FINISH
  );
}

export function branchProgressPercent(
  progress: Record<string, NodeStatus>,
  branchId: string
): number {
  const branchNodes = SKILL_NODES.filter((node) => node.branchId === branchId);
  if (branchNodes.length === 0) return 0;
  const done = branchNodes.filter((node) => progress[node.id] === "completed").length;
  return Math.round((done / branchNodes.length) * 100);
}

export function branchCompletedCount(
  progress: Record<string, NodeStatus>,
  branchId: string
): number {
  return SKILL_NODES.filter(
    (node) => node.branchId === branchId && progress[node.id] === "completed"
  ).length;
}
