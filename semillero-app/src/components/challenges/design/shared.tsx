"use client";

import { useState, type ReactNode } from "react";

/** Color de rama Diseño/CAD (ver retos/01-diseno-cad.md). */
export const DESIGN_BRAND = "#3455D1";
export const DESIGN_BRAND_LIGHT = "#8CA0F0";

export function DesignChallengeShell({
  nodeId,
  categoryLabel,
  title,
  introduction,
  readOnly,
  attempts,
  hintsUsed,
  solved,
  children,
}: {
  nodeId: string;
  categoryLabel: string;
  title: string;
  introduction: string;
  readOnly: boolean;
  attempts: number;
  hintsUsed: number;
  solved: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-3xl border shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
      style={{ borderColor: `${DESIGN_BRAND}40`, background: "#0B1220" }}
    >
      <div
        className="border-b border-white/10 px-5 py-5 sm:px-7 lg:px-9"
        style={{
          background: `radial-gradient(circle at top right, ${DESIGN_BRAND}30, transparent 45%), linear-gradient(135deg,#101a35,#0b1428)`,
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: `${DESIGN_BRAND_LIGHT}4D`, background: `${DESIGN_BRAND_LIGHT}1A`, color: DESIGN_BRAND_LIGHT }}
              >
                {nodeId} · {categoryLabel}
              </span>
              {readOnly && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Solo lectura
                </span>
              )}
              {solved && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">
                  Completado
                </span>
              )}
            </div>
            <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{introduction}</p>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
            <Stat label="Intentos" value={attempts} />
            <Stat label="Pistas" value={hintsUsed} />
            <Stat label="Estado" value={solved ? "✓" : "—"} />
          </dl>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-white">Paso 1 de 1</span>
            <span className="text-slate-400">{solved ? "1/1 resuelto" : "0/1 resuelto"}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={solved ? 1 : 0}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: solved ? "100%" : "8%",
                background: `linear-gradient(90deg, ${DESIGN_BRAND}, ${DESIGN_BRAND_LIGHT})`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="font-heading text-base font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{label}</div>
    </div>
  );
}

export function DesignVisual({ src, alt }: { src: string; alt: string }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d1730]">
      <div className="flex justify-center p-3 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${basePath}${src}`} alt={alt} className="w-full max-w-xl rounded-xl" />
      </div>
    </figure>
  );
}

export function DesignOptionGrid({
  options,
  selected,
  multi,
  disabled,
  onToggle,
}: {
  options: readonly { id: string; label: string }[];
  selected: readonly string[];
  multi: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const picked = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.id)}
            aria-pressed={picked}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              picked
                ? "border-[#8CA0F0]/60 bg-[#3455D1]/15 text-white"
                : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/25"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                multi ? "rounded-[4px]" : "rounded-full"
              } ${picked ? "border-[#8CA0F0] bg-[#8CA0F0]" : "border-slate-500"}`}
            >
              {picked && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-none stroke-[#0B1220] stroke-[2]">
                  <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function DesignResultBanner({ isCorrect, message }: { isCorrect: boolean; message: string }) {
  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-6 ${
        isCorrect
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-rose-400/30 bg-rose-400/10 text-rose-200"
      }`}
      role="status"
    >
      {isCorrect ? "✓ " : "✗ "}
      {message}
    </div>
  );
}

export function DesignHintPanel({
  hints,
  revealed,
  disabled,
  onReveal,
}: {
  hints: readonly string[];
  revealed: number;
  disabled: boolean;
  onReveal: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-200"
      >
        Pistas ({revealed}/{hints.length}) {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {hints.slice(0, revealed).map((hint, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.025] px-3.5 py-2.5 text-xs leading-5 text-slate-300">
              <span className="mr-2 font-bold" style={{ color: DESIGN_BRAND_LIGHT }}>
                {i + 1}.
              </span>
              {hint}
            </div>
          ))}
          {revealed < hints.length && !disabled && (
            <button
              type="button"
              onClick={onReveal}
              className="rounded-lg border border-white/15 bg-white/[0.035] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-white/30"
            >
              Revelar siguiente pista
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DesignFooter({
  solved,
  readOnly,
  canSubmit,
  submitLabel,
  onSubmit,
  onExit,
}: {
  solved: boolean;
  readOnly: boolean;
  canSubmit: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onExit?: () => void;
}) {
  return (
    <footer className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.065]"
          >
            Guardar y salir
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        {!solved && !readOnly && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-[0_12px_32px_rgba(52,85,209,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: `linear-gradient(90deg, #22318f, ${DESIGN_BRAND})` }}
          >
            {submitLabel}
          </button>
        )}
        {solved && (
          <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 text-sm font-bold text-emerald-200">
            ✓ Reto completado
          </div>
        )}
        {readOnly && !solved && <p className="text-xs text-slate-400">Este paso aún no tiene una solución registrada.</p>}
      </div>
    </footer>
  );
}
