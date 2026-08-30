"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BranchIcon } from "@/components/icons/BranchIcon";
import type { BranchId } from "@/lib/types";

export interface LaneHeaderData {
  branchId: BranchId;
  name: string;
  color: string;
  done: number;
  total: number;
  pct: number;
  targetPosition?: Position;
  sourcePosition?: Position;
  [key: string]: unknown;
}

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

export function LaneHeaderNode({ data }: NodeProps) {
  const d = data as LaneHeaderData;
  const targetPosition = d.targetPosition ?? Position.Top;
  const sourcePosition = d.sourcePosition ?? Position.Bottom;

  return (
    <section
      className="relative w-[148px] select-none rounded-2xl border border-line bg-surface/95 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur"
      aria-label={`${d.name}: ${d.done} de ${d.total} retos completados, ${d.pct}%`}
    >
      <Handle
        id="in"
        type="target"
        position={targetPosition}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
      <Handle
        id="out"
        type="source"
        position={sourcePosition}
        style={HANDLE_STYLE}
        isConnectable={false}
      />

      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-0.5 rounded-r-full"
        style={{ backgroundColor: d.color }}
      />

      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: `${d.color}55`,
            backgroundColor: `${d.color}1f`,
            color: d.color,
          }}
        >
          <BranchIcon branch={d.branchId} className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-4 text-ink">
            {d.name}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted">
            {d.done} de {d.total} retos
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          role="progressbar"
          aria-label={`Progreso de ${d.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={d.pct}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-night/60"
        >
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{ width: `${d.pct}%`, backgroundColor: d.color }}
          />
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-ink">
          {d.pct}%
        </span>
      </div>
    </section>
  );
}
