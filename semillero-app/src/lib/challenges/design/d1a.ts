/**
 * Pure content and evaluation engine for Design/CAD D1A.
 */

export type D1AStepId = "constraints";

export interface D1AOption {
  readonly id: string;
  readonly label: string;
}

export interface D1ASubmission {
  readonly stepId: D1AStepId;
  readonly selected: readonly string[];
}

export interface D1AEvaluation {
  readonly isCorrect: boolean;
  readonly feedback: string;
}

export const D1A_STEP_IDS = ["constraints"] as const satisfies readonly D1AStepId[];

export const D1A_OPTIONS: readonly D1AOption[] = [
  { id: "coincidente", label: "Coincidente" },
  { id: "paralelo", label: "Paralelo" },
  { id: "perpendicular", label: "Perpendicular" },
  { id: "tangente", label: "Tangente" },
  { id: "concentrico", label: "Concéntrico" },
  { id: "simetrico", label: "Simétrico" },
  { id: "igual", label: "Igual" },
  { id: "horizontal", label: "Horizontal" },
  { id: "cota", label: "Cota" },
];

/** Cualquiera de estas, sola o combinada, deja el sketch resuelto. */
export const D1A_VALID_ANY = [
  "horizontal",
  "perpendicular",
  "cota",
  "paralelo",
  "igual",
] as const;

export const D1A_CHALLENGE = {
  id: "D1A",
  title: "Geometría bajo control",
  subtitle: "Subhabilidad · Sketches y restricciones",
  introduction:
    "Observa el sketch mostrado e identifica qué restricción falta para que quede completamente definido.",
  attempts: "unlimited",
  completionRule: "all_steps",
  totalSteps: 1,
  steps: {
    constraints: {
      id: "constraints" as const,
      order: 1 as const,
      eyebrow: "Paso único",
      title: "¿Qué restricción falta?",
      statement:
        "Este sketch no está completamente restringido: la arista superior (azul) queda libre y no es rectangular. Selecciona qué restricción(es) permitirían corregirlo para que la figura sea un rectángulo.",
      image: {
        src: "/challenges/design/d1a/d1a-sketch.png",
        alt: "Sketch trapezoidal con arista superior sin restricción",
      },
      hints: [
        "La arista libre no es horizontal ni tiene una longitud fija — ambas cosas la dejarían resuelta.",
        "Restricción geométrica y cota numérica no son excluyentes: cualquiera de las dos estrategias cierra el sketch.",
      ] as const,
      feedback: {
        correct:
          "Correcto. Cualquiera de estas resuelve el sketch: Horizontal o Paralelo (la arista queda horizontal), Perpendicular (respecto a un lado vertical), Igual (iguala la longitud de los dos lados verticales), o Cota (fija la altura del punto libre).",
        incorrect:
          "Aún no. Piensa en qué le falta específicamente a esa arista libre para quedar fija: dirección o longitud.",
      },
    },
  },
} as const;

export function createD1ADraft(): D1ASubmission {
  return { stepId: "constraints", selected: [] };
}

export function evaluateD1A(submission: D1ASubmission): D1AEvaluation {
  const selected = submission.selected;
  const isCorrect =
    selected.length > 0 &&
    selected.every((id) => (D1A_VALID_ANY as readonly string[]).includes(id));
  return {
    isCorrect,
    feedback: isCorrect
      ? D1A_CHALLENGE.steps.constraints.feedback.correct
      : D1A_CHALLENGE.steps.constraints.feedback.incorrect,
  };
}
