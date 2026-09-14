import { reflectionSection, type AiNodeContent } from "@/lib/challenges/ai/schema";

export const A0_CONTENT: AiNodeContent = {
  nodeId: "A0",
  title: "¿Puedes confiar en tus datos?",
  subtitle:
    "Esta prueba no busca medir cuánto sabes de inteligencia artificial. Busca observar cómo piensas cuando los datos, los modelos o tus propios experimentos pueden estar equivocados. El objetivo actual es construir un detector de pelotas de tenis de mesa: antes de entrenar cualquier modelo, audita el dataset, determina si es confiable para ese objetivo y prepara una versión utilizable.",
  estimatedTime: "60–90 minutos",
  context:
    "Puedes utilizar documentación, Internet e inteligencia artificial generativa en toda la rama de IA para programar y aprender. Eres responsable de revisar, comprender y validar todo lo que utilices: no se penaliza usar IA, sí se penaliza código no comprendido, conclusiones incompatibles con tus propios resultados o errores básicos que no detectaste. Recibes un dataset de imágenes de tenis de mesa proveniente de una fuente tipo Roboflow, con varias clases anotadas. El objetivo de esta prueba es detectar únicamente pelotas de tenis de mesa (`ball`), no todo lo demás que aparece anotado.",
  objective:
    "Auditar el dataset, documentar todos los problemas encontrados y justificar cada decisión de limpieza o transformación antes de entrenar ningún modelo.",
  resources: [
    {
      label: "Descargar dataset (estudiantes)",
      href: "/challenges/ai/a0/table-tennis-ball-dataset-student.zip",
      description: "Incluye imágenes, labels en formato YOLO y data.yaml.",
    },
  ],
  sections: [
    {
      id: "structure",
      title: "Estructura del dataset",
      intro:
        "No asumas nada sobre el dataset que no puedas verificar leyendo sus propios archivos.",
      fields: [
        {
          id: "classes",
          kind: "text",
          label: "¿Qué clases contiene realmente el dataset y cuál corresponde a `ball`?",
          help: "Revisa data.yaml. No asumas que ball siempre tiene el mismo ID.",
          minLength: 20,
        },
        {
          id: "monoclassPrep",
          kind: "textarea",
          label:
            "¿Todas las clases son necesarias para el problema actual? ¿Cómo preparaste las anotaciones para una tarea monoclase y cómo verificaste que el remapeo de IDs quedó consistente?",
          minLength: 150,
          rows: 5,
        },
        {
          id: "negativesVsMissing",
          kind: "textarea",
          label:
            "¿Qué ocurre con una imagen que contiene persona, mesa y raqueta pero no pelota? ¿Un label vacío implica necesariamente un error?",
          minLength: 150,
          rows: 5,
        },
      ],
    },
    {
      id: "audit",
      title: "Auditoría técnica",
      intro:
        "Distingue lo que puedes validar solo con el archivo de anotaciones de lo que necesitas comparar contra la imagen.",
      fields: [
        {
          id: "formatChecks",
          kind: "textarea",
          label:
            "¿Qué validaciones de una bounding box en formato YOLO puedes realizar sin mirar la imagen? Aplícalas y reporta cuántos problemas encontraste por tipo (integridad de archivos, bbox inválidas, missing annotations, bbox inconsistentes).",
          minLength: 200,
          rows: 6,
        },
        {
          id: "visualOnlyErrors",
          kind: "textarea",
          label:
            "¿Qué errores solo puedes detectar comparando la imagen con su anotación? Da al menos dos ejemplos concretos que hayas encontrado.",
          minLength: 150,
          rows: 5,
        },
        {
          id: "motionBlurDecision",
          kind: "textarea",
          label:
            "¿Eliminarías imágenes con motion blur? Justifica tu decisión distinguiendo motion blur natural de un error real de anotación.",
          minLength: 150,
          rows: 5,
        },
        {
          id: "auditEvidence",
          kind: "evidence",
          label: "Evidencia de auditoría",
          help: "Script, notebook o reporte con lo que encontraste (código, conteos, capturas).",
          accept: ".py,.ipynb,.csv,.json,.md,.pdf,text/*,image/*",
          multiple: true,
          maxFiles: 6,
          required: true,
        },
      ],
    },
    {
      id: "cleanup",
      title: "Limpieza reproducible",
      intro: "Una limpieza que no puedes reproducir no sirve para un dataset de examen ni para un dataset real.",
      fields: [
        {
          id: "cleanupProcess",
          kind: "textarea",
          label:
            "Describe tu proceso de limpieza reproducible: qué eliminaste, qué conservaste y por qué. ¿Cómo evitaste destruir la variabilidad natural del dataset (blur, tamaños, oclusión, negativos legítimos)?",
          minLength: 200,
          rows: 6,
        },
        {
          id: "splitAugmentOrder",
          kind: "single_choice",
          label: "¿En qué orden aplicarías el split y las augmentations?",
          options: [
            { id: "split_then_augment", label: "Split → augmentations solo sobre train" },
            { id: "augment_then_split", label: "Augmentations → luego split" },
          ],
        },
        {
          id: "leakageJustification",
          kind: "textarea",
          label: "¿Por qué el orden que elegiste evita o permite data leakage entre train, validation y test?",
          minLength: 100,
          rows: 4,
        },
      ],
    },
    reflectionSection(),
  ],
};
