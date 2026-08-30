import type { SkillNodeDef } from "@/lib/types";

export type DeliveryFormat =
  | "guided"
  | "numeric"
  | "interactive"
  | "code"
  | "text"
  | "link"
  | "file"
  | "image"
  | "audio"
  | "video";

export interface ChallengePresentation {
  levelLabel: string;
  deliveryMode: string;
  deliveryFormats: DeliveryFormat[];
  deliveryPrompt: string;
}

// Internal platform kinds documented in the product specification. They remain
// deliberately private so the interface only exposes meaningful human labels.
type ChallengeKind = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";

const CHALLENGE_KINDS_BY_ID: Record<string, readonly ChallengeKind[]> = {
  D0: ["C", "H"],
  D1A: ["A", "E"],
  D1B: ["C"],
  D2: ["H", "C", "I"],
  D3A: ["B", "H"],
  D3B: ["B", "I", "H"],
  D4: ["J"],

  M0: ["G", "A", "B"],
  M1A: ["C", "A"],
  M1B: ["G", "A"],
  M2: ["C", "A"],
  M3A: ["A", "B"],
  M3B: ["A", "I"],
  M4: ["J"],

  E0: ["G", "A"],
  E1A: ["C"],
  E1B: ["A", "B", "E"],
  E2: ["G", "A", "B"],
  E3A: ["A", "B", "C"],
  E3B: ["H", "F", "I"],
  E4: ["J"],

  C0: ["G", "A"],
  C1A: ["A", "E"],
  C1B: ["D", "E"],
  C2: ["G"],
  C3A: ["E", "G"],
  C3B: ["G", "A", "E"],
  C4: ["F"],
  C5: ["A", "I"],
  C6: ["J"],

  S0: ["G"],
  S1A: ["F"],
  S1B: ["F"],
  S2: ["G", "F"],
  S3A: ["F", "G"],
  S3B: ["G", "I"],
  S4: ["J"],

  A0: ["B", "G"],
  A1A: ["A", "I"],
  A1B: ["A", "E"],
  A2: ["H", "I"],
  A3A: ["A", "I"],
  A3B: ["A", "B", "I"],
  A4: ["J"],

  SI0: ["G"],
  SI1A: ["G", "D"],
  SI1B: ["G", "A"],
  SI2: ["G", "D"],
  SI3A: ["G"],
  SI3B: ["A", "G"],
  SI4: ["G", "A"],
  SI5: ["G", "D"],
  SI6: ["J"],

  IR: ["J"],
};

const FORMATS_BY_KIND: Record<ChallengeKind, readonly DeliveryFormat[]> = {
  A: ["guided"],
  B: ["guided"],
  C: ["numeric"],
  D: ["interactive"],
  E: ["interactive"],
  F: ["code"],
  G: ["interactive"],
  H: ["file", "image"],
  I: ["text", "audio"],
  J: ["text", "link", "file", "image", "audio", "video"],
};

const FALLBACK_KINDS_BY_CATEGORY: Record<
  SkillNodeDef["category"],
  readonly ChallengeKind[]
> = {
  fundamentos: ["A"],
  sub: ["A"],
  aplicacion: ["I"],
  profundizacion: ["I"],
  critica: ["A", "I"],
  libre: ["J"],
};

function uniqueFormats(kinds: readonly ChallengeKind[]): DeliveryFormat[] {
  return [...new Set(kinds.flatMap((kind) => FORMATS_BY_KIND[kind]))];
}

function getDeliveryMode(kinds: readonly ChallengeKind[]): string {
  const has = (kind: ChallengeKind) => kinds.includes(kind);

  if (has("J")) return "Entrega multimodal";
  if (has("F") && has("G")) return "Código y actividad interactiva";
  if (has("F")) return "Reto de código";
  if (has("H") && has("C")) return "Cálculo con evidencia";
  if (has("H")) return "Respuesta con evidencia";
  if (has("C") && (has("A") || has("B"))) return "Cálculo guiado";
  if (has("C")) return "Respuesta numérica";
  if (has("G") || has("D") || has("E")) return "Actividad interactiva";
  if (has("I") && (has("A") || has("B"))) return "Respuesta argumentada";
  if (has("A") || has("B")) return "Respuesta guiada";
  return "Respuesta abierta";
}

function getDeliveryPrompt(kinds: readonly ChallengeKind[]): string {
  const has = (kind: ChallengeKind) => kinds.includes(kind);

  if (has("J")) {
    return "Combina las evidencias que mejor representen tu proceso, tu resultado y lo que aprendiste.";
  }
  if (has("F")) {
    return "Queremos observar cómo estructuras tu solución, pruebas el código y explicas las decisiones importantes.";
  }
  if (has("H")) {
    return "Incluye el resultado solicitado y evidencia suficiente para entender cómo lo construiste.";
  }
  if (has("C")) {
    return "Registra el resultado numérico y conserva el razonamiento que te permitió calcularlo.";
  }
  if (has("G") || has("D") || has("E")) {
    return "Completa la interacción y presta atención a las decisiones que tomas durante el recorrido.";
  }
  if (has("I")) {
    return "Explica tu elección y los criterios que usaste para llegar a esa respuesta.";
  }
  return "Selecciona la respuesta que mejor represente tu análisis del reto.";
}

/**
 * Converts the internal challenge catalogue into interface-ready guidance.
 * Every current node has an explicit entry; category fallback only protects
 * future nodes until their challenge kind is added to the catalogue.
 */
export function getChallengePresentation(
  node: SkillNodeDef
): ChallengePresentation {
  const kinds = CHALLENGE_KINDS_BY_ID[node.id] ?? FALLBACK_KINDS_BY_CATEGORY[node.category];

  return {
    levelLabel: node.id === "IR" ? "Reto transversal" : `Nivel ${node.depth + 1}`,
    deliveryMode: getDeliveryMode(kinds),
    deliveryFormats: uniqueFormats(kinds),
    deliveryPrompt: getDeliveryPrompt(kinds),
  };
}

export const DELIVERY_FORMAT_LABELS: Record<DeliveryFormat, string> = {
  guided: "Respuesta guiada",
  numeric: "Valor numérico",
  interactive: "Actividad interactiva",
  code: "Código",
  text: "Texto",
  link: "Enlace",
  file: "Archivo",
  image: "Imagen",
  audio: "Audio",
  video: "Video",
};
