"use client";

import { RunEvidencePanel } from "@/components/evaluator/RunEvidencePanel";
import { BRANCHES } from "@/lib/data/branches";
import type { JsonValue, NodeChallengeProgress, NodeStatus, SkillNodeDef } from "@/lib/types";

interface Props {
  runId: string;
  node: SkillNodeDef;
  progress?: NodeChallengeProgress;
  status: NodeStatus;
  completedAt?: number;
  onClose: () => void;
}

export function CandidateNodeResultPanel({ runId, node, progress, status, completedAt, onClose }: Props) {
  const steps = progress ? Object.entries(progress.steps) : [];
  const attempts = steps.flatMap(([, step]) => step.attempts);
  const seconds = steps.reduce((sum, [, step]) => sum + step.totalActiveSeconds, 0);
  const hints = steps.reduce((sum, [, step]) => sum + step.revealedHints, 0);
  const color = BRANCHES[node.branchId].color;

  return (
    <aside className="absolute inset-y-3 right-3 z-20 flex w-[min(31rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.48)]" aria-label={`Resultados de ${node.title}`}>
      <header className="shrink-0 border-b border-line px-5 py-4" style={{ boxShadow: `inset 0 2px 0 ${color}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{node.id} · {BRANCHES[node.branchId].name}{node.bonus && <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-cyan">Bonus</span>}</p><h3 className="mt-1 text-lg font-semibold leading-6 text-ink">{node.title}</h3></div>
          <button type="button" onClick={onClose} aria-label="Cerrar resultados" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/45 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"><CloseIcon /></button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <ResultBadge status={status} />
          <span className="rounded-full border border-line bg-night/40 px-2.5 py-1 text-muted">{attempts.length} intentos</span>
          <span className="rounded-full border border-line bg-night/40 px-2.5 py-1 text-muted">{formatDuration(seconds)}</span>
          <span className="rounded-full border border-line bg-night/40 px-2.5 py-1 text-muted">{hints} pistas</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {completedAt && <p className="mt-5 text-xs text-muted">Completado el {formatDate(completedAt)}</p>}
        {steps.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-line bg-night/20 p-5 text-center"><p className="text-sm font-semibold text-ice">Sin resultados guardados</p><p className="mt-1 text-xs leading-5 text-muted">El aspirante aún no respondió pasos de este reto. El nodo permanece visible para revisar el recorrido completo.</p></div>
        ) : (
          <section className="mt-5" aria-label="Respuestas por paso">
            <h4 className="text-sm font-semibold text-ink">Respuestas e intentos</h4>
            <div className="mt-3 space-y-4">{steps.map(([stepId, step]) => (
              <article key={stepId} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-xs font-semibold text-ice">{stepId}</h5><span className="text-[11px] text-muted">{step.attempts.length} intentos · {formatDuration(step.totalActiveSeconds)} · {step.revealedHints} pistas</span></div>
                {step.attempts.length ? <ol className="mt-2 space-y-2">{step.attempts.map((attempt) => <li key={attempt.id} className="rounded-xl bg-night/45 p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="font-semibold text-muted">Intento {attempt.attemptNumber}</span><AnswerStatus value={attempt.isCorrect} /></div><AnswerDetails value={attempt.answer} /></li>)}</ol> : <div className="mt-2 rounded-xl bg-night/35 p-3"><p className="text-[11px] font-semibold text-muted">Borrador actual</p><AnswerDetails value={step.draft} /></div>}
              </article>
            ))}</div>
          </section>
        )}
        <RunEvidencePanel runId={runId} nodeId={node.id} showIntroduction={false} compact />
      </div>
    </aside>
  );
}

function ResultBadge({ status }: { status: NodeStatus }) {
  const label =
    status === "completed"
      ? "Completado"
      : status === "in_progress"
        ? "Con actividad"
        : status === "available"
          ? "Disponible, sin actividad"
          : "Bloqueado";
  const isOpen = status === "available" || status === "in_progress";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-semibold ${
        status === "completed"
          ? "border-ok/30 bg-ok/10 text-ok"
          : isOpen
            ? "border-cyan/30 bg-cyan/10 text-cyan"
            : "border-line bg-night/40 text-muted"
      }`}
    >
      {label}
    </span>
  );
}
function AnswerStatus({ value }: { value: boolean | null }) { return <span className={value === null ? "text-cyan" : value ? "text-ok" : "text-danger"}>{value === null ? "Revisión manual" : value ? "Correcto" : "Incorrecto"}</span>; }
function AnswerDetails({ value }: { value: JsonValue }) {
  if (value === "" || value === null) return <p className="mt-2 text-xs leading-5 text-muted">Sin respuesta.</p>;
  if (typeof value !== "object") return <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ice">{formatPrimitive(value)}</p>;

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index + 1), item] as const)
    : Object.entries(value).filter(([key]) => !HIDDEN_ANSWER_FIELDS.has(key));
  if (entries.length === 0) return <p className="mt-2 text-xs leading-5 text-muted">La entrega no incluye respuestas textuales.</p>;

  return <dl className="mt-3 space-y-3">{entries.map(([key, item]) => (
    <div key={key} className="border-t border-line/70 pt-3 first:border-t-0 first:pt-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{Array.isArray(value) ? `Elemento ${key}` : fieldLabel(key)}</dt>
      <dd className="mt-1 text-sm leading-6 text-ice"><ReadableValue value={item} /></dd>
    </div>
  ))}</dl>;
}

function ReadableValue({ value }: { value: JsonValue }) {
  if (value === null || value === "") return <span className="text-muted">Sin respuesta</span>;
  if (typeof value !== "object") return <span className="whitespace-pre-wrap break-words">{formatPrimitive(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">Sin elementos</span>;
    return <ul className="space-y-2">{value.map((item, index) => <li key={index} className="rounded-lg bg-surface/55 px-3 py-2"><ReadableValue value={item} /></li>)}</ul>;
  }
  const entries = Object.entries(value).filter(([key]) => !HIDDEN_ANSWER_FIELDS.has(key));
  return <div className="space-y-2">{entries.map(([key, item]) => <div key={key}><span className="text-xs font-semibold text-muted">{fieldLabel(key)}:</span> <ReadableValue value={item} /></div>)}</div>;
}

const HIDDEN_ANSWER_FIELDS = new Set(["id", "stepId", "storagePath", "mimeType", "size", "lastModified", "storedAt", "files", "schematicFiles", "demonstrationFiles", "codeFiles"]);
const FIELD_LABELS: Record<string, string> = { note: "Descripción", title: "Título", problem: "Problema", operation: "Funcionamiento", reflection: "Reflexión", components: "Componentes", repositoryUrl: "Repositorio", simulationUrl: "Simulación", additionalUrl: "Enlace adicional", codeApplies: "Incluye código" };
function fieldLabel(key: string) { return FIELD_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatPrimitive(value: string | number | boolean) { if (typeof value === "boolean") return value ? "Sí" : "No"; return String(value); }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds} s`; const minutes = Math.round(seconds / 60); return `${minutes} min`; }
function formatDate(timestamp: number) { return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp)); }
function CloseIcon() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>; }
