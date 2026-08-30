/** Pure, JSON-safe content and evaluation engine for Control C0. */

export const C0_STEP_IDS = ["reference"] as const;

export type C0StepId = (typeof C0_STEP_IDS)[number];

export interface C0ChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface C0Question {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly C0ChoiceOption[];
  readonly correctOptionId: string;
  readonly feedback: {
    readonly correct: string;
    readonly incorrect: string;
  };
}

export interface C0StepDefinition {
  readonly id: C0StepId;
  readonly order: 1;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly videoAsset: {
    readonly src: string;
    readonly alt: string;
  };
  readonly hints: readonly string[];
  readonly question: C0Question;
}

export interface C0StepSubmission {
  readonly stepId: C0StepId;
  readonly selectedOptionId: string;
}

export interface C0ItemEvaluation {
  readonly itemId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface C0StepEvaluation {
  readonly stepId: C0StepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly C0ItemEvaluation[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export const C0_QUESTION: C0Question = {
  id: "control-reference-action",
  prompt: "Determina la acción lógica inicial que debe tomar el sistema de control:",
  options: [
    {
      id: "accelerate-forward-decelerate-backward",
      label: "Acelerar hacia adelante si la distancia es mayor a 50 cm y frenar/retroceder si es menor.",
    },
    {
      id: "maintain-constant-speed",
      label: "Mantener la velocidad de avance constante.",
    },
    {
      id: "shutdown-motors",
      label: "Apagar los motores inmediatamente para evitar cualquier colisión sin importar la posición.",
    },
  ],
  correctOptionId: "accelerate-forward-decelerate-backward",
  feedback: {
    correct: "¡Correcto! Has comprendido el principio intuitivo fundamental de generar una acción correctiva basada en la desviación respecto a una referencia deseada.",
    incorrect: "Inténtalo de nuevo. Analiza con cuidado cómo debe reaccionar el movimiento del robot si la posición del objetivo cambia respecto al valor ideal.",
  },
};

export const C0_STEPS: readonly C0StepDefinition[] = [
  {
    id: "reference",
    order: 1,
    title: "Persigue la referencia",
    eyebrow: "Fundamentos de Control",
    statement:
      "Un robot móvil de reparto se desplaza por un pasillo y debe mantener una distancia constante de 50 cm respecto a la pared frontal. Observa la simulación cuando la distancia cambia de forma imprevista y determina la acción lógica inicial que debe tomar el sistema.",
    videoAsset: {
      src: "/challenges/control/c0/rccar_C0.mp4",
      alt: "Simulación interactiva de un robot dotado de un sensor de distancia frente a una pared móvil.",
    },
    hints: [
      "Piensa en qué harías tú de forma instintiva si estuvieras caminando a ciegas detrás de otra persona.",
      "Si la distancia supera los 50 cm, el robot se ha alejado del objetivo, por lo que necesita acortar espacio.",
      "Relaciona de manera directa el valor medido por el sensor con la velocidad que deben aplicar las ruedas.",
    ],
    question: C0_QUESTION,
  },
] as const;

export const C0_CHALLENGE = {
  id: "C0",
  title: "Persigue la referencia",
  subtitle: "Fundamentos · sin requisitos · desbloquea C1A, C1B",
  totalSteps: 1,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: C0_STEPS,
} as const;

export function createEmptyC0Submission(): C0StepSubmission {
  return { stepId: "reference", selectedOptionId: "" };
}

export function normalizeC0Submission(value: unknown): C0StepSubmission {
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return {
      stepId: "reference",
      selectedOptionId: typeof record.selectedOptionId === "string" ? record.selectedOptionId : "",
    };
  }
  return createEmptyC0Submission();
}

export function isC0DraftReady(submission: C0StepSubmission): boolean {
  return Boolean(submission.selectedOptionId);
}

export function evaluateC0Step(submission: C0StepSubmission): C0StepEvaluation {
  const isAnswered = Boolean(submission.selectedOptionId);
  const isCorrect = submission.selectedOptionId === C0_QUESTION.correctOptionId;
  const score = isCorrect ? 1 : 0;

  const item: C0ItemEvaluation = {
    itemId: C0_QUESTION.id,
    isAnswered,
    isCorrect,
    score,
    maxScore: 1,
    feedback: isCorrect ? C0_QUESTION.feedback.correct : C0_QUESTION.feedback.incorrect,
  };

  return {
    stepId: "reference",
    isComplete: isCorrect,
    score,
    maxScore: 1,
    feedback: isCorrect ? C0_QUESTION.feedback.correct : C0_QUESTION.feedback.incorrect,
    items: [item],
    metadata: {
      isCorrect,
    },
  };
}

export function isC0Complete(completedStepIds: readonly string[]): boolean {
  return completedStepIds.includes("reference");
}
