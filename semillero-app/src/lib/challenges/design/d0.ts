/**
 * Pure content and evaluation engine for Design/CAD D0.
 *
 * No React, browser-storage, or application-state dependencies here — a UI
 * renders these definitions and persists submissions wherever appropriate.
 */

export type D0StepId = "operations";

export interface D0Option {
  readonly id: string;
  readonly label: string;
}

export interface D0Submission {
  readonly stepId: D0StepId;
  readonly selected: readonly string[];
}

export interface D0Evaluation {
  readonly isCorrect: boolean;
  readonly feedback: string;
}

export const D0_STEP_IDS = ["operations"] as const satisfies readonly D0StepId[];

export const D0_OPTIONS: readonly D0Option[] = [
  { id: "extrusion", label: "Extrusión" },
  { id: "redondeo", label: "Redondeo" },
  { id: "chaflan", label: "Chaflán" },
  { id: "simetria", label: "Simetría" },
  { id: "revolucion", label: "Revolución" },
  { id: "agujero", label: "Agujero" },
  { id: "patron", label: "Patrón" },
  { id: "solevado", label: "Solevado" },
  { id: "vaciado", label: "Vaciado" },
  { id: "barrido", label: "Barrido" },
  { id: "angulo_salida", label: "Ángulo de salida" },
];

/** Obligatoria: sin ella la pieza no existe. */
export const D0_REQUIRED = ["extrusion"] as const;
/** Opcionales: no penalizan si están o no están (estrategias equivalentes). */
export const D0_OPTIONAL_OK = ["chaflan", "redondeo", "simetria"] as const;

export const D0_CHALLENGE = {
  id: "D0",
  title: "Identifica las operaciones",
  subtitle: "Fundamentos · CAD básico",
  introduction:
    "Observa esta pieza terminada y selecciona todas las operaciones de modelado que se usaron para construirla.",
  attempts: "unlimited",
  completionRule: "all_steps",
  totalSteps: 1,
  steps: {
    operations: {
      id: "operations" as const,
      order: 1 as const,
      eyebrow: "Paso único",
      title: "¿Qué operaciones se usaron?",
      statement:
        "Seleccione las operaciones con las que se puede hacer esta pieza.",
      image: {
        src: "/challenges/design/d0/d0-operations.png",
        alt: "Escuadra con pared en arco y esquina de la base biselada",
      },
      hints: [
        "Toda esta pieza necesita al menos una operación base de extrusión — sin eso no existe volumen.",
        "El arco superior admite varias formas válidas de lograrse: perfil completo, medio perfil + simetría, o agregando redondeos/chaflanes aparte.",
      ] as const,
      feedback: {
        correct:
          "Correcto. Esta pieza admite varias estrategias válidas: una sola Extrusión con el perfil completo, medio perfil + Simetría, o agregando Redondeo/Chaflán como operaciones aparte.",
        incorrect:
          "Aún no. Revisa qué operación es imprescindible para que exista la pieza, y descarta las que no tienen nada que ver con esta geometría.",
      },
    },
  },
} as const;

export function createD0Draft(): D0Submission {
  return { stepId: "operations", selected: [] };
}

export function evaluateD0(submission: D0Submission): D0Evaluation {
  const selected = submission.selected;
  const allowed = new Set<string>([...D0_REQUIRED, ...D0_OPTIONAL_OK]);
  const hasAllRequired = D0_REQUIRED.every((id) => selected.includes(id));
  const noForbidden = selected.every((id) => allowed.has(id));
  const isCorrect = hasAllRequired && noForbidden;
  return {
    isCorrect,
    feedback: isCorrect
      ? D0_CHALLENGE.steps.operations.feedback.correct
      : D0_CHALLENGE.steps.operations.feedback.incorrect,
  };
}
