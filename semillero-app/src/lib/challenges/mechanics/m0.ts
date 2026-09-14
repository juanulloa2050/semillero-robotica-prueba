/**
 * Pure content and evaluation engine for Mechanics M0.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. A UI can render the definitions, persist submissions wherever
 * appropriate, and use the exported evaluators without duplicating answers.
 */

export type M0StepId =
  | "gears"
  | "pulleys"
  | "levers"
  | "mechanical-advantage"
  | "speed-torque";

export type M0StepKind = "choice_set" | "numeric_set";
export type M0QuestionType = "single_choice" | "numeric";
export type M0Seed = string | number;
export type M0NumericInput = string | number;

export interface M0Feedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M0ChoiceOption {
  readonly id: string;
  readonly label: string;
}

interface M0QuestionBase {
  readonly id: string;
  readonly type: M0QuestionType;
  readonly prompt: string;
  readonly feedback: M0Feedback;
}

export interface M0SingleChoiceQuestion extends M0QuestionBase {
  readonly type: "single_choice";
  readonly options: readonly M0ChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
}

export interface M0NumericQuestion extends M0QuestionBase {
  readonly type: "numeric";
  readonly unit: string;
  readonly expectedValue: number;
  readonly tolerance: number;
  readonly formula: string;
  readonly placeholder: string;
}

export type M0QuestionDefinition = M0SingleChoiceQuestion | M0NumericQuestion;

export interface M0StepDefinition {
  readonly id: M0StepId;
  readonly order: 1 | 2 | 3 | 4 | 5;
  readonly kind: M0StepKind;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M0StepId;
  readonly hints: readonly [string];
  readonly questions: readonly M0QuestionDefinition[];
}

export interface M0ChallengeDefinition {
  readonly id: "M0";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 5;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
  readonly steps: readonly M0StepDefinition[];
}

export interface M0ChoiceSubmission {
  readonly stepId: "gears" | "pulleys" | "levers";
  readonly answers: Readonly<Partial<Record<string, string>>>;
}

export interface M0NumericSubmission {
  readonly stepId: "mechanical-advantage" | "speed-torque";
  readonly answers: Readonly<Partial<Record<string, M0NumericInput>>>;
}

export type M0StepSubmission = M0ChoiceSubmission | M0NumericSubmission;

export interface M0ItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M0StepEvaluation {
  readonly stepId: M0StepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M0ItemEvaluation[];
}

const GEARS_QUESTIONS = [
  {
    id: "gears-mesh-direction",
    type: "single_choice",
    prompt:
      "Dos engranajes están en contacto directo (uno motriz y uno conducido). El motriz gira en sentido horario. ¿En qué sentido gira el conducido?",
    options: [
      { id: "gears-opposite", label: "En sentido antihorario, el sentido contrario al motriz." },
      { id: "gears-same", label: "En sentido horario, el mismo sentido que el motriz." },
      { id: "gears-depends-size", label: "Depende del tamaño relativo de los engranajes." },
    ],
    correctOptionId: "gears-opposite",
    shuffleOptions: true,
    feedback: {
      correct:
        "Dos engranajes externos en contacto directo siempre giran en sentidos opuestos: sus dientes se empujan en direcciones contrarias.",
      incorrect:
        "En un contacto directo entre dos engranajes externos, los dientes se empujan en direcciones opuestas. Piensa en cómo se traba un diente contra otro.",
    },
  },
  {
    id: "gears-idler-direction",
    type: "single_choice",
    prompt:
      "Ahora agregas un tercer engranaje intermedio (un engranaje loco) en línea entre el motriz y el conducido. ¿En qué sentido gira ahora el último engranaje conducido, respecto al motriz?",
    options: [
      { id: "idler-same", label: "En el mismo sentido que el motriz." },
      { id: "idler-opposite", label: "En sentido contrario al motriz." },
      { id: "idler-stops", label: "No gira, el engranaje loco lo bloquea." },
    ],
    correctOptionId: "idler-same",
    shuffleOptions: true,
    feedback: {
      correct:
        "Cada contacto invierte el sentido de giro. Con dos contactos (motriz→loco y loco→conducido) las dos inversiones se cancelan y el conducido queda en el mismo sentido que el motriz.",
      incorrect:
        "Cuenta los contactos: motriz→loco es una inversión, loco→conducido es otra. Dos inversiones se cancelan entre sí.",
    },
  },
  {
    id: "gears-ratio-torque",
    type: "single_choice",
    prompt:
      "Un engranaje motriz de 10 dientes mueve uno conducido de 40 dientes. Comparado con el motriz, ¿qué ocurre en el conducido?",
    options: [
      { id: "ratio-slower-more-torque", label: "Gira más lento y entrega más torque." },
      { id: "ratio-faster-less-torque", label: "Gira más rápido y entrega menos torque." },
      { id: "ratio-same", label: "Gira a la misma velocidad y con el mismo torque." },
    ],
    correctOptionId: "ratio-slower-more-torque",
    shuffleOptions: true,
    feedback: {
      correct:
        "La relación es 4:1 (40/10). El conducido, al ser más grande, gira 4 veces más lento pero con 4 veces más torque (en el caso ideal, sin pérdidas).",
      incorrect:
        "Divide los dientes del conducido entre los del motriz (40/10 = 4) y piensa qué gana un engranaje más grande: velocidad o torque.",
    },
  },
] as const satisfies readonly M0SingleChoiceQuestion[];

const PULLEYS_QUESTIONS = [
  {
    id: "pulley-fixed",
    type: "single_choice",
    prompt: "Usas una sola polea fija (anclada en un punto) para levantar una caja. ¿Qué ganas principalmente?",
    options: [
      { id: "fixed-direction-only", label: "Cambias la dirección en la que aplicas la fuerza, pero no reduces el esfuerzo." },
      { id: "fixed-half-force", label: "Reduces la fuerza necesaria a la mitad." },
      { id: "fixed-double-speed", label: "Duplicas la velocidad de subida de la caja." },
    ],
    correctOptionId: "fixed-direction-only",
    shuffleOptions: true,
    feedback: {
      correct:
        "Una polea fija simple solo redirige la fuerza (por ejemplo, de tirar hacia abajo a levantar hacia arriba); la magnitud de la fuerza necesaria no cambia.",
      incorrect:
        "Una polea fija no tiene ventaja mecánica: solo cambia la dirección en la que aplicas la fuerza.",
    },
  },
  {
    id: "pulley-movable",
    type: "single_choice",
    prompt:
      "Con una polea móvil (que se mueve junto con la carga), ¿qué ocurre con la fuerza necesaria para levantar el mismo peso, comparado con levantarlo directamente?",
    options: [
      { id: "movable-half-force-double-rope", label: "Se reduce a la mitad, pero debes tirar del doble de longitud de cuerda." },
      { id: "movable-same-force", label: "Se mantiene igual, solo cambia la dirección." },
      { id: "movable-double-force", label: "Se duplica, porque hay que mover también la polea." },
    ],
    correctOptionId: "movable-half-force-double-rope",
    shuffleOptions: true,
    feedback: {
      correct:
        "Una polea móvil da una ventaja mecánica de 2: la fuerza necesaria se reduce a la mitad, a cambio de tirar del doble de cuerda para la misma altura.",
      incorrect:
        "Piensa en cuántos tramos de cuerda sostienen la carga cuando la polea se mueve junto con ella, y qué relación hay entre fuerza y distancia recorrida.",
    },
  },
  {
    id: "pulley-block-tackle",
    type: "single_choice",
    prompt:
      "Un sistema de poleas tiene 3 tramos de cuerda sosteniendo la carga. Si la carga pesa 300 N, ¿qué fuerza aproximada debes aplicar (sin fricción)?",
    options: [
      { id: "block-100n", label: "Aproximadamente 100 N." },
      { id: "block-300n", label: "Aproximadamente 300 N." },
      { id: "block-900n", label: "Aproximadamente 900 N." },
    ],
    correctOptionId: "block-100n",
    shuffleOptions: true,
    feedback: {
      correct:
        "Con 3 tramos de cuerda soportando la carga, la fuerza se reparte entre ellos: 300 N / 3 = 100 N (caso ideal, sin fricción).",
      incorrect:
        "Divide el peso de la carga entre el número de tramos de cuerda que la sostienen.",
    },
  },
] as const satisfies readonly M0SingleChoiceQuestion[];

const LEVERS_QUESTIONS = [
  {
    id: "lever-class-one",
    type: "single_choice",
    prompt:
      "¿Cuál es la característica de una palanca de primera clase, como un balancín o unas tijeras?",
    options: [
      { id: "class-one-fulcrum-between", label: "El punto de apoyo está entre la fuerza aplicada y la carga." },
      { id: "class-one-load-between", label: "La carga está entre el punto de apoyo y la fuerza aplicada." },
      { id: "class-one-force-between", label: "La fuerza aplicada está entre el punto de apoyo y la carga." },
    ],
    correctOptionId: "class-one-fulcrum-between",
    shuffleOptions: true,
    feedback: {
      correct:
        "En una palanca de primera clase, el punto de apoyo queda en medio: a un lado la fuerza, al otro la carga.",
      incorrect:
        "Piensa en un balancín: el punto de apoyo está en el centro, entre las dos personas (fuerza y carga).",
    },
  },
  {
    id: "lever-class-two",
    type: "single_choice",
    prompt:
      "En una carretilla, el punto de apoyo (la rueda) está en un extremo y tú aplicas la fuerza en el otro extremo. ¿Dónde está la carga?",
    options: [
      { id: "class-two-load-between", label: "Entre el punto de apoyo y donde aplicas la fuerza." },
      { id: "class-two-load-outside", label: "Más allá de donde aplicas la fuerza, en el mismo extremo." },
      { id: "class-two-load-at-fulcrum", label: "Exactamente sobre el punto de apoyo." },
    ],
    correctOptionId: "class-two-load-between",
    shuffleOptions: true,
    feedback: {
      correct:
        "Es una palanca de segunda clase: la carga está entre el apoyo y la fuerza aplicada, lo que siempre da ventaja mecánica mayor a 1.",
      incorrect:
        "En una carretilla, la caja de carga va entre la rueda (apoyo) y las manijas donde aplicas la fuerza.",
    },
  },
  {
    id: "lever-longer-arm",
    type: "single_choice",
    prompt:
      "Si alargas el brazo donde aplicas la fuerza, manteniendo el mismo punto de apoyo y la misma carga, ¿qué sucede con la fuerza necesaria?",
    options: [
      { id: "longer-arm-less-force", label: "Se necesita menos fuerza para mover la misma carga." },
      { id: "longer-arm-more-force", label: "Se necesita más fuerza para mover la misma carga." },
      { id: "longer-arm-same-force", label: "La fuerza necesaria no cambia." },
    ],
    correctOptionId: "longer-arm-less-force",
    shuffleOptions: true,
    feedback: {
      correct:
        "Al alargar el brazo de la fuerza, aumenta tu ventaja mecánica: la misma carga se mueve con menos fuerza (a cambio de mover tu extremo una distancia mayor).",
      incorrect:
        "Recuerda el equilibrio de una palanca: F1 · d1 = F2 · d2. Si aumentas el brazo de la fuerza sin cambiar la carga, ¿qué debe pasar con la fuerza para mantener la igualdad?",
    },
  },
] as const satisfies readonly M0SingleChoiceQuestion[];

const MECHANICAL_ADVANTAGE_QUESTIONS = [
  {
    id: "ma-effort-force",
    type: "numeric",
    prompt: "¿Cuál es la fuerza mínima que debes aplicar para equilibrar la palanca?",
    unit: "N",
    expectedValue: 20,
    tolerance: 1,
    formula: "F1 · d1 = F2 · d2",
    placeholder: "Ej. 100",
    feedback: {
      correct: "F = (60 N × 0.2 m) / 0.6 m = 20 N.",
      incorrect:
        "Usa el equilibrio de momentos: la carga (60 N) por su brazo (0.2 m) debe igualar la fuerza aplicada por su brazo (0.6 m).",
    },
  },
  {
    id: "ma-ratio",
    type: "numeric",
    prompt: "¿Cuál es la ventaja mecánica de esta palanca (brazo de la fuerza entre brazo de la carga)?",
    unit: "",
    expectedValue: 3,
    tolerance: 0.1,
    formula: "VM = d_esfuerzo / d_carga",
    placeholder: "Ej. 1,00",
    feedback: {
      correct: "VM = 0.6 m / 0.2 m = 3. Con 1 N aplicado puedes equilibrar 3 N de carga.",
      incorrect: "Divide el brazo donde aplicas la fuerza (0.6 m) entre el brazo de la carga (0.2 m).",
    },
  },
] as const satisfies readonly M0NumericQuestion[];

const SPEED_TORQUE_QUESTIONS = [
  {
    id: "st-output-speed",
    type: "numeric",
    prompt: "¿A qué velocidad gira el eje de salida, después de una reducción 5:1?",
    unit: "rpm",
    expectedValue: 200,
    tolerance: 10,
    formula: "n_salida = n_motor / i",
    placeholder: "Ej. 100",
    feedback: {
      correct: "n_salida = 1000 rpm / 5 = 200 rpm.",
      incorrect: "Divide la velocidad del motor entre la relación de reducción (5).",
    },
  },
  {
    id: "st-output-torque",
    type: "numeric",
    prompt: "¿Qué torque entrega el eje de salida (caso ideal, sin pérdidas)?",
    unit: "N·m",
    expectedValue: 10,
    tolerance: 0.5,
    formula: "T_salida = T_motor × i",
    placeholder: "Ej. 100",
    feedback: {
      correct: "T_salida = 2 N·m × 5 = 10 N·m.",
      incorrect: "Multiplica el torque del motor por la relación de reducción (5).",
    },
  },
] as const satisfies readonly M0NumericQuestion[];

export const M0_STEPS = [
  {
    id: "gears",
    order: 1,
    kind: "choice_set",
    title: "Engranajes",
    eyebrow: "Paso 1 de 5 · Sentido y relación de dientes",
    statement:
      "Observa cómo se transmite el movimiento entre engranajes en contacto directo y decide qué ocurre con el sentido de giro, la velocidad y el torque.",
    diagram: "gears",
    hints: [
      "Cuenta cuántos contactos hay entre el engranaje motriz y el que te preguntan: cada contacto invierte el sentido de giro.",
    ],
    questions: GEARS_QUESTIONS,
  },
  {
    id: "pulleys",
    order: 2,
    kind: "choice_set",
    title: "Poleas",
    eyebrow: "Paso 2 de 5 · Ventaja mecánica",
    statement:
      "Compara una polea fija, una polea móvil y un sistema de poleas, y decide qué gana cada configuración: dirección, fuerza o ambas.",
    diagram: "pulleys",
    hints: [
      "La ventaja mecánica de un sistema de poleas depende de cuántos tramos de cuerda sostienen la carga, no del número de poleas en sí.",
    ],
    questions: PULLEYS_QUESTIONS,
  },
  {
    id: "levers",
    order: 3,
    kind: "choice_set",
    title: "Palancas",
    eyebrow: "Paso 3 de 5 · Clases y equilibrio",
    statement:
      "Identifica dónde está el punto de apoyo, la fuerza y la carga en distintas palancas, y qué ocurre al cambiar la longitud de un brazo.",
    diagram: "levers",
    hints: [
      "Ubica primero el punto de apoyo; después decide si la carga o la fuerza queda más cerca de él.",
    ],
    questions: LEVERS_QUESTIONS,
  },
  {
    id: "mechanical-advantage",
    order: 4,
    kind: "numeric_set",
    title: "Ventaja mecánica",
    eyebrow: "Paso 4 de 5 · Haz que los números cierren",
    statement:
      "Una palanca en equilibrio tiene una carga de 60 N a 0.2 m del apoyo y la fuerza se aplica a 0.6 m del apoyo. Calcula la fuerza necesaria y la ventaja mecánica.",
    diagram: "mechanical-advantage",
    hints: ["Empieza por el equilibrio de momentos: F1 · d1 = F2 · d2."],
    questions: MECHANICAL_ADVANTAGE_QUESTIONS,
  },
  {
    id: "speed-torque",
    order: 5,
    kind: "numeric_set",
    title: "Velocidad y torque",
    eyebrow: "Paso 5 de 5 · Motor y reducción",
    statement:
      "Un motor gira a 1000 rpm con 2 N·m de torque y pasa por una reducción 5:1. Calcula la velocidad y el torque a la salida (caso ideal).",
    diagram: "speed-torque",
    hints: [
      "La velocidad y el torque cambian en sentido opuesto: si uno se divide entre la relación, el otro se multiplica por ella.",
    ],
    questions: SPEED_TORQUE_QUESTIONS,
  },
] as const satisfies readonly M0StepDefinition[];

export const M0_CHALLENGE = {
  id: "M0",
  title: "Piensa como un mecanismo",
  subtitle: "Intuición mecánica: engranajes, poleas, palancas y transmisión",
  introduction:
    "Resuelve cinco minirretos sobre engranajes, poleas, palancas, ventaja mecánica y relación de velocidad/torque antes de avanzar a los siguientes retos de Mecánica.",
  totalSteps: 5,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: M0_STEPS,
} as const satisfies M0ChallengeDefinition;

export const M0_STEP_IDS = M0_STEPS.map((step) => step.id) as readonly M0StepId[];

/** FNV-1a hash followed by a Mulberry32 generator provides stable UI ordering. */
function hashSeed(seed: M0Seed): number {
  const value = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seed: M0Seed): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a new deterministically shuffled array and never mutates the input. */
export function deterministicShuffle<T>(items: readonly T[], seed: M0Seed): T[] {
  const shuffled = [...items];
  const random = createDeterministicRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

export function getM0Step(stepId: M0StepId): M0StepDefinition {
  const step = M0_STEPS.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error("Unknown M0 step: " + stepId);
  return step;
}

export function getM0ChoiceQuestion(questionId: string): M0SingleChoiceQuestion {
  for (const step of M0_STEPS) {
    const question = step.questions.find((candidate) => candidate.id === questionId);
    if (question?.type === "single_choice") return question;
  }
  throw new Error("Unknown M0 choice question: " + questionId);
}

/**
 * Keeps options stable for a candidate/attempt while still preventing answer
 * position from becoming part of the challenge.
 */
export function getDeterministicChoiceOptions(
  questionId: string,
  seed: M0Seed
): M0ChoiceOption[] {
  const question = getM0ChoiceQuestion(questionId);
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, "M0:" + questionId + ":" + String(seed));
}

/** Accepts both decimal comma and decimal point, returning null for invalid input. */
export function normalizeDecimalInput(value: M0NumericInput): number | null {
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

function evaluateSingleChoice(
  question: M0SingleChoiceQuestion,
  selectedOptionId: string | undefined
): M0ItemEvaluation {
  const isAnswered = typeof selectedOptionId === "string" && selectedOptionId.length > 0;
  const isCorrect = selectedOptionId === question.correctOptionId;

  return {
    questionId: question.id,
    isAnswered,
    isCorrect,
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
  };
}

function evaluateNumeric(
  question: M0NumericQuestion,
  rawValue: M0NumericInput | undefined
): M0ItemEvaluation {
  const isAnswered = rawValue !== undefined && String(rawValue).trim().length > 0;
  const normalized = isAnswered ? normalizeDecimalInput(rawValue as M0NumericInput) : null;
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
  stepId: M0StepId,
  items: readonly M0ItemEvaluation[],
  completeFeedback: string,
  retryFeedback: string
): M0StepEvaluation {
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

function evaluateChoiceStep(
  stepId: "gears" | "pulleys" | "levers",
  questions: readonly M0SingleChoiceQuestion[],
  submission: M0ChoiceSubmission,
  completeFeedback: string,
  retryFeedback: string
): M0StepEvaluation {
  const items = questions.map((question) =>
    evaluateSingleChoice(question, submission.answers[question.id])
  );
  return summarizeItems(stepId, items, completeFeedback, retryFeedback);
}

export function evaluateGearsStep(submission: M0ChoiceSubmission): M0StepEvaluation {
  return evaluateChoiceStep(
    "gears",
    GEARS_QUESTIONS,
    submission,
    "Resolviste correctamente los tres casos de engranajes.",
    "Todavía hay casos por revisar. Puedes ajustar tus respuestas e intentarlo otra vez."
  );
}

export function evaluatePulleysStep(submission: M0ChoiceSubmission): M0StepEvaluation {
  return evaluateChoiceStep(
    "pulleys",
    PULLEYS_QUESTIONS,
    submission,
    "Diferenciaste correctamente polea fija, polea móvil y un sistema con varios tramos.",
    "Todavía hay casos por revisar. Puedes ajustar tus respuestas e intentarlo otra vez."
  );
}

export function evaluateLeversStep(submission: M0ChoiceSubmission): M0StepEvaluation {
  return evaluateChoiceStep(
    "levers",
    LEVERS_QUESTIONS,
    submission,
    "Reconociste correctamente las clases de palanca y el efecto de alargar un brazo.",
    "Todavía hay casos por revisar. Puedes ajustar tus respuestas e intentarlo otra vez."
  );
}

function evaluateNumericStep(
  stepId: "mechanical-advantage" | "speed-torque",
  questions: readonly M0NumericQuestion[],
  submission: M0NumericSubmission,
  completeFeedback: string,
  bothIncorrectFeedback: string
): M0StepEvaluation {
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

export function evaluateMechanicalAdvantageStep(
  submission: M0NumericSubmission
): M0StepEvaluation {
  return evaluateNumericStep(
    "mechanical-advantage",
    MECHANICAL_ADVANTAGE_QUESTIONS,
    submission,
    "F = 20 N y VM = 3. Ambos resultados son consistentes entre sí.",
    "Calcula primero la fuerza con el equilibrio de momentos y usa esos mismos brazos para la ventaja mecánica."
  );
}

export function evaluateSpeedTorqueStep(submission: M0NumericSubmission): M0StepEvaluation {
  return evaluateNumericStep(
    "speed-torque",
    SPEED_TORQUE_QUESTIONS,
    submission,
    "n_salida = 200 rpm y T_salida = 10 N·m. La velocidad baja y el torque sube en la misma proporción.",
    "Usa la relación de reducción (5): divide la velocidad del motor y multiplica su torque por ese mismo número."
  );
}

export function evaluateM0Step(submission: M0StepSubmission): M0StepEvaluation {
  switch (submission.stepId) {
    case "gears":
      return evaluateGearsStep(submission);
    case "pulleys":
      return evaluatePulleysStep(submission);
    case "levers":
      return evaluateLeversStep(submission);
    case "mechanical-advantage":
      return evaluateMechanicalAdvantageStep(submission);
    case "speed-torque":
      return evaluateSpeedTorqueStep(submission);
  }
}

export function isM0Complete(completedStepIds: readonly M0StepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M0_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM0StepId(completedStepIds: readonly M0StepId[]): M0StepId | null {
  const completed = new Set(completedStepIds);
  return M0_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
