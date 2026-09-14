import { describe, expect, it } from "vitest";
import { canFinishJourney, computeStatus } from "@/lib/unlock";
import type { NodeChallengeProgress, NodeStatus } from "@/lib/types";

function progress(completed: string[]): Record<string, NodeStatus> {
  return Object.fromEntries(completed.map((id) => [id, "completed"]));
}

function challengeProgress(nodeIds: string[]): Record<string, NodeChallengeProgress> {
  return Object.fromEntries(
    nodeIds.map((nodeId) => [
      nodeId,
      {
        nodeId,
        currentStepId: "submission",
        shuffleSeed: 1,
        startedAt: 1,
        updatedAt: 1,
        completedAt: null,
        steps: {},
        analytics: {},
      } satisfies NodeChallengeProgress,
    ])
  );
}

describe("canFinishJourney", () => {
  it("habilita la entrega con cuatro nodos en dos ramas", () => {
    expect(canFinishJourney(progress(["M0", "M1A", "E0", "E1A"]))).toBe(true);
  });

  it("no habilita la entrega si los cuatro nodos pertenecen a una sola rama", () => {
    expect(canFinishJourney(progress(["M0", "M1A", "M1B", "M2"]))).toBe(false);
  });

  it("no habilita la entrega con menos de cuatro nodos", () => {
    expect(canFinishJourney(progress(["M0", "M1A", "E0"]))).toBe(false);
  });
});

describe("reto integrador", () => {
  it("se desbloquea al completar Aplicación en dos ramas distintas", () => {
    expect(computeStatus("IR", progress(["M2", "E2"]))).toBe("available");
  });

  it("permanece bloqueado con una sola rama en Aplicación", () => {
    expect(computeStatus("IR", progress(["M2"]))).toBe("locked");
  });

  it("cuenta A2-YOLO como el nivel de Aplicación de IA", () => {
    expect(computeStatus("IR", progress(["A2_YOLO", "M2"]))).toBe("available");
  });

  it("cuenta A2-OpenCV como el nivel de Aplicación de IA (basta uno de los dos)", () => {
    expect(computeStatus("IR", progress(["A2_OPENCV", "M2"]))).toBe("available");
  });
});

describe("rama IA — bifurcación A0 -> A1 -> {A2-YOLO, A2-OpenCV} -> A3 -> {A4-RL, A4-GENERAL}", () => {
  // Casos funcionales de ESPECIFICACION_PRUEBA_IA_ROBOTICA_NODOS_v2.md, sección 30.

  it("Caso 1: sin nodos completados, solo A0 está disponible", () => {
    const state = progress([]);
    expect(computeStatus("A0", state)).toBe("available");
    for (const id of ["A1", "A2_YOLO", "A2_OPENCV", "A3", "A4_RL", "A4_GENERAL"]) {
      expect(computeStatus(id, state)).toBe("locked");
    }
  });

  it("Caso 2: A0 completado desbloquea A1 y nada más", () => {
    const state = progress(["A0"]);
    expect(computeStatus("A1", state)).toBe("available");
    for (const id of ["A2_YOLO", "A2_OPENCV", "A3", "A4_RL", "A4_GENERAL"]) {
      expect(computeStatus(id, state)).toBe("locked");
    }
  });

  it("Caso 3: A0+A1 completados desbloquean ambas ramas de A2 simultáneamente", () => {
    const state = progress(["A0", "A1"]);
    expect(computeStatus("A2_YOLO", state)).toBe("available");
    expect(computeStatus("A2_OPENCV", state)).toBe("available");
  });

  it("Caso 4: A3 permanece bloqueado si falta cualquiera de las dos ramas de A2", () => {
    const onlyYolo = progress(["A0", "A1", "A2_YOLO"]);
    expect(computeStatus("A3", onlyYolo)).toBe("locked");

    const onlyOpenCv = progress(["A0", "A1", "A2_OPENCV"]);
    expect(computeStatus("A3", onlyOpenCv)).toBe("locked");
  });

  it("Caso 5: A3 se desbloquea solo cuando A2-YOLO y A2-OpenCV están completos", () => {
    const state = progress(["A0", "A1", "A2_YOLO", "A2_OPENCV"]);
    expect(computeStatus("A3", state)).toBe("available");
  });

  it("Caso 6: A3 completado desbloquea ambos nodos bonus", () => {
    const state = progress(["A0", "A1", "A2_YOLO", "A2_OPENCV", "A3"]);
    expect(computeStatus("A4_RL", state)).toBe("available");
    expect(computeStatus("A4_GENERAL", state)).toBe("available");
  });

  it("deriva in_progress cuando el nodo está desbloqueado y tiene challengeProgress guardado", () => {
    const state = progress(["A0"]);
    expect(computeStatus("A1", state)).toBe("available");
    expect(computeStatus("A1", state, challengeProgress(["A1"]))).toBe("in_progress");
  });

  it("completed tiene prioridad sobre challengeProgress al derivar el estado", () => {
    const state = progress(["A0"]);
    expect(computeStatus("A0", state, challengeProgress(["A0"]))).toBe("completed");
  });

  it("un nodo bloqueado sigue bloqueado aunque tenga challengeProgress (no debería poder pasar en la app real)", () => {
    const state = progress([]);
    expect(computeStatus("A1", state, challengeProgress(["A1"]))).toBe("locked");
  });
});
