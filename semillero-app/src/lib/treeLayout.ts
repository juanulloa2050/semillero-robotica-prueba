import { BRANCH_ORDER } from "@/lib/data/branches";
import { ALL_NODES, IR_NODE } from "@/lib/data/nodes";
import type { BranchId } from "@/lib/types";

export const CANDIDATE_NODE_ID = "candidate";
export const BRANCH_HUB_RADIUS = 340;
export const FIRST_TIER_RADIUS = 460;
export const TIER_RADIUS_STEP = 155;
export const FORK_SPREAD = 104;

export type HandleSide = "top" | "right" | "bottom" | "left";

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Seven equal sectors around the candidate. Starting at twelve o'clock leaves
 * a deliberate opening below the candidate for the transversal IR challenge.
 */
export function branchAngle(branchId: BranchId): number {
  const index = BRANCH_ORDER.indexOf(branchId);
  return -Math.PI / 2 + index * ((Math.PI * 2) / BRANCH_ORDER.length);
}

function pointOnRay(angle: number, radius: number): NodePosition {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function branchHubPosition(branchId: BranchId): NodePosition {
  return pointOnRay(branchAngle(branchId), BRANCH_HUB_RADIUS);
}

export function branchFocusPosition(branchId: BranchId): NodePosition {
  return pointOnRay(branchAngle(branchId), FIRST_TIER_RADIUS + TIER_RADIUS_STEP);
}

export function layoutPositions(): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};

  for (const node of ALL_NODES) {
    if (node.id === IR_NODE.id) continue;

    const angle = branchAngle(node.branchId);
    const radius = FIRST_TIER_RADIUS + node.depth * TIER_RADIUS_STEP;
    const onRay = pointOnRay(angle, radius);
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);

    positions[node.id] = {
      x: onRay.x + tangentX * node.offset * FORK_SPREAD,
      y: onRay.y + tangentY * node.offset * FORK_SPREAD,
    };
  }

  positions[IR_NODE.id] = { x: 0, y: 190 };
  return positions;
}

export function outwardHandle(branchId: BranchId): HandleSide {
  const angle = branchAngle(branchId);
  const x = Math.cos(angle);
  const y = Math.sin(angle);

  if (Math.abs(x) > Math.abs(y)) return x >= 0 ? "right" : "left";
  return y >= 0 ? "bottom" : "top";
}

export function oppositeHandle(side: HandleSide): HandleSide {
  if (side === "top") return "bottom";
  if (side === "right") return "left";
  if (side === "bottom") return "top";
  return "right";
}

export function candidateHandle(branchId: BranchId): string {
  return `center-${outwardHandle(branchId)}`;
}
