/**
 * Pure content and evaluation engine for Design/CAD D1B.
 */

import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

export type D1BStepId = "volume";

export interface D1BSubmission {
  readonly stepId: D1BStepId;
  readonly value: string;
  /** Archivo nativo del modelo (Fusion, Inventor, SolidWorks o un formato neutro). */
  readonly files: readonly LocalEvidenceFile[];
}

export interface D1BEvaluation {
  readonly isCorrect: boolean;
  readonly feedback: string;
  /** Verdadero cuando el volumen entra en tolerancia pero falta el archivo. */
  readonly missingFile: boolean;
}

export const D1B_STEP_IDS = ["volume"] as const satisfies readonly D1BStepId[];

/** Valor de referencia interno — nunca se muestra al aspirante. */
const TARGET_VOLUME_MM3 = 309_300;
const TOLERANCE = 0.02;

export const D1B_CHALLENGE = {
  id: "D1B",
  title: "Del plano al volumen",
  subtitle: "Subhabilidad · Modelado y propiedades físicas",
  introduction:
    "Modela la pieza mostrada en el plano y reporta su volumen.",
  attempts: "unlimited",
  completionRule: "all_steps",
  totalSteps: 1,
  steps: {
    volume: {
      id: "volume" as const,
      order: 1 as const,
      eyebrow: "Paso único",
      title: "Reporta el volumen",
      statement: "Modela la pieza mostrada en el plano y reporta su volumen (mm³).",
      unit: "mm³",
      tolerance: TOLERANCE,
      image: {
        src: "/challenges/design/d1b/d1b-part.png",
        alt: "Plano isométrico de soporte en U con redondeos y agujero central R14",
      },
      evidence: {
        label: "Archivo de tu modelo",
        description:
          "Sube la pieza que modelaste: el archivo nativo de Fusion 360 (.f3d), Inventor (.ipt) o SolidWorks (.sldprt). Si trabajas en otro programa, exporta un STEP (.step) o comprime la carpeta en un .zip.",
        accept:
          ".f3d,.f3z,.ipt,.iam,.sldprt,.sldasm,.step,.stp,.iges,.igs,.zip,application/zip",
      },
      hints: [
        "No es un bloque rectangular simple — los redondeos de la parte curva afectan el volumen de forma notoria.",
        "Verifica las unidades del documento antes de leer el resultado final.",
      ] as const,
      feedback: {
        correct: "Correcto — dentro del ±2% del volumen de referencia, y tu archivo quedó adjunto.",
        incorrect: "Aún no. Revisa los redondeos y las unidades del documento, y vuelve a intentar.",
        missingFile:
          "El volumen es correcto. Solo falta que adjuntes el archivo de tu modelo (Fusion, Inventor, SolidWorks o un STEP) para dar el reto por terminado.",
      },
    },
  },
} as const;

export function createD1BDraft(): D1BSubmission {
  return { stepId: "volume", value: "", files: [] };
}

export function evaluateD1B(submission: D1BSubmission): D1BEvaluation {
  const parsed = Number(submission.value.replace(",", "."));
  let volumeOk = false;
  if (Number.isFinite(parsed)) {
    const lo = TARGET_VOLUME_MM3 * (1 - TOLERANCE);
    const hi = TARGET_VOLUME_MM3 * (1 + TOLERANCE);
    volumeOk = parsed >= lo && parsed <= hi;
  }
  const hasFile = submission.files.length > 0;
  const missingFile = volumeOk && !hasFile;
  const { feedback } = D1B_CHALLENGE.steps.volume;
  return {
    isCorrect: volumeOk && hasFile,
    missingFile,
    feedback: missingFile
      ? feedback.missingFile
      : volumeOk
        ? feedback.correct
        : feedback.incorrect,
  };
}
