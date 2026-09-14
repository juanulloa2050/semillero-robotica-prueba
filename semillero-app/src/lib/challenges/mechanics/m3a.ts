/**
 * Pure content and evaluation engine for Mechanics M3A.
 *
 * This module intentionally has no React, browser-storage, or application-state
 * dependencies. Each step presents a simulated FEA (finite element analysis)
 * result on a piece: material, load, constraint, and a reported displacement
 * and factor of safety. Three guided multiple-choice questions test whether
 * the candidate can read the setup; a fourth, open-text question asks them to
 * judge whether the reported result is physically coherent - one of the three
 * scenarios is deliberately under-constrained (a beam with only one support),
 * so its reported numbers can't actually be trusted, on purpose.
 */

export type M3AStepId = "bracket" | "beam" | "plate";
export type M3AQuestionType = "single_choice" | "open_text";

export interface M3AFeedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface M3AChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface M3ASingleChoiceQuestion {
  readonly id: string;
  readonly type: "single_choice";
  readonly prompt: string;
  readonly options: readonly M3AChoiceOption[];
  readonly correctOptionId: string;
  readonly shuffleOptions: boolean;
  readonly feedback: M3AFeedback;
}

export interface M3AOpenTextQuestion {
  readonly id: string;
  readonly type: "open_text";
  readonly prompt: string;
  readonly minCharacters: number;
  readonly placeholder: string;
}

export type M3AQuestionDefinition = M3ASingleChoiceQuestion | M3AOpenTextQuestion;

export interface M3AStepDefinition {
  readonly id: M3AStepId;
  readonly order: 1 | 2 | 3;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly diagram: M3AStepId;
  readonly material: string;
  readonly load: string;
  readonly constraint: string;
  readonly reportedDisplacement: string;
  readonly reportedFoS: string;
  readonly consistent: boolean;
  readonly hints: readonly [string, string];
  readonly questions: readonly [
    M3ASingleChoiceQuestion,
    M3ASingleChoiceQuestion,
    M3ASingleChoiceQuestion,
    M3AOpenTextQuestion,
  ];
}

export interface M3AChallengeDefinition {
  readonly id: "M3A";
  readonly title: string;
  readonly subtitle: string;
  readonly introduction: string;
  readonly totalSteps: 3;
  readonly completionRule: "all_steps";
  readonly attempts: "unlimited";
}

export interface M3AStepSubmission {
  readonly stepId: M3AStepId;
  readonly answers: Readonly<Partial<Record<string, string>>>;
}

export interface M3AItemEvaluation {
  readonly questionId: string;
  readonly isAnswered: boolean;
  readonly isCorrect: boolean | null;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface M3AStepEvaluation {
  readonly stepId: M3AStepId;
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly items: readonly M3AItemEvaluation[];
}

// La justificación abierta no se califica como correcta/incorrecta — eso
// queda a criterio del evaluador. Aquí solo exigimos que no esté vacía,
// como condición para poder comprobar las preguntas cerradas y completar
// el paso.
const OPEN_MIN_CHARS = 1;

const BRACKET_QUESTIONS: readonly [
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3AOpenTextQuestion,
] = [
  {
    id: "bracket-constraint",
    type: "single_choice",
    prompt: "¿Qué tipo de restricción tiene esta pieza?",
    options: [
      { id: "bracket-fixed", label: "Empotramiento: la cara posterior no puede trasladarse ni rotar." },
      { id: "bracket-pin", label: "Apoyo simple: solo restringe el movimiento en una dirección." },
      { id: "bracket-none", label: "No tiene restricciones." },
    ],
    correctOptionId: "bracket-fixed",
    shuffleOptions: true,
    feedback: {
      correct: "La cara posterior está empotrada: no se traslada ni rota en ninguna dirección.",
      incorrect: "La cara sombreada contra la pared no tiene flechas de carga ni juntas: representa un empotramiento completo.",
    },
  },
  {
    id: "bracket-stress-location",
    type: "single_choice",
    prompt: "¿Dónde esperarías la mayor concentración de esfuerzo?",
    options: [
      { id: "bracket-corner", label: "En la esquina interior del doblez, donde cambia bruscamente la sección." },
      { id: "bracket-flat", label: "En el centro de la cara plana, lejos de cualquier borde." },
      { id: "bracket-tip-only", label: "Únicamente en el punto exacto donde se aplica la carga." },
    ],
    correctOptionId: "bracket-corner",
    shuffleOptions: true,
    feedback: {
      correct: "Los cambios bruscos de geometría (esquinas, filetes pequeños) concentran esfuerzo; por eso el mapa de color se pone rojo justo ahí.",
      incorrect: "Piensa en cómo se \"aprietan\" las líneas de fuerza cuando la geometría cambia de dirección de golpe, como en la esquina interior del doblez.",
    },
  },
  {
    id: "bracket-fos-meaning",
    type: "single_choice",
    prompt: "Con un FoS (factor de seguridad) mínimo reportado de 2.1, ¿la pieza falla bajo esta carga?",
    options: [
      { id: "bracket-fos-ok", label: "No: un FoS mayor a 1 significa que resiste, con margen adicional." },
      { id: "bracket-fos-fail", label: "Sí: cualquier FoS reportado indica que la pieza ya falló." },
      { id: "bracket-fos-unknown", label: "No se puede saber sin más datos." },
    ],
    correctOptionId: "bracket-fos-ok",
    shuffleOptions: true,
    feedback: {
      correct: "FoS = esfuerzo que resiste el material / esfuerzo real aplicado. FoS > 1 significa que hay margen antes de fallar.",
      incorrect: "El factor de seguridad compara cuánto resiste el material contra cuánto esfuerzo real hay. Un valor mayor a 1 es un buen resultado, no una falla.",
    },
  },
  {
    id: "bracket-coherence",
    type: "open_text",
    prompt: "¿Es coherente este resultado? Justifica tu respuesta usando el material, la restricción, la carga y la forma de la pieza.",
    minCharacters: OPEN_MIN_CHARS,
    placeholder: "Explica tu razonamiento con tus propias palabras...",
  },
];

const BEAM_QUESTIONS: readonly [
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3AOpenTextQuestion,
] = [
  {
    id: "beam-supports",
    type: "single_choice",
    prompt: "¿Cuántos apoyos tiene esta viga en el modelo?",
    options: [
      { id: "beam-one", label: "Solo uno, en el extremo izquierdo." },
      { id: "beam-two", label: "Dos, uno en cada extremo." },
      { id: "beam-three", label: "Tres, distribuidos a lo largo de la viga." },
    ],
    correctOptionId: "beam-one",
    shuffleOptions: true,
    feedback: {
      correct: "El diagrama solo marca un pasador en el extremo izquierdo; el resto de la viga no tiene ningún otro apoyo.",
      incorrect: "Cuenta los símbolos de apoyo (el triángulo con el pasador) dibujados en el diagrama: solo hay uno.",
    },
  },
  {
    id: "beam-equilibrium",
    type: "single_choice",
    prompt: "Con un solo apoyo tipo pasador y una carga vertical en el centro, ¿puede la viga estar en equilibrio estático?",
    options: [
      { id: "beam-mechanism", label: "No: un solo pasador no restringe la rotación de toda la viga, así que giraría como un mecanismo." },
      { id: "beam-yes-always", label: "Sí: un pasador siempre es suficiente para cualquier viga." },
      { id: "beam-yes-small", label: "Solo si la carga aplicada es muy pequeña." },
    ],
    correctOptionId: "beam-mechanism",
    shuffleOptions: true,
    feedback: {
      correct: "Un pasador restringe la traslación en ese punto, pero no evita que el resto de la viga gire alrededor de él: le falta al menos otro apoyo para estar en equilibrio.",
      incorrect: "Un solo pasador fija una posición, pero no impide que toda la pieza rote alrededor de ese punto como una palanca libre.",
    },
  },
  {
    id: "beam-validity",
    type: "single_choice",
    prompt: "¿Qué revela esto sobre el resultado reportado (0.4 mm de desplazamiento, FoS 3.5)?",
    options: [
      { id: "beam-invalid", label: "El resultado no es válido: un modelo mal restringido no converge a una solución física real, aunque el software entregue números." },
      { id: "beam-valid-small", label: "El resultado es válido porque el desplazamiento reportado es pequeño." },
      { id: "beam-valid-fos", label: "El resultado es válido porque el FoS reportado es mayor a 1." },
    ],
    correctOptionId: "beam-invalid",
    shuffleOptions: true,
    feedback: {
      correct: "Un modelo sin suficientes restricciones (grados de libertad sin fijar) es un mecanismo, no una estructura: cualquier número que reporte el software para ese caso no representa un comportamiento físico real.",
      incorrect: "Que los números reportados \"se vean razonables\" no valida el modelo: primero hay que confirmar que la pieza esté completamente restringida.",
    },
  },
  {
    id: "beam-coherence",
    type: "open_text",
    prompt: "¿Es coherente este resultado? Justifica tu respuesta usando el material, la restricción, la carga y la forma de la pieza.",
    minCharacters: OPEN_MIN_CHARS,
    placeholder: "Explica tu razonamiento con tus propias palabras...",
  },
];

const PLATE_QUESTIONS: readonly [
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3ASingleChoiceQuestion,
  M3AOpenTextQuestion,
] = [
  {
    id: "plate-stress-location",
    type: "single_choice",
    prompt: "¿Dónde se concentra el esfuerzo en una placa con un agujero bajo tracción?",
    options: [
      { id: "plate-hole-edge", label: "En el borde del agujero, en la dirección perpendicular a la carga." },
      { id: "plate-uniform", label: "Se reparte de forma uniforme en toda la placa." },
      { id: "plate-corners", label: "En las esquinas exteriores de la placa." },
    ],
    correctOptionId: "plate-hole-edge",
    shuffleOptions: true,
    feedback: {
      correct: "El borde del agujero, perpendicular a la carga, es el punto clásico de concentración de esfuerzo en este tipo de pieza.",
      incorrect: "Busca dónde el material \"tiene que rodear\" el agujero para seguir transmitiendo la carga: ahí es donde se concentra el esfuerzo.",
    },
  },
  {
    id: "plate-why-concentration",
    type: "single_choice",
    prompt: "¿Por qué el esfuerzo en el borde del agujero es mayor que el esfuerzo nominal lejos del agujero?",
    options: [
      { id: "plate-flow-lines", label: "El agujero interrumpe las líneas de flujo de fuerza, que se concentran al tener que rodearlo." },
      { id: "plate-weak-material", label: "El material cerca del agujero es intrínsecamente más débil." },
      { id: "plate-less-load", label: "El agujero reduce la carga total que soporta la placa." },
    ],
    correctOptionId: "plate-flow-lines",
    shuffleOptions: true,
    feedback: {
      correct: "Las líneas de fuerza no pueden atravesar el agujero, así que se \"aprietan\" al bordearlo, elevando el esfuerzo local ahí.",
      incorrect: "El material es el mismo en toda la placa; lo que cambia es que la fuerza debe redistribuirse para rodear el agujero.",
    },
  },
  {
    id: "plate-fos-margin",
    type: "single_choice",
    prompt: "Con un FoS mínimo de 1.4, ¿qué tan cerca está la pieza de fallar bajo esta carga?",
    options: [
      { id: "plate-tight-margin", label: "Tiene un margen positivo pero ajustado: resiste, pero con poco margen adicional." },
      { id: "plate-already-failed", label: "Ya falló, porque el FoS es menor a 2." },
      { id: "plate-unknown", label: "No hay forma de saberlo sin el esfuerzo de fluencia del material." },
    ],
    correctOptionId: "plate-tight-margin",
    shuffleOptions: true,
    feedback: {
      correct: "FoS 1.4 significa que el material resiste un 40% más del esfuerzo real aplicado: positivo, pero un margen ajustado para uso en producción.",
      incorrect: "FoS > 1 nunca significa falla; aquí el valor está reportado junto con el material, así que sí hay datos suficientes para interpretarlo.",
    },
  },
  {
    id: "plate-coherence",
    type: "open_text",
    prompt: "¿Es coherente este resultado? Justifica tu respuesta usando el material, la restricción, la carga y la forma de la pieza.",
    minCharacters: OPEN_MIN_CHARS,
    placeholder: "Explica tu razonamiento con tus propias palabras...",
  },
];

export const M3A_STEPS = [
  {
    id: "bracket",
    order: 1,
    title: "Ménsula en L",
    eyebrow: "Paso 1 de 3 · Lee el resultado del FEA",
    statement:
      "Una ménsula en L, empotrada en la pared, sostiene una carga en su extremo libre. Lee el panel de datos y el mapa de esfuerzo para responder.",
    diagram: "bracket",
    material: "Aluminio 6061 (E ≈ 70 GPa)",
    load: "500 N verticales en la punta",
    constraint: "Empotramiento en la cara posterior",
    reportedDisplacement: "1.8 mm",
    reportedFoS: "2.1 (en la esquina interior)",
    consistent: true,
    hints: [
      "Un empotramiento fija completamente la cara: nada de traslación ni de rotación en ese punto.",
      "Compara el FoS mínimo reportado (2.1) contra 1: si es mayor a 1, la pieza tiene margen antes de fallar bajo esa carga.",
    ],
    questions: BRACKET_QUESTIONS,
  },
  {
    id: "beam",
    order: 2,
    title: "Viga con un solo apoyo",
    eyebrow: "Paso 2 de 3 · Busca el error antes de confiar en el número",
    statement:
      "Esta viga recibe una carga puntual en el centro. Antes de creer el desplazamiento y el FoS reportados, revisa cómo está restringida.",
    diagram: "beam",
    material: "Acero A36",
    load: "800 N en el centro de la viga",
    constraint: "Apoyo tipo pasador en el extremo izquierdo (único)",
    reportedDisplacement: "0.4 mm",
    reportedFoS: "3.5",
    consistent: false,
    hints: [
      "Cuenta los apoyos dibujados en el diagrama: para que una viga esté en equilibrio necesita restringir traslación Y rotación en el conjunto de la pieza.",
      "Si a un modelo le faltan restricciones, es un mecanismo (se puede mover libremente), no una estructura: cualquier resultado numérico que reporte el software para ese caso no es confiable.",
    ],
    questions: BEAM_QUESTIONS,
  },
  {
    id: "plate",
    order: 3,
    title: "Placa con agujero en tracción",
    eyebrow: "Paso 3 de 3 · Concentración de esfuerzo",
    statement:
      "Una placa con un agujero central se estira por sus extremos. El mapa de esfuerzo muestra dónde se concentra la carga alrededor del agujero.",
    diagram: "plate",
    material: "Acero A36",
    load: "2000 N en tracción (a lo largo de la placa)",
    constraint: "Empotramiento en un extremo; carga en el extremo opuesto",
    reportedDisplacement: "0.6 mm",
    reportedFoS: "1.4 (en el borde del agujero)",
    consistent: true,
    hints: [
      "Las líneas de fuerza no pueden pasar por el agujero: se concentran al tener que rodearlo, igual que el agua alrededor de una piedra en un río.",
      "FoS 1.4 sigue siendo mayor a 1 (resiste), aunque con menos margen que en la ménsula del paso 1.",
    ],
    questions: PLATE_QUESTIONS,
  },
] as const satisfies readonly M3AStepDefinition[];

export const M3A_CHALLENGE = {
  id: "M3A",
  title: "¿La estructura aguanta?",
  subtitle: "Interpretación de análisis estructural (FEA)",
  introduction:
    "Lee tres resultados simulados de análisis estructural: una ménsula, una viga y una placa con agujero. Identifica restricciones, cargas y concentración de esfuerzo, y juzga si el resultado reportado es físicamente coherente — en al menos uno de los tres casos, no lo es.",
  totalSteps: 3,
  completionRule: "all_steps",
  attempts: "unlimited",
} as const satisfies M3AChallengeDefinition;

export const M3A_STEP_IDS = M3A_STEPS.map((step) => step.id) as readonly M3AStepId[];

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

export function getM3AStepTitle(stepId: M3AStepId): string {
  return M3A_STEPS.find((step) => step.id === stepId)?.title ?? stepId;
}

export function getDeterministicChoiceOptions(
  question: M3ASingleChoiceQuestion,
  stepId: M3AStepId,
  seed: string | number
): M3AChoiceOption[] {
  if (!question.shuffleOptions) return [...question.options];
  return deterministicShuffle(question.options, `M3A:${stepId}:${question.id}:${String(seed)}`);
}

function evaluateQuestion(
  question: M3AQuestionDefinition,
  rawValue: string | undefined
): M3AItemEvaluation {
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

export function evaluateM3AStep(step: M3AStepDefinition, submission: M3AStepSubmission): M3AStepEvaluation {
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
      ? "Identificaste correctamente la restricción, la concentración de esfuerzo y el margen de seguridad, y registraste tu justificación."
      : (firstIncorrectChoice?.feedback ??
        (!openItem?.isAnswered
          ? "Escribe tu justificación antes de continuar."
          : "Revisa tus respuestas e inténtalo de nuevo.")),
    items,
  };
}

export function isM3AComplete(completedStepIds: readonly M3AStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return M3A_STEP_IDS.every((stepId) => completed.has(stepId));
}

export function getNextM3AStepId(completedStepIds: readonly M3AStepId[]): M3AStepId | null {
  const completed = new Set(completedStepIds);
  return M3A_STEP_IDS.find((stepId) => !completed.has(stepId)) ?? null;
}
