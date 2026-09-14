import { ALL_NODES, APPLICATION_NODE_IDS, IR_NODE, SKILL_NODES } from "@/lib/data/nodes";
import type { NodeStatus } from "@/lib/types";

export function computeStatus(
  nodeId: string,
  progress: Record<string, NodeStatus>
): NodeStatus {
  if (progress[nodeId] === "completed") return "completed";

  if (nodeId === IR_NODE.id) {
    const applicationBranchesDone = APPLICATION_NODE_IDS.filter(
      (id) => progress[id] === "completed"
    ).length;
    return applicationBranchesDone >= 2 ? "available" : "locked";
  }

  const node = SKILL_NODES.find((item) => item.id === nodeId);
  if (!node) return "locked";
  if (node.requires.length === 0) return "available";
  // A split level is a single gate: every preceding challenge is required.
  const unlocked = node.requires.every((reqId) => progress[reqId] === "completed");
  return unlocked ? "available" : "locked";
}

export function computeAllStatuses(
  progress: Record<string, NodeStatus>
): Record<string, NodeStatus> {
  const statuses: Record<string, NodeStatus> = {};
  for (const node of ALL_NODES) {
    statuses[node.id] = computeStatus(node.id, progress);
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
  return completedCount(progress) >= 5 && branchesExplored(progress) >= 2;
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
