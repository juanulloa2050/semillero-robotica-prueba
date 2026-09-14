import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

export const IR_STEP_ID = "research-proposal" as const;
export const IR_STEP_IDS = [IR_STEP_ID] as const;

export const IR_BRANCH_OPTIONS = [
  { id: "design", label: "Diseño / CAD" },
  { id: "mechanics", label: "Mecánica" },
  { id: "electronics", label: "Electrónica" },
  { id: "control", label: "Control y automatización" },
  { id: "software", label: "Software" },
  { id: "ai", label: "Inteligencia artificial" },
  { id: "systems", label: "Sistemas y backend" },
] as const;

export interface IRSpecificObjective {
  readonly id: string;
  readonly objective: string;
  readonly successIndicator: string;
}

export interface IRActionPhase {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly activities: string;
  readonly deliverable: string;
  readonly duration: string;
}

export interface IRResource {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly source: string;
}

export interface IRMetric {
  readonly id: string;
  readonly metric: string;
  readonly target: string;
  readonly verification: string;
}

export interface IRRisk {
  readonly id: string;
  readonly risk: string;
  readonly mitigation: string;
}

export interface IRReference {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

export interface IRSubmission {
  readonly stepId: typeof IR_STEP_ID;
  readonly title: string;
  readonly branches: readonly string[];
  readonly context: string;
  readonly problem: string;
  readonly researchQuestion: string;
  readonly justification: string;
  readonly generalObjective: string;
  readonly specificObjectives: readonly IRSpecificObjective[];
  readonly hypothesis: string;
  readonly solution: string;
  readonly architecture: string;
  readonly innovation: string;
  readonly actionPhases: readonly IRActionPhase[];
  readonly resources: readonly IRResource[];
  readonly metrics: readonly IRMetric[];
  readonly risks: readonly IRRisk[];
  readonly ethicsAndSafety: string;
  readonly expectedImpact: string;
  readonly limitations: string;
  readonly diagramFiles: readonly LocalEvidenceFile[];
  readonly proposalFiles: readonly LocalEvidenceFile[];
  readonly references: readonly IRReference[];
}

export type IRFieldId =
  | "title"
  | "branches"
  | "context"
  | "problem"
  | "researchQuestion"
  | "justification"
  | "generalObjective"
  | "specificObjectives"
  | "hypothesis"
  | "solution"
  | "architecture"
  | "innovation"
  | "actionPhases"
  | "resources"
  | "metrics"
  | "risks"
  | "ethicsAndSafety"
  | "expectedImpact"
  | "limitations"
  | "diagramFiles"
  | "references";

export interface IRValidation {
  readonly isComplete: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: Readonly<Partial<Record<IRFieldId, string>>>;
  readonly feedback: string;
}

export const IR_CHALLENGE = {
  id: "IR",
  title: "Proyecto de investigación robótica",
  subtitle:
    "Formula una investigación viable que integre al menos dos áreas de la robótica.",
  completionRule: "human_review",
  estimatedTime: "45–75 minutos",
  minimums: {
    title: 8,
    context: 100,
    problem: 180,
    researchQuestion: 40,
    justification: 150,
    generalObjective: 80,
    specificObjectives: 3,
    hypothesis: 80,
    solution: 200,
    architecture: 180,
    innovation: 80,
    actionPhases: 4,
    resources: 4,
    metrics: 3,
    risks: 3,
    ethicsAndSafety: 120,
    expectedImpact: 120,
    limitations: 80,
    references: 2,
  },
} as const;

export function createIRDraft(): IRSubmission {
  return {
    stepId: IR_STEP_ID,
    title: "",
    branches: [],
    context: "",
    problem: "",
    researchQuestion: "",
    justification: "",
    generalObjective: "",
    specificObjectives: [
      specificObjective("objective-1"),
      specificObjective("objective-2"),
      specificObjective("objective-3"),
    ],
    hypothesis: "",
    solution: "",
    architecture: "",
    innovation: "",
    actionPhases: [
      actionPhase("phase-1", "Exploración y estado del arte"),
      actionPhase("phase-2", "Diseño de la solución"),
      actionPhase("phase-3", "Construcción y experimentación"),
      actionPhase("phase-4", "Validación y conclusiones"),
    ],
    resources: [resource("resource-1")],
    metrics: [metric("metric-1")],
    risks: [risk("risk-1")],
    ethicsAndSafety: "",
    expectedImpact: "",
    limitations: "",
    diagramFiles: [],
    proposalFiles: [],
    references: [reference("reference-1"), reference("reference-2")],
  };
}

export function validateIR(submission: IRSubmission): IRValidation {
  const min = IR_CHALLENGE.minimums;
  const errors: Partial<Record<IRFieldId, string>> = {};

  requireLength(errors, "title", submission.title, min.title, "Define un título concreto para la investigación");
  if (new Set(submission.branches).size < 2) {
    errors.branches = "Selecciona al menos dos áreas que realmente se integren en el proyecto.";
  }
  requireLength(errors, "context", submission.context, min.context, "Describe quién vive el problema y en qué contexto ocurre");
  requireLength(errors, "problem", submission.problem, min.problem, "Delimita el problema, sus causas y la evidencia de que existe");
  requireLength(errors, "researchQuestion", submission.researchQuestion, min.researchQuestion, "Formula una pregunta investigable");
  if (!errors.researchQuestion && !submission.researchQuestion.includes("?")) {
    errors.researchQuestion = "Escríbela como una pregunta explícita que termine o contenga signo de interrogación.";
  }
  requireLength(errors, "justification", submission.justification, min.justification, "Explica por qué vale la pena investigar este problema");
  requireLength(errors, "generalObjective", submission.generalObjective, min.generalObjective, "Redacta un objetivo general medible y alcanzable");

  const validObjectives = submission.specificObjectives.filter(
    (item) => item.objective.trim().length >= 40 && item.successIndicator.trim().length >= 20
  );
  if (validObjectives.length < min.specificObjectives) {
    errors.specificObjectives = `Incluye al menos ${min.specificObjectives} objetivos específicos, cada uno con un indicador verificable.`;
  }
  requireLength(errors, "hypothesis", submission.hypothesis, min.hypothesis, "Plantea la hipótesis o el resultado que esperas observar");
  requireLength(errors, "solution", submission.solution, min.solution, "Describe la solución robótica propuesta y su funcionamiento");
  requireLength(errors, "architecture", submission.architecture, min.architecture, "Explica los bloques del sistema, sus entradas, salidas e interacción");
  requireLength(errors, "innovation", submission.innovation, min.innovation, "Aclara qué aporta o qué se aprendería frente a soluciones existentes");

  const validPhases = submission.actionPhases.filter(
    (phase) =>
      phase.name.trim().length >= 4 &&
      phase.purpose.trim().length >= 30 &&
      phase.activities.trim().length >= 40 &&
      phase.deliverable.trim().length >= 20 &&
      phase.duration.trim().length >= 2
  );
  if (validPhases.length < min.actionPhases) {
    errors.actionPhases = `Desglosa al menos ${min.actionPhases} fases completas con propósito, actividades, entregable y duración.`;
  }

  const validResources = submission.resources.filter(
    (item) => item.name.trim().length >= 2 && item.purpose.trim().length >= 15 && item.source.trim().length >= 2
  );
  if (validResources.length < min.resources) {
    errors.resources = `Incluye al menos ${min.resources} recursos con propósito y fuente de obtención.`;
  }
  const validMetrics = submission.metrics.filter(
    (item) => item.metric.trim().length >= 10 && item.target.trim().length >= 5 && item.verification.trim().length >= 15
  );
  if (validMetrics.length < min.metrics) {
    errors.metrics = `Define al menos ${min.metrics} métricas con meta y método de verificación.`;
  }
  const validRisks = submission.risks.filter(
    (item) => item.risk.trim().length >= 15 && item.mitigation.trim().length >= 25
  );
  if (validRisks.length < min.risks) {
    errors.risks = `Identifica al menos ${min.risks} riesgos y una mitigación concreta para cada uno.`;
  }

  requireLength(errors, "ethicsAndSafety", submission.ethicsAndSafety, min.ethicsAndSafety, "Analiza seguridad, privacidad, ética e impacto ambiental según aplique");
  requireLength(errors, "expectedImpact", submission.expectedImpact, min.expectedImpact, "Explica el impacto esperado y quién se beneficiaría");
  requireLength(errors, "limitations", submission.limitations, min.limitations, "Reconoce límites técnicos, económicos o de alcance");
  if (submission.diagramFiles.length === 0) {
    errors.diagramFiles = "Adjunta un diagrama de bloques, arquitectura o flujo experimental.";
  }

  const validReferences = submission.references.filter(
    (item) => item.title.trim().length >= 4 && isHttpUrl(item.url)
  );
  if (validReferences.length < min.references) {
    errors.references = `Incluye al menos ${min.references} fuentes confiables con título y URL completa.`;
  }

  const rubric = [
    !errors.context && !errors.problem && !errors.researchQuestion,
    !errors.justification,
    !errors.generalObjective && !errors.specificObjectives,
    !errors.hypothesis,
    !errors.solution && !errors.architecture && !errors.innovation,
    !errors.actionPhases && !errors.resources,
    !errors.metrics && !errors.risks && !errors.ethicsAndSafety,
    !errors.expectedImpact && !errors.limitations && !errors.diagramFiles && !errors.references,
  ];
  const isComplete = Object.keys(errors).length === 0;
  return {
    isComplete,
    score: rubric.filter(Boolean).length,
    maxScore: rubric.length,
    errors,
    feedback: isComplete
      ? "La propuesta está completa y queda lista para revisión humana."
      : "La propuesta todavía tiene apartados incompletos. Revisa las secciones marcadas.",
  };
}

export function createIRSpecificObjective(id: string): IRSpecificObjective {
  return specificObjective(id);
}
export function createIRActionPhase(id: string): IRActionPhase {
  return actionPhase(id, "");
}
export function createIRResource(id: string): IRResource {
  return resource(id);
}
export function createIRMetric(id: string): IRMetric {
  return metric(id);
}
export function createIRRisk(id: string): IRRisk {
  return risk(id);
}
export function createIRReference(id: string): IRReference {
  return reference(id);
}

function specificObjective(id: string): IRSpecificObjective {
  return { id, objective: "", successIndicator: "" };
}
function actionPhase(id: string, name: string): IRActionPhase {
  return { id, name, purpose: "", activities: "", deliverable: "", duration: "" };
}
function resource(id: string): IRResource {
  return { id, name: "", purpose: "", source: "" };
}
function metric(id: string): IRMetric {
  return { id, metric: "", target: "", verification: "" };
}
function risk(id: string): IRRisk {
  return { id, risk: "", mitigation: "" };
}
function reference(id: string): IRReference {
  return { id, title: "", url: "" };
}
function requireLength(
  errors: Partial<Record<IRFieldId, string>>,
  field: IRFieldId,
  value: string,
  minimum: number,
  message: string
) {
  if (value.trim().length < minimum) errors[field] = `${message} (mínimo ${minimum} caracteres).`;
}
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
