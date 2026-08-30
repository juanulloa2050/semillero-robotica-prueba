/**
 * Pure content and evaluation engine for Electronics E1A.
 *
 * It deliberately contains no React or browser APIs. Definitions, drafts and
 * evaluations are JSON-compatible so the UI can persist them in the shared
 * NodeChallengeProgress contract.
 */

export const E1A_STEP_IDS = ["interpretation", "blocks", "faults"] as const;

export type E1AStepId = (typeof E1A_STEP_IDS)[number];
export type E1AFunctionId =
  | "source"
  | "regulation"
  | "communication"
  | "processing"
  | "driver"
  | "actuation"
  | "indicator";
export type E1ABlockId =
  | "battery"
  | "regulator"
  | "mcu"
  | "bluetooth"
  | "led"
  | "motor-driver"
  | "dc-motor";
export type E1AFaultCaseId = "direct-wiring" | "l293d-diagnosis" | "l293d-solved";
export type E1AFaultQuestionKind = "single" | "multiple" | "open";

export interface E1AAsset {
  readonly sourceFilename: string;
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface E1AHotspot {
  /** Percentages relative to the asset's own width/height, not currently rendered as an overlay. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface E1AFunctionOption {
  readonly id: E1AFunctionId;
  readonly label: string;
  readonly description: string;
}

export interface E1ABlockDefinition {
  readonly id: E1ABlockId;
  readonly shortLabel: string;
  readonly componentName: string;
  readonly componentDetail: string;
  readonly accessibleLabel: string;
  readonly correctFunctionId: E1AFunctionId;
  readonly hotspot: E1AHotspot;
}

export interface E1AFaultOption {
  readonly id: string;
  readonly label: string;
}

export interface E1AFaultQuestion {
  readonly id: string;
  readonly kind: E1AFaultQuestionKind;
  readonly prompt: string;
  /** Only for "single" / "multiple". */
  readonly options?: readonly E1AFaultOption[];
  /** Only for "single" / "multiple". Exact-set match decides correctness. */
  readonly correctOptionIds?: readonly string[];
  readonly feedback?: {
    readonly correct: string;
    readonly incorrect: string;
  };
}

export interface E1AFaultCase {
  readonly id: E1AFaultCaseId;
  readonly title: string;
  readonly prompt: string;
  readonly asset: E1AAsset;
  readonly questions: readonly E1AFaultQuestion[];
}

export interface E1AStepDefinition {
  readonly id: E1AStepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly asset: E1AAsset;
  readonly hints: readonly string[];
}

export interface E1AInterpretationSubmission {
  readonly stepId: "interpretation";
  readonly response: string;
}

export interface E1ABlocksSubmission {
  readonly stepId: "blocks";
  readonly assignments: Readonly<Partial<Record<E1ABlockId, E1AFunctionId>>>;
}

export interface E1AFaultQuestionAnswer {
  /** For "single" / "multiple" questions: the selected option ids. */
  readonly selected?: readonly string[];
  /** For "open" questions: the free-text answer. */
  readonly text?: string;
}

export type E1AFaultCaseAnswers = Readonly<Partial<Record<string, E1AFaultQuestionAnswer>>>;

export interface E1AFaultsSubmission {
  readonly stepId: "faults";
  readonly answers: Readonly<Partial<Record<E1AFaultCaseId, E1AFaultCaseAnswers>>>;
}

export type E1AStepSubmission =
  | E1AInterpretationSubmission
  | E1ABlocksSubmission
  | E1AFaultsSubmission;

export interface E1AItemEvaluation {
  readonly itemId: string;
  readonly isAnswered: boolean;
  /** null means the answer must be assessed manually by a reviewer. */
  readonly isCorrect: boolean | null;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface E1AStepEvaluation {
  readonly stepId: E1AStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly E1AItemEvaluation[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export const E1A_FUNCTIONS: readonly E1AFunctionOption[] = [
  {
    id: "source",
    label: "Fuente",
    description: "Entrega la energía eléctrica inicial al sistema.",
  },
  {
    id: "regulation",
    label: "Regulación",
    description: "Acondiciona el voltaje para los circuitos que lo necesitan.",
  },
  {
    id: "communication",
    label: "Comunicación",
    description: "Envía y recibe datos con otro dispositivo.",
  },
  {
    id: "processing",
    label: "Procesamiento",
    description: "Lee entradas y decide qué salidas activar.",
  },
  {
    id: "driver",
    label: "Driver",
    description: "Adapta la señal de control a la potencia del actuador.",
  },
  {
    id: "actuation",
    label: "Actuación",
    description: "Transforma energía eléctrica en una acción física.",
  },
  {
    id: "indicator",
    label: "Indicador",
    description: "Comunica visualmente un estado del sistema.",
  },
] as const;

export const E1A_BLOCKS: readonly E1ABlockDefinition[] = [
  {
    id: "battery",
    shortLabel: "B1",
    componentName: "Fuente 7V–10V",
    componentDetail: "Batería / fuente principal del robot",
    accessibleLabel: "Bloque inferior izquierdo: fuente de 7 a 10 voltios",
    correctFunctionId: "source",
    hotspot: { left: 24.6, top: 88, width: 16.9, height: 9.6 },
  },
  {
    id: "regulator",
    shortLabel: "B2",
    componentName: "LM2596",
    componentDetail: "Convierte 7–10 V en 5 V regulados para el Arduino",
    accessibleLabel: "Bloque inferior derecho: regulador LM2596",
    correctFunctionId: "regulation",
    hotspot: { left: 78.1, top: 88.9, width: 11.3, height: 8.4 },
  },
  {
    id: "mcu",
    shortLabel: "B3",
    componentName: "Arduino Nano",
    componentDetail: "Procesa entradas y genera las señales de control",
    accessibleLabel: "Bloque central: Arduino Nano",
    correctFunctionId: "processing",
    hotspot: { left: 42.6, top: 46.7, width: 19.1, height: 8.4 },
  },
  {
    id: "bluetooth",
    shortLabel: "B4",
    componentName: "HC-05",
    componentDetail: "Módulo Bluetooth: TX/RX con el Arduino",
    accessibleLabel: "Bloque izquierdo: módulo Bluetooth HC-05",
    correctFunctionId: "communication",
    hotspot: { left: 9.3, top: 45.5, width: 11.5, height: 9.8 },
  },
  {
    id: "led",
    shortLabel: "B5",
    componentName: "Matriz LED (×2)",
    componentDetail: "Muestra información visual mediante CLK, CS y DIN",
    accessibleLabel: "Bloques superiores: matrices LED en cascada",
    correctFunctionId: "indicator",
    hotspot: { left: 45.9, top: 1.2, width: 11.5, height: 31.1 },
  },
  {
    id: "motor-driver",
    shortLabel: "B6",
    componentName: "L298N mini",
    componentDetail: "Adapta las señales del Arduino a la potencia de los motores",
    accessibleLabel: "Bloque inferior central: driver L298N mini",
    correctFunctionId: "driver",
    hotspot: { left: 48.6, top: 72.5, width: 11.5, height: 9 },
  },
  {
    id: "dc-motor",
    shortLabel: "B7",
    componentName: "Motores DC (×2)",
    componentDetail: "Convierten energía eléctrica en el movimiento de las ruedas",
    accessibleLabel: "Círculos inferiores: motor izquierdo y motor derecho",
    correctFunctionId: "actuation",
    hotspot: { left: 33.8, top: 72.1, width: 8.3, height: 9.1 },
  },
] as const;

const INTERPRETATION_ASSET: E1AAsset = {
  sourceFilename: "electronics_E1A_S1_robot_schematic.png",
  src: "/challenges/electronics/e1a/electronics_E1A_S1_robot_schematic.png",
  alt: "Plano eléctrico de un robot: fuente de 7 a 10 voltios y regulador LM2596 alimentan un Arduino Nano, que controla dos matrices LED en cascada, un módulo Bluetooth HC-05 y un driver L298N mini conectado a dos motores DC.",
  width: 915,
  height: 835,
};

const BLOCKS_ASSET: E1AAsset = {
  ...INTERPRETATION_ASSET,
  alt: "Plano eléctrico rotulado del robot usado para asociar cada componente con su función.",
};

export const E1A_FAULT_CASES: readonly E1AFaultCase[] = [
  {
    id: "direct-wiring",
    title: "Caso 1",
    prompt: "Este circuito busca mover los motores.",
    asset: {
      sourceFilename: "E1A_deteccion_fallos_caso-1.png",
      src: "/challenges/electronics/e1a/electronics_E1A_S3_case1_direct_wiring.png",
      alt: "Arduino UNO con dos motores DC conectados directamente a pines digitales y una batería de 9V conectada al pin 5V.",
      width: 1146,
      height: 789,
    },
    questions: [
      {
        id: "why-wrong",
        kind: "open",
        prompt: "¿Por qué esta conexión es un problema? Explica el riesgo.",
      },
      {
        id: "missing-elements",
        kind: "open",
        prompt: "¿Qué elementos le faltan a este circuito?",
      },
      {
        id: "why-selected",
        kind: "open",
        prompt: "Explica por qué elegiste esos elementos.",
      },
    ],
  },
  {
    id: "l293d-diagnosis",
    title: "Caso 2",
    prompt: "Este circuito busca controlar la dirección de giro de los motores.",
    asset: {
      sourceFilename: "E1A_deteccion_fallos_caso-2.png",
      src: "/challenges/electronics/e1a/electronics_E1A_S3_case2_l293d_diagnosis.png",
      alt: "Arduino UNO conectado a un L293D en protoboard, que controla dos motores DC alimentados por una batería de 9V.",
      width: 1413,
      height: 751,
    },
    questions: [
      {
        id: "l293d-explanation",
        kind: "open",
        prompt: "Consulta el datasheet del L293D y explica, con tus palabras, cómo funciona este integrado.",
      },
      {
        id: "wire-roles",
        kind: "open",
        prompt: "Describe qué papel cumple cada cable de este circuito.",
      },
      {
        id: "what-is-the-error",
        kind: "open",
        prompt: "¿Cuál es el error en este circuito? Explica cómo lo detectaste.",
      },
    ],
  },
  {
    id: "l293d-solved",
    title: "Caso 3",
    prompt: "Este circuito busca controlar la velocidad y la dirección de giro de los motores.",
    asset: {
      sourceFilename: "E1A_deteccion_fallos_caso-3.png",
      src: "/challenges/electronics/e1a/electronics_E1A_S3_case3_l293d_solved.png",
      alt: "Mismo circuito con L293D en protoboard, con los pines de control conectados a GND.",
      width: 1314,
      height: 673,
    },
    questions: [
      {
        id: "pins-purpose",
        kind: "open",
        prompt: "¿Para qué sirven los pines que ahora están conectados a GND y qué función cumplen en el L293D?",
      },
      {
        id: "pins-connection",
        kind: "open",
        prompt:
          "¿A dónde van conectados esos pines y cómo se relaciona esa conexión con el funcionamiento del circuito?",
      },
    ],
  },
] as const;

export const E1A_STEPS: readonly E1AStepDefinition[] = [
  {
    id: "interpretation",
    order: 1,
    title: "Interpreta el sistema",
    eyebrow: "Lectura abierta",
    statement:
      "Explica qué hace el sistema, cómo fluye la alimentación y qué función cumple cada bloque. Tu respuesta será revisada por una persona.",
    asset: INTERPRETATION_ASSET,
    hints: [
      "Sigue primero la energía desde la fuente de 7–10 V y el LM2596 hasta el Arduino Nano; desde ahí identifica qué señales salen hacia el HC-05, la matriz LED y el L298N con los motores.",
    ],
  },
  {
    id: "blocks",
    order: 2,
    title: "Asocia las funciones",
    eyebrow: "Esquema interactivo",
    statement:
      "Selecciona cada bloque del plano y asígnale la función que desempeña. Debes completar las siete asociaciones.",
    asset: BLOCKS_ASSET,
    hints: [
      "Identifica primero la fuente y el actuador; después sigue el flujo de energía y señales hasta el bloque central.",
    ],
  },
  {
    id: "faults",
    order: 3,
    title: "Diagnostica los circuitos",
    eyebrow: "Banco de diagnóstico",
    statement: "Tres circuitos diferentes. Investiga, explica y diagnostica cada uno.",
    asset: E1A_FAULT_CASES[0].asset,
    hints: ["¿Qué es un puente H?"],
  },
] as const;

export const E1A_CHALLENGE = {
  id: "E1A",
  title: "Lee un plano eléctrico",
  subtitle: "Del símbolo a la función y de la anomalía al diagnóstico.",
  totalSteps: 3,
  completionRule: "all_steps",
  attempts: "unlimited",
  steps: E1A_STEPS,
} as const;

export function createEmptyE1ASubmission(stepId: E1AStepId): E1AStepSubmission {
  if (stepId === "interpretation") return { stepId, response: "" };
  if (stepId === "blocks") return { stepId, assignments: {} };
  return { stepId, answers: {} };
}

export function normalizeE1ASubmission(
  stepId: E1AStepId,
  value: unknown
): E1AStepSubmission {
  const record = isRecord(value) ? value : {};

  if (stepId === "interpretation") {
    return {
      stepId,
      response: typeof record.response === "string" ? record.response : "",
    };
  }

  if (stepId === "blocks") {
    const rawAssignments = isRecord(record.assignments) ? record.assignments : {};
    const assignments: Partial<Record<E1ABlockId, E1AFunctionId>> = {};
    for (const block of E1A_BLOCKS) {
      const candidate = rawAssignments[block.id];
      if (isFunctionId(candidate)) assignments[block.id] = candidate;
    }
    return { stepId, assignments };
  }

  const rawAnswers = isRecord(record.answers) ? record.answers : {};
  const answers: Partial<Record<E1AFaultCaseId, E1AFaultCaseAnswers>> = {};
  for (const faultCase of E1A_FAULT_CASES) {
    const rawCase = rawAnswers[faultCase.id];
    if (!isRecord(rawCase)) continue;
    const caseAnswers: Record<string, E1AFaultQuestionAnswer> = {};
    for (const question of faultCase.questions) {
      const rawAnswer = rawCase[question.id];
      if (!isRecord(rawAnswer)) continue;
      if (question.kind === "open") {
        if (typeof rawAnswer.text === "string") {
          caseAnswers[question.id] = { text: rawAnswer.text };
        }
      } else {
        const validIds = new Set((question.options ?? []).map((option) => option.id));
        const selected = Array.isArray(rawAnswer.selected)
          ? rawAnswer.selected.filter(
              (id): id is string => typeof id === "string" && validIds.has(id)
            )
          : [];
        caseAnswers[question.id] = { selected };
      }
    }
    answers[faultCase.id] = caseAnswers;
  }
  return { stepId, answers };
}

export function isE1ADraftReady(submission: E1AStepSubmission): boolean {
  if (submission.stepId === "interpretation") {
    return normalizedLength(submission.response) > 0;
  }
  if (submission.stepId === "blocks") {
    return E1A_BLOCKS.every((block) => Boolean(submission.assignments[block.id]));
  }
  return E1A_FAULT_CASES.every((faultCase) => {
    const caseAnswers = submission.answers[faultCase.id];
    return faultCase.questions.every((question) => isQuestionAnswered(question, caseAnswers));
  });
}

export function evaluateE1AStep(submission: E1AStepSubmission): E1AStepEvaluation {
  if (submission.stepId === "interpretation") return evaluateInterpretation(submission);
  if (submission.stepId === "blocks") return evaluateBlocks(submission);
  return evaluateFaults(submission);
}

export function isE1AComplete(completedStepIds: readonly string[]): boolean {
  return E1A_STEP_IDS.every((stepId) => completedStepIds.includes(stepId));
}

function evaluateInterpretation(
  submission: E1AInterpretationSubmission
): E1AStepEvaluation {
  const length = normalizedLength(submission.response);
  const hasResponse = length > 0;
  return {
    stepId: submission.stepId,
    isComplete: hasResponse,
    score: hasResponse ? 1 : 0,
    maxScore: 1,
    feedback: hasResponse
      ? "Respuesta registrada para revisión. Puedes continuar con la asociación de bloques."
      : "Escribe tu lectura del plano para guardarla y continuar.",
    items: [
      {
        itemId: "interpretation-response",
        isAnswered: length > 0,
        isCorrect: null,
        score: hasResponse ? 1 : 0,
        maxScore: 1,
        feedback: hasResponse
          ? "La respuesta queda pendiente de revisión semántica."
          : "Incluye propósito, flujo de alimentación y función de los bloques.",
      },
    ],
    metadata: { characterCount: length, reviewerRequired: true },
  };
}

function evaluateBlocks(submission: E1ABlocksSubmission): E1AStepEvaluation {
  const items = E1A_BLOCKS.map((block) => {
    const answer = submission.assignments[block.id];
    const isAnswered = Boolean(answer);
    const isCorrect = answer === block.correctFunctionId;
    return {
      itemId: block.id,
      isAnswered,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect ? "Función bien asociada." : "La función no coincide con el flujo del esquema.",
    };
  });
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const isComplete = score === items.length;
  return {
    stepId: submission.stepId,
    isComplete,
    score,
    maxScore: items.length,
    feedback: isComplete
      ? "Las siete funciones coinciden con los bloques del plano."
      : `Tienes ${score} de ${items.length} asociaciones correctas. Revisa el flujo antes de reintentar.`,
    items,
    metadata: { correctAssociations: score },
  };
}

function isQuestionAnswered(
  question: E1AFaultQuestion,
  caseAnswers: E1AFaultCaseAnswers | undefined
): boolean {
  const answer = caseAnswers?.[question.id];
  if (question.kind === "open") {
    return normalizedLength(answer?.text ?? "") > 0;
  }
  return (answer?.selected ?? []).length > 0;
}

function isQuestionCorrect(
  question: E1AFaultQuestion,
  caseAnswers: E1AFaultCaseAnswers | undefined
): boolean | null {
  if (question.kind === "open") return null;
  const selected = new Set(caseAnswers?.[question.id]?.selected ?? []);
  const correct = new Set(question.correctOptionIds ?? []);
  if (selected.size !== correct.size) return false;
  for (const id of selected) {
    if (!correct.has(id)) return false;
  }
  return true;
}

function evaluateFaults(submission: E1AFaultsSubmission): E1AStepEvaluation {
  const items: E1AItemEvaluation[] = [];

  for (const faultCase of E1A_FAULT_CASES) {
    const caseAnswers = submission.answers[faultCase.id];
    for (const question of faultCase.questions) {
      const isAnswered = isQuestionAnswered(question, caseAnswers);
      const isCorrect = isQuestionCorrect(question, caseAnswers);
      const graded = question.kind !== "open";
      items.push({
        itemId: `${faultCase.id}:${question.id}`,
        isAnswered,
        isCorrect,
        score: graded ? (isCorrect ? 1 : 0) : isAnswered ? 1 : 0,
        maxScore: 1,
        feedback: graded
          ? isCorrect
            ? question.feedback?.correct ?? "Respuesta correcta."
            : question.feedback?.incorrect ?? "Revisa esta respuesta y vuelve a intentarlo."
          : isAnswered
            ? "Respuesta registrada para revisión."
            : "Esta pregunta necesita una respuesta escrita.",
      });
    }
  }

  const score = items.reduce((sum, item) => sum + item.score, 0);
  const isComplete = E1A_FAULT_CASES.every((faultCase) => {
    const caseAnswers = submission.answers[faultCase.id];
    return faultCase.questions.every((question) => {
      if (!isQuestionAnswered(question, caseAnswers)) return false;
      if (question.kind === "open") return true;
      return isQuestionCorrect(question, caseAnswers) === true;
    });
  });

  return {
    stepId: submission.stepId,
    isComplete,
    score,
    maxScore: items.length,
    feedback: isComplete
      ? "Los tres casos quedaron diagnosticados. Terminaste la lectura de planos."
      : `Tienes ${score} de ${items.length} respuestas listas. Completa las preguntas abiertas y revisa la selección del caso 1.`,
    items,
    metadata: { answeredItems: items.filter((item) => item.isAnswered).length },
  };
}

function normalizedLength(value: string): number {
  return value.trim().replace(/\s+/g, " ").length;
}

function isFunctionId(value: unknown): value is E1AFunctionId {
  return (
    typeof value === "string" &&
    E1A_FUNCTIONS.some((option) => option.id === value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
