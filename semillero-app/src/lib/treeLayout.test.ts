import { describe, expect, it } from "vitest";
import { IR_NODE } from "@/lib/data/nodes";
import {
  CANDIDATE_NODE_ID,
  INTEGRATION_NODE_Y,
  layoutPositions,
} from "@/lib/treeLayout";

describe("tree layout", () => {
  it("keeps the integrator challenge below the expanded candidate card", () => {
    const positions = layoutPositions();

    expect(positions[CANDIDATE_NODE_ID]).toBeUndefined();
    expect(positions[IR_NODE.id]).toEqual({ x: 0, y: INTEGRATION_NODE_Y });
    expect(INTEGRATION_NODE_Y).toBeGreaterThanOrEqual(400);
  });
});
