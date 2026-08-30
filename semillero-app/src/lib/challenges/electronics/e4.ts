import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

/** Pure, serializable content and validation rules for Electronics E4. */

export type E4StepId = "open-project";

export interface E4ComponentEntry {
  readonly id: string;
  readonly name: string;
  readonly quantity: string;
  readonly purpose: string;
}

export interface E4Submission {
  readonly stepId: E4StepId;
  readonly title: string;
  readonly problem: string;
  readonly operation: string;
  readonly components: readonly E4ComponentEntry[];
  readonly reflection: string;
  readonly schematicFiles: readonly LocalEvidenceFile[];
  readonly demonstrationFiles: readonly LocalEvidenceFile[];
  readonly codeFiles: readonly LocalEvidenceFile[];
  readonly codeApplies: boolean;
  readonly simulationUrl: string;
  readonly repositoryUrl: string;
  readonly additionalUrl: string;
}

export type E4FieldId =
  | "title"
  | "problem"
  | "operation"
  | "components"
  | "reflection"
  | "schematicFiles"
  | "demonstrationFiles"
  | "codeEvidence"
  | "simulationUrl"
  | "repositoryUrl"
  | "additionalUrl";

export interface E4Validation {
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: Readonly<Partial<Record<E4FieldId, string>>>;
  readonly feedback: string;
}

export const E4_STEP_IDS = [
  "open-project",
] as const satisfies readonly E4StepId[];

export const E4_CHALLENGE = {
  id: "E4",
  title: "Electrónica libre",
  subtitle: "Documenta una solución propia y deja evidencia reproducible.",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    "open-project": {
      id: "open-project",
      title: "Tu proyecto electrónico",
      statement:
        "Puede ser construido o simulado. Nos interesa entender el problema, tus decisiones y la evidencia que permite revisar el resultado.",
      brief: {
        heading: "Ahora es tu momento de diseñar",
        body: "Propón una solución electrónica propia: puede ser un robot, un conjunto de sensores y actuadores, una PCB, un sistema de control… Puede estar simulada o construida físicamente. Lo que evaluamos es que definas bien el problema, justifiques tus decisiones técnicas y dejes evidencia suficiente para que se pueda revisar.",
      },
      minimums: {
        title: 5,
        problem: 80,
        operation: 120,
        reflection: 100,
        components: 3,
      },
      hints: [
        "Delimita el problema y explica el flujo completo —alimentación, sensado, decisión, driver y salida— antes de reunir tus evidencias.",
      ],
      acceptedEvidence: {
        schematic: ".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf",
        demonstration: "image/*,video/*,application/pdf,.pdf",
        code: ".zip,.ino,.py,.c,.cpp,.h,.hpp,.js,.ts,.txt,.md,.json,application/zip,text/*",
      },
    },
  },
} as const;

export function createE4Draft(): E4Submission {
  return {
    stepId: "open-project",
    title: "",
    problem: "",
    operation: "",
    components: [{ id: "component-1", name: "", quantity: "1", purpose: "" }],
    reflection: "",
    schematicFiles: [],
    demonstrationFiles: [],
    codeFiles: [],
    codeApplies: false,
    simulationUrl: "",
    repositoryUrl: "",
    additionalUrl: "",
  };
}

export function validateE4(submission: E4Submission): E4Validation {
  const minimums = E4_CHALLENGE.steps["open-project"].minimums;
  const errors: Partial<Record<E4FieldId, string>> = {};
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
    errors.components = `Incluye al menos ${minimums.components} componentes con nombre, cantidad y propósito.`;
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
  if (
    submission.codeApplies &&
    submission.codeFiles.length === 0 &&
    submission.repositoryUrl.trim().length === 0
  ) {
    errors.codeEvidence = "Adjunta el código o comparte un enlace al repositorio.";
  }

  for (const [field, value] of [
    ["simulationUrl", submission.simulationUrl],
    ["repositoryUrl", submission.repositoryUrl],
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
    !errors.schematicFiles && !errors.demonstrationFiles,
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
