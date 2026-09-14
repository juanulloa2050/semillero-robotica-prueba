"use client";

import { useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { BranchIcon } from "@/components/icons/BranchIcon";
import { JourneyHelp } from "@/components/tree/JourneyHelp";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import { IR_NODE, SKILL_NODES } from "@/lib/data/nodes";
import {
  MIN_COMPLETED_NODES_TO_FINISH,
  MIN_EXPLORED_BRANCHES_TO_FINISH,
} from "@/lib/unlock";
import type { BranchId, NodeStatus, SkillNodeDef } from "@/lib/types";

export interface MobileSkillTreeProps {
  progress: Record<string, NodeStatus>;
  statuses: Record<string, NodeStatus>;
  overview: boolean;
  onToggleOverview: () => void;
  onExit: () => void;
  onOpen: (id: string) => void;
  completedTotal: number;
  branchesTotal: number;
  profileName: string;
  ready: boolean;
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  locked: "Bloqueado",
  available: "Listo para iniciar",
  in_progress: "En progreso",
  completed: "Completado",
};

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
    >
      <path d="m5 12.5 4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
    >
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4-5.7-1.8L10.2 9 12 3.5Z" strokeLinejoin="round" />
      <path d="m18.5 16 .65 1.85L21 18.5l-1.85.65L18.5 21l-.65-1.85L16 18.5l1.85-.65L18.5 16Z" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path d="M2.7 12s3.2-5.5 9.3-5.5 9.3 5.5 9.3 5.5-3.2 5.5-9.3 5.5S2.7 12 2.7 12Z" />
      <circle cx="12" cy="12" r="2.4" />
      {crossed && <path d="m4 4 16 16" strokeLinecap="round" />}
    </svg>
  );
}

function InProgressIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="12" cy="12" r="7.2" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "completed") return <CheckIcon />;
  if (status === "locked") return <LockIcon />;
  if (status === "in_progress") return <InProgressIcon />;
  return <SparkIcon />;
}

function TreeConnector({
  fromCount,
  toCount,
  color,
  targetStatuses,
}: {
  fromCount: number;
  toCount: number;
  color: string;
  targetStatuses: NodeStatus[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const sourcePoints = fromCount > 1 ? [25, 75] : [50];
  const targetPoints = toCount > 1 ? [25, 75] : [50];
  const paths =
    sourcePoints.length === targetPoints.length
      ? sourcePoints.map((source, index) => [source, targetPoints[index], index] as const)
      : sourcePoints.length === 1
        ? targetPoints.map((target, index) => [sourcePoints[0], target, index] as const)
        : targetPoints.length === 1
          ? sourcePoints.map((source) => [source, targetPoints[0], 0] as const)
          : sourcePoints.flatMap((source) =>
              targetPoints.map((target, index) => [source, target, index] as const)
            );

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 48"
      preserveAspectRatio="none"
      className="mx-auto h-12 w-full max-w-[21rem] overflow-visible"
    >
      {paths.map(([source, target, targetIndex], index) => {
        const status = targetStatuses[targetIndex] ?? "locked";
        const locked = status === "locked";
        const completed = status === "completed";
        const baseOpacity = locked ? 0.34 : completed ? 0.86 : 0.66;
        const baseWidth = locked ? 1.15 : completed ? 1.85 : 1.55;
        const path = `M ${source} 0 V 22 Q ${source} 24 ${source + Math.sign(target - source) * 2} 24 H ${target - Math.sign(target - source) * 2} Q ${target} 24 ${target} 26 V 48`;

        return (
          <g key={`${source}-${target}-${index}`}>
            {!locked && (
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={baseWidth + 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={completed ? 0.09 : 0.055}
              />
            )}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={baseWidth}
              strokeDasharray={locked ? "3 6" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={baseOpacity}
            />
            {!locked && !prefersReducedMotion && (
              <path
                d={path}
                fill="none"
                stroke="#e5edf7"
                strokeWidth={completed ? 0.95 : 0.8}
                strokeDasharray="2 11"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={completed ? 0.72 : 0.56}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-26"
                  dur={`${completed ? 1.25 : 1.5}s`}
                  begin={`${index * 0.08}s`}
                  repeatCount="indefinite"
                />
              </path>
            )}
          </g>
        );
      })}
      {targetPoints.map((target, index) => {
        const status = targetStatuses[index] ?? "locked";
        const locked = status === "locked";
        const completed = status === "completed";

        return (
          <path
            key={`direction-${target}`}
            d={`M ${target - 1.7} 43.5 L ${target} 47 L ${target + 1.7} 43.5`}
            fill="none"
            stroke={color}
            strokeWidth={locked ? 1.1 : 1.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={locked ? 0.42 : completed ? 0.92 : 0.76}
          />
        );
      })}
    </svg>
  );
}

function SkillTreeNode({
  node,
  status,
  color,
  onOpen,
  special = false,
  bonus = false,
}: {
  node: SkillNodeDef;
  status: NodeStatus;
  color: string;
  onOpen: (id: string) => void;
  special?: boolean;
  bonus?: boolean;
}) {
  const locked = status === "locked";
  const completed = status === "completed";

  const background = locked
    ? "linear-gradient(145deg, rgba(14,44,68,0.58), rgba(7,27,43,0.74))"
    : completed
      ? `linear-gradient(145deg, ${color}38, rgba(9,36,56,0.98) 72%)`
      : `linear-gradient(145deg, ${color}26, rgba(11,36,56,0.98) 68%)`;

  return (
    <button
      type="button"
      onClick={() => onOpen(node.id)}
      aria-label={`${node.title}. ${STATUS_LABEL[status]}`}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border px-3 py-3.5 text-left shadow-xl outline-none transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-cyan/80 ${
        special ? "min-h-[178px] px-5 py-5" : "min-h-[138px]"
      } ${locked ? "border-dashed opacity-50 grayscale" : "hover:-translate-y-0.5"}`}
      style={{
        borderColor: locked ? "rgba(117, 186, 224, 0.2)" : `${color}99`,
        background,
        boxShadow: locked
          ? "0 14px 32px -25px rgba(0,0,0,0.8)"
          : `0 18px 42px -28px ${color}, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-4 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {special && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ice">
          <SparkIcon className="h-3 w-3" />
          Reto integrador
        </span>
      )}
      {!special && bonus && (
        <span className="mb-3 inline-flex w-fit items-center rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan">
          Bonus
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex shrink-0 items-center justify-center rounded-xl border ${special ? "h-12 w-12" : "h-10 w-10"}`}
          style={{
            borderColor: `${color}45`,
            color: locked ? "#9CB6C8" : color,
            background: locked ? "rgba(156,182,200,0.07)" : `${color}1f`,
          }}
        >
          <BranchIcon branch={node.branchId} className={special ? "h-6 w-6" : "h-5 w-5"} />
        </span>
        <span className="rounded-full border border-line bg-night/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
          {special ? "Multirrama" : `Nivel ${node.depth + 1}`}
        </span>
      </div>

      <h3 className={`mt-3 font-heading font-semibold text-ink ${special ? "text-xl leading-6" : "text-[13px] leading-[17px]"}`}>
        {node.title}
      </h3>

      {special && <p className="mt-2 text-xs leading-5 text-muted">{node.description}</p>}

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {node.typeLabel}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold"
          style={{
            color: completed ? "#8CE2C4" : locked ? "#9CB6C8" : color,
            borderColor: completed ? "rgba(88,199,162,0.35)" : locked ? "rgba(117,186,224,0.15)" : `${color}45`,
            background: completed ? "rgba(88,199,162,0.1)" : locked ? "rgba(156,182,200,0.06)" : `${color}12`,
          }}
        >
          <StatusIcon status={status} />
          <span>{STATUS_LABEL[status]}</span>
        </span>
      </div>
    </button>
  );
}

function ConvergenceGraphic({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 304 64"
      className="mx-auto h-16 w-full max-w-[19rem] overflow-visible"
    >
      {BRANCH_ORDER.map((branchId, index) => {
        const branch = BRANCHES[branchId];
        const sourceX = 20 + (index * 264) / (BRANCH_ORDER.length - 1);
        const path = `M ${sourceX} 12 C ${sourceX} 28 152 24 152 58`;

        return (
          <g key={branchId}>
            <path
              d={path}
              fill="none"
              stroke={branch.color}
              strokeWidth={active ? 1.45 : 1.1}
              strokeDasharray={active ? undefined : "3 6"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={active ? 0.58 : 0.25}
            />
            {active && !prefersReducedMotion && (
              <path
                d={path}
                fill="none"
                stroke="#e5edf7"
                strokeWidth="0.8"
                strokeDasharray="2 12"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.55"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-28"
                  dur="1.55s"
                  begin={`${index * 0.06}s`}
                  repeatCount="indefinite"
                />
              </path>
            )}
            <circle
              cx={sourceX}
              cy="12"
              r="5"
              fill={branch.color}
              stroke="#03152f"
              strokeWidth="2"
              opacity={active ? 1 : 0.5}
            />
          </g>
        );
      })}
      <path
        d="M 147.5 52 L 152 59 L 156.5 52"
        fill="none"
        stroke="#d9e1ef"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 0.85 : 0.38}
      />
      <circle cx="152" cy="59" r="4.5" fill="#03152f" stroke="#84b6d7" strokeWidth="1.5" opacity={active ? 1 : 0.45} />
    </svg>
  );
}

export function MobileSkillTree({
  progress,
  statuses,
  overview,
  onToggleOverview,
  onExit,
  onOpen,
  completedTotal,
  branchesTotal,
  profileName,
  ready,
}: MobileSkillTreeProps) {
  const [activeBranch, setActiveBranch] = useState<BranchId>(BRANCH_ORDER[0]);
  const branch = BRANCHES[activeBranch];
  const branchNodes = SKILL_NODES.filter((node) => node.branchId === activeBranch);
  const branchDone = branchNodes.filter((node) => progress[node.id] === "completed").length;
  const branchPercent = Math.round((branchDone / branchNodes.length) * 100);
  const displayName = profileName.trim() || "Aspirante";
  const initial = displayName.charAt(0).toLocaleUpperCase("es");

  const nodesByDepth = Array.from(
    branchNodes.reduce((groups, node) => {
      const group = groups.get(node.depth) ?? [];
      group.push(node);
      groups.set(node.depth, group);
      return groups;
    }, new Map<number, SkillNodeDef[]>())
  )
    .sort(([depthA], [depthB]) => depthA - depthB)
    .map(([depth, nodes]) => [
      depth,
      nodes
        .sort((nodeA, nodeB) => nodeA.offset - nodeB.offset)
        .filter((node) => overview || (statuses[node.id] ?? "locked") !== "locked"),
    ] as const)
    .filter(([, nodes]) => nodes.length > 0);

  const irStatus = statuses[IR_NODE.id] ?? "locked";
  const showIr = overview || irStatus !== "locked";

  return (
    <div className="relative min-h-[calc(100svh-61px)] overflow-hidden bg-night pb-24 lg:hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 5%, rgba(22,141,208,0.18), transparent 28%), radial-gradient(circle at 92% 34%, rgba(53,196,232,0.1), transparent 24%), linear-gradient(rgba(117,186,224,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(117,186,224,0.025) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 28px 28px, 28px 28px",
        }}
      />

      <div className="relative mx-auto w-full max-w-lg px-4 pb-6 pt-4">
        <div className="absolute right-[4.25rem] top-8 z-50">
          <JourneyHelp panelClassName="-right-12" />
        </div>
        <header className="overflow-hidden rounded-[26px] border border-line bg-surface/75 shadow-[0_24px_70px_-42px_rgba(53,196,232,0.55)] backdrop-blur-xl">
          <div className="relative p-4">
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "rgba(53,196,232,0.13)" }}
            />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan/30 bg-gradient-to-br from-tech/30 to-cyan/10 font-heading text-lg font-bold text-ice shadow-lg">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan">Aspirante</p>
                <p className="truncate font-heading text-base font-semibold text-ink">{displayName}</p>
              </div>
              <button
                type="button"
                onClick={onExit}
                aria-label="Cerrar sesión"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-night/35 text-muted transition-colors hover:border-danger/45 hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-cyan"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" strokeLinecap="round" />
                  <path d="M14.5 8.5 18 12l-3.5 3.5M9 12h9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="relative mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Mapa de crecimiento</p>
                <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink">Árbol de habilidades</h1>
              </div>
              <button
                type="button"
                onClick={onToggleOverview}
                aria-pressed={overview}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold transition active:scale-95 ${
                  overview
                    ? "border-cyan/50 bg-cyan/15 text-ice"
                    : "border-line bg-night/35 text-muted hover:border-cyan/35 hover:text-ink"
                }`}
              >
                <EyeIcon crossed={overview} />
                {overview ? "Ocultar bloqueados" : "Ver árbol completo"}
              </button>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-line bg-night/35 px-3 py-2.5">
                <p className="font-heading text-xl font-bold text-ink">{completedTotal}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Retos completados</p>
              </div>
              <div className="rounded-2xl border border-line bg-night/35 px-3 py-2.5">
                <p className="font-heading text-xl font-bold text-ink">
                  {branchesTotal}<span className="text-xs font-medium text-muted">/{BRANCH_ORDER.length}</span>
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Ramas exploradas</p>
              </div>
            </div>

            <div className={`relative mt-3 rounded-2xl border p-3 ${ready ? "border-ok/35 bg-ok/[0.08]" : "border-cyan/25 bg-cyan/[0.06]"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${ready ? "text-ok" : "text-cyan"}`}>
                {ready ? "Entrega final habilitada" : "Meta para enviar tu prueba"}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                Completa {MIN_COMPLETED_NODES_TO_FINISH} retos en al menos {MIN_EXPLORED_BRANCHES_TO_FINISH} ramas diferentes.
              </p>
              <div className="mt-2 flex gap-2 text-[10px] font-semibold">
                <span className="rounded-lg bg-night/45 px-2.5 py-1.5 text-ice">
                  {Math.min(completedTotal, MIN_COMPLETED_NODES_TO_FINISH)}/{MIN_COMPLETED_NODES_TO_FINISH} retos
                </span>
                <span className="rounded-lg bg-night/45 px-2.5 py-1.5 text-ice">
                  {Math.min(branchesTotal, MIN_EXPLORED_BRANCHES_TO_FINISH)}/{MIN_EXPLORED_BRANCHES_TO_FINISH} ramas
                </span>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Ramas de habilidades" className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" aria-label="Seleccionar rama" className="flex w-max gap-2">
            {BRANCH_ORDER.map((branchId) => {
              const item = BRANCHES[branchId];
              const selected = branchId === activeBranch;
              const done = SKILL_NODES.filter(
                (node) => node.branchId === branchId && progress[node.id] === "completed"
              ).length;

              return (
                <button
                  key={branchId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="mobile-skill-branch"
                  onClick={() => setActiveBranch(branchId)}
                  className={`relative flex min-w-[88px] flex-col items-center gap-1.5 overflow-hidden rounded-2xl border px-3 py-3 text-center transition active:scale-95 ${
                    selected ? "bg-surface-raised text-ink shadow-xl" : "border-line bg-surface/55 text-muted"
                  }`}
                  style={{
                    borderColor: selected ? `${item.color}85` : undefined,
                    boxShadow: selected ? `0 16px 34px -24px ${item.color}` : undefined,
                  }}
                >
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 top-0 h-px"
                      style={{ background: item.color }}
                    />
                  )}
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ color: item.color, background: `${item.color}18` }}
                  >
                    <BranchIcon branch={branchId} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="max-w-[76px] truncate text-[10px] font-semibold">{item.shortName}</span>
                  {done > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ok px-1 text-[8px] font-bold text-night">
                      {done}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <section
          id="mobile-skill-branch"
          role="tabpanel"
          aria-label={branch.name}
          className="mt-3 rounded-[28px] border border-line bg-surface/45 px-3 pb-5 pt-4 shadow-[0_28px_70px_-48px_rgba(0,0,0,0.95)] backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-line bg-night/35 p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                style={{ color: branch.color, borderColor: `${branch.color}45`, background: `${branch.color}16` }}
              >
                <BranchIcon branch={activeBranch} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: branch.color }}>
                  Rama activa
                </p>
                <h2 className="mt-0.5 font-heading text-lg font-bold leading-5 text-ink">{branch.name}</h2>
                <p className="mt-1 text-[11px] leading-4 text-muted">{branch.tagline}</p>
              </div>
              <span className="shrink-0 font-heading text-sm font-bold text-ink">
                {branchDone}<span className="font-body text-[10px] font-medium text-muted">/{branchNodes.length}</span>
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-night/70">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${branchPercent}%`,
                  background: `linear-gradient(90deg, ${branch.color}, #35C4E8)`,
                  boxShadow: branchDone > 0 ? `0 0 10px ${branch.color}` : undefined,
                }}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-col items-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-night shadow-lg"
              style={{ borderColor: branch.color, color: branch.color, boxShadow: `0 0 20px ${branch.color}35` }}
            >
              <BranchIcon branch={activeBranch} className="h-4 w-4" />
            </div>

            {nodesByDepth.length > 0 ? (
              nodesByDepth.map(([depth, nodes], groupIndex) => {
                const previousNodes = groupIndex === 0 ? [{ id: "branch-root" }] : nodesByDepth[groupIndex - 1][1];
                return (
                  <div key={depth} className="w-full">
                    <TreeConnector
                      fromCount={previousNodes.length}
                      toCount={nodes.length}
                      color={branch.color}
                      targetStatuses={nodes.map((node) => statuses[node.id] ?? "locked")}
                    />
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className="h-px w-7 bg-line" />
                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted">Nivel {depth + 1}</span>
                      <span className="h-px w-7 bg-line" />
                    </div>
                    <div className={`grid gap-3 ${nodes.length > 1 ? "grid-cols-2" : "mx-auto max-w-[21rem] grid-cols-1"}`}>
                      {nodes.map((node) => (
                        <SkillTreeNode
                          key={node.id}
                          node={node}
                          status={statuses[node.id] ?? "locked"}
                          color={branch.color}
                          onOpen={onOpen}
                          bonus={node.bonus === true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="mt-6 w-full rounded-2xl border border-dashed border-line bg-night/25 px-4 py-8 text-center">
                <LockIcon className="mx-auto h-5 w-5 text-muted" />
                <p className="mt-2 text-xs text-muted">Completa el nivel anterior para revelar esta rama.</p>
              </div>
            )}
          </div>
        </section>

        {showIr && (
          <section aria-label="Reto integrador" className="mt-7">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan">Las ramas convergen</p>
              <h2 className="mt-1 font-heading text-lg font-bold text-ink">Integra lo que aprendiste</h2>
            </div>
            <ConvergenceGraphic active={irStatus !== "locked"} />
            <SkillTreeNode
              node={IR_NODE}
              status={irStatus}
              color="#35C4E8"
              onOpen={onOpen}
              special
            />
          </section>
        )}

        {ready && (
          <div className="sticky bottom-4 z-20 mt-8 rounded-[22px] border border-cyan/35 bg-surface/90 p-2 shadow-[0_22px_60px_-22px_rgba(53,196,232,0.55)] backdrop-blur-xl">
            <Link
              href="/perfil"
              className="pulse-glow flex items-center justify-between rounded-2xl bg-gradient-to-r from-action via-tech to-cyan px-4 py-3.5 text-sm font-bold text-ink transition active:scale-[0.99]"
            >
              <span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-ice/75">Tu recorrido está listo</span>
                Preparar entrega final
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-night/20 text-lg" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
