import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

/** Pure, serializable content and validation rules for Design/CAD D4. */

export type D4StepId = "open-project";

export interface D4Submission {
  readonly stepId: D4StepId;
  readonly title: string;
  readonly problem: string;
  readonly material: string;
  readonly explanation: string;
  readonly manufacturingProcess: string;
  readonly limitations: string;
  readonly viewFiles: readonly LocalEvidenceFile[];
  readonly cadFiles: readonly LocalEvidenceFile[];
  readonly cadUrl: string;
  readonly additionalUrl: string;
}

export type D4FieldId =
  | "title"
  | "problem"
  | "material"
  | "explanation"
  | "viewFiles"
  | "cadEvidence"
  | "cadUrl"
  | "additionalUrl";

export interface D4Validation {
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: Readonly<Partial<Record<D4FieldId, string>>>;
  readonly feedback: string;
}

export const D4_STEP_IDS = ["open-project"] as const satisfies readonly D4StepId[];

export const D4_CHALLENGE = {
  id: "D4",
  title: "Diseña algo que exista",
  subtitle: "Reto libre · Criterio de diseño y documentación",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    "open-project": {
      id: "open-project",
      title: "Tu diseño",
      statement:
        "Diseña una pieza, conjunto o mecanismo que consideres útil para un robot. Puede ser algo tan simple como un soporte de sensor o tan ambicioso como una pinza o un mecanismo articulado — lo importante es que resuelva un problema real y que puedas explicar tus decisiones. No hay una única respuesta correcta: aquí evaluamos criterio de diseño, no un resultado exacto.",
      minimums: {
        title: 5,
        problem: 30,
        explanationWords: 100,
        viewFiles: 2,
      },
      hints: [
        "Piensa primero en el problema que resuelve la pieza antes de pensar en su forma.",
        "Una pieza simple y bien justificada vale más que una compleja sin explicación clara.",
      ],
      acceptedEvidence: {
        view: ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf",
        cad: ".zip,.step,.stp,.iges,.igs,.sldprt,.sldasm,.f3d,.f3z,.ipt,.iam,.fcstd,.pdf,application/zip",
      },
    },
  },
} as const;

export function createD4Draft(): D4Submission {
  return {
    stepId: "open-project",
    title: "",
    problem: "",
    material: "",
    explanation: "",
    manufacturingProcess: "",
    limitations: "",
    viewFiles: [],
    cadFiles: [],
    cadUrl: "",
    additionalUrl: "",
  };
}

export function validateD4(submission: D4Submission): D4Validation {
  const minimums = D4_CHALLENGE.steps["open-project"].minimums;
  const errors: Partial<Record<D4FieldId, string>> = {};

  if (submission.title.trim().length < minimums.title) {
    errors.title = `Usa al menos ${minimums.title} caracteres para identificar la pieza.`;
  }
  if (submission.problem.trim().length < minimums.problem) {
    errors.problem = `Describe para qué sirve en al menos ${minimums.problem} caracteres.`;
  }
  if (submission.material.trim().length < 2) {
    errors.material = "Indica el material asignado a la pieza.";
  }
  if (wordCount(submission.explanation) < minimums.explanationWords) {
    errors.explanation = `Escribe al menos ${minimums.explanationWords} palabras explicando por qué la diseñaste así.`;
  }
  if (submission.viewFiles.length < minimums.viewFiles) {
    errors.viewFiles = `Sube al menos ${minimums.viewFiles} capturas (una isométrica y una con cotas o vista técnica).`;
  }
  if (submission.cadFiles.length === 0 && submission.cadUrl.trim().length === 0) {
    errors.cadEvidence = "Adjunta el archivo CAD o comparte un enlace al modelo.";
  }

  for (const [field, value] of [
    ["cadUrl", submission.cadUrl],
    ["additionalUrl", submission.additionalUrl],
  ] as const) {
    if (value.trim().length > 0 && !isHttpUrl(value)) {
      errors[field] = "Usa una dirección completa que empiece por http:// o https://.";
    }
  }

  const rubricChecks = [
    !errors.problem,
    !errors.material,
    !errors.explanation,
    !errors.viewFiles && !errors.cadEvidence,
  ];
  const score = rubricChecks.filter(Boolean).length;
  const isComplete = Object.keys(errors).length === 0;

  return {
    isComplete,
    score,
    maxScore: rubricChecks.length,
    errors,
    feedback: isComplete
      ? "Diseño registrado para revisión. Tu explicación, evidencias y enlaces quedan asociados al reto."
      : "Aún faltan datos o evidencias obligatorias. Revisa los campos señalados.",
  };
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
