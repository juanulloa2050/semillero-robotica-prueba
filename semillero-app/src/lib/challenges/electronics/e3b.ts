/** Pure, serializable content and validation rules for Electronics E3B. */

import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

export type E3BStepId = "explore" | "simulate" | "test" | "reflect";

export interface E3BSimulatorEntry {
  readonly id: "simulator-1" | "simulator-2" | "simulator-3";
  readonly name: string;
  readonly whatCanSimulate: string;
  readonly advantage: string;
  readonly limitation: string;
  readonly useCase: string;
}

export interface E3BExploreSubmission {
  readonly stepId: "explore";
  readonly simulators: readonly E3BSimulatorEntry[];
  readonly selectedSimulator: string;
  readonly selectionJustification: string;
}

export interface E3BMotorState {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export const E3B_MOTOR_STATES = [
  {
    id: "stopped",
    title: "Estado 1 · Detenido",
    description: "Ambos motores detenidos.",
  },
  {
    id: "forward",
    title: "Estado 2 · Mismo sentido",
    description: "Los dos motores giran en el mismo sentido.",
  },
  {
    id: "reverse",
    title: "Estado 3 · Sentido contrario",
    description: "Los dos motores invierten el sentido respecto al estado anterior.",
  },
  {
    id: "independent",
    title: "Estado 4 · Control independiente",
    description:
      "Los motores reciben comandos distintos: uno detenido y otro encendido, sentidos diferentes, velocidades distintas por PWM, u otra evidencia clara de control independiente.",
  },
] as const satisfies readonly E3BMotorState[];

export type E3BMotorStateId = (typeof E3B_MOTOR_STATES)[number]["id"];

export interface E3BSimulateSubmission {
  readonly stepId: "simulate";
  readonly simulatorUsed: string;
  readonly microcontroller: string;
  readonly motorDriver: string;
  readonly motorType: string;
  readonly powerSource: string;
  readonly overviewFiles: readonly LocalEvidenceFile[];
  readonly codeText: string;
  readonly codeFiles: readonly LocalEvidenceFile[];
  readonly stateFiles: Readonly<Partial<Record<E3BMotorStateId, readonly LocalEvidenceFile[]>>>;
  readonly sharedVideoFiles: readonly LocalEvidenceFile[];
  readonly sharedVideoStateIds: readonly E3BMotorStateId[];
  readonly driverExplanation: string;
}

export interface E3BCondition {
  readonly id: "condition-1" | "condition-2" | "condition-3";
  readonly sensorCondition: string;
  readonly motorBehavior: string;
}

export interface E3BScenario {
  readonly id: "scenario-a" | "scenario-b" | "scenario-c";
  readonly sensorValue: string;
  readonly observedBehavior: string;
  readonly files: readonly LocalEvidenceFile[];
}

export interface E3BTestSubmission {
  readonly stepId: "test";
  readonly simulatorUsed: string;
  readonly sensorUsed: string;
  readonly overviewFiles: readonly LocalEvidenceFile[];
  readonly codeText: string;
  readonly codeFiles: readonly LocalEvidenceFile[];
  readonly conditions: readonly E3BCondition[];
  readonly scenarios: readonly E3BScenario[];
  readonly informationFlowExplanation: string;
}

export interface E3BReflectSubmission {
  readonly stepId: "reflect";
  readonly simulationAdvantage: string;
  readonly realWorldDifference: string;
}

export type E3BSubmission =
  | E3BExploreSubmission
  | E3BSimulateSubmission
  | E3BTestSubmission
  | E3BReflectSubmission;

export interface E3BStepValidation {
  readonly stepId: E3BStepId;
  readonly isComplete: boolean;
  readonly errors: readonly string[];
  readonly feedback: string;
}

export const E3B_STEP_IDS = [
  "explore",
  "simulate",
  "test",
  "reflect",
] as const satisfies readonly E3BStepId[];

export const E3B_MINIMUMS = {
  selectionJustification: 30,
  driverExplanation: 60,
  informationFlowExplanation: 60,
  reflectionAnswer: 40,
} as const;

export const E3B_CHALLENGE = {
  id: "E3B",
  title: "Simula antes de construir",
  subtitle:
    "Investiga herramientas de simulación, controla dos motores y añade un sensor que cambie su comportamiento.",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    explore: {
      id: "explore",
      badge: "EXPLORE",
      title: "Explora simuladores",
      eyebrow: "Paso 1 de 4 · Investigación",
      statement:
        "Antes de simular un circuito, conoce las herramientas disponibles. Investiga tres simuladores de electrónica diferentes y compáralos: qué permite simular cada uno, su principal ventaja, una limitación y en qué tipo de proyecto lo usarías.",
      hints: [
        "¿No sabes por dónde comenzar? Puedes investigar herramientas como Tinkercad Circuits, Wokwi, Falstad, LTspice, Proteus, Multisim u otras. La lista es solo una referencia: no obliga a escoger esas herramientas.",
      ],
    },
    simulate: {
      id: "simulate",
      badge: "SIMULATE",
      title: "Controla dos motores",
      eyebrow: "Paso 2 de 4 · Simulación",
      statement:
        "Construye una simulación electrónica capaz de controlar dos motores DC mediante un microcontrolador. Ambos motores deben controlarse a través de un driver de motores adecuado, y tu simulación debe demostrar distintos estados de funcionamiento y control independiente.",
      warning:
        "No debes simular un robot completo. No necesitas chasis, ruedas, masa, movimiento físico ni un entorno virtual: tu objetivo es únicamente simular los componentes electrónicos necesarios para controlar dos motores DC.",
      hints: [],
    },
    test: {
      id: "test",
      badge: "TEST",
      title: "Haz que el sistema reaccione",
      eyebrow: "Paso 3 de 4 · Integración",
      statement:
        "En la simulación anterior controlaste dos motores mediante instrucciones programadas. Ahora añade un sensor y utiliza su lectura para modificar automáticamente el comportamiento de los motores. Define al menos dos condiciones diferentes del sensor y logra que los motores respondan de manera distinta ante cada una.",
      hints: [
        "Ejemplo: con un sensor de distancia podrías hacer que los motores funcionen cuando un objeto esté lejos y se detengan cuando esté cerca.",
      ],
    },
    reflect: {
      id: "reflect",
      badge: "EXPLAIN",
      title: "Reflexiona",
      eyebrow: "Paso 4 de 4 · Cierre",
      statement:
        "Cierra el laboratorio explicando qué validaste mediante simulación y qué podría comportarse diferente al llevar el sistema a hardware real.",
      hints: [],
    },
  },
} as const;

const SIMULATOR_IDS = ["simulator-1", "simulator-2", "simulator-3"] as const;
const CONDITION_IDS = ["condition-1", "condition-2", "condition-3"] as const;
const SCENARIO_IDS = ["scenario-a", "scenario-b", "scenario-c"] as const;

function createEmptySimulator(id: E3BSimulatorEntry["id"]): E3BSimulatorEntry {
  return { id, name: "", whatCanSimulate: "", advantage: "", limitation: "", useCase: "" };
}

function createEmptyCondition(id: E3BCondition["id"]): E3BCondition {
  return { id, sensorCondition: "", motorBehavior: "" };
}

function createEmptyScenario(id: E3BScenario["id"]): E3BScenario {
  return { id, sensorValue: "", observedBehavior: "", files: [] };
}

export function createE3BDraft(stepId: E3BStepId): E3BSubmission {
  switch (stepId) {
    case "explore":
      return {
        stepId,
        simulators: SIMULATOR_IDS.map(createEmptySimulator),
        selectedSimulator: "",
        selectionJustification: "",
      };
    case "simulate":
      return {
        stepId,
        simulatorUsed: "",
        microcontroller: "",
        motorDriver: "",
        motorType: "",
        powerSource: "",
        overviewFiles: [],
        codeText: "",
        codeFiles: [],
        stateFiles: {},
        sharedVideoFiles: [],
        sharedVideoStateIds: [],
        driverExplanation: "",
      };
    case "test":
      return {
        stepId,
        simulatorUsed: "",
        sensorUsed: "",
        overviewFiles: [],
        codeText: "",
        codeFiles: [],
        conditions: CONDITION_IDS.map(createEmptyCondition),
        scenarios: SCENARIO_IDS.map(createEmptyScenario),
        informationFlowExplanation: "",
      };
    case "reflect":
      return { stepId, simulationAdvantage: "", realWorldDifference: "" };
  }
}

export function isE3BStepId(value: unknown): value is E3BStepId {
  return typeof value === "string" && E3B_STEP_IDS.includes(value as E3BStepId);
}

export function validateE3B(submission: E3BSubmission): E3BStepValidation {
  if (submission.stepId === "explore") return validateExplore(submission);
  if (submission.stepId === "simulate") return validateSimulate(submission);
  if (submission.stepId === "test") return validateTest(submission);
  return validateReflect(submission);
}

function validateExplore(submission: E3BExploreSubmission): E3BStepValidation {
  const errors: string[] = [];
  const names = submission.simulators
    .map((simulator) => simulator.name.trim().toLowerCase())
    .filter((name) => name.length > 0);
  if (names.length < 3 || new Set(names).size < 3) {
    errors.push("Nombra tres simuladores diferentes.");
  }
  const hasIncompleteCard = submission.simulators.some(
    (simulator) =>
      !simulator.name.trim() ||
      !simulator.whatCanSimulate.trim() ||
      !simulator.advantage.trim() ||
      !simulator.limitation.trim() ||
      !simulator.useCase.trim()
  );
  if (hasIncompleteCard) {
    errors.push("Completa qué simula, ventaja, limitación y caso de uso en las tres tarjetas.");
  }
  if (!submission.selectedSimulator.trim()) {
    errors.push("Indica cuál de los tres simuladores elegirías para un sistema robótico.");
  }
  if (submission.selectionJustification.trim().length < E3B_MINIMUMS.selectionJustification) {
    errors.push(`Justifica tu elección con al menos ${E3B_MINIMUMS.selectionJustification} caracteres.`);
  }
  const isComplete = errors.length === 0;
  return {
    stepId: "explore",
    isComplete,
    errors,
    feedback: isComplete
      ? "Comparación registrada para revisión."
      : "Completa la comparación de los tres simuladores.",
  };
}

function validateSimulate(submission: E3BSimulateSubmission): E3BStepValidation {
  const errors: string[] = [];
  if (!submission.simulatorUsed.trim()) errors.push("Indica qué simulador utilizaste.");
  if (submission.overviewFiles.length === 0) {
    errors.push("Sube una captura donde se vean claramente los componentes de tu simulación.");
  }
  if (!submission.codeText.trim() && submission.codeFiles.length === 0) {
    errors.push("Comparte tu código: escríbelo o adjunta un archivo.");
  }
  const missingStates = E3B_MOTOR_STATES.filter((state) => {
    const direct = submission.stateFiles[state.id];
    const coveredByVideo =
      submission.sharedVideoFiles.length > 0 && submission.sharedVideoStateIds.includes(state.id);
    return !(direct && direct.length > 0) && !coveredByVideo;
  });
  if (missingStates.length > 0) {
    errors.push(`Falta evidencia de: ${missingStates.map((state) => state.title).join(", ")}.`);
  }
  if (submission.driverExplanation.trim().length < E3B_MINIMUMS.driverExplanation) {
    errors.push(`Explica por qué usaste un driver (mínimo ${E3B_MINIMUMS.driverExplanation} caracteres).`);
  }
  const isComplete = errors.length === 0;
  return {
    stepId: "simulate",
    isComplete,
    errors,
    feedback: isComplete
      ? "Simulación de control registrada para revisión."
      : "Completa la simulación de control antes de continuar.",
  };
}

function validateTest(submission: E3BTestSubmission): E3BStepValidation {
  const errors: string[] = [];
  if (!submission.simulatorUsed.trim()) errors.push("Indica qué simulador utilizaste.");
  if (!submission.sensorUsed.trim()) errors.push("Indica qué sensor utilizaste.");
  if (submission.overviewFiles.length === 0) errors.push("Sube una captura general de la simulación.");
  if (!submission.codeText.trim() && submission.codeFiles.length === 0) {
    errors.push("Comparte tu código: escríbelo o adjunta un archivo.");
  }
  const [firstCondition, secondCondition] = submission.conditions;
  const conditionReady = (condition?: E3BCondition) =>
    Boolean(condition?.sensorCondition.trim() && condition?.motorBehavior.trim());
  if (!conditionReady(firstCondition) || !conditionReady(secondCondition)) {
    errors.push("Define al menos dos condiciones del sensor con su comportamiento esperado.");
  }
  const [scenarioA, scenarioB] = submission.scenarios;
  const scenarioReady = (scenario?: E3BScenario) =>
    Boolean(scenario?.sensorValue.trim() && scenario?.observedBehavior.trim() && scenario.files.length > 0);
  if (!scenarioReady(scenarioA)) errors.push("Completa el escenario A con su evidencia visual.");
  if (!scenarioReady(scenarioB)) errors.push("Completa el escenario B con su evidencia visual.");
  if (submission.informationFlowExplanation.trim().length < E3B_MINIMUMS.informationFlowExplanation) {
    errors.push(
      `Explica cómo viaja la información del sensor a los motores (mínimo ${E3B_MINIMUMS.informationFlowExplanation} caracteres).`
    );
  }
  const isComplete = errors.length === 0;
  return {
    stepId: "test",
    isComplete,
    errors,
    feedback: isComplete
      ? "Integración de sensor registrada para revisión."
      : "Completa la integración del sensor antes de continuar.",
  };
}

function validateReflect(submission: E3BReflectSubmission): E3BStepValidation {
  const errors: string[] = [];
  if (submission.simulationAdvantage.trim().length < E3B_MINIMUMS.reflectionAnswer) {
    errors.push(`Desarrolla la primera reflexión (mínimo ${E3B_MINIMUMS.reflectionAnswer} caracteres).`);
  }
  if (submission.realWorldDifference.trim().length < E3B_MINIMUMS.reflectionAnswer) {
    errors.push(`Desarrolla la segunda reflexión (mínimo ${E3B_MINIMUMS.reflectionAnswer} caracteres).`);
  }
  const isComplete = errors.length === 0;
  return {
    stepId: "reflect",
    isComplete,
    errors,
    feedback: isComplete
      ? "Reflexión registrada. El laboratorio queda listo para revisión."
      : "Completa las dos reflexiones finales.",
  };
}

export function isE3BComplete(completedStepIds: readonly E3BStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return E3B_STEP_IDS.every((id) => completed.has(id));
}
