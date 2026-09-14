import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

/** Pure, serializable content and validation rules for Design/CAD D5. */

export type D5StepId = "showcase";

export interface D5Submission {
  readonly stepId: D5StepId;
  readonly title: string;
  readonly explanation: string;
  readonly context: string;
  readonly approxDate: string;
  readonly improvementIdeas: string;
  readonly files: readonly LocalEvidenceFile[];
  readonly fileUrl: string;
}

export type D5FieldId =
  | "title"
  | "explanation"
  | "evidence"
  | "fileUrl";

export interface D5Validation {
  readonly isComplete: boolean;
  readonly errors: Readonly<Partial<Record<D5FieldId, string>>>;
  readonly feedback: string;
}

export const D5_STEP_IDS = ["showcase"] as const satisfies readonly D5StepId[];

export const D5_CHALLENGE = {
  id: "D5",
  title: "Muéstranos tu mejor trabajo",
  subtitle: "Reto libre · Comparte un modelo CAD propio que ya hayas hecho.",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    showcase: {
      id: "showcase" as const,
      title: "Tu mejor trabajo",
      statement:
        "Cuéntanos sobre el modelo CAD del que te sientas más orgulloso — algo en lo que ya hayas puesto tu mejor esfuerzo, sin importar si lo hiciste para un curso, un proyecto personal, otro semillero o simplemente por curiosidad. Sube el archivo (o capturas si el archivo es muy pesado o confidencial) y cuéntanos qué es, qué problema resolvía, qué fue lo más difícil de lograr, y qué harías distinto si lo rehicieras hoy.",
      minimums: {
        title: 3,
        explanationWords: 80,
        files: 1,
      },
      acceptedEvidence: {
        work: ".zip,.step,.stp,.iges,.igs,.sldprt,.sldasm,.f3d,.f3z,.ipt,.iam,.fcstd,.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf,application/zip",
      },
    },
  },
} as const;

export function createD5Draft(): D5Submission {
  return {
    stepId: "showcase",
    title: "",
    explanation: "",
    context: "",
    approxDate: "",
    improvementIdeas: "",
    files: [],
    fileUrl: "",
  };
}

export function validateD5(submission: D5Submission): D5Validation {
  const minimums = D5_CHALLENGE.steps.showcase.minimums;
  const errors: Partial<Record<D5FieldId, string>> = {};

  if (submission.title.trim().length < minimums.title) {
    errors.title = `Usa al menos ${minimums.title} caracteres para nombrar tu modelo.`;
  }
  if (wordCount(submission.explanation) < minimums.explanationWords) {
    errors.explanation = `Escribe al menos ${minimums.explanationWords} palabras: qué es, para qué sirve y qué tan difícil fue hacerlo.`;
  }
  if (submission.files.length < minimums.files && submission.fileUrl.trim().length === 0) {
    errors.evidence = "Sube tu archivo CAD (o capturas) o comparte un enlace al modelo.";
  }
  if (submission.fileUrl.trim().length > 0 && !isHttpUrl(submission.fileUrl)) {
    errors.fileUrl = "Usa una dirección completa que empiece por http:// o https://.";
  }

  const isComplete = Object.keys(errors).length === 0;

  return {
    isComplete,
    errors,
    feedback: isComplete
      ? "Gracias por compartir tu trabajo. Esto nos ayuda muchísimo a conocer tu nivel real y tu forma de pensar el diseño, más allá de los retos guiados."
      : "Aún faltan datos o evidencia obligatoria. Revisa los campos señalados.",
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
