/**
 * Pure content and evaluation engine for Mechanics M3B.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. Each step presents a movement requirement (travel, precision,
 * budget, envelope) alongside a fixed catalog of five mechanism families with
 * their typical travel/precision/cost/complexity. The candidate picks the
 * mechanism that best fits the requirement and writes an open justification.
 */

export type M3BStepId = "platform" | "gripper" | "hatch";
export type M3BMechanismId = "lead-screw" | "four-bar" | "rack-pinion" | "linear-actuator" | "belt-pulley";

export interface M3BMechanismSpec {
  readonly id: M3BMechanismId;
  readonly name: string;
  readonly travel: string;
  readonly precision: string;
  readonly cost: string;
  readonly complexity: string;
}

export const M3B_CATALOG: readonly M3BMechanismSpec[] = [
  { id: "lead-screw", name: "Husillo (tornillo de potencia)", travel: "Media-larga", precision: "Alta", cost: "Medio-alto", complexity: "Media" },
  { id: "four-bar", name: "Mecanismo de cuatro barras", travel: "Corta (movimiento angular)", precision: "Media", cost: "Bajo", complexity: "Media" },
  { id: "rack-pinion", name: "Piñón-cremallera", travel: "Larga", precision: "Media-alta", cost: "Medio", complexity: "Baja-media" },
  { id: "linear-actuator", name: "Actuador lineal (llave en mano)", travel: "Corta-media", precision: "Media", cost: "Alto", complexity: "Baja" },
  { id: "belt-pulley", name: "Polea y correa", travel: "Larga", precision: "Media", cost: "Bajo", complexity: "Baja" },
];

export interface M3BFeedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M3BChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface M3BSingleChoiceQuestion {
  readonly id: string;
  readonly type: "single_choice";
  readonly prompt: string;
  readonly options: readonly M3BChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
  readonly feedback: M3BFeedback;
}

export interface M3BOpenTextQuestion {
  readonly id: string;
  readonly type: "open_text";
  readonly prompt: string;
  readonly minCharacters: number;
  readonly placeholder: string;
}

export type M3BQuestionDefinition = M3BSingleChoiceQuestion | M3BOpenTextQuestion;

export interface M3BStepDefinition {
  readonly id: M3BStepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M3BStepId;
  readonly travelMm: number;
  readonly envelope: string;
  readonly precisionRequirement: string;
  readonly budgetNote: string;
  readonly hints: readonly [string, string];
  readonly questions: readonly [M3BSingleChoiceQuestion, M3BOpenTextQuestion];
}

export interface M3BChallengeDefinition {
  readonly id: "M3B";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 3;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
}

export interface M3BStepSubmission {
  readonly stepId: M3BStepId;
  readonly answers: Readonly<Partial<Record<string, string>>>;
}

export interface M3BItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean | null;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M3BStepEvaluation {
  readonly stepId: M3BStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M3BItemEvaluation[];
}

// La justificación abierta no se califica como correcta/incorrecta — eso
// queda a criterio del evaluador. Aquí solo exigimos que no esté vacía,
// como condición para poder comprobar las preguntas cerradas y completar
// el paso.
const OPEN_MIN_CHARS = 1;

function catalogOptions(): M3BChoiceOption[] {
  return M3B_CATALOG.map((mechanism) => ({ id: mechanism.id, label: mechanism.name }));
}

export const M3B_STEPS = [
  {
    id: "platform",
    order: 1,
    title: "Plataforma deslizante",
    eyebrow: "Paso 1 de 3 · Elige el mecanismo",
    statement:
      "Una plataforma debe moverse 150 mm en línea recta, dentro de un volumen de 200 × 100 × 80 mm. La precisión requerida es moderada (±0.5 mm) y el presupuesto es limitado.",
    diagram: "platform",
    travelMm: 150,
    envelope: "200 × 100 × 80 mm",
    precisionRequirement: "±0.5 mm (moderada)",
    budgetNote: "Presupuesto limitado",
    hints: [
      "El recorrido (150 mm) es largo comparado con el volumen disponible, así que necesitas un mecanismo con buena carrera lineal.",
      "Con presupuesto limitado y precisión solo moderada (no extrema), no necesitas pagar por la precisión adicional de un husillo: hay una opción de carrera larga y costo medio que ya cumple lo que pide el enunciado.",
    ],
    questions: [
      {
        id: "platform-mechanism",
        type: "single_choice",
        prompt: "¿Qué mecanismo elegirías para este recorrido?",
        options: catalogOptions(),
        correctOptionId: "rack-pinion",
        shuffleOptions: true,
        feedback: {
          correct: "El piñón-cremallera da carrera larga en línea recta con costo medio: encaja con el presupuesto limitado y la precisión moderada que pide el enunciado.",
          incorrect: "Compara cada opción contra los tres datos del enunciado a la vez: carrera larga (150 mm), precisión solo moderada, y presupuesto limitado.",
        },
      },
      {
        id: "platform-justification",
        type: "open_text",
        prompt: "Justifica tu elección: ¿por qué este mecanismo y no otro de la tabla?",
        minCharacters: OPEN_MIN_CHARS,
        placeholder: "Explica tu razonamiento comparando al menos dos mecanismos de la tabla...",
      },
    ],
  },
  {
    id: "gripper",
    order: 2,
    title: "Pinza de precisión",
    eyebrow: "Paso 2 de 3 · Ahora la precisión manda",
    statement:
      "Una pinza (gripper) debe abrir y cerrar unos 40 mm para manipular piezas pequeñas, con una precisión muy alta (±0.05 mm). El espacio disponible es reducido, pero el presupuesto sí permite pagar por precisión.",
    diagram: "gripper",
    travelMm: 40,
    envelope: "Espacio reducido",
    precisionRequirement: "±0.05 mm (muy alta)",
    budgetNote: "Presupuesto disponible para precisión",
    hints: [
      "Aquí el recorrido es corto (40 mm); lo que manda esta vez es la precisión, no la carrera.",
      "De los mecanismos de la tabla, solo uno está calificado como \"Alta\" precisión: ese es el que necesitas cuando el presupuesto sí lo permite.",
    ],
    questions: [
      {
        id: "gripper-mechanism",
        type: "single_choice",
        prompt: "¿Qué mecanismo elegirías para esta pinza?",
        options: catalogOptions(),
        correctOptionId: "lead-screw",
        shuffleOptions: true,
        feedback: {
          correct: "El husillo ofrece la mayor precisión de la tabla; con recorrido corto y presupuesto disponible, es la elección correcta aquí.",
          incorrect: "Esta vez la precisión (±0.05 mm) es el requisito que más restringe: busca en la tabla el mecanismo calificado como \"Alta\" precisión.",
        },
      },
      {
        id: "gripper-justification",
        type: "open_text",
        prompt: "Justifica tu elección: ¿por qué este mecanismo y no otro de la tabla?",
        minCharacters: OPEN_MIN_CHARS,
        placeholder: "Explica tu razonamiento comparando al menos dos mecanismos de la tabla...",
      },
    ],
  },
  {
    id: "hatch",
    order: 3,
    title: "Escotilla giratoria",
    eyebrow: "Paso 3 de 3 · Bajo presupuesto, sin exigir precisión",
    statement:
      "Una escotilla debe girar 90° para abrir un compartimento. No necesita precisión fina (basta con que abra y cierre bien), y el presupuesto es muy limitado.",
    diagram: "hatch",
    travelMm: 90,
    envelope: "Movimiento angular (no lineal)",
    precisionRequirement: "Baja (solo abrir/cerrar)",
    budgetNote: "Presupuesto muy limitado",
    hints: [
      "El movimiento pedido es de rotación (90°), no una línea recta: eso ya descarta los mecanismos pensados para carrera lineal larga.",
      "Con presupuesto muy limitado y precisión baja, busca el mecanismo con costo \"Bajo\" que además está pensado para movimiento angular, no lineal.",
    ],
    questions: [
      {
        id: "hatch-mechanism",
        type: "single_choice",
        prompt: "¿Qué mecanismo elegirías para esta escotilla?",
        options: catalogOptions(),
        correctOptionId: "four-bar",
        shuffleOptions: true,
        feedback: {
          correct: "El mecanismo de cuatro barras es de bajo costo y está pensado para movimiento angular como este, sin necesitar alta precisión.",
          incorrect: "El movimiento es una rotación de 90°, no una línea recta: de la tabla, busca el mecanismo de bajo costo pensado para ese tipo de movimiento.",
        },
      },
      {
        id: "hatch-justification",
        type: "open_text",
        prompt: "Justifica tu elección: ¿por qué este mecanismo y no otro de la tabla?",
        minCharacters: OPEN_MIN_CHARS,
        placeholder: "Explica tu razonamiento comparando al menos dos mecanismos de la tabla...",
      },
    ],
  },
] as const satisfies readonly M3BStepDefinition[];

export const M3B_CHALLENGE = {
  id: "M3B",
  title: "Inventa el movimiento",
  subtitle: "Síntesis conceptual: elige y justifica un mecanismo",
  introduction:
    "Resuelve tres escenarios de síntesis de mecanismos: una plataforma deslizante, una pinza de precisión y una escotilla giratoria. En cada uno, compara el catálogo de mecanismos contra el recorrido, la precisión y el presupuesto exigidos, elige el más adecuado y justifica tu elección por escrito.",
  totalSteps: 3,
  completionRule: "all_steps",
  attempts: "unlimited",
} as const satisfies M3BChallengeDefinition;

export const M3B_STEP_IDS = M3B_STEPS.map((step) => step.id) as readonly M3BStepId[];

function hashSeed(seed: string | number): number {
  const value = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed: string | number): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const shuffled = [...items];
  const random = createDeterministicRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function getM3BStepTitle(stepId: M3BStepId): string {
  return M3B_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

export function getDeterministicChoiceOptions(
  question: M3BSingleChoiceQuestion,
  stepId: M3BStepId,
  seed: string | number
): M3BChoiceOption[] {
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, `M3B:${stepId}:${question.id}:${String(seed)}`);
}

function evaluateQuestion(question: M3BQuestionDefinition, rawValue: string | undefined): M3BItemEvaluation {
  if (question.type === "single_choice") {
    const isAnswered = typeof rawValue === "string" && rawValue.length > 0;
    const isCorrect = rawValue === question.correctOptionId;
    return {
      questionId: question.id,
      isAnswered,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
    };
  }

  const trimmed = (rawValue ?? "").trim();
  const isAnswered = trimmed.length >= question.minCharacters;
  return {
    questionId: question.id,
    isAnswered,
    isCorrect: null,
    score: 0,
    maxScore: 0,
    feedback: isAnswered
      ? "Tu justificación queda registrada para revisión."
      : "Escribe tu justificación antes de continuar.",
  };
}

export function evaluateM3BStep(step: M3BStepDefinition, submission: M3BStepSubmission): M3BStepEvaluation {
  const items = step.questions.map((question) => evaluateQuestion(question, submission.answers[question.id]));
  const choiceItems = items.filter((item) => item.isCorrect !== null);
  const score = choiceItems.reduce((total, item) => total + item.score, 0);
  const maxScore = choiceItems.reduce((total, item) => total + item.maxScore, 0);
  const allChoicesCorrect = choiceItems.every((item) => item.isCorrect);
  const openItem = items.find((item) => item.maxScore === 0);
  const isComplete = allChoicesCorrect && Boolean(openItem?.isAnswered);
  const firstIncorrectChoice = choiceItems.find((item) => !item.isCorrect);

  return {
    stepId: step.id,
    isComplete,
    score,
    maxScore,
    feedback: isComplete
      ? "Elegiste un mecanismo consistente con el recorrido, la precisión y el presupuesto, y registraste tu justificación."
      : (firstIncorrectChoice?.feedback ??
        (!openItem?.isAnswered ? "Escribe tu justificación antes de continuar." : "Revisa tu elección e inténtalo de nuevo.")),
    items,
  };
}

export function isM3BComplete(completedStepIds: readonly M3BStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M3B_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM3BStepId(completedStepIds: readonly M3BStepId[]): M3BStepId | null {
  const completed = new Set(completedStepIds);
  return M3B_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
