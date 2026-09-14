import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type { JsonValue } from "@/lib/types";

/**
 * Declarative content model shared by every node of the AI branch (A0..A4).
 * One React component (`AiNodeChallenge`) renders any node purely from an
 * `AiNodeContent` value, and one generic function validates any submission —
 * individual node files only declare *what* to ask, never *how* to render it.
 */

export const AI_STEP_ID = "submission" as const;

export interface AiChoiceOption {
  readonly id: string;
  readonly label: string;
}

interface AiFieldBase {
  readonly id: string;
  readonly label: string;
  readonly help?: string;
  readonly placeholder?: string;
}

export interface AiTextField extends AiFieldBase {
  readonly kind: "text" | "textarea";
  readonly minLength: number;
  /** Defaults to true. Set to false for genuinely optional/bonus fields. */
  readonly required?: boolean;
  readonly rows?: number;
}

export interface AiSingleChoiceField extends AiFieldBase {
  readonly kind: "single_choice";
  readonly options: readonly AiChoiceOption[];
  readonly required?: boolean;
}

export interface AiRepeatableColumn {
  readonly id: string;
  readonly label: string;
  readonly minLength: number;
  readonly multiline?: boolean;
  readonly placeholder?: string;
}

export interface AiRepeatableField extends AiFieldBase {
  readonly kind: "repeatable";
  readonly itemLabel: string;
  readonly columns: readonly AiRepeatableColumn[];
  readonly minItems: number;
}

export interface AiEvidenceField extends AiFieldBase {
  readonly kind: "evidence";
  readonly accept: string;
  readonly multiple?: boolean;
  readonly maxFiles?: number;
  readonly required?: boolean;
}

export type AiField =
  | AiTextField
  | AiSingleChoiceField
  | AiRepeatableField
  | AiEvidenceField;

export interface AiSection {
  readonly id: string;
  readonly title: string;
  readonly intro?: string;
  readonly fields: readonly AiField[];
}

export interface AiResourceLink {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
}

export interface AiNodeContent {
  readonly nodeId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly estimatedTime: string;
  readonly context: string;
  readonly objective: string;
  readonly resources?: readonly AiResourceLink[];
  readonly sections: readonly AiSection[];
}

export type AiRepeatableRow = Record<string, string> & { readonly id: string };
export type AiFieldValue = string | readonly AiRepeatableRow[] | readonly LocalEvidenceFile[];
export type AiDraft = Record<string, AiFieldValue>;

const REFLECTION_FIELD_ID = "reflection";

/** Shared "¿Qué podría estar mal?" field (spec §19) — appended by A0, A1,
 * A2-YOLO, A2-OpenCV and A3, but not by the A4 bonus nodes. */
export function reflectionSection(): AiSection {
  return {
    id: "reflection",
    title: "Reflexión final",
    intro: "Un experimento sin autocrítica es incompleto, sin importar qué tan buenos parezcan los resultados.",
    fields: [
      {
        id: REFLECTION_FIELD_ID,
        kind: "textarea",
        label: "¿Qué podría estar mal?",
        help: "Identifica hasta cinco razones por las que tus resultados podrían ser engañosos, incompletos o no generalizar al robot real.",
        minLength: 80,
        rows: 5,
      },
    ],
  };
}

export function allFields(content: AiNodeContent): readonly AiField[] {
  return content.sections.flatMap((section) => section.fields);
}

function emptyRow(field: AiRepeatableField): AiRepeatableRow {
  const row: Record<string, string> = {};
  for (const column of field.columns) row[column.id] = "";
  return { ...row, id: crypto.randomUUID() };
}

export function createRow(field: AiRepeatableField): AiRepeatableRow {
  return emptyRow(field);
}

export function createEmptyDraft(content: AiNodeContent): AiDraft {
  const draft: AiDraft = {};
  for (const field of allFields(content)) {
    if (field.kind === "repeatable") {
      draft[field.id] = Array.from({ length: field.minItems }, () => emptyRow(field));
    } else if (field.kind === "evidence") {
      draft[field.id] = [];
    } else {
      draft[field.id] = "";
    }
  }
  return draft;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRows(value: unknown, field: AiRepeatableField): AiRepeatableRow[] {
  if (!Array.isArray(value)) return [];
  const rows = value
    .map((item): AiRepeatableRow | null => {
      const record = isRecord(item) ? item : null;
      if (!record) return null;
      const row: Record<string, string> = {};
      for (const column of field.columns) {
        const raw = record[column.id];
        row[column.id] = typeof raw === "string" ? raw : "";
      }
      const id = typeof record.id === "string" && record.id ? record.id : crypto.randomUUID();
      return { ...row, id };
    })
    .filter((row): row is AiRepeatableRow => row !== null)
    .slice(0, 30);
  return rows;
}

function normalizeFiles(value: unknown): LocalEvidenceFile[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LocalEvidenceFile => {
    const record = isRecord(item) ? item : null;
    return Boolean(
      record &&
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        typeof record.mimeType === "string" &&
        typeof record.size === "number"
    );
  });
}

export function normalizeAiDraft(content: AiNodeContent, value: JsonValue | undefined): AiDraft {
  const draft = createEmptyDraft(content);
  if (!isRecord(value)) return draft;
  for (const field of allFields(content)) {
    const raw = (value as Record<string, unknown>)[field.id];
    if (field.kind === "repeatable") {
      const rows = normalizeRows(raw, field);
      draft[field.id] = rows.length > 0 ? rows : draft[field.id];
    } else if (field.kind === "evidence") {
      draft[field.id] = normalizeFiles(raw);
    } else {
      draft[field.id] = typeof raw === "string" ? raw : "";
    }
  }
  return draft;
}

export interface AiValidationResult {
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: Readonly<Record<string, string>>;
  readonly feedback: string;
}

function validateField(field: AiField, rawValue: AiFieldValue | undefined): true | string {
  if (field.kind === "text" || field.kind === "textarea") {
    const value = typeof rawValue === "string" ? rawValue : "";
    if (field.required === false && value.trim().length === 0) return true;
    if (value.trim().length < field.minLength) {
      return `Escribe al menos ${field.minLength} caracteres.`;
    }
    return true;
  }
  if (field.kind === "single_choice") {
    const value = typeof rawValue === "string" ? rawValue : "";
    if (field.required === false) return true;
    return value ? true : "Selecciona una opción.";
  }
  if (field.kind === "repeatable") {
    const rows = Array.isArray(rawValue) ? (rawValue as readonly AiRepeatableRow[]) : [];
    const validRows = rows.filter((row) =>
      field.columns.every((column) => (row[column.id] ?? "").trim().length >= column.minLength)
    );
    if (validRows.length < field.minItems) {
      return `Completa al menos ${field.minItems} ${field.itemLabel.toLowerCase()}${
        field.minItems === 1 ? "" : "s"
      } con todos sus campos.`;
    }
    return true;
  }
  // evidence
  if (field.required === false) return true;
  const files = Array.isArray(rawValue) ? rawValue : [];
  return files.length > 0 ? true : "Adjunta al menos un archivo.";
}

export function validateAiSubmission(content: AiNodeContent, draft: AiDraft): AiValidationResult {
  const errors: Record<string, string> = {};
  let passed = 0;
  const fields = allFields(content);
  for (const field of fields) {
    const result = validateField(field, draft[field.id]);
    if (result === true) passed += 1;
    else errors[field.id] = result;
  }
  const isComplete = Object.keys(errors).length === 0;
  return {
    isComplete,
    score: passed,
    maxScore: fields.length,
    errors,
    feedback: isComplete
      ? "Todos los campos cumplen el mínimo solicitado. Queda listo para revisión humana."
      : "Todavía hay campos incompletos. Revisa las secciones marcadas.",
  };
}

export function sectionIndexOfField(content: AiNodeContent, fieldId: string): number {
  const index = content.sections.findIndex((section) =>
    section.fields.some((field) => field.id === fieldId)
  );
  return index === -1 ? 0 : index;
}

export function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
