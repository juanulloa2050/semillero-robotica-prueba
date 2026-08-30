import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

export type E2StepId = "brief" | "components" | "schematic" | "architecture";

export type E2ComponentCategory =
  | "microcontroller"
  | "front-sensor"
  | "edge-sensor"
  | "driver"
  | "actuators"
  | "indicator"
  | "power-source"
  | "other";

export interface E2Requirement {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface E2ComponentCategoryOption {
  readonly id: E2ComponentCategory;
  readonly label: string;
  readonly required: boolean;
}

export interface E2ComponentRow {
  readonly id: string;
  readonly category: E2ComponentCategory | "";
  readonly componentName: string;
  readonly purpose: string;
  readonly justification: string;
}

export interface E2BriefSubmission {
  readonly stepId: "brief";
  readonly confirmedRequirementIds: readonly string[];
}

export interface E2ComponentsSubmission {
  readonly stepId: "components";
  readonly rows: readonly E2ComponentRow[];
}

export interface E2SchematicSubmission {
  readonly stepId: "schematic";
  /** Serializable IndexedDB metadata; the binary is kept out of app state. */
  readonly files: readonly LocalEvidenceFile[];
}

export interface E2ArchitectureSubmission {
  readonly stepId: "architecture";
  readonly explanation: string;
}

export type E2StepSubmission =
  | E2BriefSubmission
  | E2ComponentsSubmission
  | E2SchematicSubmission
  | E2ArchitectureSubmission;

export interface E2StepValidation {
  readonly stepId: E2StepId;
  readonly isComplete: boolean;
  readonly errors: readonly string[];
  readonly missingCategoryIds?: readonly E2ComponentCategory[];
}

export interface E2StepDefinition {
  readonly id: E2StepId;
  readonly order: number;
  readonly title: string;
  readonly eyebrow: string;
  readonly statement: string;
  readonly hints: readonly string[];
}

export type E2SupportedEvidenceType =
  | "image/png"
  | "image/jpeg"
  | "application/pdf";

export const E2_ARCHITECTURE_MIN_CHARS = 160;

export const E2_REQUIREMENTS = [
  {
    id: "front-obstacle",
    label: "Detectar un obstáculo frontal",
    description:
      "Debe percibir un obstáculo frente a él a una distancia aproximada de 10 a 30 cm y reaccionar (detenerse, retroceder o esquivar) antes de chocar.",
  },
  {
    id: "edge",
    label: "Detectar un borde o desnivel",
    description:
      "No solo obstáculos al frente: también debe notar cuando el piso desaparece bajo él (por ejemplo el borde de una mesa) para no caerse.",
  },
  {
    id: "two-wheels",
    label: "Mover al menos dos ruedas",
    description:
      "Debe controlar al menos dos ruedas de forma independiente, con potencia suficiente para avanzar, retroceder y girar.",
  },
  {
    id: "visual-signal",
    label: "Mostrar el estado con una señal visual",
    description:
      "Debe comunicar su estado (por ejemplo detenido, avanzando o en alerta) con una señal visual, como un LED o una matriz LED.",
  },
  {
    id: "mcu",
    label: "Ser controlado por un microcontrolador",
    description:
      "La decisión de qué hacer con los motores a partir de lo que leen los sensores debe tomarla un microcontrolador, no electrónica puramente analógica.",
  },
] as const satisfies readonly E2Requirement[];

export const E2_COMPONENT_CATEGORIES = [
  { id: "microcontroller", label: "Microcontrolador", required: true },
  { id: "front-sensor", label: "Sensor frontal", required: true },
  { id: "edge-sensor", label: "Sensor de borde", required: true },
  { id: "driver", label: "Driver", required: true },
  { id: "actuators", label: "Actuadores", required: true },
  { id: "indicator", label: "Indicador", required: true },
  { id: "power-source", label: "Fuente", required: true },
  { id: "other", label: "Otro", required: false },
] as const satisfies readonly E2ComponentCategoryOption[];

export const E2_REQUIRED_CATEGORY_IDS = E2_COMPONENT_CATEGORIES.filter(
  (category) => category.required
).map((category) => category.id);

export const E2_SUPPORTED_EVIDENCE_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const satisfies readonly E2SupportedEvidenceType[];

export const E2_STEPS = [
  {
    id: "brief",
    order: 1,
    title: "Entiende el robot",
    eyebrow: "Paso 1 de 4 · Brief del robot",
    statement:
      "Lee el problema y confirma los requisitos que deberá cubrir tu propuesta electrónica.",
    hints: [],
  },
  {
    id: "components",
    order: 2,
    title: "Define los componentes",
    eyebrow: "Paso 2 de 4 · Lista justificada",
    statement:
      "Propón los componentes del sistema y explica para qué sirve cada uno y por qué lo elegiste. Investiga por tu cuenta: no necesitas usar una marca o modelo concreto.",
    hints: [],
  },
  {
    id: "schematic",
    order: 3,
    title: "Entrega el esquema",
    eyebrow: "Paso 3 de 4 · Esquema propio",
    statement:
      "Debes entregar el plano eléctrico de tu robot. Sube una imagen o un PDF legible que represente tu propia propuesta.",
    hints: [],
  },
  {
    id: "architecture",
    order: 4,
    title: "Explica la arquitectura",
    eyebrow: "Paso 4 de 4 · Decisiones de diseño",
    statement:
      "Explica el recorrido sensor → procesamiento → decisión → driver → actuador y cómo tu esquema responde al brief.",
    hints: [],
  },
] as const satisfies readonly E2StepDefinition[];

export const E2_STEP_IDS = E2_STEPS.map((step) => step.id) as readonly E2StepId[];

export const E2_CHALLENGE = {
  id: "E2",
  title: "Del problema al esquema electrónico",
  subtitle: "Del sensor al motor",
  introduction:
    "Convierte el brief de un robot móvil en una selección justificada de componentes, un esquema propio y una explicación de arquitectura.",
  totalSteps: E2_STEPS.length,
  completionRule: "all_steps",
  attempts: "unlimited",
  manualRubric: {
    criteriaCount: 5,
    pointsPerCriterion: 2,
    maximumScore: 10,
  },
} as const;

export function createEmptyE2ComponentRow(id: string): E2ComponentRow {
  return {
    id,
    category: "",
    componentName: "",
    purpose: "",
    justification: "",
  };
}

export function createEmptyE2Draft(stepId: E2StepId): E2StepSubmission {
  switch (stepId) {
    case "brief":
      return { stepId, confirmedRequirementIds: [] };
    case "components":
      return {
        stepId,
        rows: E2_REQUIRED_CATEGORY_IDS.map((category, index) => ({
          ...createEmptyE2ComponentRow(`component-${index + 1}`),
          category,
        })),
      };
    case "schematic":
      return { stepId, files: [] };
    case "architecture":
      return { stepId, explanation: "" };
  }
}

export function isE2StepId(value: unknown): value is E2StepId {
  return typeof value === "string" && E2_STEP_IDS.includes(value as E2StepId);
}

export function isE2ComponentCategory(
  value: unknown
): value is E2ComponentCategory {
  return (
    typeof value === "string" &&
    E2_COMPONENT_CATEGORIES.some((category) => category.id === value)
  );
}

export function isE2SupportedEvidenceType(
  value: unknown
): value is E2SupportedEvidenceType {
  return (
    typeof value === "string" &&
    E2_SUPPORTED_EVIDENCE_TYPES.includes(value as E2SupportedEvidenceType)
  );
}

export function validateE2Submission(
  submission: E2StepSubmission
): E2StepValidation {
  switch (submission.stepId) {
    case "brief": {
      const confirmed = new Set(submission.confirmedRequirementIds);
      const missing = E2_REQUIREMENTS.filter(
        (requirement) => !confirmed.has(requirement.id)
      );
      return {
        stepId: submission.stepId,
        isComplete: missing.length === 0,
        errors:
          missing.length === 0
            ? []
            : ["Confirma los cinco requisitos del brief para continuar."],
      };
    }
    case "components": {
      const completeRows = submission.rows.filter(isCompleteComponentRow);
      const represented = new Set(completeRows.map((row) => row.category));
      const missingCategoryIds = E2_REQUIRED_CATEGORY_IDS.filter(
        (categoryId) => !represented.has(categoryId)
      );
      const hasIncompleteRows = submission.rows.some(
        (row) => !isCompleteComponentRow(row)
      );
      const errors: string[] = [];
      if (submission.rows.length === 0) {
        errors.push("Añade al menos una fila de componentes.");
      } else if (hasIncompleteRows) {
        errors.push("Completa categoría, componente, propósito y justificación en cada fila.");
      }
      if (missingCategoryIds.length > 0) {
        errors.push("La lista todavía no cubre todas las categorías obligatorias.");
      }
      return {
        stepId: submission.stepId,
        isComplete: errors.length === 0,
        errors,
        missingCategoryIds,
      };
    }
    case "schematic": {
      const evidence = submission.files[0];
      const valid =
        evidence !== undefined &&
        evidence.name.trim().length > 0 &&
        evidence.size > 0 &&
        isE2SupportedEvidenceType(evidence.mimeType) &&
        evidence.nodeId === "E2" &&
        evidence.fieldId === "schematic";
      return {
        stepId: submission.stepId,
        isComplete: valid,
        errors: valid ? [] : ["Sube un archivo PNG, JPG o PDF válido antes de continuar."],
      };
    }
    case "architecture": {
      const length = submission.explanation.trim().length;
      const valid = length >= E2_ARCHITECTURE_MIN_CHARS;
      return {
        stepId: submission.stepId,
        isComplete: valid,
        errors: valid
          ? []
          : [
              `La explicación necesita al menos ${E2_ARCHITECTURE_MIN_CHARS} caracteres (${length}/${E2_ARCHITECTURE_MIN_CHARS}).`,
            ],
      };
    }
  }
}

export function isE2Complete(completedStepIds: readonly E2StepId[]): boolean {
  const completed = new Set(completedStepIds);
  return E2_STEP_IDS.every((stepId) => completed.has(stepId));
}

function isCompleteComponentRow(row: E2ComponentRow): boolean {
  return (
    isE2ComponentCategory(row.category) &&
    row.componentName.trim().length > 0 &&
    row.purpose.trim().length > 0 &&
    row.justification.trim().length > 0
  );
}
