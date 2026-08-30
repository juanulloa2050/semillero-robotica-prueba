"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FlowGate } from "@/components/layout/FlowGate";
import { useAppState } from "@/lib/state/AppStateContext";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import { SKILL_NODES, IR_NODE } from "@/lib/data/nodes";
import {
  branchProgressPercent,
  branchesExplored,
  completedCount,
} from "@/lib/unlock";

export default function PerfilPage() {
  return (
    <FlowGate requireReady>
      <PerfilContent />
    </FlowGate>
  );
}

function PerfilContent() {
  const { state } = useAppState();
  const reduceMotion = Boolean(useReducedMotion());
  const total = completedCount(state.progress);
  const branches = branchesExplored(state.progress);
  const openChallenges = SKILL_NODES.filter(
    (n) => n.category === "libre" && state.progress[n.id] === "completed"
  ).length;
  const irDone = state.progress[IR_NODE.id] === "completed";
  const evidence = state.introduction.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs font-medium uppercase tracking-widest text-cyan">
          Tu exploración
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-ink">
          Esto es lo que decidiste construir.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          No necesitas completar todo. Este mapa representa lo que decidiste
          explorar y hasta dónde quisiste llegar.
        </p>
      </motion.div>

      <div className="mt-8 space-y-3 rounded-2xl border border-line bg-surface/60 p-6 sm:p-8">
        {BRANCH_ORDER.map((id, i) => {
          const branch = BRANCHES[id];
          const pct = branchProgressPercent(state.progress, id);
          return (
            <div key={id}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-ink">{branch.name}</span>
                <span className="text-muted">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
                <motion.div
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.7, delay: 0.1 + i * 0.05, ease: "easeOut" }
                  }
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${branch.color}, #35C4E8)` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Retos completados", value: total },
          { label: "Ramas exploradas", value: branches },
          { label: "Retos libres", value: openChallenges },
          { label: "Evidencias", value: evidence },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-line bg-surface/60 p-4 text-center"
          >
            <p className="font-heading text-2xl font-semibold text-ink">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {irDone && (
        <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/10 px-5 py-4 text-sm text-ink">
          Completaste el reto transversal <strong>{IR_NODE.title}</strong> —
          combinaste varias de tus habilidades en una sola propuesta.
        </div>
      )}

      {state.submitted ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-ok/25 bg-ok/10 px-6 py-6 text-center">
          <p className="text-sm text-ink">
            Tu recorrido ya fue enviado y quedó cerrado para edición.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/enviar"
              className="rounded-lg bg-gradient-to-r from-action to-tech px-6 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-action/20"
            >
              Ver confirmación
            </Link>
            <Link href="/" className="px-4 py-2 text-xs text-muted hover:text-ink">
              Volver al inicio
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/enviar"
            className="rounded-lg bg-gradient-to-r from-action to-tech px-8 py-3 text-sm font-semibold text-ink shadow-lg shadow-action/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Enviar mi prueba
          </Link>
          <Link href="/skills" className="text-xs text-muted hover:text-ink">
            Seguir explorando
          </Link>
        </div>
      )}
    </div>
  );
}
