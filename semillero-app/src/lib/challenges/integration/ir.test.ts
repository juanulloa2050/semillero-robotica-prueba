import { describe, expect, it } from "vitest";
import {
  createIRDraft,
  createIRMetric,
  createIRResource,
  createIRRisk,
  validateIR,
  type IRSubmission,
} from "@/lib/challenges/integration/ir";

const long = (label: string, length: number) => `${label} ${"contenido ".repeat(Math.ceil(length / 10))}`;

function completeDraft(): IRSubmission {
  const draft = createIRDraft();
  return {
    ...draft,
    title: "Robot móvil para inspección segura de laboratorios",
    branches: ["mechanics", "electronics", "software"],
    context: long("Contexto", 120),
    problem: long("Problema", 200),
    researchQuestion: "¿Cómo puede un robot móvil reducir el tiempo de inspección sin comprometer la seguridad?",
    justification: long("Justificación", 170),
    generalObjective: long("Diseñar y validar un sistema robótico de inspección", 90),
    specificObjectives: draft.specificObjectives.map((item, index) => ({
      ...item,
      objective: long(`Objetivo específico ${index + 1}`, 50),
      successIndicator: long("Indicador medible", 25),
    })),
    hypothesis: long("Hipótesis", 90),
    solution: long("Solución robótica", 220),
    architecture: long("Arquitectura", 200),
    innovation: long("Aporte", 90),
    actionPhases: draft.actionPhases.map((phase, index) => ({
      ...phase,
      name: phase.name || `Fase ${index + 1}`,
      purpose: long("Propósito", 35),
      activities: long("Actividades", 50),
      deliverable: long("Entregable", 25),
      duration: "2 semanas",
    })),
    resources: Array.from({ length: 4 }, (_, index) => ({
      ...createIRResource(`resource-${index}`),
      name: `Recurso ${index + 1}`,
      purpose: long("Propósito", 20),
      source: "Laboratorio",
    })),
    metrics: Array.from({ length: 3 }, (_, index) => ({
      ...createIRMetric(`metric-${index}`),
      metric: `Métrica verificable ${index + 1}`,
      target: "Mayor al 90 %",
      verification: long("Protocolo de pruebas", 20),
    })),
    risks: Array.from({ length: 3 }, (_, index) => ({
      ...createIRRisk(`risk-${index}`),
      risk: long(`Riesgo ${index + 1}`, 20),
      mitigation: long("Mitigación preventiva", 30),
    })),
    ethicsAndSafety: long("Seguridad, privacidad, ética y ambiente", 130),
    expectedImpact: long("Impacto esperado para los beneficiarios", 130),
    limitations: long("Limitaciones técnicas y económicas", 90),
    diagramFiles: [{
      id: "diagram-1", nodeId: "IR", fieldId: "research-diagram",
      name: "arquitectura.png", mimeType: "image/png", size: 1_024,
      lastModified: 1, storedAt: 1,
    }],
    references: draft.references.map((reference, index) => ({
      ...reference,
      title: `Referencia técnica ${index + 1}`,
      url: `https://example.com/reference-${index + 1}`,
    })),
  };
}

describe("validateIR", () => {
  it("rechaza una idea sin desglose de investigación", () => {
    const result = validateIR(createIRDraft());
    expect(result.isComplete).toBe(false);
    expect(result.errors.problem).toBeTruthy();
    expect(result.errors.actionPhases).toBeTruthy();
  });

  it("acepta una propuesta completa y verificable", () => {
    const result = validateIR(completeDraft());
    expect(result.isComplete).toBe(true);
    expect(result.score).toBe(result.maxScore);
  });
});
