"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import {
  AI_STEP_ID,
  createRow,
  normalizeAiDraft,
  sectionIndexOfField,
  toJson,
  validateAiSubmission,
  type AiDraft,
  type AiField,
  type AiNodeContent,
  type AiRepeatableField,
  type AiRepeatableRow,
  type AiSection,
  type AiSingleChoiceField,
  type AiTextField,
  type AiValidationResult,
} from "@/lib/challenges/ai/schema";
import type { ChallengeAttempt, NodeChallengeProgress } from "@/lib/types";

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function resolveResourceHref(href: string): string {
  return href.startsWith("/") ? `${PUBLIC_BASE_PATH}${href}` : href;
}

interface Props {
  content: AiNodeContent;
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (progress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

export function AiNodeChallenge({ content, savedProgress, readOnly, onSave, onComplete, onExit }: Props) {
  const initial = useMemo(() => createInitialProgress(content, savedProgress), [content, savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [validation, setValidation] = useState<AiValidationResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const commit = useCallback((next: NodeChallengeProgress) => {
    progressRef.current = next;
    setProgress(next);
    onSaveRef.current(next);
    return next;
  }, []);

  const step = progress.steps[AI_STEP_ID];
  const draft = normalizeAiDraft(content, step.draft);
  const solved = Boolean(step.solvedAt);
  const disabled = readOnly || solved;
  const errors = validation?.errors ?? {};

  const changeField = (fieldId: string, value: AiDraft[string]) => {
    if (disabled) return;
    setValidation(null);
    const nextDraft: AiDraft = { ...draft, [fieldId]: value };
    commit({
      ...progressRef.current,
      updatedAt: Date.now(),
      steps: {
        ...progressRef.current.steps,
        [AI_STEP_ID]: { ...progressRef.current.steps[AI_STEP_ID], draft: toJson(nextDraft) },
      },
      analytics: {
        ...progressRef.current.analytics,
        lastEvent: "answer_changed",
        activeSection: sectionIndex + 1,
      },
    });
  };

  const submit = () => {
    if (disabled) return;
    const result = validateAiSubmission(content, draft);
    setValidation(result);
    if (!result.isComplete) {
      const firstFieldId = Object.keys(result.errors)[0];
      if (firstFieldId) setSectionIndex(sectionIndexOfField(content, firstFieldId));
      setAnnouncement("Todavía hay campos incompletos.");
      return;
    }
    const now = Date.now();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: content.nodeId,
      stepId: AI_STEP_ID,
      attemptNumber: step.attempts.length + 1,
      startedAt: progress.startedAt,
      submittedAt: now,
      durationSeconds: Math.max(step.totalActiveSeconds, Math.floor((now - progress.startedAt) / 1_000)),
      answer: toJson(draft),
      isCorrect: null,
      hintsUsed: step.revealedHints,
      score: result.score,
      metadata: { maxScore: result.maxScore, reviewerRequired: true },
    };
    const next = commit({
      ...progressRef.current,
      updatedAt: now,
      completedAt: now,
      steps: {
        ...progressRef.current.steps,
        [AI_STEP_ID]: { ...step, attempts: [...step.attempts, attempt], solvedAt: now },
      },
      analytics: { ...progressRef.current.analytics, lastEvent: "challenge_completed", reviewerRequired: true },
    });
    setAnnouncement("Entrega registrada para revisión humana.");
    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  };

  const sections = content.sections;
  const activeSection = sections[sectionIndex] ?? sections[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan/25 bg-[#071923] shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(53,196,232,0.2),transparent_42%),linear-gradient(135deg,#0b3044,#081d2a)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
              Inteligencia Artificial · {content.nodeId}
            </p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">
              {content.title}
            </h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-slate-300">
              {content.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-cyan">
              {content.estimatedTime}
            </span>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-300 hover:border-cyan/40 hover:text-white"
              >
                Volver
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan">Contexto</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">{content.context}</p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan">Objetivo</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">{content.objective}</p>
          {content.resources && content.resources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {content.resources.map((resource) => (
                <a
                  key={resource.href}
                  href={resolveResourceHref(resource.href)}
                  target="_blank"
                  rel="noreferrer"
                  title={resource.description}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan hover:bg-cyan/15"
                >
                  {resource.label}
                  <DownloadIcon />
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div
          className="grid gap-1 rounded-2xl border border-white/10 bg-black/15 p-1.5"
          style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
          aria-label="Secciones del reto"
        >
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSectionIndex(index)}
              aria-current={sectionIndex === index ? "step" : undefined}
              className={`min-h-14 rounded-xl px-2 py-2 text-center transition ${
                sectionIndex === index
                  ? "bg-cyan/15 text-white shadow-inner"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em]">
                {index + 1}. {section.title}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <SectionView
            section={activeSection}
            draft={draft}
            disabled={disabled}
            errors={errors}
            nodeId={content.nodeId}
            onChangeField={changeField}
          />
        </div>

        {validation && (
          <div
            role="status"
            className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
              validation.isComplete
                ? "border-ok/30 bg-ok/[0.08] text-ok"
                : "border-danger/30 bg-danger/[0.08] text-rose-100"
            }`}
          >
            {validation.feedback}{" "}
            {validation.isComplete && `Campos completos: ${validation.score}/${validation.maxScore}.`}
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => setSectionIndex((value) => Math.max(0, value - 1))}
            disabled={sectionIndex === 0}
            className="min-h-11 rounded-xl border border-white/15 px-4 text-xs font-semibold text-slate-300 disabled:opacity-35"
          >
            Anterior
          </button>
          <div className="flex gap-3">
            {sectionIndex < sections.length - 1 && (
              <button
                type="button"
                onClick={() => setSectionIndex((value) => Math.min(sections.length - 1, value + 1))}
                className="min-h-11 rounded-xl bg-cyan/15 px-5 text-sm font-bold text-cyan"
              >
                Siguiente sección
              </button>
            )}
            {sectionIndex === sections.length - 1 &&
              (!solved && !readOnly ? (
                <button
                  type="button"
                  onClick={submit}
                  className="min-h-11 rounded-xl bg-gradient-to-r from-action to-cyan px-5 text-sm font-bold text-night shadow-[0_14px_36px_rgba(53,196,232,0.25)]"
                >
                  Registrar entrega
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-bold text-ok">
                  Entrega registrada
                </span>
              ))}
          </div>
        </footer>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}

interface SectionProps {
  section: AiSection;
  draft: AiDraft;
  disabled: boolean;
  errors: Record<string, string>;
  nodeId: string;
  onChangeField: (fieldId: string, value: AiDraft[string]) => void;
}

function SectionView({ section, draft, disabled, errors, nodeId, onChangeField }: SectionProps) {
  return (
    <section>
      <div className="mb-5">
        <h3 className="font-heading text-xl font-semibold text-white">{section.title}</h3>
        {section.intro && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{section.intro}</p>}
      </div>
      <div className="space-y-5">
        {section.fields.map((field) => (
          <FieldView
            key={field.id}
            field={field}
            value={draft[field.id]}
            disabled={disabled}
            error={errors[field.id]}
            nodeId={nodeId}
            onChange={(value) => onChangeField(field.id, value)}
          />
        ))}
      </div>
    </section>
  );
}

function FieldView({
  field,
  value,
  disabled,
  error,
  nodeId,
  onChange,
}: {
  field: AiField;
  value: AiDraft[string];
  disabled: boolean;
  error?: string;
  nodeId: string;
  onChange: (value: AiDraft[string]) => void;
}) {
  if (field.kind === "text") {
    return (
      <TextField field={field} value={typeof value === "string" ? value : ""} disabled={disabled} error={error} onChange={onChange} />
    );
  }
  if (field.kind === "textarea") {
    return (
      <TextAreaField field={field} value={typeof value === "string" ? value : ""} disabled={disabled} error={error} onChange={onChange} />
    );
  }
  if (field.kind === "single_choice") {
    return (
      <SingleChoiceField field={field} value={typeof value === "string" ? value : ""} disabled={disabled} error={error} onChange={onChange} />
    );
  }
  if (field.kind === "repeatable") {
    const rows = Array.isArray(value) ? (value as AiRepeatableRow[]) : [];
    return <RepeatableFieldView field={field} rows={rows} disabled={disabled} error={error} onChange={onChange} />;
  }

  if (field.kind === "evidence") {
    const files = Array.isArray(value) ? (value as LocalEvidenceFile[]) : [];
    return (
      <div>
        <LocalEvidenceUploader
          nodeId={nodeId}
          fieldId={field.id}
          label={field.label}
          description={field.help ?? ""}
          accept={field.accept}
          value={[...files]}
          onChange={onChange}
          multiple={field.multiple}
          maxFiles={field.maxFiles}
          disabled={disabled}
          required={field.required !== false}
        />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    );
  }

  return null;
}

function TextField({
  field,
  value,
  disabled,
  error,
  onChange,
}: {
  field: AiTextField;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-300">
      {field.label}
      {field.required === false && <span className="ml-1.5 font-normal normal-case text-slate-500">(opcional)</span>}
      {field.help && <span className="mt-1 block font-normal leading-5 text-slate-500">{field.help}</span>}
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 min-h-11 w-full rounded-xl border bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan/60 ${
          error ? "border-danger/60" : "border-white/15"
        }`}
      />
      <Counter value={value} min={field.minLength} />
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function TextAreaField({
  field,
  value,
  disabled,
  error,
  onChange,
}: {
  field: AiTextField;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-300">
      {field.label}
      {field.required === false && <span className="ml-1.5 font-normal normal-case text-slate-500">(opcional)</span>}
      {field.help && <span className="mt-1 block font-normal leading-5 text-slate-500">{field.help}</span>}
      <textarea
        value={value}
        rows={field.rows ?? 5}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full resize-y rounded-xl border bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan/60 ${
          error ? "border-danger/60" : "border-white/15"
        }`}
      />
      <Counter value={value} min={field.minLength} />
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function SingleChoiceField({
  field,
  value,
  disabled,
  error,
  onChange,
}: {
  field: AiSingleChoiceField;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-semibold text-slate-300">{field.label}</legend>
      {field.help && <p className="mt-1 text-xs leading-5 text-slate-500">{field.help}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {field.options.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition ${
                checked ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-white/12 bg-black/15 text-slate-400"
              }`}
            >
              <input type="radio" name={field.id} checked={checked} onChange={() => onChange(option.id)} className="sr-only" />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </fieldset>
  );
}

function RepeatableFieldView({
  field,
  rows,
  disabled,
  error,
  onChange,
}: {
  field: AiRepeatableField;
  rows: readonly AiRepeatableRow[];
  disabled: boolean;
  error?: string;
  onChange: (rows: AiRepeatableRow[]) => void;
}) {
  const updateRow = (id: string, patch: Record<string, string>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">{field.label}</h4>
          {field.help && <p className="mt-1 text-xs leading-5 text-slate-400">{field.help}</p>}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange([...rows, createRow(field)])}
            className="min-h-9 rounded-lg border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan"
          >
            Agregar {field.itemLabel.toLowerCase()}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <article key={row.id} className="rounded-xl border border-white/10 bg-black/15 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-[0.12em] text-cyan">
                {field.itemLabel} {index + 1}
              </h5>
              {!disabled && rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-400/10"
                >
                  Quitar
                </button>
              )}
            </div>
            <div className="space-y-3">
              {field.columns.map((column) => (
                <label key={column.id} className="block text-xs font-semibold text-slate-300">
                  {column.label}
                  {column.multiline ? (
                    <textarea
                      value={row[column.id] ?? ""}
                      rows={3}
                      disabled={disabled}
                      placeholder={column.placeholder}
                      onChange={(event) => updateRow(row.id, { [column.id]: event.target.value })}
                      className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan/60"
                    />
                  ) : (
                    <input
                      type="text"
                      value={row[column.id] ?? ""}
                      disabled={disabled}
                      placeholder={column.placeholder}
                      onChange={(event) => updateRow(row.id, { [column.id]: event.target.value })}
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan/60"
                    />
                  )}
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </section>
  );
}

function Counter({ value, min }: { value: string; min: number }) {
  return (
    <span className={`mt-1 block text-right text-[10px] ${value.trim().length >= min ? "text-ok" : "text-slate-500"}`}>
      {value.trim().length}/{min} mínimo
    </span>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-xs leading-5 text-rose-300">
      {children}
    </p>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function createInitialProgress(content: AiNodeContent, saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const valid = saved?.nodeId === content.nodeId ? saved : undefined;
  const step = valid?.steps[AI_STEP_ID];
  return {
    nodeId: content.nodeId,
    currentStepId: AI_STEP_ID,
    shuffleSeed: valid?.shuffleSeed ?? now,
    startedAt: valid?.startedAt ?? now,
    updatedAt: valid?.updatedAt ?? now,
    completedAt: valid?.completedAt ?? null,
    steps: {
      [AI_STEP_ID]: {
        draft: toJson(normalizeAiDraft(content, step?.draft)),
        attempts: step?.attempts ?? [],
        revealedHints: step?.revealedHints ?? 0,
        totalActiveSeconds: step?.totalActiveSeconds ?? 0,
        solvedAt: step?.solvedAt ?? null,
      },
    },
    analytics: valid?.analytics ?? { lastEvent: "challenge_started", reviewerRequired: true },
  };
}

export default AiNodeChallenge;
