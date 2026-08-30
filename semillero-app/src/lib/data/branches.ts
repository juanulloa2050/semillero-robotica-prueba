import type { Branch, BranchId } from "@/lib/types";

export const BRANCH_ORDER: BranchId[] = [
  "design",
  "mechanics",
  "electronics",
  "control",
  "software",
  "ai",
  "systems",
];

export const BRANCHES: Record<BranchId, Branch> = {
  design: {
    id: "design",
    name: "Diseño / CAD",
    shortName: "Diseño",
    tagline: "Del plano a la pieza que existe.",
    color: "#3455D1",
  },
  mechanics: {
    id: "mechanics",
    name: "Mecánica",
    shortName: "Mecánica",
    tagline: "Fuerzas, movimiento y mecanismos.",
    color: "#4E7CA6",
  },
  electronics: {
    id: "electronics",
    name: "Electrónica",
    shortName: "Electrónica",
    tagline: "Del sensor a la señal correcta.",
    color: "#0A84C7",
  },
  control: {
    id: "control",
    name: "Control y Automatización",
    shortName: "Control",
    tagline: "Haz que un sistema persiga su referencia.",
    color: "#17A2C9",
  },
  software: {
    id: "software",
    name: "Software",
    shortName: "Software",
    tagline: "Lógica, código y arquitectura.",
    color: "#7B7FE8",
  },
  ai: {
    id: "ai",
    name: "Inteligencia Artificial",
    shortName: "IA",
    tagline: "Datos, modelos y criterio.",
    color: "#35C4E8",
  },
  systems: {
    id: "systems",
    name: "Sistemas e Integración Robótica",
    shortName: "Sistemas",
    tagline: "Linux, ROS 2, Git y despliegue.",
    color: "#A9E4F2",
  },
};
