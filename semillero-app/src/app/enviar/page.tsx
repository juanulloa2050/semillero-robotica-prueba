"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FlowGate } from "@/components/layout/FlowGate";
import { useAppState } from "@/lib/state/AppStateContext";

export default function EnviarPage() {
  return (
    <FlowGate requireReady>
      <EnviarContent />
    </FlowGate>
  );
}

function EnviarContent() {
  const { state, submitJourney } = useAppState();

  if (state.submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <h1 className="mt-6 font-heading text-2xl font-semibold text-ink">
          Tu prueba fue enviada.
        </h1>
        <p className="mt-3 text-sm text-muted">
          Gracias por explorar y construir con nosotros. El equipo del
          semillero revisará tu recorrido y te contactará pronto.
        </p>
        <Link href="/" className="mt-8 text-xs text-cyan hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs font-medium uppercase tracking-widest text-cyan">
          Último paso
        </span>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-ink">
          Estás a punto de cerrar tu recorrido.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          No necesitas completar todo el árbol. Queremos conocer hasta dónde
          decidiste explorar.
          <br />
          <br />
          Después del envío final no podrás modificar tus respuestas.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/skills"
            className="rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-tech"
          >
            Seguir explorando
          </Link>
          <button
            onClick={submitJourney}
            className="rounded-lg bg-gradient-to-r from-action to-tech px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-action/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Finalizar mi recorrido
          </button>
        </div>
      </motion.div>
    </div>
  );
}
