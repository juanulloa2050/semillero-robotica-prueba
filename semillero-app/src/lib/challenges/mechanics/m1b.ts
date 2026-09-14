/**
 * Pure content and evaluation engine for Mechanics M1B.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. A UI can render the definitions, persist submissions wherever
 * appropriate, and use the exported evaluators without duplicating answers.
 *
 * Unlike M0/M1A, the numbers here (and therefore the correct option) are
 * derived from the candidate's shuffle seed: the reduction ratios offered per
 * scenario stay fixed, but the motor spec and which ratio is correct vary per
 * candidate, so "the answer is 6:1" can't be shared between candidates.
 */

export type M1BStepId = "arm-lift" | "conveyor" | "winch";

export type M1BStepKind = "choice_set";
export type M1BSeed = string | number;

export interface M1BFeedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M1BChoiceOption {
  readonly id: string;
  readonly label: string;
  readonly ratio: number;
}

export interface M1BSingleChoiceQuestion {
  readonly id: string;
  readonly type: "single_choice";
  readonly prompt: string;
  readonly options: readonly M1BChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
  readonly feedback: M1BFeedback;
}

export interface M1BStepDefinition {
  readonly id: M1BStepId;
  readonly order: 1 | 2 | 3;
  readonly kind: M1BStepKind;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M1BStepId;
  readonly motorRpm: number;
  readonly motorTorque: number;
  readonly minOutputRpm: number;
  readonly minOutputTorque: number;
  readonly loadLabel: string;
  readonly hints: readonly [string, string];
  readonly questions: readonly [M1BSingleChoiceQuestion];
}

export interface M1BChallengeDefinition {
  readonly id: "M1B";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 3;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
}

export interface M1BChoiceSubmission {
  readonly stepId: M1BStepId;
  readonly answers: Readonly<Partial<Record<string, string>>>;
}

export type M1BStepSubmission = M1BChoiceSubmission;

export interface M1BItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M1BStepEvaluation {
  readonly stepId: M1BStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M1BItemEvaluation[];
}

export const M1B_CHALLENGE = {
  id: "M1B",
  title: "Cambia velocidad por fuerza",
  subtitle: "Relación de transmisión: elige la reducción adecuada",
  introduction:
    "Resuelve tres escenarios de selección de reducción: un brazo, una banda transportadora y un torno de izado. En cada uno, el motor entrega una velocidad y un torque fijos; tu trabajo es elegir la relación de reducción que cumpla los mínimos de velocidad y torque que exige la carga.",
  totalSteps: 3,
  completionRule: "all_steps",
  attempts: "unlimited",
} as const satisfies M1BChallengeDefinition;

export const M1B_STEP_IDS = ["arm-lift", "conveyor", "winch"] as const satisfies readonly M1BStepId[];

/** FNV-1a hash followed by a Mulberry32 generator provides stable, per-seed values. */
function hashSeed(seed: M1BSeed): number {
  const value = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seed: M1BSeed): () => number {
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
export function deterministicShuffle<T>(items: readonly T[], seed: M1BSeed): T[] {
  const shuffled = [...items];
  const random = createDeterministicRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

function pickFrom<T>(pool: readonly T[], random: () => number): T {
  return pool[Math.floor(random() * pool.length)];
}

interface GeneratedScenario {
  readonly motorRpm: number;
  readonly motorTorque: number;
  readonly correctOptionIndex: number;
  readonly correctRatio: number;
  /** n_salida = n_motor / i at the correct ratio: the exact speed floor. */
  readonly minOutputRpm: number;
  /** T_salida = T_motor * i at the correct ratio: the exact torque floor. */
  readonly minOutputTorque: number;
}

/**
 * Derives the scenario's numbers from the seed, then sets the two minimums to
 * exactly what the chosen ratio produces. Because output speed strictly
 * decreases and output torque strictly increases as the ratio grows, every
 * smaller ratio in the ladder then fails the torque minimum and every larger
 * ratio fails the speed minimum - so exactly one option ever qualifies,
 * whichever one was picked.
 */
function generateScenario(
  stepId: M1BStepId,
  seed: M1BSeed,
  optionRatios: readonly [number, number, number, number],
  motorRpmPool: readonly number[],
  motorTorquePool: readonly number[]
): GeneratedScenario {
  const random = createDeterministicRandom(`M1B:scenario:${stepId}:${String(seed)}`);
  const motorRpm = pickFrom(motorRpmPool, random);
  const motorTorque = pickFrom(motorTorquePool, random);
  const correctOptionIndex = Math.floor(random() * optionRatios.length);
  const correctRatio = optionRatios[correctOptionIndex];

  return {
    motorRpm,
    motorTorque,
    correctOptionIndex,
    correctRatio,
    minOutputRpm: round1(motorRpm / correctRatio),
    minOutputTorque: round1(motorTorque * correctRatio),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

interface ScenarioTemplate {
  readonly id: M1BStepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly loadLabel: string;
  readonly optionRatios: readonly [number, number, number, number];
  readonly optionIdPrefix: string;
  readonly motorRpmPool: readonly number[];
  readonly motorTorquePool: readonly number[];
  readonly loadNoun: string;
  readonly failureNote: string;
}

const TEMPLATES: Readonly<Record<M1BStepId, ScenarioTemplate>> = {
  "arm-lift": {
    id: "arm-lift",
    order: 1,
    title: "Brazo que levanta una carga",
    eyebrow: "Paso 1 de 3 · Elige la reducción",
    loadLabel: "Brazo",
    optionRatios: [3, 6, 8, 12],
    optionIdPrefix: "arm",
    motorRpmPool: [2400, 3000, 3600, 4800],
    motorTorquePool: [0.6, 0.8, 1.0, 1.2],
    loadNoun: "el brazo",
    failureNote: "levantar la carga",
  },
  conveyor: {
    id: "conveyor",
    order: 2,
    title: "Banda transportadora",
    eyebrow: "Paso 2 de 3 · Balancea velocidad y torque",
    loadLabel: "Banda",
    optionRatios: [5, 10, 15, 20],
    optionIdPrefix: "conv",
    motorRpmPool: [1200, 1800, 2400, 3000],
    motorTorquePool: [0.9, 1.2, 1.5, 1.8],
    loadNoun: "la banda",
    failureNote: "mover la carga sin patinar",
  },
  winch: {
    id: "winch",
    order: 3,
    title: "Torno de izado",
    eyebrow: "Paso 3 de 3 · Verifica ambos mínimos",
    loadLabel: "Torno",
    optionRatios: [10, 15, 20, 30],
    optionIdPrefix: "winch",
    motorRpmPool: [3000, 4500, 6000, 7500],
    motorTorquePool: [0.3, 0.4, 0.5, 0.6],
    loadNoun: "el torno",
    failureNote: "izar la carga",
  },
};

function buildOptions(template: ScenarioTemplate): M1BChoiceOption[] {
  return template.optionRatios.map((ratio) => ({
    id: `${template.optionIdPrefix}-${ratio}`,
    label: `Reducción ${ratio}:1`,
    ratio,
  }));
}

/** Generates this step's scenario (motor spec, minimums, correct ratio) for one candidate seed. */
export function generateM1BStep(stepId: M1BStepId, seed: M1BSeed): M1BStepDefinition {
  const template = TEMPLATES[stepId];
  const scenario = generateScenario(
    stepId,
    seed,
    template.optionRatios,
    template.motorRpmPool,
    template.motorTorquePool
  );
  const options = buildOptions(template);
  const correctOptionId = options[scenario.correctOptionIndex].id;
  const motorRpm = formatNum(scenario.motorRpm);
  const motorTorque = formatNum(scenario.motorTorque);
  const minRpm = formatNum(scenario.minOutputRpm);
  const minTorque = formatNum(scenario.minOutputTorque);

  const question: M1BSingleChoiceQuestion = {
    id: `${stepId}-ratio`,
    type: "single_choice",
    prompt: "¿Qué relación de reducción eligirías?",
    options,
    correctOptionId,
    shuffleOptions: true,
    feedback: {
      correct: `Con ${scenario.correctRatio}:1 obtienes ${minRpm} rpm y ${minTorque} N·m: cumple los dos mínimos sin sobredimensionar la reducción.`,
      incorrect: `Calcula n_salida = n_motor / i y T_salida = T_motor × i para cada opción, y descarta las que no cumplan alguno de los dos mínimos (${minRpm} rpm y ${minTorque} N·m).`,
    },
  };

  return {
    id: stepId,
    order: template.order,
    kind: "choice_set",
    title: template.title,
    eyebrow: template.eyebrow,
    statement: `Un motor gira a ${motorRpm} rpm con ${motorTorque} N·m. ${capitalize(template.loadNoun)} necesita al menos ${minRpm} rpm en el eje de salida y al menos ${minTorque} N·m de torque para ${template.failureNote}. Elige la reducción adecuada.`,
    diagram: stepId,
    motorRpm: scenario.motorRpm,
    motorTorque: scenario.motorTorque,
    minOutputRpm: scenario.minOutputRpm,
    minOutputTorque: scenario.minOutputTorque,
    loadLabel: template.loadLabel,
    hints: [
      `Divide ${motorRpm} rpm entre cada relación para la velocidad de salida, y multiplica ${motorTorque} N·m por la misma relación para el torque de salida.`,
      `Descarta las reducciones donde la velocidad caiga por debajo de ${minRpm} rpm o el torque quede por debajo de ${minTorque} N·m; de las que sobran, la más pequeña es la mejor opción.`,
    ],
    questions: [question],
  };
}

/** Generates the full, seed-specific set of M1B steps for one candidate. */
export function generateM1BSteps(seed: M1BSeed): M1BStepDefinition[] {
  return M1B_STEP_IDS.map((stepId) => generateM1BStep(stepId, seed));
}

/** Titles don't depend on the seed, so callers that only need a label (e.g.
 * an aria-live announcement) don't need to generate the full step. */
export function getM1BStepTitle(stepId: M1BStepId): string {
  return TEMPLATES[stepId].title;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Keeps options stable for a candidate/attempt while still preventing answer
 * position from becoming part of the challenge.
 */
export function getDeterministicChoiceOptions(
  step: M1BStepDefinition,
  seed: M1BSeed
): M1BChoiceOption[] {
  const question = step.questions[0];
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, "M1B:" + question.id + ":" + String(seed));
}

function evaluateSingleChoice(
  question: M1BSingleChoiceQuestion,
  selectedOptionId: string | undefined
): M1BItemEvaluation {
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

function summarizeItems(
  stepId: M1BStepId,
  items: readonly M1BItemEvaluation[],
  completeFeedback: string,
  retryFeedback: string
): M1BStepEvaluation {
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

const COMPLETE_FEEDBACK: Readonly<Record<M1BStepId, string>> = {
  "arm-lift": "Elegiste la reducción que cumple los dos mínimos sin sobredimensionar.",
  conveyor: "Elegiste la reducción que balancea velocidad y torque para la banda.",
  winch: "Elegiste la reducción que cumple los dos mínimos del torno.",
};

/**
 * Evaluates a submission against the step definition it was generated
 * against (produced by `generateM1BStep`/`generateM1BSteps` for the same
 * seed the candidate saw), since the correct option is seed-dependent.
 */
export function evaluateM1BStep(
  step: M1BStepDefinition,
  submission: M1BStepSubmission
): M1BStepEvaluation {
  const question = step.questions[0];
  const items = [evaluateSingleChoice(question, submission.answers[question.id])];
  return summarizeItems(
    step.id,
    items,
    COMPLETE_FEEDBACK[step.id],
    "Todavía no es la reducción correcta. Puedes ajustar tu respuesta e intentarlo otra vez."
  );
}

export function isM1BComplete(completedStepIds: readonly M1BStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M1B_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM1BStepId(completedStepIds: readonly M1BStepId[]): M1BStepId | null {
  const completed = new Set(completedStepIds);
  return M1B_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
