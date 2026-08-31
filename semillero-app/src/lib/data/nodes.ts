import type { SkillNodeDef } from "@/lib/types";

const TYPE_LABEL: Record<SkillNodeDef["category"], string> = {
  fundamentos: "Fundamentos",
  sub: "Subhabilidad",
  aplicacion: "Aplicación",
  profundizacion: "Profundización",
  critica: "Evaluación crítica",
  libre: "Reto libre",
};

function n(
  id: string,
  branchId: SkillNodeDef["branchId"],
  depth: number,
  offset: number,
  title: string,
  category: SkillNodeDef["category"],
  description: string,
  requires: string[],
  extra?: { bonus?: boolean }
): SkillNodeDef {
  return {
    id,
    branchId,
    depth,
    offset,
    title,
    category,
    typeLabel: TYPE_LABEL[category],
    description,
    requires,
    ...extra,
  };
}

export const SKILL_NODES: SkillNodeDef[] = [
  // Diseño / CAD
  n("D0", "design", 0, 0, "Entrega rápida", "fundamentos",
    "Comparte cualquier archivo relacionado con una idea, proyecto o aprendizaje y cuéntanos brevemente qué representa.", []),
  n("D1A", "design", 1, -1, "Geometría bajo control", "sub",
    "Observa varios croquis e identifica cuál está completamente definido y qué restricción falta.", ["D0"]),
  n("D1B", "design", 1, 1, "El material también diseña", "sub",
    "Asigna un material real a tu pieza (por ejemplo aluminio 6061) y calcula su masa, volumen y centro de masa.", ["D0"]),
  n("D2", "design", 2, 0, "Diseña menos, logra más", "aplicacion",
    "Reduce al menos 15% la masa de tu pieza sin modificar las superficies de montaje, y explica tus decisiones.", ["D1A", "D1B"]),
  n("D3A", "design", 3, -1, "Diseña para imprimir", "profundizacion",
    "Se presenta una pieza problemática para impresión 3D: identifica y corrige los problemas de manufactura aditiva.", ["D2"]),
  n("D3B", "design", 3, 1, "Diseña para fabricar y ensamblar", "profundizacion",
    "Detecta problemas de manufactura y ensamble en una pieza (tornillos inaccesibles, tolerancias imposibles) y corrígelos.", ["D2"]),
  n("D4", "design", 4, 0, "Diseña algo que exista", "libre",
    "Diseña una pieza, conjunto o mecanismo que consideres útil para un robot y documenta tu proceso.", ["D3A", "D3B"]),

  // Mecánica
  n("M0", "mechanics", 0, 0, "Piensa como un mecanismo", "fundamentos",
    "Minijuegos visuales sobre engranajes, poleas, palancas y sentido de giro para poner a prueba tu intuición mecánica.", []),
  n("M1A", "mechanics", 1, -1, "Fuerzas que cuentan una historia", "sub",
    "Resuelve problemas visuales de reacción, momento, torque y brazo de palanca.", ["M0"]),
  n("M1B", "mechanics", 1, 1, "Cambia velocidad por fuerza", "sub",
    "A partir de motor, velocidad y carga, elige una relación de reducción adecuada.", ["M0"]),
  n("M2", "mechanics", 2, 0, "Elige el actuador correcto", "aplicacion",
    "Dado un brazo que debe levantar una carga en un tiempo determinado, estima el torque, la velocidad y el motor/reducción necesarios.", ["M1A", "M1B"]),
  n("M3A", "mechanics", 3, -1, "¿La estructura aguanta?", "profundizacion",
    "Interpreta un análisis estructural (FEA): identifica restricciones, cargas, deformación y factor de seguridad.", ["M2"]),
  n("M3B", "mechanics", 3, 1, "Inventa el movimiento", "profundizacion",
    "Propón o selecciona un mecanismo (husillo, cuatro barras, piñón-cremallera...) para lograr un movimiento específico.", ["M2"]),
  n("M4", "mechanics", 4, 0, "Mecánica libre", "libre",
    "Diseña o analiza un subsistema mecánico para un robot: transmisión, manipulador, suspensión o estructura.", ["M3A", "M3B"]),

  // Electrónica
  n("E0", "electronics", 0, 0, "Fundamentos eléctricos y símbolos", "fundamentos",
    "Resuelve cinco minirretos sobre voltaje, corriente, polaridad, Ley de Ohm, potencia y símbolos eléctricos.", []),
  n("E1A", "electronics", 1, -1, "Lee un plano eléctrico", "sub",
    "Interpreta un esquema de robot, identifica la función de sus bloques y diagnostica tres fallas eléctricas.", ["E0"]),
  n("E1B", "electronics", 1, 1, "Habla con el microcontrolador", "sub",
    "Consulta un datasheet de ESP32 y relaciona GPIO, ADC, PWM, UART, I²C y SPI con aplicaciones reales.", ["E0"]),
  n("E2", "electronics", 2, 0, "Del problema al esquema electrónico", "aplicacion",
    "Diseña la arquitectura electrónica de un robot móvil: componentes, esquema propio y explicación del flujo funcional.", ["E1A", "E1B"]),
  n("E3A", "electronics", 3, -1, "Alimenta el robot", "profundizacion",
    "Dimensiona batería, reguladores y rieles de alimentación a partir de consumos nominales y corrientes pico.", ["E2"]),
  n("E3B", "electronics", 3, 1, "Simula antes de construir", "profundizacion",
    "Investiga simuladores de electrónica, controla dos motores por simulación y añade un sensor que cambie su comportamiento.", ["E2"]),
  n("E4", "electronics", 4, 0, "Electrónica libre", "libre",
    "Documenta un sistema electrónico propio para robótica y reúne su esquema, evidencias, código y reflexión final.", ["E3A", "E3B"]),

  // Control y Automatización
  n("C0", "control", 0, 0, "Persigue la referencia", "fundamentos",
    "Un robot debe mantenerse a 50 cm de un objetivo: decide qué debería hacer cuando la distancia cambia.", []),
  n("C1A", "control", 1, -1, "Abierto o realimentado", "sub",
    "Compara control en lazo abierto y en lazo cerrado, y elige cuál usar para un posicionamiento preciso.", ["C0"]),
  n("C1B", "control", 1, 1, "¿Quién mide y quién actúa?", "sub",
    "Clasifica sensores y actuadores (encoder, IMU, LiDAR, servo...) y decide cuáles cierran cada lazo.", ["C0"]),
  n("C2", "control", 2, 0, "Domina el Kp", "aplicacion",
    "Ajusta un control proporcional (Kp) en una simulación interactiva buscando respuesta rápida sin oscilación.", ["C1A", "C1B"]),
  n("C3A", "control", 3, -1, "Afina un PID", "profundizacion",
    "Ante error estacionario, oscilaciones o ruido, ajusta o selecciona las ganancias Kp, Ki y Kd adecuadas.", ["C2"]),
  n("C3B", "control", 3, 1, "Lee la respuesta", "profundizacion",
    "A partir de una gráfica de respuesta, identifica tiempo de subida, overshoot, error estacionario y estabilidad.", ["C2"]),
  n("C4", "control", 4, 0, "Haz que el robot siga", "aplicacion",
    "Programa las velocidades de motor de un robot diferencial a partir del error de seguimiento.", ["C3A", "C3B"]),
  n("C5", "control", 5, 0, "Diagnostica el controlador", "critica",
    "Compara tres respuestas de control (lenta, oscilatoria, rápida con overshoot leve) y justifica cuál implementarías.", ["C4"]),
  n("C6", "control", 6, 0, "Control libre", "libre",
    "Controla cualquier sistema que te interese y documenta sensor, controlador, actuador y resultado.", ["C5"]),

  // Software
  n("S0", "software", 0, 0, "Haz pensar al robot", "fundamentos",
    "Guía a un robot de A a B usando bloques de avanzar, girar, condicionales y repeticiones.", []),
  n("S1A", "software", 1, -1, "Código que decide", "sub",
    "En un editor de código, procesa mediciones de un sensor de distancia y decide avanzar, reducir velocidad o detener el robot.", ["S0"]),
  n("S1B", "software", 1, 1, "Rompe el bug", "sub",
    "Encuentra y corrige errores en un código con bugs, y valida tu solución con tests.", ["S0"]),
  n("S2", "software", 2, 0, "El robot tiene estados", "aplicacion",
    "Construye una máquina de estados (buscar, aproximar, interactuar, volver) con condiciones y transiciones.", ["S1A", "S1B"]),
  n("S3A", "software", 3, -1, "Haz que los sistemas hablen", "profundizacion",
    "Procesa mensajes de sensores y genera decisiones usando conceptos de comunicación (serial, JSON, pub/sub).", ["S2"]),
  n("S3B", "software", 3, 1, "Divide un robot en piezas de software", "profundizacion",
    "Divide un robot en piezas de software (cámara, detector, planner, controlador) y propón nodos, mensajes y flujo.", ["S2"]),
  n("S4", "software", 4, 0, "Software libre", "libre",
    "Crea una herramienta de software útil para un robot: nodo, controlador, GUI, simulador o algoritmo.", ["S3A", "S3B"]),

  // Inteligencia Artificial — percepción de una pelota de tenis de mesa
  n("A0", "ai", 0, 0, "¿Puedes confiar en tus datos?", "fundamentos",
    "Audita un dataset multiclase de pelotas de tenis de mesa, determina si es confiable para detectar únicamente `ball` y prepara una versión utilizable, documentando cada problema y decisión de limpieza.", []),
  n("A1", "ai", 1, 0, "¿Entiendes lo que estás observando?", "sub",
    "Analiza distribución, geometría y color del dataset ya auditado: cuartiles de bounding boxes, motion blur como hipótesis física, histogramas HSV y el falso dilema Precision vs. Recall.", ["A0"]),
  n("A2_YOLO", "ai", 2, -1, "Entrena, pero primero formula una hipótesis", "aplicacion",
    "Entrena un detector YOLOv8 con Ultralytics: baseline reproducible, experimentación controlada (una variable a la vez) e interpretación de las pérdidas reportadas.", ["A1"]),
  n("A2_OPENCV", "ai", 2, 1, "¿Realmente necesitas Deep Learning?", "aplicacion",
    "Construye un detector clásico con OpenCV (HSV, threshold, contornos) a partir de los hallazgos de A1, y audita si el código generado por IA convierte los colores correctamente.", ["A1"]),
  n("A3", "ai", 3, 0, "¿Tu solución funciona fuera del caso ideal?", "profundizacion",
    "Compara experimentalmente YOLO y OpenCV bajo degradaciones controladas (brillo y otras), sin asumir de antemano cuál se degrada primero.", ["A2_YOLO", "A2_OPENCV"]),
  n("A4_RL", "ai", 4, -1, "El agente optimiza lo que escribiste", "libre",
    "BONUS — Entrena un agente de Reinforcement Learning, analiza su curva de recompensa e identifica si maximizar el reward realmente logró el comportamiento deseado (reward hacking).", ["A3"], { bonus: true }),
  n("A4_GENERAL", "ai", 4, 1, "¿Puedes salirte del dataset?", "libre",
    "BONUS — Consigue evidencia de que tu detector funciona fuera del dominio visual original y, opcionalmente, añade tracking temporal eficiente en vez de detectar en cada frame.", ["A3"], { bonus: true }),

  // Sistemas e Integración Robótica
  n("SI0", "systems", 0, 0, "Entra a la terminal", "fundamentos",
    "En una terminal simulada, encuentra un archivo usando ls, cd, pwd y cat.", []),
  n("SI1A", "systems", 1, -1, "Navega el sistema", "sub",
    "Crea, copia, mueve, busca y elimina archivos usando comandos del sistema de archivos.", ["SI0"]),
  n("SI1B", "systems", 1, 1, "Hazlo ejecutable", "sub",
    "Un script no tiene permisos de ejecución: diagnostica y resuelve el problema con chmod.", ["SI0"]),
  n("SI2", "systems", 2, 0, "El entorno está roto", "aplicacion",
    "Un script falla por una dependencia faltante: investiga el entorno de Python y diagnostica la causa.", ["SI1A", "SI1B"]),
  n("SI3A", "systems", 3, -1, "Encuentra el proceso rebelde", "profundizacion",
    "Un proceso está consumiendo toda la CPU: encuéntralo y detenlo con las herramientas adecuadas.", ["SI2"]),
  n("SI3B", "systems", 3, 1, "¿Por qué no puedo hablar con el robot?", "profundizacion",
    "El robot y tu computador no se comunican: diagnostica la conectividad de red entre ambos.", ["SI2"]),
  n("SI4", "systems", 4, 0, "Inspecciona un robot con ROS 2", "aplicacion",
    "El robot detecta objetos pero no se mueve: inspecciona nodos y tópicos de ROS 2 para encontrar dónde se rompe la comunicación.", ["SI3A", "SI3B"]),
  n("SI5", "systems", 5, -1, "Trabaja como equipo con Git", "profundizacion",
    "Interpreta y usa comandos de Git (status, diff, add, commit, branch) en un repositorio con un conflicto sencillo.", ["SI4"]),
  n("SI6", "systems", 5, 1, "Ponlo a funcionar fuera de tu PC", "libre",
    "Prepara un entorno de ejecución reproducible para una pequeña aplicación robótica.", ["SI4"]),
];

export const IR_NODE: SkillNodeDef = n(
  "IR",
  "systems",
  99,
  0,
  "Conecta tus habilidades",
  "libre",
  "Combina al menos dos de las áreas que exploraste para proponer o construir una solución robótica completa.",
  []
);

export const APPLICATION_NODE_IDS: ReadonlyArray<string | readonly string[]> = [
  "D2",
  "M2",
  "E2",
  "C2",
  "S2",
  ["A2_YOLO", "A2_OPENCV"],
  "SI2",
];

export const ALL_NODES: SkillNodeDef[] = [...SKILL_NODES, IR_NODE];

export function nodeById(id: string): SkillNodeDef | undefined {
  return ALL_NODES.find((node) => node.id === id);
}
