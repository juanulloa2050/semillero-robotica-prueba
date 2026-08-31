"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion } from "framer-motion";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { EASE_SPRING } from "@/lib/motion";
import type { NodeStatus, SkillNodeDef } from "@/lib/types";
import { BranchIcon } from "@/components/icons/BranchIcon";

export interface SkillNodeData {
  def: SkillNodeDef;
  status: NodeStatus;
  dimmed: boolean;
  color: string;
  isIR?: boolean;
  bonus?: boolean;
  targetPosition?: Position;
  sourcePosition?: Position;
  onOpen: (id: string) => void;
  reviewMode?: boolean;
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

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path
        d="m5 13 4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SkillNodeCard({ data }: NodeProps) {
  const d = data as SkillNodeData;
  const {
    def,
    status,
    dimmed,
    color,
    isIR = false,
    bonus = false,
    targetPosition = Position.Top,
    sourcePosition = Position.Bottom,
    reviewMode = false,
  } = d;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const prevStatus = useRef(status);
  const tooltipId = useId();

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (prev === "locked" && status === "available") {
      setJustUnlocked(true);
      const timeout = setTimeout(() => setJustUnlocked(false), 900);
      return () => clearTimeout(timeout);
    }

    if ((prev === "available" || prev === "in_progress") && status === "completed") {
      setJustCompleted(true);
      const timeout = setTimeout(() => setJustCompleted(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const isOpen = status === "available" || status === "in_progress";

  const statusLabel =
    status === "completed"
      ? "Completado"
      : status === "in_progress"
        ? reviewMode ? "Con actividad" : "En progreso"
        : status === "available"
          ? reviewMode ? "Disponible" : "Listo"
          : reviewMode ? "Sin actividad" : "Bloqueado";

  const bodyClass =
    status === "completed"
      ? "border-ice/65 bg-gradient-to-br from-tech to-cyan text-night"
      : isOpen
        ? "border-2 bg-surface-raised text-ink"
        : "border border-dashed border-muted/55 bg-surface/80 text-muted";

  const bodyStyle: CSSProperties = {
    ...(isOpen
      ? {
          borderColor: color,
          background: `linear-gradient(140deg, #0E2C44 45%, ${color}26)`,
          boxShadow: `0 0 0 3px ${color}1f`,
        }
      : {}),
    ...(isIR
      ? {
          clipPath:
            "polygon(9% 0, 91% 0, 100% 50%, 91% 100%, 9% 100%, 0 50%)",
        }
      : {}),
  };

  const statusClass =
    status === "completed"
      ? "border-night/15 bg-night/15 text-night"
      : isOpen
        ? "border-current/25 bg-night/35"
        : "border-muted/25 bg-night/30 text-muted";

  return (
    <div
      className="relative flex w-[168px] flex-col items-center overflow-visible"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
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
      <Handle
        id="cross"
        type="source"
        position={targetPosition}
        style={HANDLE_STYLE}
        isConnectable={false}
      />

      {tooltipVisible && (
        <motion.div
          id={tooltipId}
          role="tooltip"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute -top-3 z-30 w-48 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2.5 text-left shadow-2xl"
        >
          <p className="text-xs font-semibold leading-4 text-ink">{def.title}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted">
            {reviewMode
              ? status === "completed"
                ? "El aspirante completó este reto. Abre sus resultados."
                : status === "in_progress"
                  ? "Hay progreso guardado. Abre los resultados disponibles."
                  : status === "available"
                    ? "El reto está disponible, pero el aspirante aún no registra actividad."
                    : "El aspirante todavía no registra actividad en este reto."
              : status === "completed"
              ? "Reto completado. Puedes volver a revisar el detalle."
              : status === "in_progress"
                ? "Tienes progreso guardado. Continúa donde lo dejaste."
                : status === "available"
                  ? "Reto listo. Ábrelo para ver las instrucciones."
                  : "Abre el reto para consultar sus prerrequisitos."}
          </p>
        </motion.div>
      )}

      <div
        className={isIR ? "drop-shadow-[0_12px_22px_rgba(53,196,232,0.2)]" : ""}
      >
        <motion.button
          type="button"
          onClick={() => d.onOpen(def.id)}
          onFocus={() => setTooltipVisible(true)}
          onBlur={() => setTooltipVisible(false)}
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{
            opacity: dimmed ? 0.42 : 1,
            scale: justCompleted ? [1, 1.07, 1] : 1,
          }}
          transition={{ duration: 0.32, ease: EASE_SPRING }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          aria-label={`${def.title}. Estado: ${statusLabel}. Abrir detalle.`}
          aria-describedby={tooltipVisible ? tooltipId : undefined}
          data-state={status}
          style={bodyStyle}
          className={`nodrag nopan relative flex min-h-[94px] w-[168px] cursor-pointer flex-col gap-2 overflow-hidden px-3 py-3 text-left shadow-lg transition-[box-shadow,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-night ${
            isIR ? "min-h-[112px] px-5 py-4" : "rounded-2xl"
          } ${bodyClass} ${dimmed ? "grayscale" : ""} ${
            justUnlocked ? "ring-pulse" : ""
          }`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: status === "locked" ? "#6f8797" : color }}
          />

          {isIR && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-current/75">
              Reto integrador
            </p>
          )}
          {!isIR && bonus && (
            <p className="inline-flex w-fit items-center rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan">
              Bonus
            </p>
          )}

          <div className="flex min-w-0 items-start gap-2">
            <span
              className={`flex shrink-0 items-center justify-center border ${
                isIR ? "h-8 w-8 rotate-45 rounded-[9px]" : "h-7 w-7 rounded-lg"
              }`}
              style={{
                borderColor:
                  status === "completed" ? "rgba(6,24,39,0.2)" : `${color}55`,
                background:
                  status === "completed" ? "rgba(6,24,39,0.14)" : `${color}1f`,
                color:
                  status === "locked"
                    ? "#9CB6C8"
                    : status === "completed"
                      ? "#061827"
                      : color,
              }}
            >
              <BranchIcon
                branch={def.branchId}
                className={`${isIR ? "h-4 w-4 -rotate-45" : "h-3.5 w-3.5"}`}
              />
            </span>

            <p
              className={`line-clamp-3 min-w-0 flex-1 font-semibold ${
                isIR ? "text-[13px] leading-[17px]" : "text-xs leading-4"
              }`}
            >
              {def.title}
            </p>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.08em] opacity-70">
              {def.typeLabel}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-1 text-[11px] font-semibold leading-none ${statusClass}`}
              style={isOpen ? { color } : undefined}
            >
              {status === "completed" ? (
                <CheckIcon />
              ) : status === "in_progress" ? (
                <InProgressIcon />
              ) : status === "available" ? (
                <ReadyIcon />
              ) : (
                <LockIcon />
              )}
              {statusLabel}
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
