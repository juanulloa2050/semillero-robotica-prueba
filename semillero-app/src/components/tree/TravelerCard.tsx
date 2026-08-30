"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import { branchProgressPercent } from "@/lib/unlock";
import type { NodeStatus } from "@/lib/types";

export interface TravelerCardData {
  name: string;
  completed: number;
  branches: number;
  progress: Record<string, NodeStatus>;
  ready: boolean;
  [key: string]: unknown;
}

export type TravelerNode = Node<TravelerCardData, "traveler">;

const HANDLE_STYLE = {
  width: 2,
  height: 2,
  minWidth: 2,
  minHeight: 2,
  border: 0,
  background: "transparent",
  opacity: 0,
  pointerEvents: "none" as const,
};

export function TravelerCard({ data }: NodeProps<TravelerNode>) {
  const { name, completed, branches, progress, ready } = data;
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : "TÚ";

  const branchProgress = BRANCH_ORDER.map((id) => ({
    id,
    branch: BRANCHES[id],
    percent: branchProgressPercent(progress, id),
  }));
  const overallProgress = Math.round(
    branchProgress.reduce((sum, item) => sum + item.percent, 0) /
      branchProgress.length
  );

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto relative w-[240px] overflow-visible rounded-[28px] border border-cyan/35 bg-surface/95 px-4 pb-4 pt-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.38),0_0_40px_rgba(53,196,232,0.12)] backdrop-blur-xl"
      aria-label={`Perfil de ${name || "aspirante"}. ${completed} retos completados y ${overallProgress}% de progreso.`}
    >
      <Handle
        id="center-top"
        type="source"
        position={Position.Top}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
      <Handle
        id="center-right"
        type="source"
        position={Position.Right}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
      <Handle
        id="center-bottom"
        type="source"
        position={Position.Bottom}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
      <Handle
        id="center-left"
        type="source"
        position={Position.Left}
        style={HANDLE_STYLE}
        isConnectable={false}
      />

      <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/40 bg-gradient-to-br from-action via-tech to-cyan font-heading text-base font-bold text-[#061827] shadow-[0_8px_24px_rgba(53,196,232,0.28)]">
        {initials}
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate font-heading text-[15px] font-semibold text-ink">
          {name || "Aspirante"}
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan">
          Nodo central
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-night/45 py-2.5">
        <div>
          <dd className="font-heading text-sm font-bold text-ink">{completed}</dd>
          <dt className="mt-0.5 text-[11px] text-muted">Retos</dt>
        </div>
        <div>
          <dd className="font-heading text-sm font-bold text-ink">{branches}</dd>
          <dt className="mt-0.5 text-[11px] text-muted">Ramas</dt>
        </div>
        <div>
          <dd className="font-heading text-sm font-bold text-cyan">
            {overallProgress}%
          </dd>
          <dt className="mt-0.5 text-[11px] text-muted">Avance</dt>
        </div>
      </dl>

      <div className="mt-3" aria-label="Progreso por rama">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span>Progreso por ramas</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="flex gap-1">
          {branchProgress.map(({ id, branch, percent }) => (
            <span
              key={id}
              role="progressbar"
              aria-label={`${branch.shortName}: ${percent}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              title={`${branch.shortName} · ${percent}%`}
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${percent}%`, backgroundColor: branch.color }}
              />
            </span>
          ))}
        </div>
      </div>

      {ready && (
        <Link
          href="/perfil"
          className="nodrag nopan mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-tech to-cyan px-3 py-2 text-xs font-bold text-night shadow-[0_8px_22px_rgba(53,196,232,0.2)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          Finalizar recorrido
          <span aria-hidden="true" className="ml-1.5">
            →
          </span>
        </Link>
      )}
    </motion.article>
  );
}
