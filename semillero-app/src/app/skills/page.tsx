"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppState } from "@/lib/state/AppStateContext";
import {
  ALL_NODES,
  APPLICATION_NODE_IDS,
  IR_NODE,
  SKILL_NODES,
  nodeById,
} from "@/lib/data/nodes";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import {
  branchFocusPosition,
  branchHubPosition,
  candidateHandle,
  CANDIDATE_NODE_ID,
  layoutPositions,
  oppositeHandle,
  outwardHandle,
  type HandleSide,
} from "@/lib/treeLayout";
import {
  branchCompletedCount,
  branchProgressPercent,
  branchesExplored,
  canFinishJourney,
  completedCount,
  computeAllStatuses,
} from "@/lib/unlock";
import { SkillNodeCard } from "@/components/tree/SkillNodeCard";
import { LaneHeaderNode } from "@/components/tree/LaneHeaderNode";
import { LaneEdge } from "@/components/tree/LaneEdge";
import { TravelerCard } from "@/components/tree/TravelerCard";
import { TreeHeader } from "@/components/tree/TreeHeader";
import { NodeDetailPanel } from "@/components/tree/NodeDetailPanel";
import { MobileSkillTree } from "@/components/tree/MobileSkillTree";
import { ExitJourneyDialog } from "@/components/tree/ExitJourneyDialog";
import { canAccessSkillTree } from "@/lib/journey";
import { useTesterSession } from "@/lib/tester/session";
import type { BranchId, NodeStatus } from "@/lib/types";

const nodeTypes = {
  skill: SkillNodeCard,
  laneHeader: LaneHeaderNode,
  traveler: TravelerCard,
};
const edgeTypes = { lane: LaneEdge };

const HANDLE_POSITION: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** Visual relationships only: they show where disciplines meet without
 * changing the prerequisite rules for either branch. */
const HYBRID_LINKS = [
  ["D2", "M2"],
  ["E2", "C2"],
  ["S2", "A2_YOLO"],
  ["C4", "SI4"],
  ["S3B", "SI4"],
  ["A3", "E3A"],
] as const;

function TreeCanvas() {
  const {
    state,
    hydrated,
    sessionActive,
    completeNode,
    completeChallenge,
    saveChallengeProgress,
    endSession,
  } = useAppState();
  const [overview, setOverview] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const { fitView, setCenter } = useReactFlow();
  const router = useRouter();
  const { hydrated: testerHydrated, testerActive, deactivateTester } = useTesterSession();
  const canAccess = canAccessSkillTree(state);
  const accessAllowed = testerActive || (sessionActive && canAccess && !state.submitted);

  useEffect(() => {
    if (!hydrated || !testerHydrated) return;
    if (testerActive) return;
    if (!sessionActive) {
      router.replace("/");
      return;
    }
    if (state.submitted) {
      router.replace("/perfil");
      return;
    }
    if (!canAccess) router.replace("/registro");
  }, [canAccess, hydrated, router, sessionActive, state.submitted, testerActive, testerHydrated]);

  const positions = useMemo(() => layoutPositions(), []);
  const statuses = useMemo(() => {
    const computed = computeAllStatuses(state.progress, state.challengeProgress);
    if (!testerActive) return computed;
    // Modo espectador: todo queda visible y abierto para revisión, sin
    // necesitar progreso ni respuestas reales.
    const overridden: Record<string, NodeStatus> = {};
    for (const [id, status] of Object.entries(computed)) {
      overridden[id] = status === "completed" ? status : "available";
    }
    return overridden;
  }, [state.progress, state.challengeProgress, testerActive]);
  const completedTotal = completedCount(state.progress);
  const branchesTotal = branchesExplored(state.progress);
  const ready = canFinishJourney(state.progress);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const visible = useMemo(() => {
    const set = new Set<string>();
    for (const node of ALL_NODES) {
      if (overview || statuses[node.id] !== "locked") set.add(node.id);
    }
    return set;
  }, [overview, statuses]);

  const flowNodes: Node[] = useMemo(() => {
    const candidate: Node = {
      id: CANDIDATE_NODE_ID,
      type: "traveler",
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      zIndex: 5,
      data: {
        name: testerActive ? "Modo tester" : state.profile.fullName,
        completed: completedTotal,
        branches: branchesTotal,
        progress: state.progress,
        ready,
      },
    };

    const branchHubs: Node[] = BRANCH_ORDER.map((id) => {
      const branch = BRANCHES[id];
      const total = SKILL_NODES.filter((node) => node.branchId === id).length;
      const done = branchCompletedCount(state.progress, id);
      const out = outwardHandle(id);
      return {
        id: `lane-${id}`,
        type: "laneHeader",
        position: branchHubPosition(id),
        draggable: false,
        selectable: false,
        zIndex: 4,
        data: {
          branchId: id,
          name: branch.name,
          tagline: branch.tagline,
          color: branch.color,
          done,
          total,
          pct: branchProgressPercent(state.progress, id),
          targetPosition: HANDLE_POSITION[oppositeHandle(out)],
          sourcePosition: HANDLE_POSITION[out],
        },
      };
    });

    const skillNodes: Node[] = ALL_NODES.filter((node) => visible.has(node.id)).map(
      (node) => {
        const out = node.id === IR_NODE.id ? "bottom" : outwardHandle(node.branchId);
        const inward = node.id === IR_NODE.id ? "top" : oppositeHandle(out);
        return {
          id: node.id,
          type: "skill",
          position: positions[node.id],
          // React Flow disables pointer events when a node is neither draggable
          // nor selectable. Skill nodes remain fixed, but their inner button
          // must still receive hover, mouse and touch interactions.
          style: { pointerEvents: "all" },
          draggable: false,
          selectable: false,
          zIndex: node.id === IR_NODE.id ? 6 : 3,
          data: {
            def: node,
            status: statuses[node.id],
            dimmed: overview && statuses[node.id] === "locked",
            color: BRANCHES[node.branchId].color,
            isIR: node.id === IR_NODE.id,
            bonus: node.bonus === true,
            targetPosition: HANDLE_POSITION[inward],
            sourcePosition: HANDLE_POSITION[out],
            onOpen: setSelectedId,
          },
        };
      }
    );

    return [candidate, ...branchHubs, ...skillNodes];
  }, [
    branchesTotal,
    completedTotal,
    overview,
    positions,
    ready,
    state.profile.fullName,
    state.progress,
    statuses,
    testerActive,
    visible,
  ]);

  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (const branchId of BRANCH_ORDER) {
      const root = SKILL_NODES.find(
        (node) => node.branchId === branchId && node.requires.length === 0
      );
      if (!root) continue;

      const branch = BRANCHES[branchId];
      edges.push({
        id: `candidate-${branchId}`,
        source: CANDIDATE_NODE_ID,
        sourceHandle: candidateHandle(branchId),
        target: `lane-${branchId}`,
        targetHandle: "in",
        type: "lane",
        zIndex: 1,
        data: {
          color: branch.color,
          active: statuses[root.id] !== "locked",
          dimmed: false,
          variant: "branch",
        },
      });

      if (visible.has(root.id)) {
        edges.push({
          id: `lane-${branchId}-${root.id}`,
          source: `lane-${branchId}`,
          sourceHandle: "out",
          target: root.id,
          targetHandle: "in",
          type: "lane",
          zIndex: 1,
          data: {
            color: branch.color,
            active: statuses[root.id] !== "locked",
            dimmed: overview && statuses[root.id] === "locked",
            variant: "branch",
          },
        });
      }
    }

    for (const node of SKILL_NODES) {
      if (!visible.has(node.id)) continue;
      for (const requirementId of node.requires) {
        if (!visible.has(requirementId)) continue;
        edges.push({
          id: `${requirementId}-${node.id}`,
          source: requirementId,
          sourceHandle: "out",
          target: node.id,
          targetHandle: "in",
          type: "lane",
          zIndex: 1,
          data: {
            color: BRANCHES[node.branchId].color,
            active: statuses[requirementId] === "completed",
            dimmed: overview && statuses[node.id] === "locked",
            variant: "lane",
          },
        });
      }
    }

    for (const [source, target] of HYBRID_LINKS) {
      if (!visible.has(source) || !visible.has(target)) continue;
      const sourceNode = nodeById(source);
      if (!sourceNode) continue;
      edges.push({
        id: `hybrid-${source}-${target}`,
        source,
        sourceHandle: "cross",
        target,
        targetHandle: "in",
        type: "lane",
        zIndex: 0,
        data: {
          color: BRANCHES[sourceNode.branchId].color,
          active: statuses[source] === "completed" && statuses[target] !== "locked",
          dimmed: overview &&
            (statuses[source] === "locked" || statuses[target] === "locked"),
          variant: "hybrid",
        },
      });
    }

    if (visible.has(IR_NODE.id)) {
      const applicationIds = APPLICATION_NODE_IDS.flatMap((group) =>
        Array.isArray(group) ? group : [group]
      );
      for (const applicationId of applicationIds) {
        if (statuses[applicationId] !== "completed") continue;
        const applicationNode = nodeById(applicationId);
        if (!applicationNode) continue;
        edges.push({
          id: `feed-${applicationId}`,
          source: applicationId,
          sourceHandle: "cross",
          target: IR_NODE.id,
          targetHandle: "in",
          type: "lane",
          zIndex: 2,
          data: {
            color: BRANCHES[applicationNode.branchId].color,
            active: true,
            dimmed: false,
            variant: "irfeed",
          },
        });
      }
    }

    return edges;
  }, [overview, statuses, visible]);

  useEffect(() => {
    if (isCompact || !hydrated || !accessAllowed) return;
    const timer = setTimeout(
      () => fitView({ padding: overview ? 0.06 : 0.1, duration: 650, maxZoom: 1 }),
      80
    );
    return () => clearTimeout(timer);
  }, [accessAllowed, fitView, hydrated, isCompact, overview, visible.size]);

  const selectedNode = selectedId ? nodeById(selectedId) ?? null : null;
  const selectedStatus = selectedId ? statuses[selectedId] ?? "locked" : "locked";
  const prereqTitles = useMemo(() => {
    if (!selectedNode) return [];
    return selectedNode.requires
      .map((id) => nodeById(id)?.title)
      .filter((title): title is string => Boolean(title));
  }, [selectedNode]);

  const handleComplete = useCallback(
    (id: string) => completeNode(id),
    [completeNode]
  );

  const handleJumpToLane = useCallback(
    (branchId: BranchId) => {
      const point = branchFocusPosition(branchId);
      setCenter(point.x, point.y, { zoom: 0.92, duration: 650 });
    },
    [setCenter]
  );

  const handleExit = useCallback(() => {
    if (testerActive) deactivateTester();
    else endSession();
    setExitOpen(false);
    router.replace("/");
  }, [deactivateTester, endSession, router, testerActive]);

  const detailPanel = (
    <NodeDetailPanel
      node={selectedNode}
      status={selectedStatus}
      prereqTitles={prereqTitles}
      onClose={() => setSelectedId(null)}
      onComplete={handleComplete}
      challengeProgress={selectedId ? state.challengeProgress[selectedId] : undefined}
      onSaveChallengeProgress={saveChallengeProgress}
      onCompleteChallenge={completeChallenge}
      testerMode={testerActive}
    />
  );

  const exitDialog = (
    <ExitJourneyDialog
      open={exitOpen}
      onCancel={() => setExitOpen(false)}
      onConfirm={handleExit}
    />
  );

  if (!hydrated || !testerHydrated || !accessAllowed) {
    return <TreeLoading />;
  }

  if (isCompact) {
    return (
      <div className="min-h-[calc(100dvh-61px)] bg-night">
        <MobileSkillTree
          progress={state.progress}
          statuses={statuses}
          overview={overview}
          onToggleOverview={() => setOverview((value) => !value)}
          onExit={() => setExitOpen(true)}
          onOpen={setSelectedId}
          completedTotal={completedTotal}
          branchesTotal={branchesTotal}
          profileName={testerActive ? "Modo tester" : state.profile.fullName}
          ready={ready}
        />
        {detailPanel}
        {exitDialog}
      </div>
    );
  }

  return (
    <div className="skill-tree-canvas relative flex h-[calc(100dvh-61px)] min-h-[680px] w-full flex-col overflow-hidden bg-night">
      <div className="pointer-events-none relative z-10 shrink-0 px-4 pt-4 lg:px-5 lg:pt-5">
        <TreeHeader
          progress={state.progress}
          overview={overview}
          onToggleOverview={() => setOverview((value) => !value)}
          onJumpToLane={handleJumpToLane}
          onExit={() => setExitOpen(true)}
          completedTotal={completedTotal}
          branchesTotal={branchesTotal}
          testerMode={testerActive}
        />
      </div>

      <div className="relative z-[1] min-h-0 flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodeOrigin={[0.5, 0.5]}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.22}
          maxZoom={1.5}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#1a4965"
            gap={30}
            size={1.3}
          />
          <Controls
            showInteractive={false}
            position="bottom-right"
            className="!m-5 !overflow-hidden !rounded-xl !border !border-line !bg-surface/95 !shadow-2xl [&>button]:!border-line [&>button]:!bg-surface [&>button]:!text-ink [&>button:hover]:!bg-surface-raised"
          />
        </ReactFlow>

        <div className="pointer-events-none absolute bottom-5 left-5 z-10 hidden items-center gap-4 rounded-xl border border-line bg-surface/85 px-3.5 py-2.5 text-[10px] text-muted shadow-xl backdrop-blur lg:flex">
          <span className="font-semibold uppercase tracking-[0.16em] text-ink/80">Lectura</span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-cyan" /> Listo
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-ok" /> Completado
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-px w-5 border-t border-dashed border-muted" /> Cruce entre ramas
          </span>
        </div>
      </div>

      {detailPanel}
      {exitDialog}
    </div>
  );
}

function TreeLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-61px)] items-center justify-center bg-night px-6">
      <div className="relative flex items-center gap-3 rounded-full border border-line bg-surface/75 px-4 py-2.5 text-xs text-muted shadow-2xl backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan shadow-[0_0_12px_rgba(53,196,232,0.8)]" />
        Preparando tu árbol
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <ReactFlowProvider>
      <TreeCanvas />
    </ReactFlowProvider>
  );
}
