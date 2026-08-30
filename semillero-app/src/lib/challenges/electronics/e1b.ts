/** Pure, JSON-safe content and evaluation engine for Electronics E1B. */

export const E1B_STEP_IDS = ["datasheet", "interfaces"] as const;

export type E1BStepId = (typeof E1B_STEP_IDS)[number];
export type E1BClosedQuestionId = "logic-level" | "adc-purpose" | "i2c-lines";
export type E1BPeripheralId =
  | "led-relay"
  | "potentiometer"
  | "motor-driver"
  | "gps"
  | "imu"
  | "microsd";
export type E1BInterfaceId = "GPIO" | "ADC" | "PWM" | "UART" | "I2C" | "SPI";

export interface E1BAsset {
  readonly sourceFilename: string;
  readonly src: string;
  readonly fallbackSrc?: string;
  readonly alt: string;
}

export interface E1BChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface E1BClosedQuestion {
  readonly id: E1BClosedQuestionId;
  readonly prompt: string;
  readonly options: readonly E1BChoiceOption[];
  readonly correctOptionId: string;
  readonly feedback: {
    readonly correct: string;
    readonly incorrect: string;
  };
}

export interface E1BInterfaceOption {
  readonly id: E1BInterfaceId;
  readonly label: string;
  readonly clue: string;
}

export interface E1BPeripheralDefinition {
  readonly id: E1BPeripheralId;
  readonly label: string;
  readonly signalDescription: string;
  readonly correctInterfaceId: E1BInterfaceId;
}

export interface E1BStepDefinition {
  readonly id: E1BStepId;
  readonly order: 1 | 2;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly asset?: E1BAsset;
  readonly hints: readonly string[];
}

export interface E1BDatasheetSubmission {
  readonly stepId: "datasheet";
  readonly closedAnswers: Readonly<Partial<Record<E1BClosedQuestionId, string>>>;
  readonly compatibilityReview: string;
}

export interface E1BInterfacesSubmission {
  readonly stepId: "interfaces";
  readonly mappings: Readonly<Partial<Record<E1BPeripheralId, E1BInterfaceId>>>;
  readonly voltageCompatibilityOptionId: string;
}

export type E1BStepSubmission = E1BDatasheetSubmission | E1BInterfacesSubmission;

export interface E1BItemEvaluation {
  readonly itemId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean | null;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface E1BStepEvaluation {
  readonly stepId: E1BStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly E1BItemEvaluation[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export const E1B_BOARD_ASSET: E1BAsset = {
  sourceFilename: "electronics_E1B_S2_esp32_board_reference.svg",
  src: "/challenges/electronics/e1b/electronics_E1B_S2_esp32_board_reference.svg",
  fallbackSrc:
    "/challenges/electronics/e1b/electronics_E1B_S2_esp32_board_reference.png",
  alt: "ESP32 DevKit con pines de alimentación, ADC, UART, I2C y SPI identificados.",
};

export const E1B_DATASHEET_QUESTIONS: readonly E1BClosedQuestion[] = [
  {
    id: "logic-level",
    prompt: "¿Cuál es el nivel lógico típico indicado para el ESP32?",
    options: [
      { id: "logic-3v3", label: "3.3 V" },
      { id: "logic-5v", label: "5 V" },
      { id: "logic-12v", label: "12 V" },
    ],
    correctOptionId: "logic-3v3",
    feedback: {
      correct: "El datasheet del ESP32 especifica lógica de 3.3 V.",
      incorrect: "Busca el valor indicado en la sección Alimentación y lógica.",
    },
  },
  {
    id: "adc-purpose",
    prompt: "¿Para qué usarías una entrada ADC?",
    options: [
      { id: "adc-analog", label: "Para convertir un voltaje analógico en un valor digital." },
      { id: "adc-motor-power", label: "Para alimentar directamente un motor de corriente continua." },
      { id: "adc-serial", label: "Para transmitir caracteres por TX y RX." },
    ],
    correctOptionId: "adc-analog",
    feedback: {
      correct: "El ADC permite medir señales analógicas dentro del rango admitido.",
      incorrect: "Distingue una medición analógica de una salida de potencia o un bus serial.",
    },
  },
  {
    id: "i2c-lines",
    prompt: "¿Qué interfaz usa las líneas SDA y SCL?",
    options: [
      { id: "lines-i2c", label: "I²C" },
      { id: "lines-uart", label: "UART" },
      { id: "lines-spi", label: "SPI" },
    ],
    correctOptionId: "lines-i2c",
    feedback: {
      correct: "I²C usa SDA para datos y SCL para reloj.",
      incorrect: "Ubica SDA/SCL en el apartado de interfaces del datasheet.",
    },
  },
] as const;

export const E1B_INTERFACE_OPTIONS: readonly E1BInterfaceOption[] = [
  { id: "GPIO", label: "GPIO", clue: "Entrada o salida digital de propósito general." },
  { id: "ADC", label: "ADC", clue: "Mide un nivel analógico y lo digitaliza." },
  { id: "PWM", label: "PWM", clue: "Modula el ciclo útil para controlar potencia media." },
  { id: "UART", label: "UART", clue: "Comunicación serial asíncrona por TX y RX." },
  { id: "I2C", label: "I²C", clue: "Bus síncrono compartido con SDA y SCL." },
  { id: "SPI", label: "SPI", clue: "Bus síncrono con MOSI, MISO, SCK y selección de dispositivo." },
] as const;

export const E1B_PERIPHERALS: readonly E1BPeripheralDefinition[] = [
  {
    id: "led-relay",
    label: "LED o relé digital",
    signalDescription: "Solo necesita estados encendido/apagado.",
    correctInterfaceId: "GPIO",
  },
  {
    id: "potentiometer",
    label: "Potenciómetro",
    signalDescription: "Entrega un voltaje variable continuo.",
    correctInterfaceId: "ADC",
  },
  {
    id: "motor-driver",
    label: "Driver de motor",
    signalDescription: "Se quiere regular la velocidad mediante ciclo útil.",
    correctInterfaceId: "PWM",
  },
  {
    id: "gps",
    label: "GPS TX/RX",
    signalDescription: "Intercambia datos seriales asíncronos.",
    correctInterfaceId: "UART",
  },
  {
    id: "imu",
    label: "IMU SDA/SCL",
    signalDescription: "Comparte un bus de datos y reloj.",
    correctInterfaceId: "I2C",
  },
  {
    id: "microsd",
    label: "microSD MOSI/MISO/SCK",
    signalDescription: "Usa datos de ida, datos de vuelta y reloj.",
    correctInterfaceId: "SPI",
  },
] as const;

export const E1B_VOLTAGE_OPTIONS: readonly E1BChoiceOption[] = [
  {
    id: "check-and-adapt",
    label:
      "Verificar niveles y tolerancia; si la salida es 5 V y la entrada no es tolerante, adaptar el nivel antes de conectar.",
  },
  {
    id: "direct-always",
    label: "Conectar directamente: cualquier GPIO de 3.3 V acepta 5 V de forma segura.",
  },
  {
    id: "only-share-vcc",
    label: "Unir únicamente VCC; no es necesario compartir GND para intercambiar señales.",
  },
] as const;

export const E1B_STEPS: readonly E1BStepDefinition[] = [
  {
    id: "datasheet",
    order: 1,
    title: "Consulta el datasheet",
    eyebrow: "Lectura técnica",
    statement:
      "Busca el datasheet oficial del ESP32, consulta sus especificaciones y responde las preguntas con base en la información que encuentres.",
    hints: [
      "Busca primero los niveles eléctricos; después distingue entradas analógicas y nombres de buses.",
    ],
  },
  {
    id: "interfaces",
    order: 2,
    title: "Conecta cada periférico",
    eyebrow: "Matching de interfaces",
    statement:
      "Asocia seis periféricos con GPIO, ADC, PWM, UART, I²C o SPI y resuelve la compatibilidad entre 5 V y 3.3 V.",
    asset: E1B_BOARD_ASSET,
    hints: [
      "Las etiquetas de las señales suelen revelar el bus: TX/RX, SDA/SCL y MOSI/MISO/SCK son conjuntos distintos.",
    ],
  },
] as const;

export const E1B_CHALLENGE = {
  id: "E1B",
  title: "Habla con el microcontrolador",
  subtitle: "Lee límites eléctricos y elige la interfaz correcta.",
  totalSteps: 2,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: E1B_STEPS,
} as const;

export function createEmptyE1BSubmission(stepId: E1BStepId): E1BStepSubmission {
  if (stepId === "datasheet") {
    return { stepId, closedAnswers: {}, compatibilityReview: "" };
  }
  return { stepId, mappings: {}, voltageCompatibilityOptionId: "" };
}

export function normalizeE1BSubmission(
  stepId: E1BStepId,
  value: unknown
): E1BStepSubmission {
  const record = isRecord(value) ? value : {};
  if (stepId === "datasheet") {
    const rawAnswers = isRecord(record.closedAnswers) ? record.closedAnswers : {};
    const closedAnswers: Partial<Record<E1BClosedQuestionId, string>> = {};
    for (const question of E1B_DATASHEET_QUESTIONS) {
      const candidate = rawAnswers[question.id];
      if (typeof candidate === "string") closedAnswers[question.id] = candidate;
    }
    return {
      stepId,
      closedAnswers,
      compatibilityReview:
        typeof record.compatibilityReview === "string"
          ? record.compatibilityReview
          : "",
    };
  }

  const rawMappings = isRecord(record.mappings) ? record.mappings : {};
  const mappings: Partial<Record<E1BPeripheralId, E1BInterfaceId>> = {};
  for (const peripheral of E1B_PERIPHERALS) {
    const candidate = rawMappings[peripheral.id];
    if (isInterfaceId(candidate)) mappings[peripheral.id] = candidate;
  }
  return {
    stepId,
    mappings,
    voltageCompatibilityOptionId:
      typeof record.voltageCompatibilityOptionId === "string"
        ? record.voltageCompatibilityOptionId
        : "",
  };
}

export function isE1BDraftReady(submission: E1BStepSubmission): boolean {
  if (submission.stepId === "datasheet") {
    return (
      E1B_DATASHEET_QUESTIONS.every((question) =>
        Boolean(submission.closedAnswers[question.id])
      ) &&
      normalizedLength(submission.compatibilityReview) > 0
    );
  }
  return (
    E1B_PERIPHERALS.every((peripheral) => Boolean(submission.mappings[peripheral.id])) &&
    Boolean(submission.voltageCompatibilityOptionId)
  );
}

export function evaluateE1BStep(submission: E1BStepSubmission): E1BStepEvaluation {
  if (submission.stepId === "datasheet") return evaluateDatasheet(submission);
  return evaluateInterfaces(submission);
}

export function isE1BComplete(completedStepIds: readonly string[]): boolean {
  return E1B_STEP_IDS.every((stepId) => completedStepIds.includes(stepId));
}

function evaluateDatasheet(submission: E1BDatasheetSubmission): E1BStepEvaluation {
  const closedItems: E1BItemEvaluation[] = E1B_DATASHEET_QUESTIONS.map((question) => {
    const answer = submission.closedAnswers[question.id];
    const isAnswered = Boolean(answer);
    const isCorrect = answer === question.correctOptionId;
    return {
      itemId: question.id,
      isAnswered,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
    };
  });
  const responseLength = normalizedLength(submission.compatibilityReview);
  const openReady = responseLength > 0;
  const openItem: E1BItemEvaluation = {
    itemId: "sensor-compatibility-review",
    isAnswered: responseLength > 0,
    isCorrect: null,
    score: openReady ? 1 : 0,
    maxScore: 1,
    feedback: openReady
      ? "Respuesta abierta registrada para revisión."
      : "Menciona voltaje de alimentación, nivel lógico, GND común y posible adaptación.",
  };
  const items = [...closedItems, openItem];
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const closedCorrect = closedItems.every((item) => item.isCorrect === true);
  const isComplete = closedCorrect && openReady;
  return {
    stepId: submission.stepId,
    isComplete,
    score,
    maxScore: items.length,
    feedback: isComplete
      ? "Interpretaste correctamente el datasheet; la explicación queda guardada para revisión."
      : `Obtuviste ${score} de ${items.length}. Consulta nuevamente el datasheet oficial y reintenta.`,
    items,
    metadata: {
      closedQuestionsCorrect: closedItems.filter((item) => item.isCorrect).length,
      openResponseCharacters: responseLength,
      reviewerRequired: true,
    },
  };
}

function evaluateInterfaces(submission: E1BInterfacesSubmission): E1BStepEvaluation {
  const mappingItems: E1BItemEvaluation[] = E1B_PERIPHERALS.map((peripheral) => {
    const answer = submission.mappings[peripheral.id];
    const isAnswered = Boolean(answer);
    const isCorrect = answer === peripheral.correctInterfaceId;
    return {
      itemId: peripheral.id,
      isAnswered,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect ? "Interfaz adecuada." : "Esa interfaz no corresponde a las señales descritas.",
    };
  });
  const voltageCorrect =
    submission.voltageCompatibilityOptionId === "check-and-adapt";
  const compatibilityItem: E1BItemEvaluation = {
    itemId: "voltage-compatibility",
    isAnswered: Boolean(submission.voltageCompatibilityOptionId),
    isCorrect: voltageCorrect,
    score: voltageCorrect ? 1 : 0,
    maxScore: 1,
    feedback: voltageCorrect
      ? "Bien: los niveles deben verificarse y adaptarse cuando sea necesario."
      : "Un GPIO de 3.3 V no debe asumirse tolerante a 5 V y las señales requieren una referencia común.",
  };
  const items = [...mappingItems, compatibilityItem];
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const isComplete = score === items.length;
  return {
    stepId: submission.stepId,
    isComplete,
    score,
    maxScore: items.length,
    feedback: isComplete
      ? "Todas las interfaces y la comprobación de niveles son correctas."
      : `Hay ${score} de ${items.length} decisiones correctas. El resultado no revela cuáles: revisa las señales como conjunto.`,
    items,
    metadata: {
      correctMappings: mappingItems.filter((item) => item.isCorrect).length,
      voltageCompatibilityCorrect: voltageCorrect,
    },
  };
}

function normalizedLength(value: string): number {
  return value.trim().replace(/\s+/g, " ").length;
}

function isInterfaceId(value: unknown): value is E1BInterfaceId {
  return (
    typeof value === "string" &&
    E1B_INTERFACE_OPTIONS.some((option) => option.id === value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
