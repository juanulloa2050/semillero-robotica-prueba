"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  MIN_COMPLETED_NODES_TO_FINISH,
  MIN_EXPLORED_BRANCHES_TO_FINISH,
} from "@/lib/unlock";

export function JourneyHelp({ panelClassName = "" }: { panelClassName?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="¿Cómo funciona el árbol de habilidades?"
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border font-heading text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
          open
            ? "border-cyan/55 bg-cyan/15 text-cyan"
            : "border-line bg-surface text-ice hover:border-cyan/45 hover:bg-surface-raised"
        }`}
      >
        ?
      </button>

      {open && (
        <section
          id={panelId}
          aria-label="Cómo funciona el recorrido"
          className={`absolute right-0 top-11 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-cyan/30 bg-[#092238]/98 p-4 text-left shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl ${panelClassName}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">
            Elige tu propio recorrido
          </p>
          <h2 className="mt-1 font-heading text-sm font-bold text-ink">
            No tienes que completar todo el árbol
          </h2>
          <p className="mt-2 text-[11px] leading-[17px] text-muted">
            Escoge los retos que más te interesen. Solo debes respetar el orden de
            desbloqueo dentro de cada rama.
          </p>

          <ol className="mt-3 space-y-2 text-[11px] leading-[16px] text-ice/90">
            <li className="flex gap-2">
              <span className="font-bold text-cyan">1.</span>
              Empieza por cualquier reto que aparezca disponible.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-cyan">2.</span>
              Al completarlo se desbloquean los siguientes retos de esa rama.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-cyan">3.</span>
              El reto integrador se habilita al completar 2 retos de aplicación
              en ramas diferentes.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-cyan">4.</span>
              La entrega final requiere {MIN_COMPLETED_NODES_TO_FINISH} retos en
              al menos {MIN_EXPLORED_BRANCHES_TO_FINISH} ramas diferentes.
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}
