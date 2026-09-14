/**
 * Pure content and evaluation engine for Mechanics M2.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. Each step mixes guided numeric sub-questions (torque, target
 * speed, torque with safety margin) with a final single-choice question
 * (pick the motor/reduction that satisfies both). Like M1B, the scenario
 * numbers - and therefore every correct answer - are derived from the
 * candidate's shuffle seed, so answers can't be shared between candidates.
 */

export type M2StepId = "arm" | "gate" | "lift";
export type M2Seed = string | number;
export type M2NumericInput = string | number;

export interface M2Feedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M2NumericQuestion {
  readonly id: string;
  readonly type: "numeric";
  readonly prompt: string;
  readonly unit: string;
  readonly expectedValue: number;
  readonly tolerance: number;
  readonly formula: string;
  readonly placeholder: string;
  readonly feedback: M2Feedback;
}

export interface M2ChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface M2SingleChoiceQuestion {
  readonly id: string;
  readonly type: "single_choice";
  readonly prompt: string;
  readonly options: readonly M2ChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
  readonly feedback: M2Feedback;
}

export type M2QuestionDefinition = M2NumericQuestion | M2SingleChoiceQuestion;

export interface M2StepDefinition {
  readonly id: M2StepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M2StepId;
  readonly mass: number;
  readonly leverArm: number;
  readonly seconds: number;
  readonly loadLabel: string;
  readonly hints: readonly [string, string];
  readonly questions: readonly [
    M2NumericQuestion,
    M2NumericQuestion,
    M2NumericQuestion,
    M2SingleChoiceQuestion,
  ];
}

export interface M2ChallengeDefinition {
  readonly id: "M2";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 3;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
}

export interface M2StepSubmission {
  readonly stepId: M2StepId;
  readonly answers: Readonly<Partial<Record<string, M2NumericInput>>>;
}

export interface M2ItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M2StepEvaluation {
  readonly stepId: M2StepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M2ItemEvaluation[];
}

export const M2_CHALLENGE = {
  id: "M2",
  title: "Elige el actuador correcto",
  subtitle: "Dimensionamiento: de la carga al motor",
  introduction:
    "Resuelve tres escenarios de dimensionamiento: un brazo articulado, una puerta automática y una plataforma elevadora. En cada uno, calcula el torque necesario, la velocidad de salida requerida y el torque de diseño con margen de seguridad, y elige el motor que cumple ambos requisitos.",
  totalSteps: 3,
  completionRule: "all_steps",
  attempts: "unlimited",
} as const satisfies M2ChallengeDefinition;

export const M2_STEP_IDS = ["arm", "gate", "lift"] as const satisfies readonly M2StepId[];

const SAFETY_MARGIN = 1.5;
const GRAVITY = 10;

function hashSeed(seed: M2Seed): number {
  const value = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed: M2Seed): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(items: readonly T[], seed: M2Seed): T[] {
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

interface ScenarioTemplate {
  readonly id: M2StepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly loadLabel: string;
  readonly loadNoun: string;
  readonly failureNote: string;
  readonly massPool: readonly number[];
  readonly leverPool: readonly number[];
  readonly secondsPool: readonly number[];
}

const TEMPLATES: Readonly<Record<M2StepId, ScenarioTemplate>> = {
  arm: {
    id: "arm",
    order: 1,
    title: "Brazo articulado",
    eyebrow: "Paso 1 de 3 · De la carga al motor",
    loadLabel: "Brazo",
    loadNoun: "el brazo",
    failureNote: "sostener la carga en el extremo",
    massPool: [1, 2, 3, 4],
    leverPool: [0.2, 0.25, 0.3, 0.5],
    secondsPool: [0.5, 1, 1.5, 3],
  },
  gate: {
    id: "gate",
    order: 2,
    title: "Puerta automática",
    eyebrow: "Paso 2 de 3 · Repite el cálculo completo",
    loadLabel: "Puerta",
    loadNoun: "la puerta",
    failureNote: "abrir la puerta",
    massPool: [2, 3, 4, 4],
    leverPool: [0.2, 0.25, 0.3, 0.4],
    secondsPool: [0.5, 1, 1.5, 3],
  },
  lift: {
    id: "lift",
    order: 3,
    title: "Plataforma elevadora",
    eyebrow: "Paso 3 de 3 · Verifica tu propio margen",
    loadLabel: "Plataforma",
    loadNoun: "la plataforma",
    failureNote: "levantar la plataforma",
    massPool: [1, 2, 3, 4],
    leverPool: [0.2, 0.3, 0.4, 0.5],
    secondsPool: [0.5, 1, 1.5, 3],
  },
};

interface GeneratedScenario {
  readonly mass: number;
  readonly leverArm: number;
  readonly seconds: number;
  readonly requiredTorque: number;
  readonly requiredRpm: number;
  readonly designTorque: number;
  readonly correctMotorRpm: number;
  readonly correctMotorTorque: number;
}

function generateScenario(stepId: M2StepId, seed: M2Seed): GeneratedScenario {
  const template = TEMPLATES[stepId];
  const random = createDeterministicRandom(`M2:scenario:${stepId}:${String(seed)}`);
  const mass = pickFrom(template.massPool, random);
  const leverArm = pickFrom(template.leverPool, random);
  const seconds = pickFrom(template.secondsPool, random);

  const requiredTorque = round1(mass * GRAVITY * leverArm);
  // A quarter turn (90°) swept in `seconds`, expressed directly in rpm.
  const requiredRpm = round1(15 / seconds);
  const designTorque = round1(requiredTorque * SAFETY_MARGIN);

  return {
    mass,
    leverArm,
    seconds,
    requiredTorque,
    requiredRpm,
    designTorque,
    correctMotorRpm: Math.round(requiredRpm * 1.2),
    correctMotorTorque: round1(designTorque * 1.2),
  };
}

function buildMotorOptions(
  stepId: M2StepId,
  scenario: GeneratedScenario
): { options: M2ChoiceOption[]; correctOptionId: string } {
  const { requiredRpm, designTorque, correctMotorRpm, correctMotorTorque } = scenario;
  const candidates: { key: string; rpm: number; torque: number }[] = [
    { key: "correct", rpm: correctMotorRpm, torque: correctMotorTorque },
    { key: "fast", rpm: Math.round(requiredRpm * 1.8), torque: round1(designTorque * 0.7) },
    { key: "strong", rpm: Math.round(requiredRpm * 0.6), torque: round1(designTorque * 1.6) },
    { key: "weak", rpm: Math.round(requiredRpm * 0.7), torque: round1(designTorque * 0.6) },
  ];
  // Sort by rpm so the option order in the source data isn't itself a clue;
  // the visible order is re-shuffled per candidate on top of this anyway.
  candidates.sort((left, right) => left.rpm - right.rpm);

  const options = candidates.map((candidate, index) => ({
    id: `${stepId}-motor-${index}`,
    label: `Motor ${String.fromCharCode(65 + index)}: ${formatNum(candidate.rpm)} rpm, ${formatNum(candidate.torque)} N·m`,
  }));
  const correctIndex = candidates.findIndex((candidate) => candidate.key === "correct");

  return { options, correctOptionId: options[correctIndex].id };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function generateM2Step(stepId: M2StepId, seed: M2Seed): M2StepDefinition {
  const template = TEMPLATES[stepId];
  const scenario = generateScenario(stepId, seed);
  const mass = formatNum(scenario.mass);
  const leverArm = formatNum(scenario.leverArm);
  const seconds = formatNum(scenario.seconds);
  const requiredTorque = formatNum(scenario.requiredTorque);
  const requiredRpm = formatNum(scenario.requiredRpm);
  const designTorque = formatNum(scenario.designTorque);
  const { options, correctOptionId } = buildMotorOptions(stepId, scenario);

  const torqueQuestion: M2NumericQuestion = {
    id: `${stepId}-torque`,
    type: "numeric",
    prompt: `¿Cuál es el torque necesario para ${template.failureNote}?`,
    unit: "N·m",
    expectedValue: scenario.requiredTorque,
    tolerance: 0.3,
    formula: "T = m · g · d  (usa g = 10 m/s²)",
    placeholder: "Ej. 100",
    feedback: {
      correct: `T = ${mass} kg × 10 m/s² × ${leverArm} m = ${requiredTorque} N·m.`,
      incorrect: `Multiplica la masa (${mass} kg) por la gravedad (10 m/s²) y por el brazo de palanca (${leverArm} m).`,
    },
  };

  const speedQuestion: M2NumericQuestion = {
    id: `${stepId}-speed`,
    type: "numeric",
    prompt: `${capitalize(template.loadNoun)} debe girar un cuarto de vuelta (90°) en ${seconds} s. ¿A qué velocidad mínima de salida, en rpm, corresponde eso?`,
    unit: "rpm",
    expectedValue: scenario.requiredRpm,
    tolerance: 1,
    formula: "n = (90° / 360°) · 60 / t",
    placeholder: "Ej. 100",
    feedback: {
      correct: `n = (1/4 vuelta) × 60 s / ${seconds} s = ${requiredRpm} rpm.`,
      incorrect: `Un cuarto de vuelta son 60/4 = 15 "grados-minuto"; divide eso entre el tiempo (${seconds} s) para obtener las rpm mínimas.`,
    },
  };

  const marginQuestion: M2NumericQuestion = {
    id: `${stepId}-margin`,
    type: "numeric",
    prompt: `Aplicando un factor de seguridad de ${SAFETY_MARGIN}, ¿cuál es el torque de diseño?`,
    unit: "N·m",
    expectedValue: scenario.designTorque,
    tolerance: 0.5,
    formula: `T_diseño = T_necesario × ${SAFETY_MARGIN}`,
    placeholder: "Ej. 100",
    feedback: {
      correct: `T_diseño = ${requiredTorque} N·m × ${SAFETY_MARGIN} = ${designTorque} N·m.`,
      incorrect: `Multiplica el torque necesario (${requiredTorque} N·m) por el factor de seguridad (${SAFETY_MARGIN}).`,
    },
  };

  const motorQuestion: M2SingleChoiceQuestion = {
    id: `${stepId}-motor`,
    type: "single_choice",
    prompt: `Con esos dos mínimos (${requiredRpm} rpm y ${designTorque} N·m de diseño), ¿qué motor elegirías?`,
    options,
    correctOptionId,
    shuffleOptions: true,
    feedback: {
      correct: `Ese motor cumple los dos mínimos (${requiredRpm} rpm y ${designTorque} N·m) sin sobredimensionar.`,
      incorrect: `Compara cada motor contra tus dos mínimos: necesitas al menos ${requiredRpm} rpm Y al menos ${designTorque} N·m de torque de diseño, al mismo tiempo.`,
    },
  };

  return {
    id: stepId,
    order: template.order,
    title: template.title,
    eyebrow: template.eyebrow,
    statement: `${capitalize(template.loadNoun)} tiene una masa de ${mass} kg y el punto de aplicación de la fuerza queda a ${leverArm} m del eje de giro. ${capitalize(template.loadNoun)} debe completar un cuarto de vuelta en ${seconds} s. Calcula el torque necesario, la velocidad de salida y el torque de diseño; luego elige el motor adecuado.`,
    diagram: stepId,
    mass: scenario.mass,
    leverArm: scenario.leverArm,
    seconds: scenario.seconds,
    loadLabel: template.loadLabel,
    hints: [
      "El torque para sostener la carga es T = m · g · d. La velocidad de salida sale de cuánto ángulo debe girar el eje entre cuánto tiempo tiene para hacerlo.",
      `Primero calcula el torque necesario y la velocidad mínima por separado; multiplica el torque por ${SAFETY_MARGIN} para el torque de diseño, y solo entonces compara cada motor contra los dos mínimos (rpm y N·m de diseño) a la vez.`,
    ],
    questions: [torqueQuestion, speedQuestion, marginQuestion, motorQuestion],
  };
}

export function generateM2Steps(seed: M2Seed): M2StepDefinition[] {
  return M2_STEP_IDS.map((stepId) => generateM2Step(stepId, seed));
}

export function getM2StepTitle(stepId: M2StepId): string {
  return TEMPLATES[stepId].title;
}

export function getDeterministicChoiceOptions(
  question: M2SingleChoiceQuestion,
  stepId: M2StepId,
  seed: M2Seed
): M2ChoiceOption[] {
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, `M2:${stepId}:${question.id}:${String(seed)}`);
}

/** Accepts both decimal comma and decimal point, returning null for invalid input. */
export function normalizeDecimalInput(value: M2NumericInput): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isWithinTolerance(actual: number | null, expected: number, tolerance: number): boolean {
  return actual !== null && Math.abs(actual - expected) <= tolerance + Number.EPSILON;
}

function evaluateQuestion(
  question: M2QuestionDefinition,
  rawValue: M2NumericInput | undefined
): M2ItemEvaluation {
  if (question.type === "numeric") {
    const isAnswered = rawValue !== undefined && String(rawValue).trim().length > 0;
    const normalized = isAnswered ? normalizeDecimalInput(rawValue as M2NumericInput) : null;
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

export function evaluateM2Step(
  step: M2StepDefinition,
  submission: M2StepSubmission
): M2StepEvaluation {
  const items = step.questions.map((question) => evaluateQuestion(question, submission.answers[question.id]));
  const score = items.reduce((total, item) => total + item.score, 0);
  const maxScore = items.reduce((total, item) => total + item.maxScore, 0);
  const isComplete = score === maxScore;
  const firstIncorrect = items.find((item) => !item.isCorrect);

  return {
    stepId: step.id,
    isComplete,
    score,
    maxScore,
    feedback: isComplete
      ? "Cálculo completo: el motor elegido cumple los dos mínimos que calculaste."
      : (firstIncorrect?.feedback ?? "Revisa tus cálculos e inténtalo de nuevo."),
    items,
  };
}

export function isM2Complete(completedStepIds: readonly M2StepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M2_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM2StepId(completedStepIds: readonly M2StepId[]): M2StepId | null {
  const completed = new Set(completedStepIds);
  return M2_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
