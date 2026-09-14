import { reflectionSection, type AiNodeContent } from "@/lib/challenges/ai/schema";

export const A2_YOLO_CONTENT: AiNodeContent = {
  nodeId: "A2_YOLO",
  title: "Entrena, pero primero formula una hipótesis",
  subtitle:
    "Entrena un detector YOLOv8 con Ultralytics. Puedes usar IA generativa para programar: no se evalúa memorización de sintaxis, se evalúa carácter investigativo y diseño experimental.",
  estimatedTime: "90–150 minutos",
  context:
    "Ya tienes un dataset auditado (A0) y una hipótesis sobre su geometría y color (A1). Ahora entrenas un detector de Deep Learning real y documentas cada experimento como un experimento, no como un intento aislado.",
  objective:
    "Entrenar un baseline reproducible, estudiar el efecto de al menos epochs, batch size, learning rate y optimizer, y explicar las pérdidas que reporta YOLO.",
  sections: [
    {
      id: "baseline",
      title: "Baseline reproducible",
      fields: [
        {
          id: "baselineConfig",
          kind: "textarea",
          label:
            "Registra la configuración de tu baseline: modelo, tamaño de imagen, epochs, batch size, learning rate, optimizer, augmentations activas, seed (si aplica), hardware utilizado y tiempo aproximado de entrenamiento.",
          minLength: 200,
          rows: 6,
        },
        {
          id: "baselineResults",
          kind: "textarea",
          label: "Reporta las métricas obtenidas y describe las curvas de entrenamiento (mAP, precision, recall, pérdidas).",
          minLength: 150,
          rows: 5,
        },
        {
          id: "baselineEvidence",
          kind: "evidence",
          label: "Curvas y capturas del entrenamiento",
          accept: "image/*,.csv,.json",
          multiple: true,
          maxFiles: 8,
          required: true,
        },
      ],
    },
    {
      id: "experiments",
      title: "Experimentación controlada",
      intro:
        "Procura modificar una variable a la vez cuando quieras atribuir causalidad a un cambio. Si decides modificar varias simultáneamente, justifica por qué.",
      fields: [
        {
          id: "experiments",
          kind: "repeatable",
          label: "Bitácora de experimentos",
          help: "Intenta cubrir al menos epochs, batch size, learning rate y optimizer entre tus experimentos. Cada fila necesita hipótesis (antes) y resultado + interpretación (después).",
          itemLabel: "Experimento",
          minItems: 3,
          columns: [
            { id: "change", label: "Cambio realizado", minLength: 10, placeholder: "Ej.: reducir learning rate de 0.01 a 0.001" },
            { id: "hypothesis", label: "Hipótesis (antes del experimento)", minLength: 30, multiline: true },
            { id: "result", label: "Resultado (después del experimento)", minLength: 30, multiline: true },
            { id: "interpretation", label: "Interpretación", minLength: 40, multiline: true },
          ],
        },
        {
          id: "lossExplanation",
          kind: "textarea",
          label:
            "Explica las funciones o componentes de pérdida que reporta YOLO (qué representa cada una) y relaciona su evolución con underfitting, overfitting o inestabilidad si lo observaste.",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    {
      id: "augmentations",
      title: "Augmentations y física",
      fields: [
        {
          id: "augmentationJustification",
          kind: "textarea",
          label:
            "Justifica las augmentations que usaste (o decidiste no usar) pensando en el mundo físico de una mesa de tenis: iluminación, gravedad, orientación de cámara y entorno.",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    {
      id: "architecture-bonus",
      title: "Bonus — ¿Modificarías la arquitectura?",
      intro:
        "Si consideras que la arquitectura utilizada contiene componentes innecesarios o subóptimos para este problema, propón una modificación. Puedes implementarla o justificarla técnicamente.",
      fields: [
        {
          id: "architectureBonus",
          kind: "textarea",
          label: "Propuesta de modificación (opcional)",
          help: "También es una respuesta válida concluir que no la modificarías hasta demostrar que realmente es el cuello de botella. No premiamos complejidad por sí misma.",
          minLength: 150,
          rows: 6,
          required: false,
        },
      ],
    },
    reflectionSection(),
  ],
};
