import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";

/** Pure, serializable content and validation rules for Design/CAD D2. */

export type D2StepId = "delivery";

export interface D2Submission {
  readonly stepId: D2StepId;
  readonly software: string;
  readonly inventory: string;
  readonly process: string;
  readonly files: readonly LocalEvidenceFile[];
  readonly filesUrl: string;
}

export type D2FieldId = "software" | "inventory" | "process" | "evidence" | "filesUrl";

export interface D2Validation {
  readonly isComplete: boolean;
  readonly errors: Readonly<Partial<Record<D2FieldId, string>>>;
  readonly feedback: string;
}

export const D2_STEP_IDS = ["delivery"] as const satisfies readonly D2StepId[];

export const D2_CHALLENGE = {
  id: "D2",
  title: "Entrega tus modelos CAD",
  subtitle: "Aplicación · Cierre de la rama de diseño",
  introduction:
    "Hasta aquí resolviste los retos respondiendo valores. Ahora queremos ver los modelos con los que llegaste a esos valores.",
  attempts: "unlimited",
  completionRule: "all_steps",
  steps: {
    delivery: {
      id: "delivery" as const,
      title: "Tus archivos CAD",
      statement:
        "Reúne los modelos que construiste en los retos anteriores — la pieza que mediste en «Del plano al volumen» y la que armaste paso a paso en «Vistas técnicas y Tool Block» — y entréganos los archivos. Sube el archivo nativo de tu programa: Fusion 360 (.f3d), Inventor (.ipt / .iam) o SolidWorks (.sldprt / .sldasm). Si usas otro programa, exporta un STEP (.step) o comprime la carpeta en un .zip. No los rehagas: queremos ver el modelo tal como lo trabajaste, con su árbol de operaciones.",
      minimums: {
        files: 2,
        software: 3,
        inventory: 30,
        processWords: 60,
      },
      acceptedEvidence: {
        cad: ".f3d,.f3z,.ipt,.iam,.sldprt,.sldasm,.step,.stp,.iges,.igs,.fcstd,.zip,application/zip",
      },
      hints: [
        "Si tu programa guarda en la nube (Fusion 360), usa Archivo → Exportar para bajar el .f3d a tu computador, o comparte el enlace del proyecto.",
        "Nombra los archivos para saber cuál es cuál, por ejemplo «volumen.f3d» y «toolblock.f3d».",
      ] as const,
    },
  },
} as const;

export function createD2Draft(): D2Submission {
  return {
    stepId: "delivery",
    software: "",
    inventory: "",
    process: "",
    files: [],
    filesUrl: "",
  };
}

export function validateD2(submission: D2Submission): D2Validation {
  const minimums = D2_CHALLENGE.steps.delivery.minimums;
  const errors: Partial<Record<D2FieldId, string>> = {};

  if (submission.software.trim().length < minimums.software) {
    errors.software = "Dinos en qué programa modelaste (Fusion 360, Inventor, SolidWorks, Onshape...).";
  }
  if (submission.inventory.trim().length < minimums.inventory) {
    errors.inventory = `Indica en al menos ${minimums.inventory} caracteres a qué reto corresponde cada archivo.`;
  }
  if (wordCount(submission.process) < minimums.processWords) {
    errors.process = `Escribe al menos ${minimums.processWords} palabras sobre cómo construiste los modelos.`;
  }
  // Los archivos nativos de CAD pesan mucho y a veces viven en la nube, así que
  // un enlace al proyecto es una entrega igual de válida que la subida directa.
  if (submission.files.length < minimums.files && submission.filesUrl.trim().length === 0) {
    errors.evidence = `Sube al menos ${minimums.files} archivos CAD (uno por reto) o comparte un enlace a tu proyecto.`;
  }
  if (submission.filesUrl.trim().length > 0 && !isHttpUrl(submission.filesUrl)) {
    errors.filesUrl = "Usa una dirección completa que empiece por http:// o https://.";
  }

  const isComplete = Object.keys(errors).length === 0;

  return {
    isComplete,
    errors,
    feedback: isComplete
      ? "Entrega registrada. Con los modelos en la mano podemos ver cómo construiste las piezas, no solo el número final."
      : "Aún faltan datos o archivos obligatorios. Revisa los campos señalados.",
  };
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
