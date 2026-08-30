"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import {
  E4_CHALLENGE,
  createE4Draft,
  validateE4,
  type E4ComponentEntry,
  type E4Submission,
  type E4Validation,
} from "@/lib/challenges/electronics/e4";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type {
  ChallengeAttempt,
  ChallengeStepProgress,
  JsonValue,
  NodeChallengeProgress,
} from "@/lib/types";

export interface E4ChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
}

const STEP_ID = "open-project";

export function E4Challenge({
  savedProgress,
  readOnly,
  onSave,
  onComplete,
}: E4ChallengeProps) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [validation, setValidation] = useState<E4Validation | null>(() => {
    const last = initial.steps[STEP_ID].attempts.at(-1);
    return last ? validateE4(normalizeDraft(last.answer)) : null;
  });
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const startedAtRef = useRef<number | null>(null);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const commit = useCallback(
    (mutate: (current: NodeChallengeProgress) => NodeChallengeProgress) => {
      const next = mutate(progressRef.current);
      progressRef.current = next;
      setProgress(next);
      onSaveRef.current(next);
      return next;
    },
    []
  );

  const checkpoint = useCallback((eventName: string, updateView = true) => {
    const now = new Date().getTime();
    const elapsed = startedAtRef.current === null
      ? 0
      : Math.max(0, Math.floor((now - startedAtRef.current) / 1_000));
    if (startedAtRef.current !== null) startedAtRef.current = now;
    const current = progressRef.current;
    const next: NodeChallengeProgress = {
      ...current,
      updatedAt: now,
      steps: {
        ...current.steps,
        [STEP_ID]: {
          ...current.steps[STEP_ID],
          totalActiveSeconds:
            current.steps[STEP_ID].totalActiveSeconds + elapsed,
        },
      },
      analytics: { ...current.analytics, lastEvent: eventName },
    };
    progressRef.current = next;
    if (updateView) setProgress(next);
    onSaveRef.current(next);
  }, []);

  useEffect(() => {
    if (readOnly || progress.completedAt) return;
    if (document.visibilityState === "visible") startedAtRef.current = Date.now();
    onSaveRef.current(progressRef.current);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        checkpoint("visibility_hidden");
        startedAtRef.current = null;
      } else {
        startedAtRef.current = Date.now();
      }
    };
    const onPageHide = () => checkpoint("page_hidden", false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      checkpoint("challenge_closed", false);
      startedAtRef.current = null;
    };
  }, [checkpoint, progress.completedAt, readOnly]);

  const stepProgress = progress.steps[STEP_ID];
  const draft = normalizeDraft(stepProgress.draft);
  const solved = hasSolved(stepProgress);

  const changeDraft = (patch: Partial<E4Submission>) => {
    if (readOnly || solved) return;
    setValidation(null);
    const nextDraft: E4Submission = { ...draft, ...patch, stepId: STEP_ID };
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        [STEP_ID]: { ...current.steps[STEP_ID], draft: toJson(nextDraft) },
      },
      analytics: { ...current.analytics, lastEvent: "answer_changed" },
    }));
  };

  const revealHint = () => {
    if (readOnly || solved || stepProgress.revealedHints > 0) return;
    commit((current) => ({
      ...current,
      updatedAt: Date.now(),
      steps: {
        ...current.steps,
        [STEP_ID]: { ...current.steps[STEP_ID], revealedHints: 1 },
      },
      analytics: { ...current.analytics, lastEvent: "hint_opened" },
    }));
    setAnnouncement("Pista disponible al final del formulario.");
  };

  const addComponent = () => {
    if (draft.components.length >= 20) return;
    changeDraft({
      components: [
        ...draft.components,
        { id: crypto.randomUUID(), name: "", quantity: "1", purpose: "" },
      ],
    });
  };

  const updateComponent = (id: string, patch: Partial<E4ComponentEntry>) => {
    changeDraft({
      components: draft.components.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  const removeComponent = (id: string) => {
    if (draft.components.length <= 1) return;
    changeDraft({ components: draft.components.filter((item) => item.id !== id) });
  };

  const submit = () => {
    if (readOnly || solved) return;
    const result = validateE4(draft);
    setValidation(result);
    if (!result.isComplete) {
      setAnnouncement("Aún faltan campos o evidencias obligatorias. Revisa los mensajes del formulario.");
      return;
    }

    const now = new Date().getTime();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "E4",
      stepId: STEP_ID,
      attemptNumber: stepProgress.attempts.length + 1,
      startedAt: Math.max(progress.startedAt, now - stepProgress.totalActiveSeconds * 1_000),
      submittedAt: now,
      durationSeconds: stepProgress.totalActiveSeconds,
      answer: toJson(draft),
      isCorrect: null,
      hintsUsed: stepProgress.revealedHints,
      score: result.score,
      metadata: {
        maxScore: result.maxScore,
        reviewerRequired: true,
        evidenceCount:
          draft.schematicFiles.length +
          draft.demonstrationFiles.length +
          draft.codeFiles.length,
      },
    };
    const next = commit((current) => ({
      ...current,
      updatedAt: now,
      completedAt: current.completedAt ?? now,
      steps: {
        ...current.steps,
        [STEP_ID]: {
          ...current.steps[STEP_ID],
          attempts: [...current.steps[STEP_ID].attempts, attempt],
          solvedAt: now,
        },
      },
      analytics: {
        ...current.analytics,
        lastEvent: "challenge_completed",
        reviewerRequired: true,
      },
    }));
    setAnnouncement("Proyecto registrado para revisión.");
    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  };

  const content = E4_CHALLENGE.steps[STEP_ID];
  const errors = validation?.errors ?? {};

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface/45 shadow-[0_24px_70px_rgba(0,0,0,.2)]">
      <header className="border-b border-line bg-gradient-to-r from-[#0c3155] to-[#0a2945] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan">Electrónica · E4 · Proyecto libre</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-ink sm:text-3xl">{E4_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-muted">{E4_CHALLENGE.subtitle} {content.statement}</p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <Metric label="Intentos" value={String(stepProgress.attempts.length)} />
            <Metric label="Tiempo" value={formatTime(stepProgress.totalActiveSeconds)} />
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="overflow-hidden rounded-2xl border border-cyan/25 bg-gradient-to-br from-cyan/10 via-night/40 to-night/30 p-5 sm:p-7">
          <p className="font-heading text-xl font-bold text-ink sm:text-2xl">{content.brief.heading}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{content.brief.body}</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <TextField label="Título del proyecto" value={draft.title} min={content.minimums.title} max={120} disabled={readOnly || solved} error={errors.title} onChange={(value) => changeDraft({ title: value })} />
          <TextArea label="Problema que resuelve" description="Explica el contexto, la necesidad y el comportamiento esperado." value={draft.problem} min={content.minimums.problem} max={2000} rows={5} disabled={readOnly || solved} error={errors.problem} onChange={(value) => changeDraft({ problem: value })} />
          <div className="lg:col-span-2"><TextArea label="Cómo funciona" description="Describe alimentación, entradas, procesamiento, drivers y salidas." value={draft.operation} min={content.minimums.operation} max={3000} rows={7} disabled={readOnly || solved} error={errors.operation} onChange={(value) => changeDraft({ operation: value })} /></div>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-ink">Lista de componentes</h3><p className="mt-1 text-xs text-muted">Incluye mínimo {content.minimums.components} elementos con propósito claro.</p></div>
            {!readOnly && !solved && <button type="button" onClick={addComponent} className="min-h-10 rounded-xl border border-cyan/30 bg-cyan/10 px-4 text-xs font-semibold text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Agregar componente</button>}
          </div>
          <div className="mt-4 space-y-3">
            {draft.components.map((component, index) => (
              <div key={component.id} className="grid gap-3 rounded-xl border border-line bg-surface/35 p-3 sm:grid-cols-[1.1fr_.45fr_1.5fr_auto]">
                <label className="text-[11px] text-muted">Nombre<input value={component.name} disabled={readOnly || solved} onChange={(event) => updateComponent(component.id, { name: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-night/40 px-3 text-sm text-ink outline-none focus:border-cyan/50" /></label>
                <label className="text-[11px] text-muted">Cantidad<input value={component.quantity} disabled={readOnly || solved} onChange={(event) => updateComponent(component.id, { quantity: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-night/40 px-3 text-sm text-ink outline-none focus:border-cyan/50" /></label>
                <label className="text-[11px] text-muted">Propósito<input value={component.purpose} disabled={readOnly || solved} onChange={(event) => updateComponent(component.id, { purpose: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-night/40 px-3 text-sm text-ink outline-none focus:border-cyan/50" /></label>
                {!readOnly && !solved && <button type="button" disabled={draft.components.length <= 1} onClick={() => removeComponent(component.id)} aria-label={`Quitar componente ${index + 1}`} className="self-end rounded-lg px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-35">Quitar</button>}
              </div>
            ))}
          </div>
          {errors.components && <ErrorText>{errors.components}</ErrorText>}
        </section>

        <section className="mt-6 space-y-4">
          <LocalEvidenceUploader nodeId="E4" fieldId="schematic" label="Esquema o diagrama" description="Sube el circuito, diagrama de bloques, PCB o captura de la simulación." accept={content.acceptedEvidence.schematic} value={[...draft.schematicFiles]} onChange={(files) => changeDraft({ schematicFiles: files })} disabled={readOnly || solved} required />
          {errors.schematicFiles && <ErrorText>{errors.schematicFiles}</ErrorText>}
          <LocalEvidenceUploader nodeId="E4" fieldId="demonstration" label="Evidencia del resultado" description="Agrega fotos, capturas, video o PDF que muestre el proyecto funcionando o simulado." accept={content.acceptedEvidence.demonstration} value={[...draft.demonstrationFiles]} onChange={(files) => changeDraft({ demonstrationFiles: files })} multiple maxFiles={5} maxSizeBytes={80 * 1_048_576} disabled={readOnly || solved} required />
          {errors.demonstrationFiles && <ErrorText>{errors.demonstrationFiles}</ErrorText>}
          <fieldset disabled={readOnly || solved} className="rounded-2xl border border-line bg-night/25 p-4 sm:p-5">
            <legend className="sr-only">¿Tu proyecto incluye código?</legend>
            <p aria-hidden="true" className="text-sm font-semibold text-ink">¿Tu proyecto incluye código?</p>
            <div className="mt-3 flex gap-3"><RadioPill checked={draft.codeApplies} label="Sí" onChange={() => changeDraft({ codeApplies: true })} /><RadioPill checked={!draft.codeApplies} label="No aplica" onChange={() => changeDraft({ codeApplies: false, codeFiles: [], repositoryUrl: "" })} /></div>
          </fieldset>
          {draft.codeApplies && <LocalEvidenceUploader nodeId="E4" fieldId="code" label="Código" description="Adjunta archivos o un ZIP; también puedes compartir un repositorio en la sección de enlaces." accept={content.acceptedEvidence.code} value={[...draft.codeFiles]} onChange={(files) => changeDraft({ codeFiles: files })} multiple maxFiles={5} disabled={readOnly || solved} />}
          {errors.codeEvidence && <ErrorText>{errors.codeEvidence}</ErrorText>}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <UrlField label="Simulación" placeholder="https://wokwi.com/..." value={draft.simulationUrl} error={errors.simulationUrl} disabled={readOnly || solved} onChange={(value) => changeDraft({ simulationUrl: value })} />
          <UrlField label="Repositorio" placeholder="https://github.com/..." value={draft.repositoryUrl} error={errors.repositoryUrl} disabled={readOnly || solved} onChange={(value) => changeDraft({ repositoryUrl: value })} />
          <UrlField label="Enlace adicional" placeholder="https://..." value={draft.additionalUrl} error={errors.additionalUrl} disabled={readOnly || solved} onChange={(value) => changeDraft({ additionalUrl: value })} />
        </section>

        <div className="mt-6"><TextArea label="Reflexión final" description="Cuenta qué funcionó, qué fue difícil, qué aprendiste y qué cambiarías." value={draft.reflection} min={content.minimums.reflection} max={2500} rows={6} disabled={readOnly || solved} error={errors.reflection} onChange={(value) => changeDraft({ reflection: value })} /></div>

        {stepProgress.revealedHints > 0 && <aside className="mt-5 rounded-2xl border border-cyan/25 bg-cyan/[.07] p-4 text-sm leading-6 text-ice"><span className="font-semibold text-cyan">Pista:</span> {content.hints[0]}</aside>}
        {validation && <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${validation.isComplete ? "border-ok/30 bg-ok/[.07] text-ok" : "border-danger/30 bg-danger/[.07] text-ice"}`}>{validation.feedback}{validation.isComplete && ` Rúbrica preliminar: ${validation.score}/${validation.maxScore}.`}</div>}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button type="button" onClick={revealHint} disabled={readOnly || solved || stepProgress.revealedHints > 0} className="min-h-11 rounded-xl border border-line px-4 text-xs font-semibold text-muted hover:border-cyan/30 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-45">{stepProgress.revealedHints ? "Pista consultada" : "Ver pista"}</button>
          {!solved && !readOnly ? <button type="button" onClick={submit} className="min-h-11 rounded-xl bg-gradient-to-r from-action to-tech px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Registrar proyecto</button> : <span className="inline-flex min-h-11 items-center rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-semibold text-ok">Proyecto registrado</span>}
        </footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </article>
  );
}

function TextField({ label, value, min, max, disabled, error, onChange }: { label: string; value: string; min: number; max: number; disabled: boolean; error?: string; onChange: (value: string) => void }) {
  return <label className="block rounded-2xl border border-line bg-night/25 p-4"><span className="text-sm font-semibold text-ink">{label}</span><input value={value} disabled={disabled} maxLength={max} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-line bg-night/45 px-3 text-sm text-ink outline-none focus:border-cyan/50" /><span className="mt-1 block text-right text-[11px] text-muted">{value.trim().length}/{min} mínimo</span>{error && <ErrorText>{error}</ErrorText>}</label>;
}

function TextArea({ label, description, value, min, max, rows, disabled, error, onChange }: { label: string; description: string; value: string; min: number; max: number; rows: number; disabled: boolean; error?: string; onChange: (value: string) => void }) {
  return <label className="block rounded-2xl border border-line bg-night/25 p-4"><span className="text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span><textarea value={value} disabled={disabled} maxLength={max} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-3 w-full rounded-xl border border-line bg-night/45 p-3 text-sm leading-6 text-ink outline-none focus:border-cyan/50" /><span className="mt-1 block text-right text-[11px] text-muted">{value.trim().length}/{min} mínimo</span>{error && <ErrorText>{error}</ErrorText>}</label>;
}

function UrlField({ label, placeholder, value, error, disabled, onChange }: { label: string; placeholder: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) {
  return <label className="rounded-2xl border border-line bg-night/25 p-4"><span className="text-sm font-semibold text-ink">{label} <span className="font-normal text-muted">(opcional)</span></span><input type="url" value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-line bg-night/45 px-3 text-sm text-ink outline-none placeholder:text-muted/45 focus:border-cyan/50" />{error && <ErrorText>{error}</ErrorText>}</label>;
}

function RadioPill({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-xs ${checked ? "border-cyan/40 bg-cyan/10 text-ink" : "border-line text-muted"}`}><input type="radio" name="code-applies" checked={checked} onChange={onChange} className="accent-[#84b6d7]" />{label}</label>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-5 text-danger" role="alert">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-night/35 px-3 py-2 text-center"><strong className="block text-sm text-ink">{value}</strong><span className="text-muted">{label}</span></div>;
}

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const validSaved = saved?.nodeId === "E4" ? saved : undefined;
  const savedStep = validSaved?.steps?.[STEP_ID];
  const draft = normalizeDraft(savedStep?.draft);
  const attempts = Array.isArray(savedStep?.attempts)
    ? savedStep.attempts.filter((attempt) => attempt.nodeId === "E4" && attempt.stepId === STEP_ID)
    : [];
  const solvedAt = typeof savedStep?.solvedAt === "number" && savedStep.solvedAt > 0 ? savedStep.solvedAt : null;
  return {
    nodeId: "E4",
    currentStepId: STEP_ID,
    shuffleSeed: validSaved?.shuffleSeed ?? now,
    startedAt: validSaved?.startedAt && validSaved.startedAt > 0 ? validSaved.startedAt : now,
    updatedAt: validSaved?.updatedAt && validSaved.updatedAt > 0 ? validSaved.updatedAt : now,
    completedAt: solvedAt ? validSaved?.completedAt ?? solvedAt : null,
    steps: {
      [STEP_ID]: {
        draft: toJson(draft),
        attempts,
        revealedHints: Math.max(0, Math.min(1, savedStep?.revealedHints ?? 0)),
        totalActiveSeconds: Math.max(0, savedStep?.totalActiveSeconds ?? 0),
        solvedAt,
      },
    },
    analytics: validSaved?.analytics ?? { lastEvent: "challenge_started", reviewerRequired: true },
  };
}

function normalizeDraft(raw: unknown): E4Submission {
  const fallback = createE4Draft();
  if (!isRecord(raw)) return fallback;
  const components = Array.isArray(raw.components)
    ? raw.components.map(normalizeComponent).filter((item): item is E4ComponentEntry => item !== null).slice(0, 20)
    : fallback.components;
  return {
    stepId: STEP_ID,
    title: text(raw.title),
    problem: text(raw.problem),
    operation: text(raw.operation),
    components: components.length > 0 ? components : fallback.components,
    reflection: text(raw.reflection),
    schematicFiles: normalizeFiles(raw.schematicFiles),
    demonstrationFiles: normalizeFiles(raw.demonstrationFiles),
    codeFiles: normalizeFiles(raw.codeFiles),
    codeApplies: raw.codeApplies === true,
    simulationUrl: text(raw.simulationUrl),
    repositoryUrl: text(raw.repositoryUrl),
    additionalUrl: text(raw.additionalUrl),
  };
}

function normalizeComponent(value: unknown): E4ComponentEntry | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return { id: value.id, name: text(value.name), quantity: text(value.quantity), purpose: text(value.purpose) };
}

function normalizeFiles(value: unknown): LocalEvidenceFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.nodeId !== "string" || typeof item.fieldId !== "string" || typeof item.name !== "string" || typeof item.mimeType !== "string" || typeof item.size !== "number" || typeof item.lastModified !== "number" || typeof item.storedAt !== "number") return [];
    return [{ id: item.id, nodeId: item.nodeId, fieldId: item.fieldId, name: item.name, mimeType: item.mimeType, size: item.size, lastModified: item.lastModified, storedAt: item.storedAt }];
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasSolved(step: ChallengeStepProgress): boolean {
  return typeof step.solvedAt === "number" && Number.isFinite(step.solvedAt) && step.solvedAt > 0;
}
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return safe < 60 ? `${safe}s` : `${Math.floor(safe / 60)}m`;
}

export default E4Challenge;
