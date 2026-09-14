import type { AiNodeContent } from "@/lib/challenges/ai/schema";

export const A4_RL_CONTENT: AiNodeContent = {
  nodeId: "A4_RL",
  title: "El agente optimiza lo que escribiste",
  subtitle:
    "BONUS — Entrena un agente de Reinforcement Learning y evalúa si maximizar el reward realmente logró el comportamiento que buscabas.",
  estimatedTime: "60–120 minutos (bonus)",
  context:
    "Este nodo es opcional y no bloquea la finalización de la prueba principal. Puedes usar FrozenLake u otro entorno pequeño equivalente.",
  objective:
    "Entrenar un agente mediante Deep Q-Learning (u otro algoritmo), analizar la curva de recompensa, identificar posibles políticas degeneradas y rediseñar la recompensa si es necesario.",
  sections: [
    {
      id: "training",
      title: "Entrenamiento y curva de recompensa",
      fields: [
        {
          id: "setup",
          kind: "textarea",
          label: "Describe el entorno, el algoritmo utilizado y la configuración de entrenamiento.",
          minLength: 150,
          rows: 5,
        },
        {
          id: "rewardCurveEvidence",
          kind: "evidence",
          label: "Curva de recompensa por episodio",
          accept: "image/*,.csv",
          multiple: true,
          maxFiles: 6,
          required: true,
        },
        {
          id: "curveAnalysis",
          kind: "textarea",
          label: "Analiza la curva de recompensa: ¿qué observas? ¿El agente convergió, osciló, se estancó?",
          minLength: 150,
          rows: 5,
        },
      ],
    },
    {
      id: "reward-hacking",
      title: "Comportamiento y reward hacking",
      fields: [
        {
          id: "behaviorObserved",
          kind: "textarea",
          label:
            "Describe el comportamiento real del agente entrenado, no solo el número de reward. ¿Identificaste alguna política degenerada (quedarse quieto, dar vueltas, evitar terminar, explotar una condición mal definida)?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "rewardMeaning",
          kind: "textarea",
          label: "¿Una recompensa mayor significa necesariamente que el agente aprendió el comportamiento que querías? Justifica con tu propio experimento.",
          minLength: 200,
          rows: 6,
        },
      ],
    },
    {
      id: "redesign",
      title: "Rediseño de la recompensa",
      fields: [
        {
          id: "rewardChange",
          kind: "textarea",
          label: "Describe cómo modificaste la función de recompensa y por qué.",
          minLength: 150,
          rows: 5,
        },
        {
          id: "reEvaluation",
          kind: "textarea",
          label: "Vuelve a evaluar: ¿cambió el comportamiento? ¿Sigue habiendo reward hacking de otra forma?",
          minLength: 150,
          rows: 5,
        },
      ],
    },
  ],
};
