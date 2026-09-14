import { reflectionSection, type AiNodeContent } from "@/lib/challenges/ai/schema";

export const A3_CONTENT: AiNodeContent = {
  nodeId: "A3",
  title: "¿Tu solución funciona fuera del caso ideal?",
  subtitle:
    "Compara experimentalmente YOLO y OpenCV bajo degradaciones controladas. Este es el punto donde las dos ramas vuelven a integrarse.",
  estimatedTime: "60–90 minutos",
  context:
    "Tienes dos detectores completos: uno de Deep Learning (A2-YOLO) y uno clásico (A2-OpenCV). Ambos pueden funcionar bien dentro del dataset original y comportarse de forma muy distinta fuera de él.",
  objective:
    "Someter ambas soluciones a degradaciones controladas (brillo obligatorio, otras opcionales) y comparar su comportamiento sin asumir de antemano cuál gana.",
  sections: [
    {
      id: "design",
      title: "Diseño del stress test",
      fields: [
        {
          id: "brightnessTest",
          kind: "textarea",
          label:
            "Describe cómo implementaste la reducción progresiva de brillo (100%, 80%, 60%, 40%, y aproximadamente -60%) y qué otras degradaciones agregaste si lo hiciste: blur, motion blur, ruido, compresión JPEG, oclusión, reducción de escala, fondos visualmente similares, cambios de temperatura de color.",
          minLength: 200,
          rows: 6,
        },
        {
          id: "conditionEvidence",
          kind: "evidence",
          label: "Resultados por condición",
          accept: "image/*,.csv,.json",
          multiple: true,
          maxFiles: 10,
          required: true,
        },
      ],
    },
    {
      id: "comparison",
      title: "Comparación experimental",
      fields: [
        {
          id: "metricsComparison",
          kind: "textarea",
          label:
            "Compara YOLO y OpenCV bajo cada condición: Precision, Recall, F1, latencia media, FPS, p50, p95, número de fallos y comportamiento por condición.",
          minLength: 250,
          rows: 7,
        },
        {
          id: "failureModes",
          kind: "textarea",
          label: "¿Qué solución se degrada primero y bajo qué condición? ¿Cuál es el principal modo de fallo de cada detector?",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    {
      id: "interpretation",
      title: "Interpretación crítica",
      fields: [
        {
          id: "mapVsRobot",
          kind: "textarea",
          label: "¿Una mejora en mAP implica necesariamente una mejor solución para el robot? Justifica con tus propios resultados.",
          minLength: 150,
          rows: 5,
        },
        {
          id: "cpuConstrained",
          kind: "textarea",
          label: "Si tuvieras una CPU limitada y debieras ejecutar el sistema en tiempo real, ¿qué solución elegirías y por qué?",
          minLength: 150,
          rows: 5,
        },
        {
          id: "hybridProposal",
          kind: "textarea",
          label:
            "¿Mantendrías una sola solución o propondrías una arquitectura híbrida (por ejemplo HSV para proponer regiones y YOLO para confirmar, o YOLO cada N frames con tracking entre detecciones)? Justifica.",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    reflectionSection(),
  ],
};
