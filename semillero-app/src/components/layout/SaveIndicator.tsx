"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppState } from "@/lib/state/AppStateContext";

export function SaveIndicator() {
  const { saveStatus } = useAppState();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-w-[4.75rem] items-center justify-end text-[11px] text-muted sm:min-w-[5.5rem] sm:text-xs"
    >
      <AnimatePresence mode="wait" initial={false}>
        {saveStatus === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            Guardando…
          </motion.span>
        )}
        {saveStatus === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />
            Guardado
          </motion.span>
        )}
        {saveStatus === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-danger"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-danger" />
            Sin guardar
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
