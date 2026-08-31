"use client";

import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ALL_NODES, APPLICATION_NODE_IDS, IR_NODE, SKILL_NODES, nodeById } from "@/lib/data/nodes";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import {
  branchHubPosition,
  candidateHandle,
  CANDIDATE_NODE_ID,
  layoutPositions,
  oppositeHandle,
  outwardHandle,
  type HandleSide,
} from "@/lib/treeLayout";
import { branchCompletedCount, branchProgressPercent, branchesExplored, completedCount, computeAllStatuses } from "@/lib/unlock";
import { SkillNodeCard } from "@/components/tree/SkillNodeCard";
import { LaneHeaderNode } from "@/components/tree/LaneHeaderNode";
import { LaneEdge } from "@/components/tree/LaneEdge";
import { TravelerCard } from "@/components/tree/TravelerCard";
import { CandidateNodeResultPanel } from "@/components/evaluator/CandidateNodeResultPanel";
import type { AppState } from "@/lib/types";

const nodeTypes = { skill: SkillNodeCard, laneHeader: LaneHeaderNode, traveler: TravelerCard };
const edgeTypes = { lane: LaneEdge };
const HANDLE_POSITION: Record<HandleSide, Position> = { top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left };
const HYBRID_LINKS = [["D2", "M2"], ["E2", "C2"], ["S2", "A2_YOLO"], ["C4", "SI4"], ["S3B", "SI4"], ["A3", "E3A"]] as const;

interface Props {
  runId: string;
  candidateName: string;
  snapshot: AppState | null;
}

function ReviewTreeCanvas({ runId, candidateName, snapshot }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const progress = useMemo(() => snapshot?.progress ?? {}, [snapshot?.progress]);
  const challengeProgress = useMemo(() => snapshot?.challengeProgress ?? {}, [snapshot?.challengeProgress]);
  const positions = useMemo(() => layoutPositions(), []);
  const statuses = useMemo(
    () => computeAllStatuses(progress, challengeProgress),
    [challengeProgress, progress]
  );
  const completedTotal = completedCount(progress);
  const branchesTotal = branchesExplored(progress);

  const flowNodes: Node[] = useMemo(() => {
    const candidate: Node = {
      id: CANDIDATE_NODE_ID,
      type: "traveler",
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      zIndex: 5,
      data: { name: candidateName, completed: completedTotal, branches: branchesTotal, progress, ready: false, reviewMode: true },
    };
    const branchHubs: Node[] = BRANCH_ORDER.map((id) => {
      const branch = BRANCHES[id];
      const total = SKILL_NODES.filter((node) => node.branchId === id).length;
      const out = outwardHandle(id);
      return {
        id: `lane-${id}`,
        type: "laneHeader",
        position: branchHubPosition(id),
        draggable: false,
        selectable: false,
        zIndex: 4,
        data: { branchId: id, name: branch.name, color: branch.color, done: branchCompletedCount(progress, id), total, pct: branchProgressPercent(progress, id), targetPosition: HANDLE_POSITION[oppositeHandle(out)], sourcePosition: HANDLE_POSITION[out] },
      };
    });
    const skills: Node[] = ALL_NODES.map((node) => {
      const out = node.id === IR_NODE.id ? "bottom" : outwardHandle(node.branchId);
      const inward = node.id === IR_NODE.id ? "top" : oppositeHandle(out);
      return {
        id: node.id,
        type: "skill",
        position: positions[node.id],
        style: { pointerEvents: "all" },
        draggable: false,
        selectable: false,
        zIndex: node.id === IR_NODE.id ? 6 : 3,
        data: { def: node, status: statuses[node.id], dimmed: false, color: BRANCHES[node.branchId].color, isIR: node.id === IR_NODE.id, bonus: node.bonus === true, targetPosition: HANDLE_POSITION[inward], sourcePosition: HANDLE_POSITION[out], onOpen: setSelectedId, reviewMode: true },
      };
    });
    return [candidate, ...branchHubs, ...skills];
  }, [branchesTotal, candidateName, completedTotal, positions, progress, statuses]);

  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (const branchId of BRANCH_ORDER) {
      const root = SKILL_NODES.find((node) => node.branchId === branchId && node.requires.length === 0);
      if (!root) continue;
      const color = BRANCHES[branchId].color;
      edges.push({ id: `candidate-${branchId}`, source: CANDIDATE_NODE_ID, sourceHandle: candidateHandle(branchId), target: `lane-${branchId}`, targetHandle: "in", type: "lane", zIndex: 1, data: { color, active: statuses[root.id] !== "locked", dimmed: false, variant: "branch" } });
      edges.push({ id: `lane-${branchId}-${root.id}`, source: `lane-${branchId}`, sourceHandle: "out", target: root.id, targetHandle: "in", type: "lane", zIndex: 1, data: { color, active: statuses[root.id] !== "locked", dimmed: false, variant: "branch" } });
    }
    for (const node of SKILL_NODES) {
      for (const requirementId of node.requires) edges.push({ id: `${requirementId}-${node.id}`, source: requirementId, sourceHandle: "out", target: node.id, targetHandle: "in", type: "lane", zIndex: 1, data: { color: BRANCHES[node.branchId].color, active: statuses[requirementId] === "completed", dimmed: false, variant: "lane" } });
    }
    for (const [source, target] of HYBRID_LINKS) {
      const sourceNode = nodeById(source);
      if (sourceNode) edges.push({ id: `hybrid-${source}-${target}`, source, sourceHandle: "cross", target, targetHandle: "in", type: "lane", zIndex: 0, data: { color: BRANCHES[sourceNode.branchId].color, active: statuses[source] !== "locked" || statuses[target] !== "locked", dimmed: false, variant: "hybrid" } });
    }
    const applicationIds = APPLICATION_NODE_IDS.flatMap((group) => (Array.isArray(group) ? group : [group]));
    for (const applicationId of applicationIds) {
      const applicationNode = nodeById(applicationId);
      if (applicationNode && statuses[applicationId] === "completed") edges.push({ id: `feed-${applicationId}`, source: applicationId, sourceHandle: "cross", target: IR_NODE.id, targetHandle: "in", type: "lane", zIndex: 2, data: { color: BRANCHES[applicationNode.branchId].color, active: true, dimmed: false, variant: "irfeed" } });
    }
    return edges;
  }, [statuses]);

  const selectedNode = selectedId ? nodeById(selectedId) ?? null : null;

  return (
    <div className="relative h-[50rem] min-h-[38rem] w-full overflow-hidden rounded-2xl border border-line bg-night 2xl:h-[54rem]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[17rem] rounded-xl border border-line bg-surface/90 px-3.5 py-3 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold text-ink">Árbol de resultados</p>
        <p className="mt-1 text-[11px] leading-4 text-muted">Selecciona cualquier nodo para revisar lo que el aspirante guardó.</p>
      </div>
      <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodeOrigin={[0.5, 0.5]} fitView fitViewOptions={{ padding: 0.08, maxZoom: 0.82 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnScroll zoomOnDoubleClick={false} proOptions={{ hideAttribution: true }} minZoom={0.2} maxZoom={1.35}>
        <Background variant={BackgroundVariant.Dots} color="#1a4965" gap={30} size={1.3} />
        <Controls showInteractive={false} position="bottom-left" className="!m-4 !overflow-hidden !rounded-xl !border !border-line !bg-surface/95 !shadow-2xl [&>button]:!border-line [&>button]:!bg-surface [&>button]:!text-ink [&>button:hover]:!bg-surface-raised" />
      </ReactFlow>
      {selectedNode && <CandidateNodeResultPanel runId={runId} node={selectedNode} progress={challengeProgress[selectedNode.id]} status={statuses[selectedNode.id]} completedAt={snapshot?.completedAt[selectedNode.id]} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export function EvaluatorSkillTree(props: Props) {
  return <ReactFlowProvider><ReviewTreeCanvas key={props.runId} {...props} /></ReactFlowProvider>;
}
