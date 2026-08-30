"use client";

import { motion } from "framer-motion";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import { BranchIcon } from "@/components/icons/BranchIcon";
import { branchCompletedCount } from "@/lib/unlock";
import { SKILL_NODES } from "@/lib/data/nodes";
import type { BranchId, NodeStatus } from "@/lib/types";

export function TreeHeader({
  progress,
  overview,
  onToggleOverview,
  onJumpToLane,
  onExit,
  completedTotal,
  branchesTotal,
}: {
  progress: Record<string, NodeStatus>;
  overview: boolean;
  onToggleOverview: () => void;
  onJumpToLane: (id: BranchId) => void;
  onExit: () => void;
  completedTotal: number;
  branchesTotal: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Controles del árbol"
      className="pointer-events-auto mx-auto flex max-w-[1500px] items-center gap-4 rounded-[20px] border border-line bg-[#071d2f]/92 px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl"
    >
      <div className="min-w-[220px] border-r border-line pr-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(53,196,232,0.8)]" />
          <h1 className="font-heading text-sm font-semibold text-ink">
            Tu árbol de habilidades
          </h1>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {completedTotal} retos · {branchesTotal} ramas · arrastra para recorrer
        </p>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {BRANCH_ORDER.map((id) => {
          const branch = BRANCHES[id];
          const total = SKILL_NODES.filter((node) => node.branchId === id).length;
          const done = branchCompletedCount(progress, id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onJumpToLane(id)}
              title={`Enfocar ${branch.name}: ${done} de ${total} retos`}
              aria-label={`Enfocar ${branch.name}: ${done} de ${total} retos completados`}
              className="group flex min-w-0 items-center gap-1.5 rounded-xl border border-transparent px-2 py-2 text-muted transition-all hover:border-line hover:bg-surface-raised/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  color: branch.color,
                  borderColor: `${branch.color}38`,
                  background: `${branch.color}16`,
                }}
              >
                <BranchIcon branch={id} className="h-3.5 w-3.5" />
              </span>
              <span className="hidden min-w-0 xl:block">
                <span className="block truncate text-[10px] font-medium text-ink/90">
                  {branch.shortName}
                </span>
                <span className="block text-left text-[9px] text-muted">
                  {done}/{total}
                </span>
              </span>
              <span className="text-[9px] font-semibold xl:hidden">{done}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleOverview}
          aria-pressed={overview}
          className={`rounded-xl border px-3.5 py-2.5 text-[11px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
            overview
              ? "border-cyan/50 bg-cyan/15 text-cyan"
              : "border-line bg-surface text-ink hover:border-tech/60 hover:bg-surface-raised"
          }`}
        >
          {overview ? "Volver a mi progreso" : "Ver árbol completo"}
        </button>
        <button
          type="button"
          onClick={onExit}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-all hover:border-danger/45 hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" strokeLinecap="round" />
            <path d="M14.5 8.5 18 12l-3.5 3.5M9 12h9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.section>
  );
}
