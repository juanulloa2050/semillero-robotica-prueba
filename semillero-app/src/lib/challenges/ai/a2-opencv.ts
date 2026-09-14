import { reflectionSection, type AiNodeContent } from "@/lib/challenges/ai/schema";

export const A2_OPENCV_CONTENT: AiNodeContent = {
  nodeId: "A2_OPENCV",
  title: "¿Realmente necesitas Deep Learning?",
  subtitle:
    "Construye una solución clásica, interpretable y eficiente con OpenCV, usando los hallazgos HSV de A1. No asumas que Deep Learning es automáticamente superior.",
  estimatedTime: "60–90 minutos",
  context:
    "Ya tienes thresholds HSV justificados desde A1. Ahora construyes un detector heurístico completo y lo pones a prueba, incluyendo una auditoría honesta de cualquier código que hayas generado con IA.",
  objective:
    "Construir un detector basado en color/contornos, documentar su pipeline y sus límites, y decidir con criterio cuándo preferirías esta solución sobre YOLO.",
  sections: [
    {
      id: "pipeline",
      title: "Pipeline clásico",
      fields: [
        {
          id: "pipelineDescription",
          kind: "textarea",
          label:
            "Describe tu pipeline de detección: qué pasos usaste (conversión de color, threshold, máscara, operaciones morfológicas, contours, filtrado geométrico, estimación de centro, bounding box o círculo) y por qué.",
          minLength: 250,
          rows: 7,
        },
        {
          id: "detectorCode",
          kind: "evidence",
          label: "Código del detector",
          accept: ".py,.ipynb,text/*",
          multiple: true,
          maxFiles: 4,
          required: true,
        },
        {
          id: "thresholds",
          kind: "text",
          label: "Thresholds HSV utilizados",
          placeholder: "H: [.. – ..]  S: [.. – ..]  V: [.. – ..]",
          minLength: 10,
        },
      ],
    },
    {
      id: "code-audit",
      title: "Auditoría del código",
      intro: "Se permite usar IA para programar. Eres responsable de revisar y entender lo que ejecutas.",
      fields: [
        {
          id: "codeAudit",
          kind: "textarea",
          label:
            "Si usaste IA generativa para escribir parte del código, ¿qué revisaste línea por línea para asegurarte de que hace lo que crees que hace? Explica en particular cómo verificaste el espacio de color de cada conversión que aplicaste.",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    {
      id: "results",
      title: "Resultados y límites",
      fields: [
        {
          id: "resultsEvidence",
          kind: "evidence",
          label: "Ejemplos correctos y fallidos",
          accept: "image/*",
          multiple: true,
          maxFiles: 10,
          required: true,
        },
        {
          id: "resultsDescription",
          kind: "textarea",
          label: "Describe casos correctos y casos fallidos de tu detector. ¿Bajo qué condiciones falla?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "fpsEstimate",
          kind: "text",
          label: "Estimación de FPS o tiempo por frame",
          minLength: 3,
          placeholder: "Ej.: ~45 FPS en CPU, 512x512",
        },
        {
          id: "whenPreferOpenCv",
          kind: "textarea",
          label: "¿En qué condiciones preferirías utilizar esta solución en lugar de YOLO?",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    reflectionSection(),
  ],
};
