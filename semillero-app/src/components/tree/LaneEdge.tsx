"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getBezierPath, type EdgeProps } from "@xyflow/react";

export type LaneEdgeVariant = "branch" | "lane" | "hybrid" | "irfeed";

export interface LaneEdgeData {
  color: string;
  active: boolean;
  dimmed: boolean;
  variant: LaneEdgeVariant;
  [key: string]: unknown;
}

export function LaneEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  selected,
  style,
}: EdgeProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!data) return null;

  const d = data as LaneEdgeData;
  const variant = d.variant ?? "lane";
  const curvature =
    variant === "hybrid"
      ? 0.42
      : variant === "branch"
        ? 0.34
        : variant === "irfeed"
          ? 0.38
          : 0.28;
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  const gradientId = `lane-edge-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const isLocked = !d.active;
  const strokeWidth =
    variant === "branch"
      ? d.active
        ? 2.75
        : 2
      : variant === "hybrid"
        ? 1.2
        : variant === "irfeed"
          ? 1.55
          : d.active
            ? 2
            : 1.45;
  const strokeDasharray =
    variant === "hybrid"
      ? "2 8"
      : variant === "irfeed"
        ? "7 7"
        : isLocked
          ? variant === "branch"
            ? "4 7"
            : "3 7"
          : undefined;
  const baseOpacity =
    variant === "hybrid"
      ? d.active
        ? 0.38
        : 0.24
      : variant === "irfeed"
        ? d.active
          ? 0.62
          : 0.34
        : variant === "branch"
          ? d.active
            ? 0.9
            : 0.48
          : d.active
            ? 0.78
            : 0.46;
  const opacity = d.dimmed
    ? Math.min(baseOpacity, 0.18)
    : selected
      ? Math.min(baseOpacity + 0.15, 1)
      : baseOpacity;
  const flowDasharray =
    variant === "branch"
      ? "2 14"
      : variant === "hybrid"
        ? "1 13"
        : variant === "irfeed"
          ? "3 13"
          : "2 11";
  const flowDistance =
    variant === "branch" ? -32 : variant === "hybrid" ? -28 : -26;
  const flowDuration =
    variant === "branch" ? 1.65 : variant === "hybrid" ? 1.85 : variant === "irfeed" ? 1.25 : 1.4;
  const showFlow = d.active && !d.dimmed && !prefersReducedMotion;

  return (
    <g aria-hidden="true" className={`skill-edge skill-edge--${isLocked ? "locked" : "active"}`}>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={d.color} stopOpacity={isLocked ? 0.62 : 0.5} />
          <stop offset="58%" stopColor={d.color} stopOpacity={isLocked ? 0.78 : 0.84} />
          <stop offset="100%" stopColor={d.color} stopOpacity={isLocked ? 0.92 : 1} />
        </linearGradient>
      </defs>

      {d.active && !d.dimmed && (
        <path
          d={path}
          fill="none"
          stroke={d.color}
          strokeWidth={strokeWidth + (variant === "branch" ? 5 : 3.5)}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={variant === "hybrid" ? 0.045 : 0.075}
          pointerEvents="none"
        />
      )}

      <motion.path
        className="react-flow__edge-path skill-edge__base"
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        markerStart={markerStart}
        markerEnd={markerEnd}
        vectorEffect="non-scaling-stroke"
        style={{ ...style, stroke: `url(#${gradientId})`, strokeWidth }}
        initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity }}
        transition={{ duration: prefersReducedMotion ? 0 : variant === "hybrid" ? 0.45 : 0.65, ease: "easeOut" }}
      />

      {showFlow && (
        <path
          className="skill-edge__flow"
          d={path}
          fill="none"
          stroke="#e5edf7"
          strokeWidth={variant === "branch" ? 1.25 : 0.9}
          strokeDasharray={flowDasharray}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          opacity={variant === "hybrid" ? 0.48 : variant === "irfeed" ? 0.7 : 0.62}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to={String(flowDistance)}
            dur={`${flowDuration}s`}
            repeatCount="indefinite"
          />
        </path>
      )}
    </g>
  );
}
