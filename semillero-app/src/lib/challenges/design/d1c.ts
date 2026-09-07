/**
 * Pure content and evaluation engine for Design/CAD D1C.
 *
 * No React, browser-storage, or application-state dependencies here — a UI
 * renders these definitions and persists submissions wherever appropriate.
 *
 * Six steps in two families:
 *  - "single_choice" steps (view-1, view-2, toolblock-1): pick one option id.
 *  - "numeric" steps (toolblock-2/3/4): type a mass in grams, checked with a
 *    tolerance against a reference value (never shown to the candidate).
 */

export type D1CStepId =
  | "view-1"
  | "view-2"
  | "toolblock-1"
  | "toolblock-2"
  | "toolblock-3"
  | "toolblock-4";

export const D1C_STEP_IDS = [
  "view-1",
  "view-2",
  "toolblock-1",
  "toolblock-2",
  "toolblock-3",
  "toolblock-4",
] as const satisfies readonly D1CStepId[];

export type D1CStepKind = "single_choice" | "numeric";

export interface D1COption {
  readonly id: string;
  readonly label: string;
}

export interface D1CFeedback {
  readonly correct: string;
  readonly incorrect: string;
}

export interface D1CImage {
  readonly src: string;
  readonly alt: string;
}

export interface D1CBaseStep {
  readonly id: D1CStepId;
  readonly order: 1 | 2 | 3 | 4 | 5 | 6;
  readonly eyebrow: string;
  readonly title: string;
  readonly statement: string;
  readonly image?: D1CImage;
  readonly hints: readonly string[];
  readonly feedback: D1CFeedback;
}

export interface D1CSingleChoiceStep extends D1CBaseStep {
  readonly kind: "single_choice";
  readonly options: readonly D1COption[];
  readonly correctOptionId: string;
}

export interface D1CNumericStep extends D1CBaseStep {
  readonly kind: "numeric";
  readonly unit: string;
  /** Valor de referencia interno — nunca se muestra al aspirante. */
  readonly targetValue: number;
  /** Tolerancia relativa, ej. 0.01 = ±1%. */
  readonly tolerance: number;
}

export type D1CStepDefinition = D1CSingleChoiceStep | D1CNumericStep;

export interface D1CSingleChoiceSubmission {
  readonly stepId: D1CStepId;
  readonly kind: "single_choice";
  readonly selectedOptionId: string;
}

export interface D1CNumericSubmission {
  readonly stepId: D1CStepId;
  readonly kind: "numeric";
  readonly value: string;
}

export type D1CSubmission = D1CSingleChoiceSubmission | D1CNumericSubmission;

export interface D1CEvaluation {
  readonly isCorrect: boolean;
  readonly feedback: string;
}

const TOOLBLOCK_CONFIG_NOTE =
  "Sistema de unidades MMGS, 2 decimales, origen de pieza arbitrario. Todos los agujeros son Through All salvo que se indique lo contrario. Material: AISI 1020 Steel (densidad 0.0079 g/mm³).";

export const D1C_STEPS: Readonly<Record<D1CStepId, D1CStepDefinition>> = {
  "view-1": {
    id: "view-1",
    order: 1,
    kind: "single_choice",
    eyebrow: "Paso 1 de 6 · Vistas de dibujo",
    title: "¿Qué vista se debe insertar?",
    statement:
      "Para crear la vista de dibujo B, es necesario dibujar una spline, como se muestra, sobre la vista de dibujo A. ¿Qué tipo de vista se debe insertar?",
    image: {
      src: "/challenges/design/d1c/d1c-view-1.png",
      alt: "Vista de dibujo A con una spline dibujada sobre ella, usada para generar la vista de dibujo B",
    },
    hints: [
      "El comando parte de un perfil cerrado (como una spline) dibujado directamente sobre una vista ya existente.",
      "No genera un corte ni una proyección nueva: recorta la vista existente a la forma del perfil.",
    ],
    feedback: {
      correct: "Correcto — es una vista Crop: recorta la vista A al contorno cerrado de la spline.",
      incorrect: "Aún no. Piensa en qué comando usa un perfil cerrado sobre una vista existente para recortarla a esa forma, sin crear un corte.",
    },
    options: [
      { id: "a", label: "Section" },
      { id: "b", label: "Crop" },
      { id: "c", label: "Projected" },
      { id: "d", label: "Isometric" },
    ],
    correctOptionId: "b",
  },

  "view-2": {
    id: "view-2",
    order: 2,
    kind: "single_choice",
    eyebrow: "Paso 2 de 6 · Vistas de dibujo",
    title: "¿Qué vista se debe insertar?",
    statement:
      "Para crear la vista de dibujo B, es necesario dibujar una spline, como se muestra, sobre la vista de dibujo A. ¿Qué tipo de vista se debe insertar?",
    image: {
      src: "/challenges/design/d1c/d1c-view-2.png",
      alt: "Vista de dibujo A con una spline dibujada sobre ella para revelar geometría interna en la vista de dibujo B",
    },
    hints: [
      "A diferencia del paso anterior, aquí la spline se usa para arrancar material y revelar geometría interna, no para recortar el contorno visible.",
      "Es una variante de vista de sección que no requiere una línea de corte recta a través de toda la pieza.",
    ],
    feedback: {
      correct: "Correcto — es una vista Broken-out Section: usa el perfil de la spline para retirar material y mostrar el interior en esa zona.",
      incorrect: "Aún no. Piensa en qué vista revela geometría interna a partir de un perfil cerrado, sin necesitar una línea de corte recta a lo largo de toda la pieza.",
    },
    options: [
      { id: "a", label: "Aligned Section" },
      { id: "b", label: "Detail" },
      { id: "c", label: "Broken-out Section" },
      { id: "d", label: "Section" },
    ],
    correctOptionId: "c",
  },

  "toolblock-1": {
    id: "toolblock-1",
    order: 3,
    kind: "single_choice",
    eyebrow: "Paso 3 de 6 · Tool Block, Step 1",
    title: "¿Cuál es la masa total de la pieza?",
    statement:
      `Construye la pieza en el software CAD de tu preferencia (SOLIDWORKS, Fusion 360 u otro equivalente) utilizando los planos proporcionados. ${TOOLBLOCK_CONFIG_NOTE} Parámetros: A = 81.00, B = 57.00, C = 43.00. ¿Cuál es la masa total de la pieza en gramos?`,
    image: {
      src: "/challenges/design/d1c/d1c-toolblock-step1.png",
      alt: "Plano acotado del Tool Block, Step 1, con parámetros A, B y C",
    },
    hints: [
      "Verifica que el sistema de unidades esté en MMGS y que el material asignado sea AISI 1020 Steel antes de leer la masa.",
      "Revisa que todos los agujeros sean Through All salvo que el plano indique lo contrario; un agujero ciego por error cambia la masa.",
    ],
    feedback: {
      correct: "Correcto — con A = 81.00, B = 57.00 y C = 43.00, la pieza en AISI 1020 Steel tiene una masa de 939.54 g.",
      incorrect: "Aún no. Revisa las dimensiones A, B y C, el material asignado y que los agujeros sean Through All, y vuelve a calcular la masa.",
    },
    options: [
      { id: "a", label: "1028.33" },
      { id: "b", label: "118.93" },
      { id: "c", label: "577.64" },
      { id: "d", label: "939.54" },
    ],
    correctOptionId: "d",
  },

  "toolblock-2": {
    id: "toolblock-2",
    order: 4,
    kind: "numeric",
    eyebrow: "Paso 4 de 6 · Tool Block, Step 2",
    title: "Reporta la masa total",
    statement:
      `Modifica la pieza del paso anterior. ${TOOLBLOCK_CONFIG_NOTE} Nuevos parámetros: A = 84.00, B = 59.00, C = 45.00. Todas las demás dimensiones permanecen iguales a las del paso anterior. ¿Cuál es la masa total de la pieza en gramos?`,
    hints: [
      "Solo cambian A, B y C; el resto de la geometría (agujeros, redondeos, etc.) se mantiene igual al Step 1.",
      "Vuelve a verificar la masa después de actualizar las tres cotas — un solo parámetro desactualizado altera el resultado.",
    ],
    feedback: {
      correct: "Correcto — dentro de la tolerancia sobre el valor de referencia.",
      incorrect: "Aún no. Confirma que actualizaste A, B y C a los nuevos valores y que el resto de la pieza no cambió, y vuelve a intentar.",
    },
    unit: "g",
    targetValue: 1032.32,
    tolerance: 0.01,
  },

  "toolblock-3": {
    id: "toolblock-3",
    order: 5,
    kind: "numeric",
    eyebrow: "Paso 5 de 6 · Tool Block, Step 3",
    title: "Reporta la masa total",
    statement:
      `Modifica la pieza creada anteriormente. ${TOOLBLOCK_CONFIG_NOTE} Elimina material según los planos proporcionados y actualiza los parámetros: A = 86.00, B = 58.00, C = 44.00. ¿Cuál es la masa total de la pieza en gramos?`,
    image: {
      src: "/challenges/design/d1c/d1c-toolblock-step3.png",
      alt: "Plano acotado del Tool Block, Step 3, mostrando el material a eliminar y los parámetros A, B y C actualizados",
    },
    hints: [
      "Este paso quita material además de cambiar A, B y C — revisa con cuidado la zona señalada en el plano antes de recalcular.",
      "Si el resultado no coincide, primero confirma que el material eliminado tiene la forma y ubicación exactas del plano.",
    ],
    feedback: {
      correct: "Correcto — dentro de la tolerancia sobre el valor de referencia.",
      incorrect: "Aún no. Revisa que hayas retirado el material indicado en el plano y actualizado A, B y C, y vuelve a intentar.",
    },
    unit: "g",
    targetValue: 628.18,
    tolerance: 0.01,
  },

  "toolblock-4": {
    id: "toolblock-4",
    order: 6,
    kind: "numeric",
    eyebrow: "Paso 6 de 6 · Tool Block, Step 4",
    title: "Reporta la masa total",
    statement:
      `Modifica la pieza creada en el paso anterior agregando un bolsillo (pocket). ${TOOLBLOCK_CONFIG_NOTE} Usa la pieza del paso anterior, agrega un solo pocket en un único lado — la pieza resultante no es simétrica. Todas las dimensiones que no se indiquen permanecen iguales a las del paso anterior. ¿Cuál es la masa total de la pieza en gramos?`,
    image: {
      src: "/challenges/design/d1c/d1c-toolblock-step4.png",
      alt: "Plano acotado del Tool Block, Step 4, mostrando el pocket a agregar en un único lado",
    },
    hints: [
      "El pocket va en un solo lado — si tu pieza queda simétrica, algo no coincide con el plano.",
      "Parte de la pieza del Step 3 (ya con el material anterior retirado) y agrega únicamente el pocket nuevo.",
    ],
    feedback: {
      correct: "Correcto — dentro de la tolerancia sobre el valor de referencia.",
      incorrect: "Aún no. Verifica que el pocket esté en un solo lado, con la ubicación y dimensiones del plano, y vuelve a intentar.",
    },
    unit: "g",
    targetValue: 432.58,
    tolerance: 0.01,
  },
};

export const D1C_CHALLENGE = {
  id: "D1C",
  title: "Vistas técnicas y Tool Block",
  subtitle: "Subhabilidad · Vistas de dibujo y masa de una pieza modificada en pasos",
  introduction:
    "Identifica el tipo de vista de dibujo correcto y luego construye y modifica una pieza en varios pasos, reportando su masa en cada uno.",
  attempts: "unlimited",
  completionRule: "all_steps",
  totalSteps: 6,
} as const;

export function createD1CDraft(stepId: D1CStepId): D1CSubmission {
  const step = D1C_STEPS[stepId];
  if (step.kind === "single_choice") {
    return { stepId, kind: "single_choice", selectedOptionId: "" };
  }
  return { stepId, kind: "numeric", value: "" };
}

export function normalizeD1CDraft(stepId: D1CStepId, raw: unknown): D1CSubmission {
  const step = D1C_STEPS[stepId];
  if (step.kind === "single_choice") {
    if (
      raw &&
      typeof raw === "object" &&
      (raw as { kind?: unknown }).kind === "single_choice" &&
      typeof (raw as { selectedOptionId?: unknown }).selectedOptionId === "string"
    ) {
      return {
        stepId,
        kind: "single_choice",
        selectedOptionId: (raw as { selectedOptionId: string }).selectedOptionId,
      };
    }
    return { stepId, kind: "single_choice", selectedOptionId: "" };
  }
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { kind?: unknown }).kind === "numeric" &&
    typeof (raw as { value?: unknown }).value === "string"
  ) {
    return { stepId, kind: "numeric", value: (raw as { value: string }).value };
  }
  return { stepId, kind: "numeric", value: "" };
}

export function isD1CDraftReady(submission: D1CSubmission): boolean {
  if (submission.kind === "single_choice") return submission.selectedOptionId.length > 0;
  return submission.value.trim().length > 0;
}

export function evaluateD1CStep(submission: D1CSubmission): D1CEvaluation {
  const step = D1C_STEPS[submission.stepId];

  if (step.kind === "single_choice" && submission.kind === "single_choice") {
    const isCorrect = submission.selectedOptionId === step.correctOptionId;
    return { isCorrect, feedback: isCorrect ? step.feedback.correct : step.feedback.incorrect };
  }

  if (step.kind === "numeric" && submission.kind === "numeric") {
    const parsed = Number(submission.value.replace(",", "."));
    let isCorrect = false;
    if (Number.isFinite(parsed)) {
      const lo = step.targetValue * (1 - step.tolerance);
      const hi = step.targetValue * (1 + step.tolerance);
      isCorrect = parsed >= lo && parsed <= hi;
    }
    return { isCorrect, feedback: isCorrect ? step.feedback.correct : step.feedback.incorrect };
  }

  return { isCorrect: false, feedback: step.feedback.incorrect };
}

export function isD1CComplete(completedStepIds: readonly D1CStepId[]): boolean {
  const completed = new Set(completedStepIds);
  return D1C_STEP_IDS.every((stepId) => completed.has(stepId));
}
