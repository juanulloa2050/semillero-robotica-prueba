import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

/** Pure, serializable content and validation rules for Mechanics M4. */

export type M4StepId = "open-project";

export interface M4ComponentEntry {
  readonly id: string;
  readonly name: string;
  readonly quantity: string;
  readonly purpose: string;
}

export interface M4Submission {
  readonly stepId: M4StepId;
  readonly title: string;
  readonly problem: string;
  readonly operation: string;
  readonly components: readonly M4ComponentEntry[];
  readonly reflection: string;
  readonly schematicFiles: readonly LocalEvidenceFile[];
  readonly demonstrationFiles: readonly LocalEvidenceFile[];
  readonly calculationFiles: readonly LocalEvidenceFile[];
  readonly cadFiles: readonly LocalEvidenceFile[];
  readonly cadApplies: boolean;
  readonly cadUrl: string;
  readonly documentationUrl: string;
  readonly additionalUrl: string;
}

export type M4FieldId =
  | "title"
  | "problem"
  | "operation"
  | "components"
  | "reflection"
  | "schematicFiles"
  | "demonstrationFiles"
  | "calculationFiles"
  | "cadEvidence"
  | "cadUrl"
  | "documentationUrl"
  | "additionalUrl";

export interface M4Validation {
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: Readonly<Partial<Record<M4FieldId, string>>>;
  readonly feedback: string;
}

export const M4_STEP_IDS = ["open-project"] as const satisfies readonly M4StepId[];

export const M4_CHALLENGE = {
  id: "M4",
  title: "Mecánica libre",
  subtitle: "Diseña o analiza un subsistema mecánico y deja evidencia reproducible.",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    "open-project": {
      id: "open-project",
      title: "Tu proyecto mecánico",
      statement:
        "Te llega este encargo: un brazo robótico necesita tomar piezas cilíndricas desde una banda y colocarlas en otro punto, pero solo tienes un servomotor estándar disponible para accionar el efector final (par ≈ 1.8 kg·cm, rotación ±90°). Las piezas varían entre 3 y 8 cm de diámetro y pesan hasta 250 g; el brazo debe sostenerlas con firmeza sin aplastarlas, y soltarlas al invertir el servo. ¿Cómo resolverías la sujeción? El tipo de mecanismo, los materiales y las dimensiones son tu decisión — justifícalos con tus cálculos.",
      minimums: {
        title: 5,
        problem: 80,
        operation: 120,
        reflection: 100,
        components: 3,
      },
      hints: [
        "Delimita el problema, describe las fuerzas/movimientos involucrados y tus cálculos de dimensionamiento antes de reunir la evidencia.",
      ],
      acceptedEvidence: {
        schematic: ".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf",
        demonstration: "image/*,video/*,application/pdf,.pdf",
        calculations: ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
        cad: ".zip,.step,.stp,.iges,.igs,.sldprt,.sldasm,.f3d,.pdf,application/zip",
      },
    },
  },
} as const;

export function createM4Draft(): M4Submission {
  return {
    stepId: "open-project",
    title: "",
    problem: "",
    operation: "",
    components: [{ id: "component-1", name: "", quantity: "1", purpose: "" }],
    reflection: "",
    schematicFiles: [],
    demonstrationFiles: [],
    calculationFiles: [],
    cadFiles: [],
    cadApplies: false,
    cadUrl: "",
    documentationUrl: "",
    additionalUrl: "",
  };
}

export function validateM4(submission: M4Submission): M4Validation {
  const minimums = M4_CHALLENGE.steps["open-project"].minimums;
  const errors: Partial<Record<M4FieldId, string>> = {};
  const validComponents = submission.components.filter(
    (component) =>
      component.name.trim().length >= 2 &&
      component.quantity.trim().length > 0 &&
      component.purpose.trim().length >= 8
  );

  if (submission.title.trim().length < minimums.title) {
    errors.title = `Usa al menos ${minimums.title} caracteres para identificar el proyecto.`;
  }
  if (submission.problem.trim().length < minimums.problem) {
    errors.problem = `Describe el problema en al menos ${minimums.problem} caracteres.`;
  }
  if (submission.operation.trim().length < minimums.operation) {
    errors.operation = `Explica el funcionamiento en al menos ${minimums.operation} caracteres.`;
  }
  if (validComponents.length < minimums.components) {
    errors.components = `Incluye al menos ${minimums.components} piezas/elementos con nombre, cantidad y propósito.`;
  }
  if (submission.reflection.trim().length < minimums.reflection) {
    errors.reflection = `Escribe una reflexión de al menos ${minimums.reflection} caracteres.`;
  }
  if (submission.schematicFiles.length === 0) {
    errors.schematicFiles = "Agrega al menos un esquema o diagrama.";
  }
  if (submission.demonstrationFiles.length === 0) {
    errors.demonstrationFiles = "Agrega una foto, captura, video o PDF del resultado.";
  }
  if (submission.calculationFiles.length === 0) {
    errors.calculationFiles = "Agrega evidencia de tus cálculos (dimensionamiento, fuerzas, factor de seguridad, etc.).";
  }
  if (submission.cadApplies && submission.cadFiles.length === 0 && submission.cadUrl.trim().length === 0) {
    errors.cadEvidence = "Adjunta el archivo CAD o comparte un enlace al modelo.";
  }

  for (const [field, value] of [
    ["cadUrl", submission.cadUrl],
    ["documentationUrl", submission.documentationUrl],
    ["additionalUrl", submission.additionalUrl],
  ] as const) {
    if (value.trim().length > 0 && !isHttpUrl(value)) {
      errors[field] = "Usa una dirección completa que empiece por http:// o https://.";
    }
  }

  const rubricChecks = [
    !errors.problem,
    !errors.operation,
    !errors.components,
    !errors.schematicFiles && !errors.demonstrationFiles && !errors.calculationFiles,
    !errors.reflection,
  ];
  const score = rubricChecks.filter(Boolean).length;
  const isComplete = Object.keys(errors).length === 0;

  return {
    isComplete,
    score,
    maxScore: rubricChecks.length,
    errors,
    feedback: isComplete
      ? "Proyecto registrado para revisión. Tus textos, enlaces y evidencias quedan asociados al reto."
      : "Aún faltan datos o evidencias obligatorias. Revisa los campos señalados.",
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
