import type { AiNodeContent } from "@/lib/challenges/ai/schema";

export const A4_GENERAL_CONTENT: AiNodeContent = {
  nodeId: "A4_GENERAL",
  title: "¿Puedes salirte del dataset?",
  subtitle:
    "BONUS — Consigue evidencia de que tu detector funciona fuera del dominio visual original y, opcionalmente, añade tracking temporal eficiente.",
  estimatedTime: "60–120 minutos (bonus)",
  context:
    "Este nodo es opcional y no bloquea la finalización de la prueba principal. Tu modelo puede funcionar bien dentro del dominio del dataset y fallar fuertemente con otra mesa, fondo, iluminación, cámara, distancia, perspectiva o pelota.",
  objective:
    "Nivel 1: reducir el domain gap y demostrarlo con evidencia real fuera del dataset original. Nivel 2 (opcional, suma sobre el nivel 1): añadir tracking temporal en vez de detectar en cada frame.",
  sections: [
    {
      id: "generalization",
      title: "Nivel 1 — Generalización fuera del dataset",
      fields: [
        {
          id: "strategy",
          kind: "textarea",
          label:
            "¿Qué estrategia usaste para conseguir evidencia de que tu detector funciona fuera del dominio visual original del dataset (nuevas imágenes, otro dataset, recolección propia, transfer learning, fine-tuning, hard negatives, augmentations justificadas, synthetic data, domain randomization, cambios de arquitectura, soluciones híbridas, u otra)?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "outOfDomainEvidence",
          kind: "evidence",
          label: "Evidencia fuera del dominio original",
          help: "Debe mostrar pruebas fuera del dominio base: otra mesa, habitación, iluminación, cámara, fondo, perspectiva o pelota. No se acepta como evidencia únicamente el validation original.",
          accept: "image/*,video/*,.csv",
          multiple: true,
          maxFiles: 10,
          required: true,
        },
        {
          id: "newFailures",
          kind: "textarea",
          label: "¿Qué nuevos falsos positivos aparecieron y qué condiciones siguen rompiendo el detector?",
          minLength: 150,
          rows: 5,
        },
        {
          id: "improvementSource",
          kind: "textarea",
          label: "¿La mejora provino principalmente de datos, de arquitectura, o de ambos? Justifica.",
          minLength: 150,
          rows: 5,
        },
      ],
    },
    {
      id: "tracking",
      title: "Nivel 2 — Tracking eficiente (opcional)",
      intro: "El tracking suma sobre el detector general; no es obligatorio para completar este nodo bonus.",
      fields: [
        {
          id: "trackingApproach",
          kind: "textarea",
          label:
            "¿Cómo reducirías el costo de ejecutar detección completa en todos los frames? Describe tu estrategia de tracking si la implementaste.",
          help: "Por ejemplo: YOLO cada N frames + tracker liviano entre detecciones; detección + Kalman Filter + predicción + re-detección cuando cae la confianza; o detección + optical flow / tracker clásico.",
          minLength: 150,
          rows: 6,
          required: false,
        },
        {
          id: "trackingEvidence",
          kind: "evidence",
          label: "Video o evidencia de tracking (opcional)",
          accept: "video/*,image/*,.csv",
          multiple: true,
          maxFiles: 6,
          required: false,
        },
        {
          id: "trackingMetrics",
          kind: "textarea",
          label: "Si implementaste tracking, reporta FPS, latencia media, p95, pérdidas de track y frecuencia de re-detección.",
          minLength: 100,
          rows: 5,
          required: false,
        },
      ],
    },
  ],
};
