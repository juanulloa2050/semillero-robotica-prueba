/**
 * Pure content and evaluation engine for Electronics E0.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. A UI can render the definitions, persist submissions wherever
 * appropriate, and use the exported evaluators without duplicating answers.
 */

export type E0StepId =
  | "voltage"
  | "current"
  | "polarity"
  | "ohm-power"
  | "symbols";

export type E0StepKind = "choice_set" | "mixed_choice" | "numeric_set" | "matching";
export type E0QuestionType = "single_choice" | "multiple_choice" | "numeric" | "matching";
export type E0Seed = string | number;
export type E0NumericInput = string | number;
export type E0CurrentUnit = "A" | "mA";
export type E0PowerUnit = "W" | "mW";
export type E0NumericUnit = E0CurrentUnit | E0PowerUnit;

export type E0VoltageQuestionId =
  | "voltage-led"
  | "voltage-motor"
  | "voltage-sensor";

export type E0CurrentQuestionId =
  | "current-source-capacity"
  | "current-overload";

export type E0PolarityQuestionId =
  | "polarity-components"
  | "polarity-inverted-led";

export type E0OhmPowerQuestionId = "ohm-current" | "ohm-power";

export type E0SymbolId =
  | "resistor"
  | "led"
  | "switch"
  | "dc-source"
  | "ground"
  | "dc-motor"
  | "microcontroller"
  | "sensor"
  | "polarized-capacitor";

export interface E0Feedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface E0ChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface E0AssetDefinition {
  readonly sourceFilename: string;
  readonly src: string;
  readonly fallbackSrc?: string;
  readonly availability: "provided" | "pending";
  readonly alt: string;
  readonly fallbackDescription?: string;
}

interface E0QuestionBase {
  readonly id: string;
  readonly type: E0QuestionType;
  readonly prompt: string;
  readonly feedback: E0Feedback;
}

export interface E0SingleChoiceQuestion extends E0QuestionBase {
  readonly type: "single_choice";
  readonly options: readonly E0ChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
  readonly analytics?: {
    readonly misconceptionOptionId: string;
    readonly misconceptionKey: string;
    readonly correctionKey: string;
  };
}

export interface E0MultipleChoiceQuestion extends E0QuestionBase {
  readonly type: "multiple_choice";
  readonly options: readonly E0ChoiceOption[];
  readonly correctOptionIds: readonly string[];
  readonly shuffleOptions: boolean;
}

export interface E0NumericQuestion extends E0QuestionBase {
  readonly type: "numeric";
  readonly quantity: "current" | "power";
  readonly acceptedUnits: readonly E0NumericUnit[];
  readonly baseUnit: "A" | "W";
  readonly expectedBaseValue: number;
  readonly toleranceBaseValue: number;
  readonly formula: string;
}

export interface E0MatchingPair {
  readonly symbolId: E0SymbolId;
  readonly labelId: E0SymbolId;
  readonly label: string;
  readonly visualDescription: string;
}

export interface E0MatchingQuestion extends E0QuestionBase {
  readonly type: "matching";
  readonly pairs: readonly E0MatchingPair[];
  readonly scoring: {
    readonly firstAttemptMinimum: number;
    readonly retryMinimum: number;
  };
}

export type E0QuestionDefinition =
  | E0SingleChoiceQuestion
  | E0MultipleChoiceQuestion
  | E0NumericQuestion
  | E0MatchingQuestion;

export interface E0StepDefinition {
  readonly id: E0StepId;
  readonly order: 1 | 2 | 3 | 4 | 5;
  readonly kind: E0StepKind;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly asset: E0AssetDefinition;
  readonly hints: readonly [string];
  readonly questions: readonly E0QuestionDefinition[];
}

export interface E0ChallengeDefinition {
  readonly id: "E0";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 5;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
  readonly steps: readonly E0StepDefinition[];
}

export interface E0NumericAnswer<U extends E0NumericUnit> {
  readonly value: E0NumericInput;
  readonly unit: U;
}

export interface E0VoltageSubmission {
  readonly stepId: "voltage";
  readonly answers: Readonly<Partial<Record<E0VoltageQuestionId, string>>>;
}

export interface E0CurrentSubmission {
  readonly stepId: "current";
  readonly answers: Readonly<Partial<Record<E0CurrentQuestionId, string>>>;
}

export interface E0PolaritySubmission {
  readonly stepId: "polarity";
  readonly sensitiveComponentIds: readonly string[];
  readonly invertedLedOptionId?: string;
}

export interface E0OhmPowerSubmission {
  readonly stepId: "ohm-power";
  readonly current?: E0NumericAnswer<E0CurrentUnit>;
  readonly power?: E0NumericAnswer<E0PowerUnit>;
}

export interface E0SymbolsSubmission {
  readonly stepId: "symbols";
  readonly attemptNumber: number;
  readonly matches: Readonly<Partial<Record<E0SymbolId, E0SymbolId>>>;
}

export type E0StepSubmission =
  | E0VoltageSubmission
  | E0CurrentSubmission
  | E0PolaritySubmission
  | E0OhmPowerSubmission
  | E0SymbolsSubmission;

export interface E0ItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export type E0EvaluationMetadata = Readonly<
  Record<string, boolean | number | string>
>;

export interface E0StepEvaluation {
  readonly stepId: E0StepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly E0ItemEvaluation[];
  readonly metadata?: E0EvaluationMetadata;
}

const VOLTAGE_QUESTIONS = [
  {
    id: "voltage-led",
    type: "single_choice",
    prompt:
      "Un LED con una caída directa aproximada de 2 V se conecta directamente a una fuente de 5 V, sin resistencia ni limitador de corriente. ¿Qué es lo más probable?",
    options: [
      {
        id: "led-excess-current",
        label: "Puede circular demasiada corriente y el LED puede dañarse.",
      },
      {
        id: "led-self-regulates-voltage",
        label: "Funcionará normalmente porque el LED solo tomará los 2 V que necesita.",
      },
      {
        id: "led-voltage-too-low",
        label: "No encenderá porque la fuente entrega un voltaje demasiado bajo.",
      },
    ],
    correctOptionId: "led-excess-current",
    shuffleOptions: true,
    feedback: {
      correct:
        "Un LED no debe conectarse a 5 V sin limitar corriente. Su caída directa no reemplaza una resistencia o un driver.",
      incorrect:
        "La caída directa no evita por sí sola el exceso de corriente. Revisa cómo se limita la corriente del LED.",
    },
  },
  {
    id: "voltage-motor",
    type: "single_choice",
    prompt: "Un motor nominal de 12 V se alimenta con 3 V. ¿Qué es lo más probable?",
    options: [
      {
        id: "motor-weak-or-stalled",
        label: "Puede no arrancar o girar débilmente, con poco torque.",
      },
      {
        id: "motor-normal-performance",
        label: "Funcionará a su velocidad y torque nominales.",
      },
      {
        id: "motor-overvoltage-damage",
        label: "Se dañará inmediatamente por sobretensión.",
      },
    ],
    correctOptionId: "motor-weak-or-stalled",
    shuffleOptions: true,
    feedback: {
      correct:
        "3 V están muy por debajo de los 12 V nominales; el motor puede no vencer el arranque y entregará menos torque.",
      incorrect:
        "Compara 3 V con los 12 V nominales y piensa qué ocurre con el arranque y el torque.",
    },
  },
  {
    id: "voltage-sensor",
    type: "single_choice",
    prompt:
      "Un sensor admite como máximo 3.3 V y se alimenta con 12 V. ¿Es una alimentación segura?",
    options: [
      {
        id: "sensor-unsafe-overvoltage",
        label: "No. Superar ampliamente el máximo puede dañarlo de forma permanente.",
      },
      {
        id: "sensor-self-regulates-voltage",
        label: "Sí. El sensor solo tomará los 3.3 V que necesita.",
      },
      {
        id: "sensor-safe-with-current-capacity",
        label: "Sí, siempre que la fuente tenga suficiente capacidad de corriente.",
      },
    ],
    correctOptionId: "sensor-unsafe-overvoltage",
    shuffleOptions: true,
    feedback: {
      correct:
        "12 V superan ampliamente el máximo de 3.3 V y pueden destruir la entrada o la alimentación del sensor.",
      incorrect:
        "El voltaje máximo es un límite de seguridad; el sensor no reduce automáticamente 12 V a 3.3 V.",
    },
  },
] as const satisfies readonly E0SingleChoiceQuestion[];

const CURRENT_QUESTIONS = [
  {
    id: "current-source-capacity",
    type: "single_choice",
    prompt:
      "Una fuente de 5 V puede entregar hasta 2 A y la carga consume 300 mA a 5 V. ¿Qué ocurre?",
    options: [
      {
        id: "load-draws-300ma",
        label:
          "La carga demanda aproximadamente 300 mA; 2 A es la capacidad máxima disponible.",
      },
      {
        id: "source-forces-2a",
        label: "La fuente obliga a circular 2 A por la carga.",
      },
      {
        id: "no-current-below-maximum",
        label: "No circula corriente porque la carga necesita menos que el máximo.",
      },
    ],
    correctOptionId: "load-draws-300ma",
    shuffleOptions: true,
    analytics: {
      misconceptionOptionId: "source-forces-2a",
      misconceptionKey: "currentSourceMisconception",
      correctionKey: "misconceptionCorrected",
    },
    feedback: {
      correct:
        "Con el voltaje correcto, la carga determina su consumo. Los 2 A representan margen, no una corriente obligatoria.",
      incorrect:
        "La etiqueta de 2 A indica el máximo que la fuente puede suministrar, no lo que inyecta siempre.",
    },
  },
  {
    id: "current-overload",
    type: "single_choice",
    prompt:
      "Un conjunto de servos puede demandar 4 A, pero el regulador soporta máximo 1 A. ¿Qué escenario es más probable?",
    options: [
      {
        id: "rail-sag-heat-resets",
        label:
          "Caída de tensión, calentamiento o protección del regulador y reinicios o movimiento inestable.",
      },
      {
        id: "regulator-auto-upgrades",
        label:
          "Funcionamiento normal; el regulador aumenta automáticamente su capacidad a 4 A.",
      },
      {
        id: "silent-one-amp-limit",
        label: "Los servos reciben exactamente 1 A sin ningún otro síntoma.",
      },
    ],
    correctOptionId: "rail-sag-heat-resets",
    shuffleOptions: true,
    feedback: {
      correct:
        "La demanda supera la capacidad; el rail puede caer, el regulador limitarse o calentarse y el sistema reiniciarse.",
      incorrect:
        "Compara los 4 A demandados con el límite de 1 A y piensa qué ocurre con el voltaje al sobrecargar una fuente.",
    },
  },
] as const satisfies readonly E0SingleChoiceQuestion[];

const POLARITY_QUESTIONS = [
  {
    id: "polarity-components",
    type: "multiple_choice",
    prompt:
      "Selecciona todos los componentes en los que invertir terminales cambia el comportamiento o puede causar daño.",
    options: [
      { id: "led", label: "LED" },
      { id: "battery", label: "Batería" },
      { id: "electrolytic-capacitor", label: "Capacitor electrolítico" },
      { id: "common-resistor", label: "Resistencia común" },
    ],
    correctOptionIds: ["led", "battery", "electrolytic-capacitor"],
    shuffleOptions: false,
    feedback: {
      correct:
        "LED, batería y capacitor electrolítico tienen polaridad. Una resistencia común funciona igual en ambos sentidos.",
      incorrect:
        "Busca marcas +/− o nombres como ánodo y cátodo, y revisa si una resistencia común tiene orientación.",
    },
  },
  {
    id: "polarity-inverted-led",
    type: "single_choice",
    prompt:
      "Si conectas un LED con ánodo y cátodo invertidos en un circuito de baja tensión, ¿qué esperas?",
    options: [
      {
        id: "led-reverse-biased-off",
        label:
          "Normalmente no enciende porque queda polarizado en inversa; un voltaje inverso alto también puede dañarlo.",
      },
      {
        id: "led-works-both-directions",
        label: "Enciende igual porque los LED no tienen polaridad.",
      },
      {
        id: "led-double-brightness",
        label: "Brilla el doble porque la corriente circula al revés.",
      },
    ],
    correctOptionId: "led-reverse-biased-off",
    shuffleOptions: true,
    feedback: {
      correct:
        "Al invertir ánodo y cátodo, el LED normalmente bloquea la corriente y no enciende.",
      incorrect: "Un LED es un diodo: la orientación determina si puede conducir.",
    },
  },
] as const satisfies readonly (
  | E0MultipleChoiceQuestion
  | E0SingleChoiceQuestion
)[];

const OHM_POWER_QUESTIONS = [
  {
    id: "ohm-current",
    type: "numeric",
    quantity: "current",
    prompt: "¿Qué corriente circula por la resistencia?",
    acceptedUnits: ["A", "mA"],
    baseUnit: "A",
    expectedBaseValue: 0.05,
    toleranceBaseValue: 0.005,
    formula: "I = V / R",
    feedback: {
      correct: "I = 0.05 A, equivalente a 50 mA.",
      incorrect:
        "Revisa la Ley de Ohm y la unidad: I = V/R. Si respondes en mA, convierte desde amperios.",
    },
  },
  {
    id: "ohm-power",
    type: "numeric",
    quantity: "power",
    prompt: "¿Qué potencia disipa la resistencia?",
    acceptedUnits: ["W", "mW"],
    baseUnit: "W",
    expectedBaseValue: 0.25,
    toleranceBaseValue: 0.03,
    formula: "P = V × I = V² / R",
    feedback: {
      correct: "P = 0.25 W, equivalente a 250 mW.",
      incorrect:
        "Revisa P = V·I o P = V²/R y confirma si expresaste el resultado en W o mW.",
    },
  },
] as const satisfies readonly E0NumericQuestion[];

const SYMBOL_MATCHING_QUESTION = {
  id: "symbol-matching",
  type: "matching",
  prompt: "Relaciona cada símbolo con el componente o concepto que representa.",
  pairs: [
    {
      symbolId: "resistor",
      labelId: "resistor",
      label: "Resistencia",
      visualDescription: "Línea en zigzag entre dos terminales.",
    },
    {
      symbolId: "led",
      labelId: "led",
      label: "LED",
      visualDescription: "Diodo acompañado por dos flechas que salen de él.",
    },
    {
      symbolId: "switch",
      labelId: "switch",
      label: "Interruptor",
      visualDescription: "Dos contactos separados y una palanca abierta.",
    },
    {
      symbolId: "dc-source",
      labelId: "dc-source",
      label: "Fuente DC / batería",
      visualDescription: "Pares de placas paralelas largas y cortas.",
    },
    {
      symbolId: "ground",
      labelId: "ground",
      label: "GND / tierra",
      visualDescription: "Tres líneas horizontales de ancho decreciente.",
    },
    {
      symbolId: "dc-motor",
      labelId: "dc-motor",
      label: "Motor DC",
      visualDescription: "Círculo con la letra M y dos terminales.",
    },
    {
      symbolId: "microcontroller",
      labelId: "microcontroller",
      label: "Microcontrolador",
      visualDescription: "Bloque de circuito integrado con varios pines.",
    },
    {
      symbolId: "sensor",
      labelId: "sensor",
      label: "Sensor",
      visualDescription: "Bloque de entrada que recibe ondas o una magnitud física.",
    },
    {
      symbolId: "polarized-capacitor",
      labelId: "polarized-capacitor",
      label: "Capacitor polarizado",
      visualDescription: "Dos placas, una recta y otra curva, con marca positiva.",
    },
  ],
  scoring: {
    firstAttemptMinimum: 7,
    retryMinimum: 9,
  },
  feedback: {
    correct: "Las asociaciones requeridas son correctas.",
    incorrect: "Revisa las asociaciones marcadas y vuelve a intentarlo.",
  },
} as const satisfies E0MatchingQuestion;

export const E0_STEPS = [
  {
    id: "voltage",
    order: 1,
    kind: "choice_set",
    title: "Voltaje",
    eyebrow: "Paso 1 de 5 · Más o menos voltaje",
    statement:
      "Observa los tres casos y decide qué ocurrirá al alimentar cada componente. Resuelve las tres tarjetas para continuar.",
    asset: {
      sourceFilename: "electronics_E0_S1_voltage_cases.svg",
      src: "/challenges/electronics/e0/electronics_E0_S1_voltage_cases.svg",
      availability: "provided",
      alt:
        "Tres casos de voltaje: un LED de aproximadamente 2 V conectado a 5 V, un motor de 12 V alimentado con 3 V y un sensor de máximo 3.3 V conectado a 12 V.",
    },
    hints: [
      "Compara el voltaje aplicado con el nominal o máximo de cada componente.",
    ],
    questions: VOLTAGE_QUESTIONS,
  },
  {
    id: "current",
    order: 2,
    kind: "choice_set",
    title: "Corriente",
    eyebrow: "Paso 2 de 5 · Más o menos corriente",
    statement:
      "Decide qué corriente circulará y qué sucede cuando la demanda supera la capacidad disponible.",
    asset: {
      sourceFilename: "electronics_E0_S2_current_cases.svg",
      src: "/challenges/electronics/e0/electronics_E0_S2_current_cases.svg",
      availability: "provided",
      alt:
        "Una fuente de 5 V y máximo 2 A alimenta una carga de 300 mA; un regulador de máximo 1 A alimenta servos que requieren 4 A.",
    },
    hints: [
      "La corriente indicada en una fuente es su capacidad máxima.",
    ],
    questions: CURRENT_QUESTIONS,
  },
  {
    id: "polarity",
    order: 3,
    kind: "mixed_choice",
    title: "Polaridad",
    eyebrow: "Paso 3 de 5 · Importa el sentido",
    statement:
      "Reconoce qué componentes tienen terminales definidos y qué ocurre al invertir un LED.",
    asset: {
      sourceFilename: "electronics_E0_S3_polarity_examples.svg",
      src: "/challenges/electronics/e0/electronics_E0_S3_polarity_examples.svg",
      availability: "provided",
      alt:
        "Cuatro componentes para comparar su polaridad: LED, batería, capacitor electrolítico y resistencia común.",
    },
    hints: [
      "Busca +/−, ánodo/cátodo o símbolos asimétricos.",
    ],
    questions: POLARITY_QUESTIONS,
  },
  {
    id: "ohm-power",
    order: 4,
    kind: "numeric_set",
    title: "Ley de Ohm y potencia",
    eyebrow: "Paso 4 de 5 · Haz que los números cierren",
    statement:
      "Una resistencia de 100 Ω está conectada a 5 V. Calcula la corriente y la potencia disipada.",
    asset: {
      sourceFilename: "electronics_E0_S4_ohm_power_cards.svg",
      src: "/challenges/electronics/e0/electronics_E0_S4_ohm_power_cards.svg",
      availability: "pending",
      alt: "Tarjeta de cálculo con una fuente de 5 V y una resistencia de 100 Ω.",
      fallbackDescription:
        "Representar con una tarjeta HTML: fuente de 5 V conectada a una resistencia de 100 Ω, junto con I = V/R y P = V·I.",
    },
    hints: [
      "Empieza con la Ley de Ohm: I = V/R.",
    ],
    questions: OHM_POWER_QUESTIONS,
  },
  {
    id: "symbols",
    order: 5,
    kind: "matching",
    title: "Símbolos",
    eyebrow: "Paso 5 de 5 · Lee el lenguaje del circuito",
    statement:
      "Relaciona los nueve símbolos con su nombre. En escritorio puedes arrastrar; en móvil o con teclado puedes seleccionar primero el símbolo y después el nombre.",
    asset: {
      sourceFilename: "electronics_E0_S5_symbol_match.svg",
      src: "/challenges/electronics/e0/electronics_E0_S5_symbol_match.svg",
      availability: "pending",
      alt: "Nueve símbolos eléctricos y electrónicos para relacionar con sus nombres.",
      fallbackDescription:
        "Dibujar temporalmente nueve símbolos SVG en código usando las descripciones incluidas en los pares de matching.",
    },
    hints: [
      "Busca flechas de luz, placas, contactos, tierra y bloques con pines.",
    ],
    questions: [SYMBOL_MATCHING_QUESTION],
  },
] as const satisfies readonly E0StepDefinition[];

export const E0_CHALLENGE = {
  id: "E0",
  title: "Encuentra qué no cuadra",
  subtitle: "Fundamentos eléctricos y símbolos",
  introduction:
    "Resuelve cinco minirretos sobre voltaje, corriente, polaridad, Ley de Ohm y símbolos antes de avanzar a los siguientes retos de Electrónica.",
  totalSteps: 5,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: E0_STEPS,
} as const satisfies E0ChallengeDefinition;

export const E0_STEP_IDS = E0_STEPS.map((step) => step.id) as readonly E0StepId[];

/** FNV-1a hash followed by a Mulberry32 generator provides stable UI ordering. */
function hashSeed(seed: E0Seed): number {
  const value = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seed: E0Seed): () => number {
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
export function deterministicShuffle<T>(
  items: readonly T[],
  seed: E0Seed
): T[] {
  const shuffled = [...items];
  const random = createDeterministicRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

export function getE0Step(stepId: E0StepId): E0StepDefinition {
  const step = E0_STEPS.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error("Unknown E0 step: " + stepId);
  return step;
}

export function getE0ChoiceQuestion(
  questionId: string
): E0SingleChoiceQuestion | E0MultipleChoiceQuestion {
  for (const step of E0_STEPS) {
    const question = step.questions.find(
      (candidate) =>
        candidate.id === questionId &&
        (candidate.type === "single_choice" || candidate.type === "multiple_choice")
    );

    if (question?.type === "single_choice" || question?.type === "multiple_choice") {
      return question;
    }
  }

  throw new Error("Unknown E0 choice question: " + questionId);
}

/**
 * Keeps options stable for a candidate/attempt while still preventing answer
 * position from becoming part of the challenge.
 */
export function getDeterministicChoiceOptions(
  questionId: string,
  seed: E0Seed
): E0ChoiceOption[] {
  const question = getE0ChoiceQuestion(questionId);
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, "E0:" + questionId + ":" + String(seed));
}

export function getDeterministicSymbolLabels(seed: E0Seed): E0MatchingPair[] {
  return deterministicShuffle(
    SYMBOL_MATCHING_QUESTION.pairs,
    "E0:symbol-labels:" + String(seed)
  );
}

/** Accepts both decimal comma and decimal point, returning null for invalid input. */
export function normalizeDecimalInput(value: E0NumericInput): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCurrentToAmps(
  value: E0NumericInput,
  unit: E0CurrentUnit
): number | null {
  const parsed = normalizeDecimalInput(value);
  if (parsed === null) return null;
  return unit === "mA" ? parsed / 1000 : parsed;
}

export function normalizePowerToWatts(
  value: E0NumericInput,
  unit: E0PowerUnit
): number | null {
  const parsed = normalizeDecimalInput(value);
  if (parsed === null) return null;
  return unit === "mW" ? parsed / 1000 : parsed;
}

export function isWithinTolerance(
  actual: number | null,
  expected: number,
  tolerance: number
): boolean {
  return actual !== null && Math.abs(actual - expected) <= tolerance + Number.EPSILON;
}

function evaluateSingleChoice(
  question: E0SingleChoiceQuestion,
  selectedOptionId: string | undefined
): E0ItemEvaluation {
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

function equalIdSets(actual: readonly string[], expected: readonly string[]): boolean {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  if (actualSet.size !== expectedSet.size) return false;
  return [...actualSet].every((id) => expectedSet.has(id));
}

function evaluateMultipleChoice(
  question: E0MultipleChoiceQuestion,
  selectedOptionIds: readonly string[]
): E0ItemEvaluation {
  const isCorrect = equalIdSets(selectedOptionIds, question.correctOptionIds);

  return {
    questionId: question.id,
    isAnswered: selectedOptionIds.length > 0,
    isCorrect,
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
  };
}

function summarizeItems(
  stepId: E0StepId,
  items: readonly E0ItemEvaluation[],
  completeFeedback: string,
  retryFeedback: string,
  metadata?: E0EvaluationMetadata
): E0StepEvaluation {
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
    metadata,
  };
}

export function evaluateVoltageStep(
  submission: E0VoltageSubmission
): E0StepEvaluation {
  const items = VOLTAGE_QUESTIONS.map((question) =>
    evaluateSingleChoice(question, submission.answers[question.id])
  );

  return summarizeItems(
    "voltage",
    items,
    "Resolviste correctamente los tres casos de voltaje.",
    "Todavía hay casos por revisar. Puedes ajustar tus respuestas e intentarlo otra vez."
  );
}

export function evaluateCurrentStep(
  submission: E0CurrentSubmission
): E0StepEvaluation {
  const items = CURRENT_QUESTIONS.map((question) =>
    evaluateSingleChoice(question, submission.answers[question.id])
  );
  const capacityAnswer = submission.answers["current-source-capacity"];

  return summarizeItems(
    "current",
    items,
    "Diferenciaste la corriente demandada de la capacidad máxima disponible.",
    "Revisa la diferencia entre lo que una carga demanda y lo que una fuente puede suministrar.",
    {
      currentSourceMisconception: capacityAnswer === "source-forces-2a",
      sourceCapacityUnderstood: capacityAnswer === "load-draws-300ma",
    }
  );
}

export interface E0CurrentMisconceptionSummary {
  readonly detected: boolean;
  readonly corrected: boolean;
  readonly firstDetectedAttempt: number | null;
  readonly correctedAtAttempt: number | null;
}

/** Derives misconception/correction analytics from chronologically ordered submissions. */
export function summarizeCurrentMisconception(
  submissions: readonly E0CurrentSubmission[]
): E0CurrentMisconceptionSummary {
  const detectedIndex = submissions.findIndex(
    (submission) =>
      submission.answers["current-source-capacity"] === "source-forces-2a"
  );

  if (detectedIndex < 0) {
    return {
      detected: false,
      corrected: false,
      firstDetectedAttempt: null,
      correctedAtAttempt: null,
    };
  }

  const correctionOffset = submissions
    .slice(detectedIndex + 1)
    .findIndex(
      (submission) =>
        submission.answers["current-source-capacity"] === "load-draws-300ma"
    );
  const correctedAtIndex =
    correctionOffset < 0 ? null : detectedIndex + 1 + correctionOffset;

  return {
    detected: true,
    corrected: correctedAtIndex !== null,
    firstDetectedAttempt: detectedIndex + 1,
    correctedAtAttempt: correctedAtIndex === null ? null : correctedAtIndex + 1,
  };
}

export function evaluatePolarityStep(
  submission: E0PolaritySubmission
): E0StepEvaluation {
  const componentQuestion = POLARITY_QUESTIONS[0];
  const ledQuestion = POLARITY_QUESTIONS[1];
  const componentResult = evaluateMultipleChoice(
    componentQuestion,
    submission.sensitiveComponentIds
  );
  const selectedComponents = new Set(submission.sensitiveComponentIds);
  const includesResistor = selectedComponents.has("common-resistor");
  const omitsPolarizedComponent = componentQuestion.correctOptionIds.some(
    (id) => !selectedComponents.has(id)
  );

  const contextualComponentResult: E0ItemEvaluation = componentResult.isCorrect
    ? componentResult
    : {
        ...componentResult,
        feedback: includesResistor
          ? "Revisa la resistencia común: sus dos terminales son equivalentes."
          : omitsPolarizedComponent
            ? "Todavía falta al menos un componente. Busca marcas +/− o nombres como ánodo y cátodo."
            : componentResult.feedback,
      };
  const ledResult = evaluateSingleChoice(
    ledQuestion,
    submission.invertedLedOptionId
  );

  return summarizeItems(
    "polarity",
    [contextualComponentResult, ledResult],
    "Reconociste los componentes polarizados y el comportamiento de un LED invertido.",
    "Todavía hay una decisión de polaridad por revisar. Puedes corregirla e intentarlo de nuevo."
  );
}

function evaluateNumericAnswer(
  question: E0NumericQuestion,
  answer: E0NumericAnswer<E0NumericUnit> | undefined,
  normalizedValue: number | null
): E0ItemEvaluation {
  const isAnswered = answer !== undefined && normalizeDecimalInput(answer.value) !== null;
  const isCorrect = isWithinTolerance(
    normalizedValue,
    question.expectedBaseValue,
    question.toleranceBaseValue
  );

  return {
    questionId: question.id,
    isAnswered,
    isCorrect,
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
  };
}

export function evaluateOhmPowerStep(
  submission: E0OhmPowerSubmission
): E0StepEvaluation {
  const currentQuestion = OHM_POWER_QUESTIONS[0];
  const powerQuestion = OHM_POWER_QUESTIONS[1];
  const normalizedCurrent = submission.current
    ? normalizeCurrentToAmps(submission.current.value, submission.current.unit)
    : null;
  const normalizedPower = submission.power
    ? normalizePowerToWatts(submission.power.value, submission.power.unit)
    : null;
  const currentResult = evaluateNumericAnswer(
    currentQuestion,
    submission.current,
    normalizedCurrent
  );
  const powerResult = evaluateNumericAnswer(
    powerQuestion,
    submission.power,
    normalizedPower
  );

  return summarizeItems(
    "ohm-power",
    [currentResult, powerResult],
    "I = 0.05 A y P = 0.25 W. Las conversiones a 50 mA y 250 mW son equivalentes.",
    !currentResult.isCorrect && !powerResult.isCorrect
      ? "Calcula primero I = V/R y usa ese resultado en P = V·I. Revisa también las unidades."
      : !currentResult.isCorrect
        ? currentQuestion.feedback.incorrect
        : powerQuestion.feedback.incorrect,
    {
      normalizedCurrentAmps: normalizedCurrent ?? "invalid",
      normalizedPowerWatts: normalizedPower ?? "invalid",
    }
  );
}

export function evaluateSymbolsStep(
  submission: E0SymbolsSubmission
): E0StepEvaluation {
  const attemptNumber =
    Number.isInteger(submission.attemptNumber) && submission.attemptNumber > 0
      ? submission.attemptNumber
      : 1;
  const items = SYMBOL_MATCHING_QUESTION.pairs.map((pair) => {
    const selectedLabelId = submission.matches[pair.symbolId];
    const isCorrect = selectedLabelId === pair.labelId;

    return {
      questionId: "symbol-matching:" + pair.symbolId,
      isAnswered: selectedLabelId !== undefined,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect
        ? "Asociación correcta."
        : "Revisa esta asociación antes del siguiente intento.",
    } satisfies E0ItemEvaluation;
  });
  const score = items.reduce((total, item) => total + item.score, 0);
  const requiredScore =
    attemptNumber === 1
      ? SYMBOL_MATCHING_QUESTION.scoring.firstAttemptMinimum
      : SYMBOL_MATCHING_QUESTION.scoring.retryMinimum;
  const isComplete = score >= requiredScore;

  let feedback: string;
  if (isComplete && attemptNumber === 1) {
    feedback =
      "Reconociste " + score + " de 9 símbolos en el primer intento y completaste el paso.";
  } else if (isComplete) {
    feedback = "Las nueve asociaciones son correctas.";
  } else if (attemptNumber === 1) {
    feedback =
      "Reconociste " +
      score +
      " de 9. Revisa las asociaciones e inténtalo otra vez; ahora debes completar las nueve.";
  } else {
    feedback =
      "Llevas " + score + " de 9. Revisa las asociaciones marcadas y vuelve a intentarlo.";
  }

  return {
    stepId: "symbols",
    isComplete,
    score,
    maxScore: SYMBOL_MATCHING_QUESTION.pairs.length,
    feedback,
    items,
    metadata: {
      attemptNumber,
      requiredScore,
      requiresPerfectRetry: attemptNumber > 1,
    },
  };
}

export function evaluateE0Step(submission: E0StepSubmission): E0StepEvaluation {
  switch (submission.stepId) {
    case "voltage":
      return evaluateVoltageStep(submission);
    case "current":
      return evaluateCurrentStep(submission);
    case "polarity":
      return evaluatePolarityStep(submission);
    case "ohm-power":
      return evaluateOhmPowerStep(submission);
    case "symbols":
      return evaluateSymbolsStep(submission);
  }
}

export function isE0Complete(completedStepIds: readonly E0StepId[]): boolean {
  const completed = new Set(completedStepIds);
  return E0_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextE0StepId(
  completedStepIds: readonly E0StepId[]
): E0StepId | null {
  const completed = new Set(completedStepIds);
  return E0_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
