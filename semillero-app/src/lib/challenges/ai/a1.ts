import { reflectionSection, type AiNodeContent } from "@/lib/challenges/ai/schema";

export const A1_CONTENT: AiNodeContent = {
  nodeId: "A1",
  title: "¿Entiendes lo que estás observando?",
  subtitle:
    "Usa el dataset ya auditado para formular hipótesis sobre distribución, geometría, movimiento aparente, color y límites del dominio. Cada análisis debe responder una pregunta, no ser una gráfica decorativa.",
  estimatedTime: "60–90 minutos",
  context:
    "Ya limpiaste el dataset en A0. Ahora toca entenderlo: cuántas positivas y negativas hay, cómo se distribuyen tamaños y posiciones, y si existe más de un régimen geométrico dentro de `ball`.",
  objective:
    "Producir un análisis exploratorio que te permita formular una hipótesis defendible sobre la geometría del dataset y elegir métricas con criterio, no por costumbre.",
  sections: [
    {
      id: "eda",
      title: "EDA cuantitativo",
      intro: "Cuartiles, no solo promedios: esta parte es central para detectar más de un régimen geométrico.",
      fields: [
        {
          id: "edaEvidence",
          kind: "evidence",
          label: "Notebook, script o capturas del EDA",
          help: "Incluye las gráficas o tablas que sustenten las cifras que reportas abajo.",
          accept: "image/*,.csv,.ipynb,.py,.pdf",
          multiple: true,
          maxFiles: 8,
          required: true,
        },
        {
          id: "edaSummary",
          kind: "textarea",
          label:
            "Reporta: total de imágenes, positivas y negativas de ball, ball por imagen, y los cuartiles (Q1, mediana, Q3, IQR) de width, height, área relativa y aspect ratio de las bounding boxes.",
          minLength: 250,
          rows: 7,
        },
      ],
    },
    {
      id: "motion-hypothesis",
      title: "Hipótesis física: ¿movimiento?",
      intro: "El valor está en pasar de estadística a hipótesis física, y de ahí a inspección visual.",
      fields: [
        {
          id: "geometricRegimes",
          kind: "textarea",
          label:
            "¿Observas evidencia de más de una población geométrica dentro de `ball`? ¿Qué fenómeno físico podría explicar esa diferencia?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "visualValidation",
          kind: "textarea",
          label:
            "¿Cómo validaste esa hipótesis revisando imágenes concretas (no solo números)? Reconoce la incertidumbre que corresponda: anotaciones imperfectas, perspectiva, estela diagonal, oclusión, objetos muy pequeños.",
          minLength: 200,
          rows: 6,
        },
        {
          id: "trainValDesign",
          kind: "textarea",
          label: "¿Cómo utilizarías esta información geométrica al diseñar train y validation?",
          minLength: 150,
          rows: 5,
        },
      ],
    },
    {
      id: "metric-choice",
      title: "Precision vs. Recall",
      intro: "No hay una respuesta obviamente correcta aquí; hay respuestas mejor o peor justificadas.",
      fields: [
        {
          id: "metricChoice",
          kind: "single_choice",
          label: "Para este problema, ¿qué métrica considera más importante: Precision o Recall?",
          options: [
            { id: "precision", label: "Precision" },
            { id: "recall", label: "Recall" },
          ],
        },
        {
          id: "metricJustification",
          kind: "textarea",
          label:
            "Justifique técnicamente su decisión pensando en un robot físico: ¿qué pasa si el sistema actúa sobre un falso positivo? ¿Y si ignora un falso negativo?",
          minLength: 250,
          rows: 7,
        },
      ],
    },
    {
      id: "hsv",
      title: "Color y HSV",
      intro: "No aceptes thresholds copiados de internet: justifica cada límite con tus propios histogramas.",
      fields: [
        {
          id: "hsvEvidence",
          kind: "evidence",
          label: "Histogramas HSV",
          accept: "image/*",
          multiple: true,
          maxFiles: 6,
          required: true,
        },
        {
          id: "hsvThresholds",
          kind: "textarea",
          label: "¿Qué regiones de H, S y V decidiste incluir o excluir para tus thresholds de `ball`, y por qué?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "hsvMotionBlur",
          kind: "textarea",
          label:
            "¿Esperas que una pelota compacta y una con estela produzcan la misma distribución HSV? Considera mezcla de píxeles pelota/fondo, exposición, bordes difusos y sensibilidad de V a la iluminación.",
          minLength: 200,
          rows: 6,
        },
        {
          id: "hsvLimitations",
          kind: "textarea",
          label:
            "¿Qué limitaciones tendría un threshold elegido únicamente con este dataset (otra cámara, otra habitación, otra pelota)?",
          minLength: 150,
          rows: 5,
        },
      ],
    },
    {
      id: "domain",
      title: "HSV vs. Deep Learning y límites del dominio",
      fields: [
        {
          id: "hsvVsDl",
          kind: "textarea",
          label:
            "Un detector HSV y una red neuronal pueden reaccionar de forma diferente ante cambios de iluminación, fondo, escala, motion blur y apariencia. Explica por qué.",
          minLength: 200,
          rows: 6,
        },
        {
          id: "domainLimits",
          kind: "textarea",
          label: "¿Qué puedes afirmar con evidencia sobre un modelo entrenado con este dataset, y qué NO puedes afirmar todavía?",
          minLength: 150,
          rows: 5,
        },
        {
          id: "hypothesisForA2",
          kind: "textarea",
          label: "¿Qué hipótesis llevarás a A2 (YOLO y/o OpenCV) a partir de este análisis?",
          minLength: 100,
          rows: 4,
        },
      ],
    },
    reflectionSection(),
  ],
};
