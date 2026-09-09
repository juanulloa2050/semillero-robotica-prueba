/**
 * Pure content and evaluation engine for Design/CAD D1B.
 */

export type D1BStepId = "volume";

export interface D1BSubmission {
  readonly stepId: D1BStepId;
  readonly value: string;
}

export interface D1BEvaluation {
  readonly isCorrect: boolean;
  readonly feedback: string;
}

export const D1B_STEP_IDS = ["volume"] as const satisfies readonly D1BStepId[];

/** Valor de referencia interno — nunca se muestra al aspirante. */
const TARGET_VOLUME_MM3 = 309_300;
const TOLERANCE = 0.02;

export const D1B_CHALLENGE = {
  id: "D1B",
  title: "El material también diseña",
  subtitle: "Subhabilidad · Parametrización y propiedades físicas",
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
      hints: [
        "No es un bloque rectangular simple — los redondeos de la parte curva afectan el volumen de forma notoria.",
        "Verifica las unidades del documento antes de leer el resultado final.",
      ] as const,
      feedback: {
        correct: "Correcto — dentro del ±2% del volumen de referencia.",
        incorrect: "Aún no. Revisa los redondeos y las unidades del documento, y vuelve a intentar.",
      },
    },
  },
} as const;

export function createD1BDraft(): D1BSubmission {
  return { stepId: "volume", value: "" };
}

export function evaluateD1B(submission: D1BSubmission): D1BEvaluation {
  const parsed = Number(submission.value.replace(",", "."));
  let isCorrect = false;
  if (Number.isFinite(parsed)) {
    const lo = TARGET_VOLUME_MM3 * (1 - TOLERANCE);
    const hi = TARGET_VOLUME_MM3 * (1 + TOLERANCE);
    isCorrect = parsed >= lo && parsed <= hi;
  }
  return {
    isCorrect,
    feedback: isCorrect
      ? D1B_CHALLENGE.steps.volume.feedback.correct
      : D1B_CHALLENGE.steps.volume.feedback.incorrect,
  };
}
