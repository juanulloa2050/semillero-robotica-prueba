/**
 * Pure content and evaluation engine for Mechanics M1A.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. A UI can render the definitions, persist submissions wherever
 * appropriate, and use the exported evaluators without duplicating answers.
 */

export type M1AStepId = "reactions" | "moment" | "torque" | "lever-arm";

export type M1AStepKind = "numeric_set";
export type M1ANumericInput = string | number;

export interface M1AFeedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M1ANumericQuestion {
  readonly id: string;
  readonly type: "numeric";
  readonly prompt: string;
  readonly unit: string;
  readonly expectedValue: number;
  readonly tolerance: number;
  readonly formula: string;
  readonly placeholder: string;
  readonly feedback: M1AFeedback;
}

export interface M1AStepDefinition {
  readonly id: M1AStepId;
  readonly order: 1 | 2 | 3 | 4;
  readonly kind: M1AStepKind;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M1AStepId;
  readonly hints: readonly [string, string];
  readonly questions: readonly M1ANumericQuestion[];
}

export interface M1AChallengeDefinition {
  readonly id: "M1A";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 4;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
  readonly steps: readonly M1AStepDefinition[];
}

export interface M1ANumericSubmission {
  readonly stepId: M1AStepId;
  readonly answers: Readonly<Partial<Record<string, M1ANumericInput>>>;
}

export type M1AStepSubmission = M1ANumericSubmission;

export interface M1AItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M1AStepEvaluation {
  readonly stepId: M1AStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M1AItemEvaluation[];
}

const REACTIONS_QUESTIONS = [
  {
    id: "reactions-rb",
    type: "numeric",
    prompt: "¿Cuál es la reacción en el apoyo B (R_B)?",
    unit: "N",
    expectedValue: 225,
    tolerance: 5,
    formula: "ΣM_A = 0 → R_B · L = P · a",
    placeholder: "Ej. 100",
    feedback: {
      correct: "R_B = (600 N × 1.5 m) / 4 m = 225 N.",
      incorrect:
        "Toma momentos respecto a A: la carga (600 N) por su distancia a A (1.5 m) debe igualar a R_B por la longitud total (4 m).",
    },
  },
  {
    id: "reactions-ra",
    type: "numeric",
    prompt: "¿Cuál es la reacción en el apoyo A (R_A)?",
    unit: "N",
    expectedValue: 375,
    tolerance: 5,
    formula: "ΣF_y = 0 → R_A + R_B = P",
    placeholder: "Ej. 100",
    feedback: {
      correct: "R_A = 600 N − 225 N = 375 N.",
      incorrect:
        "Con la viga en equilibrio vertical: R_A = P − R_B. Usa el valor de R_B que ya calculaste.",
    },
  },
] as const satisfies readonly M1ANumericQuestion[];

const MOMENT_QUESTIONS = [
  {
    id: "moment-far",
    type: "numeric",
    prompt: "¿Qué momento generas empujando la puerta a 0.4 m de la bisagra?",
    unit: "N·m",
    expectedValue: 60,
    tolerance: 2,
    formula: "M = F · d",
    placeholder: "Ej. 100",
    feedback: {
      correct: "M = 150 N × 0.4 m = 60 N·m.",
      incorrect: "Multiplica la fuerza (150 N) por la distancia perpendicular a la bisagra (0.4 m).",
    },
  },
  {
    id: "moment-near",
    type: "numeric",
    prompt: "Si aplicas la misma fuerza a solo 0.15 m de la bisagra, ¿qué momento generas?",
    unit: "N·m",
    expectedValue: 22.5,
    tolerance: 1,
    formula: "M = F · d",
    placeholder: "Ej. 1,00",
    feedback: {
      correct:
        "M = 150 N × 0.15 m = 22.5 N·m: menos momento, por eso cuesta más abrir la puerta empujando cerca de la bisagra.",
      incorrect: "Usa la misma fórmula (M = F · d) pero con la nueva distancia (0.15 m).",
    },
  },
] as const satisfies readonly M1ANumericQuestion[];

const TORQUE_QUESTIONS = [
  {
    id: "torque-value",
    type: "numeric",
    prompt: "¿Qué torque aplicas sobre el perno?",
    unit: "N·m",
    expectedValue: 10,
    tolerance: 0.5,
    formula: "T = F · d",
    placeholder: "Ej. 100",
    feedback: {
      correct: "T = 40 N × 0.25 m = 10 N·m.",
      incorrect: "Multiplica la fuerza aplicada (40 N) por el brazo de la llave (0.25 m).",
    },
  },
  {
    id: "torque-force-needed",
    type: "numeric",
    prompt:
      "El fabricante pide apretar este perno a 20 N·m. Con el mismo brazo de 0.25 m, ¿qué fuerza debes aplicar?",
    unit: "N",
    expectedValue: 80,
    tolerance: 3,
    formula: "F = T / d",
    placeholder: "Ej. 100",
    feedback: {
      correct: "F = 20 N·m / 0.25 m = 80 N.",
      incorrect: "Despeja la fuerza de T = F · d: F = T / d, con T = 20 N·m y d = 0.25 m.",
    },
  },
] as const satisfies readonly M1ANumericQuestion[];

const LEVER_ARM_QUESTIONS = [
  {
    id: "lever-load-force",
    type: "numeric",
    prompt: "¿Qué fuerza ejerces sobre la piedra?",
    unit: "N",
    expectedValue: 880,
    tolerance: 20,
    formula: "F_esfuerzo · d_esfuerzo = F_carga · d_carga",
    placeholder: "Ej. 100",
    feedback: {
      correct: "F_carga = (80 N × 0.55 m) / 0.05 m = 880 N.",
      incorrect:
        "El brazo del esfuerzo es 0.6 m − 0.05 m = 0.55 m. Usa F1 · d1 = F2 · d2 para hallar la fuerza sobre la piedra.",
    },
  },
  {
    id: "lever-mechanical-advantage",
    type: "numeric",
    prompt: "¿Cuál es la ventaja mecánica de esta barra?",
    unit: "",
    expectedValue: 11,
    tolerance: 0.3,
    formula: "VM = d_esfuerzo / d_carga",
    placeholder: "Ej. 1,00",
    feedback: {
      correct: "VM = 0.55 m / 0.05 m = 11. Con 80 N mueves una resistencia de hasta 880 N.",
      incorrect: "Divide el brazo del esfuerzo (0.55 m) entre el brazo de la carga (0.05 m).",
    },
  },
] as const satisfies readonly M1ANumericQuestion[];

export const M1A_STEPS = [
  {
    id: "reactions",
    order: 1,
    kind: "numeric_set",
    title: "Reacciones en apoyos",
    eyebrow: "Paso 1 de 4 · Equilibrio de una viga",
    statement:
      "Una viga de 4 m está apoyada en A (izquierda) y B (derecha). Una carga de 600 N actúa a 1.5 m de A. Calcula las reacciones en cada apoyo.",
    diagram: "reactions",
    hints: [
      "Toma momentos respecto al apoyo A: la carga y R_B son las únicas fuerzas que generan momento respecto a A (R_A pasa exactamente por ese punto).",
      "R_B = P · a / L = 600 N × 1.5 m / 4 m. Luego usa ΣF_y = 0 para hallar R_A = P − R_B.",
    ],
    questions: REACTIONS_QUESTIONS,
  },
  {
    id: "moment",
    order: 2,
    kind: "numeric_set",
    title: "Momento en una puerta",
    eyebrow: "Paso 2 de 4 · Momento de una fuerza",
    statement:
      "Empujas una puerta con 150 N, perpendiculares a la hoja, a 0.4 m de la bisagra. Calcula el momento que generas y compáralo con empujar más cerca de la bisagra.",
    diagram: "moment",
    hints: [
      "El momento depende de la fuerza y de la distancia perpendicular al punto de giro (la bisagra), no solo de la fuerza.",
      "M = F · d. En la primera pregunta d = 0.4 m; en la segunda, d = 0.15 m, con la misma fuerza de 150 N.",
    ],
    questions: MOMENT_QUESTIONS,
  },
  {
    id: "torque",
    order: 3,
    kind: "numeric_set",
    title: "Torque con una llave",
    eyebrow: "Paso 3 de 4 · Torque directo e inverso",
    statement:
      "Aprietas un perno con una llave de 0.25 m aplicando 40 N perpendiculares al mango. Calcula el torque y, luego, la fuerza necesaria para llegar a un torque objetivo de 20 N·m con el mismo brazo.",
    diagram: "torque",
    hints: [
      "El torque es fuerza por brazo (T = F · d). Para la segunda pregunta, despeja la fuerza de la misma fórmula.",
      "T = F · d → F = T / d. Usa T = 20 N·m y d = 0.25 m para la fuerza que falta.",
    ],
    questions: TORQUE_QUESTIONS,
  },
  {
    id: "lever-arm",
    order: 4,
    kind: "numeric_set",
    title: "Brazo de palanca de una barra",
    eyebrow: "Paso 4 de 4 · Ventaja mecánica real",
    statement:
      "Usas una barra de 0.6 m para hacer palanca sobre una piedra. El punto de apoyo queda a 0.05 m del extremo que hace contacto con la piedra. Si aplicas 80 N en el extremo lejano, calcula la fuerza sobre la piedra y la ventaja mecánica de la barra.",
    diagram: "lever-arm",
    hints: [
      "Como en M0, F1 · d1 = F2 · d2. Aquí el brazo del esfuerzo es la distancia total menos el brazo de la carga (0.6 m − 0.05 m).",
      "F_carga = F_esfuerzo × d_esfuerzo / d_carga = 80 N × 0.55 m / 0.05 m. La ventaja mecánica es ese mismo cociente de brazos: 0.55/0.05.",
    ],
    questions: LEVER_ARM_QUESTIONS,
  },
] as const satisfies readonly M1AStepDefinition[];

export const M1A_CHALLENGE = {
  id: "M1A",
  title: "Fuerzas que cuentan una historia",
  subtitle: "Estática aplicada: reacciones, momento, torque y brazo de palanca",
  introduction:
    "Resuelve cuatro problemas visuales de estática: reacciones en una viga, momento de una fuerza, torque con una llave y el brazo de palanca de una barra, antes de avanzar a Elige el actuador correcto.",
  totalSteps: 4,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: M1A_STEPS,
} as const satisfies M1AChallengeDefinition;

export const M1A_STEP_IDS = M1A_STEPS.map((step) => step.id) as readonly M1AStepId[];

/** Accepts both decimal comma and decimal point, returning null for invalid input. */
export function normalizeDecimalInput(value: M1ANumericInput): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isWithinTolerance(
  actual: number | null,
  expected: number,
  tolerance: number
): boolean {
  return actual !== null && Math.abs(actual - expected) <= tolerance + Number.EPSILON;
}

function evaluateNumeric(
  question: M1ANumericQuestion,
  rawValue: M1ANumericInput | undefined
): M1AItemEvaluation {
  const isAnswered = rawValue !== undefined && String(rawValue).trim().length > 0;
  const normalized = isAnswered ? normalizeDecimalInput(rawValue as M1ANumericInput) : null;
  const isCorrect = isWithinTolerance(normalized, question.expectedValue, question.tolerance);

  return {
    questionId: question.id,
    isAnswered,
    isCorrect,
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
  };
}

function summarizeItems(
  stepId: M1AStepId,
  items: readonly M1AItemEvaluation[],
  completeFeedback: string,
  retryFeedback: string
): M1AStepEvaluation {
  const score = items.reduce((total, item) => total + item.score, 0);
  const maxScore = items.reduce((total, item) => total + item.maxScore, 0);
  const isComplete = score === maxScore;

  return {
    stepId,
    isComplete,
    score,
    maxScore,
    feedback: isComplete ? completeFeedback : retryFeedback,
    items,
  };
}

function evaluateNumericStep(
  stepId: M1AStepId,
  questions: readonly M1ANumericQuestion[],
  submission: M1ANumericSubmission,
  completeFeedback: string,
  bothIncorrectFeedback: string
): M1AStepEvaluation {
  const items = questions.map((question) =>
    evaluateNumeric(question, submission.answers[question.id])
  );
  const allIncorrect = items.every((item) => !item.isCorrect);
  const firstIncorrect = items.find((item) => !item.isCorrect);

  return summarizeItems(
    stepId,
    items,
    completeFeedback,
    allIncorrect ? bothIncorrectFeedback : (firstIncorrect?.feedback ?? bothIncorrectFeedback)
  );
}

export function evaluateReactionsStep(submission: M1ANumericSubmission): M1AStepEvaluation {
  return evaluateNumericStep(
    "reactions",
    REACTIONS_QUESTIONS,
    submission,
    "R_B = 225 N y R_A = 375 N. Las dos reacciones equilibran la carga de 600 N.",
    "Empieza por la suma de momentos respecto a A para hallar R_B; luego usa el equilibrio vertical para R_A."
  );
}

export function evaluateMomentStep(submission: M1ANumericSubmission): M1AStepEvaluation {
  return evaluateNumericStep(
    "moment",
    MOMENT_QUESTIONS,
    submission,
    "M = 60 N·m a 0.4 m y M = 22.5 N·m a 0.15 m. A menor brazo, menor momento con la misma fuerza.",
    "Usa M = F · d con cada distancia (0.4 m y 0.15 m) y la misma fuerza de 150 N."
  );
}

export function evaluateTorqueStep(submission: M1ANumericSubmission): M1AStepEvaluation {
  return evaluateNumericStep(
    "torque",
    TORQUE_QUESTIONS,
    submission,
    "T = 10 N·m con 40 N, y se necesitan 80 N para llegar a 20 N·m con el mismo brazo.",
    "Usa T = F · d para el torque, y F = T / d para despejar la fuerza que falta."
  );
}

export function evaluateLeverArmStep(submission: M1ANumericSubmission): M1AStepEvaluation {
  return evaluateNumericStep(
    "lever-arm",
    LEVER_ARM_QUESTIONS,
    submission,
    "F_carga = 880 N y VM = 11. Ambos resultados son consistentes entre sí.",
    "Calcula primero el brazo del esfuerzo (0.6 m − 0.05 m) y aplica F1 · d1 = F2 · d2."
  );
}

export function evaluateM1AStep(submission: M1AStepSubmission): M1AStepEvaluation {
  switch (submission.stepId) {
    case "reactions":
      return evaluateReactionsStep(submission);
    case "moment":
      return evaluateMomentStep(submission);
    case "torque":
      return evaluateTorqueStep(submission);
    case "lever-arm":
      return evaluateLeverArmStep(submission);
  }
}

export function isM1AComplete(completedStepIds: readonly M1AStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M1A_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM1AStepId(completedStepIds: readonly M1AStepId[]): M1AStepId | null {
  const completed = new Set(completedStepIds);
  return M1A_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
