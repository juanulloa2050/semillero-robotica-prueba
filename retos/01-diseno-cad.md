# Diseño / CAD

Color de rama: `#3455D1` · Del plano a la pieza que existe.

## Progresión

```text
D0 — Del plano al modelo (Fundamentos)
├── D1A — Geometría bajo control (Subhabilidad)
└── D1B — El material también diseña (Subhabilidad)
        ↓ (con D1A o D1B completado)
    D2 — Diseña menos, logra más (Aplicación)
        ├── D3A — Diseña para imprimir (Profundización)
        └── D3B — Diseña para fabricar y ensamblar (Profundización)
                ↓ (con D3A o D3B completado)
            D4 — Diseña algo que exista (Reto libre)

D5 — Muéstranos tu mejor trabajo (Reto libre, independiente del árbol)
```

8 nodos. D0 y D5 disponibles desde el inicio. Cada bifurcación se desbloquea al
completar **cualquiera** de sus dos padres (no hace falta hacer los dos). D5
no depende de ningún otro nodo ni desbloquea nada — es un espacio aparte para
que el aspirante muestre trabajo propio ya existente.

## Resumen

| ID | Título | Nivel | Requiere | Desbloquea |
|---|---|---|---|---|
| D0 | Del plano al modelo | Fundamentos | — | D1A, D1B |
| D1A | Geometría bajo control | Subhabilidad | D0 | D2 |
| D1B | El material también diseña | Subhabilidad | D0 | D2 |
| D2 | Diseña menos, logra más | Aplicación | D1A o D1B | D3A, D3B |
| D3A | Diseña para imprimir | Profundización | D2 | D4 |
| D3B | Diseña para fabricar y ensamblar | Profundización | D2 | D4 |
| D4 | Diseña algo que exista | Reto libre | D3A o D3B | — |
| D5 | Muéstranos tu mejor trabajo | Reto libre | — | — |

---

## D0 — Del plano al modelo

**Estado en la app:** Fundamentos · sin requisitos · desbloquea D1A, D1B

### Ya definido

- **Mini-descripción actual (panel de debug):** "Se entrega un plano técnico
  sencillo: modela la pieza, sube tu archivo o capturas y responde las
  dimensiones principales."
- **De la especificación original:**
  - Reto: se entrega un plano técnico sencillo; el candidato debe modelar la
    pieza en el CAD que prefiera, subir archivo o capturas, y responder
    dimensiones verificables.
  - Interacción sugerida: visor de plano, campos numéricos, carga de evidencia.
  - Evidencia sugerida: captura o archivo CAD + respuestas dimensionales.

### Por definir

- **Tipo de reto sugerido:** C (valor numérico) + H (subida de evidencia)
- **Enunciado final:**
  > Te entregamos el plano técnico de una placa soporte en L (vista frontal,
  > lateral y superior, cotas en milímetros). Modélala en el software CAD que
  > prefieras (SolidWorks, Fusion 360, FreeCAD, Onshape, etc.), respetando
  > todas las cotas indicadas. Cuando termines, sube tu archivo o capturas de
  > pantalla del modelo y responde las dimensiones principales que te
  > preguntamos abajo.
- **Recursos que se muestran:** Imagen/PDF de un plano técnico simple: placa
  en forma de "L" de 4 mm de espesor, brazo largo de 80 × 30 mm y brazo corto
  de 40 × 30 mm, con un barreno pasante de Ø10 mm centrado en el brazo corto y
  dos barrenos de Ø6 mm en el brazo largo (para tornillería de montaje),
  todas las cotas acotadas en el plano. (Falta producir el archivo de imagen/PDF
  final del plano; la geometría arriba descrita ya es suficiente para dibujarlo.)
- **Opciones / respuesta correcta:**
  - Espesor de la placa: `4 mm` (tolerancia ±0.2 mm)
  - Longitud del brazo largo: `80 mm` (tolerancia ±0.3 mm)
  - Longitud del brazo corto: `40 mm` (tolerancia ±0.3 mm)
  - Diámetro del barreno central: `10 mm` (tolerancia ±0.1 mm)
  - Volumen aproximado de la pieza (solo referencia, no obligatorio): ~14 400 mm³
- **Pistas:**
  - Pista 1: Empieza por el croquis 2D de la silueta en "L" sobre el plano
    principal antes de extruir.
  - Pista 2: Los barrenos se agregan después de la extrusión, como una
    operación de corte (`cut extrude` / `hole`), no como parte del croquis base.
  - Pista 3: Revisa que el espesor extruido coincida con la cota de la vista
    lateral, no con la de la vista frontal.
- **Feedback si acierta:** "¡Bien hecho! Tu modelo coincide con el plano
  entregado. Ya tienes desbloqueadas las dos siguientes rutas de esta rama."
- **Feedback si no acierta:** "Todavía no. Revisa con cuál vista estás
  tomando cada cota — es un error común confundir largo con ancho. Puedes
  ajustar tu modelo y volver a responder cuando quieras."
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** Validación automática por rango de tolerancia
  en los 4 valores numéricos. La evidencia (archivo o capturas) no se
  autoevalúa, pero queda guardada para que el evaluador confirme que el
  modelo 3D real corresponde a las cotas reportadas (evita que alguien
  adivine los números sin modelar).

---

## D1A — Geometría bajo control

**Estado en la app:** Subhabilidad · requiere D0 · desbloquea D2 (junto con D1B, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Observa varios croquis e
  identifica cuál está completamente definido y qué restricción falta."
- **De la especificación original:**
  - Reto: se presentan varios croquis; debe identificar cuál está completamente
    definido, qué restricción falta y qué dimensión controla determinado cambio.
  - Interacción sugerida: selección, highlight visual, matching.

### Por definir

- **Tipo de reto sugerido:** A (selección única) + E (matching, en un segundo
  sub-paso)
- **Enunciado final:**
  > Aquí tienes 4 croquis de una misma placa rectangular con un barreno,
  > dibujados en distintos programas CAD. Usan la convención estándar de
  > color (líneas azules = geometría sin restringir por completo, líneas
  > negras = geometría totalmente definida). Solo uno de los cuatro está
  > completamente definido. Identifícalo y luego indica cuál restricción o
  > cota le falta a **uno** de los otros tres croquis incompletos que
  > señalemos.
- **Recursos que se muestran:** 4 imágenes de croquis de la misma placa
  (100 × 50 mm con barreno Ø8 mm):
  - Croquis 1: totalmente acotado y restringido (líneas negras) — **es el correcto**.
  - Croquis 2: falta la cota de posición horizontal del barreno (queda libre
    en X, línea azul en el centro del barreno).
  - Croquis 3: falta la restricción de paralelismo entre dos lados, el
    rectángulo puede "abrirse" como paralelogramo.
  - Croquis 4: falta la cota de uno de los lados (el rectángulo puede
    estirarse). _(Falta producir las 4 imágenes; la descripción geométrica ya
    es suficiente para generarlas en cualquier CAD y exportarlas como PNG.)_
- **Opciones / respuesta correcta:**
  - Selección única: "Croquis 1" es el completamente definido.
  - Matching / segunda parte: Croquis 2 → "Falta cota de posición del
    barreno"; Croquis 3 → "Falta restricción de paralelismo"; Croquis 4 →
    "Falta cota de longitud de un lado".
- **Pistas:**
  - Pista 1: En la mayoría de CADs, el color azul (o verde según el software)
    indica grados de libertad sin restringir.
  - Pista 2: Si puedes arrastrar una entidad del croquis con el mouse y se
    mueve, no está completamente definida.
  - Pista 3: Cuenta cuántas cotas y restricciones geométricas tiene cada
    croquis; el que tiene el número exacto necesario (ni de más ni de menos)
    suele ser el correcto.
- **Feedback si acierta:** "Correcto. Reconocer geometría sub-restringida es
  clave antes de construir piezas más complejas."
- **Feedback si no acierta:** "Todavía no. Fíjate en el color de las líneas
  de cada croquis, ahí está la pista visual principal. Puedes volver a
  intentarlo."
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** Reto 100% autoevaluable (selección + matching),
  no requiere revisión manual.

---

## D1B — El material también diseña

**Estado en la app:** Subhabilidad · requiere D0 · desbloquea D2 (junto con D1A, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Asigna un material real a tu
  pieza (por ejemplo aluminio 6061) y calcula su masa, volumen y centro de masa."
- **De la especificación original:**
  - Reto: asignar un material definido (ej. `Aluminio 6061`) y responder masa,
    volumen, centro de masa y, opcionalmente, área superficial.
  - Evaluación: valores numéricos con tolerancia.

### Por definir

- **Tipo de reto sugerido:** C (valor numérico, uno por cada magnitud pedida)
- **Enunciado final:**
  > Usa la misma placa en "L" que modelaste en el reto D0 (si no la tienes,
  > modélala primero). Asígnale el material **Aluminio 6061** desde las
  > propiedades del material en tu CAD y calcula, usando las herramientas de
  > propiedades físicas del software: masa, volumen y ubicación del centro de
  > masa respecto al origen de la pieza.
- **Recursos que se muestran:** La misma pieza de D0 (placa en "L", 4 mm de
  espesor, brazo largo 80 × 30 mm, brazo corto 40 × 30 mm, barreno central
  Ø10 mm, dos barrenos Ø6 mm).
- **Opciones / respuesta correcta:** (calculado con densidad de Aluminio 6061
  ≈ 2.70 g/cm³ sobre el volumen neto tras restar los 3 barrenos, ~14 025 mm³)
  - Volumen: `14 025 mm³` (tolerancia ±3%)
  - Masa: `37.9 g` (tolerancia ±5%, para tolerar redondeos de cada CAD)
  - Centro de masa en X (desde la esquina de referencia del plano): `_valor
    exacto a calcular una vez esté modelada la pieza final_ mm` (tolerancia
    ±2 mm)
  - Centro de masa en Y: `_ídem_ mm` (tolerancia ±2 mm)
- **Pistas:**
  - Pista 1: Verifica que el material asignado sea exactamente "Aluminio
    6061" y no una aleación genérica; la densidad cambia el resultado.
  - Pista 2: El centro de masa de una pieza en "L" no cae en su centro
    geométrico aparente, sino desplazado hacia el brazo con más material.
  - Pista 3: Si tu CAD te da el resultado en otras unidades (lb, in³),
    conviértelo antes de responder.
- **Feedback si acierta:** "Exacto. Ya sabes usar propiedades físicas reales,
  no solo geometría — eso es clave para diseño de piezas robóticas."
- **Feedback si no acierta:** "Todavía no. Revisa que el material aplicado
  sea Aluminio 6061 y que estés leyendo las unidades correctas en el panel de
  propiedades físicas."
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** Los valores exactos de centro de masa deben
  recalcularse cuando se genere el modelo 3D definitivo de la pieza (aquí se
  deja el método y las tolerancias; el número exacto de X/Y depende del
  origen que se defina en el CAD de referencia).

---

## D2 — Diseña menos, logra más

**Estado en la app:** Aplicación · requiere D1A o D1B · desbloquea D3A, D3B

### Ya definido

- **Mini-descripción actual (panel de debug):** "Reduce al menos 15% la masa
  de tu pieza sin modificar las superficies de montaje, y explica tus decisiones."
- **De la especificación original:**
  - Reto: "Reduce al menos 15 % la masa sin modificar las superficies de montaje."
  - Entrega esperada: captura antes, captura después, masa antes, masa después,
    explicación de las decisiones.

### Por definir

- **Tipo de reto sugerido:** H (evidencia: capturas antes/después) + C (masa antes/después) + I (explicación abierta)
- **Enunciado final:**
  > Toma la placa en "L" de los retos anteriores (o una pieza equivalente
  > tuya) y rediseña su geometría para **reducir al menos 15% su masa**, sin
  > tocar las caras de montaje (las caras donde van los barrenos de Ø6 mm ni
  > la cara donde va el barreno central Ø10 mm deben cambiar de posición ni
  > de diámetro). Puedes usar aligeramientos, nervaduras, cambios de
  > espesor en zonas sin carga, etc. Sube una captura del modelo antes,
  > una del modelo después, la masa de cada uno, y una breve explicación de
  > qué decisiones tomaste y por qué.
- **Recursos que se muestran:** La pieza de referencia (placa en "L" de D0/D1B)
  como punto de partida, con nota explícita de cuáles caras son "de montaje"
  y no se pueden alterar.
- **Opciones / respuesta correcta:**
  - Masa antes: se autocompleta o se pide para verificar consistencia con D1B
    (`37.9 g` aprox., ±5%).
  - Masa después: debe ser ≤ 85% de la masa "antes" reportada (o sea,
    reducción ≥15%).
  - Explicación: campo abierto (tipo I), sin respuesta única.
- **Pistas:**
  - Pista 1: Los aligeramientos (bolsillos) suelen quitar más masa que
    reducir espesor uniformemente, y son más fáciles de justificar
    estructuralmente.
  - Pista 2: Revisa que ningún barreno de montaje haya cambiado de diámetro o
    posición al hacer el rediseño — eso invalidaría la pieza aunque baje de peso.
  - Pista 3: Piensa en dónde realmente hay esfuerzo (cerca de los barrenos de
    carga) versus dónde solo hay "material de relleno" que puedes quitar.
- **Feedback si acierta:** "Buen trabajo. Redujiste masa manteniendo la
  función de montaje intacta — así se piensa el diseño para robots reales,
  donde cada gramo cuenta."
- **Feedback si no acierta:** "Todavía no llega al 15% de reducción (o se
  modificó una cara de montaje). Puedes ajustar tu geometría y volver a
  subir tu evidencia cuando quieras."
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** La verificación automática de % de masa es
  posible, pero **la validación de "no modificar superficies de montaje"
  requiere revisión humana** de las capturas/archivo subido — no es algo que
  el sistema pueda comprobar solo con un número.

---

## D3A — Diseña para imprimir

**Estado en la app:** Profundización · requiere D2 · desbloquea D4 (junto con D3B, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Se presenta una pieza
  problemática para impresión 3D: identifica y corrige los problemas de
  manufactura aditiva."
- **De la especificación original:**
  - Reto: se presenta una pieza deliberadamente problemática para impresión 3D.
  - Problemas posibles a incluir: overhang, orientación, espesor insuficiente,
    exceso de soportes, anisotropía, tolerancias.
  - Debe identificar y corregir los problemas.

### Por definir

- **Tipo de reto sugerido:** B (selección múltiple de problemas) + H (evidencia de la corrección)
- **Enunciado final:**
  > Te mostramos un soporte tipo "gancho" pensado para impresión 3D en FDM,
  > con varios problemas de manufactura aditiva. Identifica **todos** los
  > problemas que apliquen a esta pieza, corrígelos en tu CAD y sube tu
  > modelo corregido (archivo o capturas) explicando brevemente qué cambiaste.
- **Recursos que se muestran:** Modelo/imagen de un soporte en forma de gancho
  con estos problemas deliberados: (1) un brazo en voladizo horizontal de
  40 mm sin ningún apoyo (overhang >45° sin soporte), (2) una pared de 0.6 mm
  de espesor en la base (por debajo del mínimo típico de ~1.2 mm en FDM),
  (3) un agujero pasante horizontal de Ø5 mm impreso "acostado" que quedaría
  ovalado por el efecto de puente sin soporte. _(Falta producir el archivo /
  imagen final; la lista de problemas ya es suficiente para modelarlo.)_
- **Opciones / respuesta correcta:** (selección múltiple — todas correctas)
  - ✅ Overhang sin soporte en el brazo horizontal
  - ✅ Espesor de pared insuficiente en la base
  - ✅ Orientación de impresión inadecuada para el agujero pasante
  - ❌ Exceso de soportes (no aplica en esta pieza)
  - ❌ Anisotropía del material (no es el problema principal aquí)
- **Pistas:**
  - Pista 1: Cualquier voladizo con ángulo mayor a ~45° respecto a la
    vertical suele necesitar soporte o reorientación.
  - Pista 2: Revisa el espesor mínimo recomendado para tu impresora/material
    (usualmente 3 líneas de perímetro, ~1.0–1.2 mm con boquilla de 0.4 mm).
  - Pista 3: Los agujeros horizontales pequeños suelen imprimirse mejor
    verticales, o compensando el diámetro en el diseño.
- **Feedback si acierta:** "Correcto, identificaste los problemas reales de
  impresión de esta pieza. Ahora revisa que tu corrección los resuelva sin
  crear problemas nuevos."
- **Feedback si no acierta:** "Todavía no. Revisa uno por uno los criterios
  clásicos de diseño para impresión 3D: ángulos de voladizo, espesores
  mínimos y orientación de agujeros."
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** La selección múltiple se autoevalúa; la
  corrección subida (archivo/capturas) requiere revisión humana para
  confirmar que de verdad resuelve los 3 problemas y no solo los menciona en
  el texto.

---

## D3B — Diseña para fabricar y ensamblar

**Estado en la app:** Profundización · requiere D2 · desbloquea D4 (junto con D3A, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Detecta problemas de
  manufactura y ensamble en una pieza (tornillos inaccesibles, tolerancias
  imposibles) y corrígelos."
- **De la especificación original:**
  - Problemas posibles: acceso imposible de herramienta, tolerancias absurdas,
    tornillos inaccesibles, geometrías innecesarias, exceso de piezas.
  - Debe modificar y justificar.

### Por definir

- **Tipo de reto sugerido:** B (selección múltiple de problemas) + I (justificación) + H (evidencia)
- **Enunciado final:**
  > Te mostramos un ensamble simple de dos piezas atornilladas (una tapa
  > sobre una caja) con varios problemas de manufactura y ensamble. Identifica
  > los problemas, corrígelos en tu CAD, sube tu modelo corregido y justifica
  > brevemente cada cambio.
- **Recursos que se muestran:** Ensamble de una caja con tapa atornillada con
  estos problemas deliberados: (1) uno de los 4 tornillos queda dentro de un
  bolsillo tan angosto que ninguna llave/destornillador entra (acceso de
  herramienta imposible), (2) el ajuste entre tapa y caja tiene una
  tolerancia de 0.02 mm (demasiado ajustada para fabricación convencional,
  debería ser del orden de 0.1–0.2 mm), (3) hay dos nervaduras internas
  redundantes que no aportan resistencia y solo agregan material y tiempo de
  impresión/mecanizado. _(Falta producir el archivo/imagen final del
  ensamble; la lista de problemas ya es suficiente para modelarlo.)_
- **Opciones / respuesta correcta:** (selección múltiple — todas correctas)
  - ✅ Tornillo con acceso de herramienta imposible
  - ✅ Tolerancia de ajuste demasiado exigente para el proceso de fabricación
  - ✅ Geometría redundante (nervaduras innecesarias)
  - ❌ Exceso de piezas en el ensamble (no aplica, solo son 2 piezas)
- **Pistas:**
  - Pista 1: Imagina que tienes que atornillar la pieza con un destornillador
    real en la mano; si no cabe ni el destornillador ni tu mano, hay un
    problema de acceso.
  - Pista 2: Las tolerancias más ajustadas que ~0.05 mm normalmente requieren
    procesos de precisión (rectificado, CNC de alta gama), no fabricación
    estándar.
  - Pista 3: Antes de agregar refuerzos, pregúntate qué carga real va a
    soportar esa zona; si no hay carga significativa, probablemente sobra.
- **Feedback si acierta:** "Correcto. Diseñar pensando en quién va a
  ensamblar y fabricar la pieza es tan importante como que funcione en el
  modelo 3D."
- **Feedback si no acierta:** "Todavía no. Piensa en el proceso real de
  fabricación y ensamble: ¿entra una herramienta?, ¿es fabricable la
  tolerancia?, ¿sobra geometría?"
- **Intentos máximos:** Ilimitado.
- **Notas para el evaluador:** La selección múltiple se autoevalúa; la
  justificación (texto libre) y la corrección subida requieren revisión
  humana.

---

## D4 — Diseña algo que exista

**Estado en la app:** Reto libre · requiere D3A o D3B · no desbloquea nada más en esta rama

### Ya definido

- **Mini-descripción actual (panel de debug):** "Diseña una pieza, conjunto o
  mecanismo que consideres útil para un robot y documenta tu proceso."
- **De la especificación original:**
  - Enunciado: "Diseña una pieza, conjunto o mecanismo que consideres útil
    para un robot."
  - Entrega esperada: CAD o enlace, capturas, material, proceso de
    manufactura, explicación, limitaciones.

### Por definir

- **Tipo de reto sugerido:** J (reto libre, múltiples evidencias)
- **Enunciado final:**
  > Diseña una pieza, conjunto o mecanismo que consideres útil para un
  > robot. Puede ser algo tan simple como un soporte de sensor o tan
  > ambicioso como una pinza o un mecanismo articulado — lo importante es
  > que resuelva un problema real y que puedas explicar tus decisiones.
  > No hay una única respuesta correcta: aquí evaluamos criterio de diseño,
  > no un resultado exacto.
- **Recursos que se muestran:** Ninguno obligatorio (reto abierto); opcional
  mostrar 2-3 ejemplos de inspiración (soporte de sensor, pinza simple,
  bisagra) solo como referencia, sin restringir la elección.
- **Qué debe entregar exactamente:**
  - Obligatorio: archivo CAD o enlace al modelo, mínimo 2 capturas (una
    isométrica y una con cotas o vista técnica), material asignado, y una
    explicación escrita (mínimo ~100 palabras) de para qué sirve la pieza y
    por qué la diseñó así.
  - Opcional: proceso de manufactura propuesto (impresión 3D, mecanizado,
    láminas dobladas, etc.), limitaciones conocidas del diseño, e ideas de
    mejora futura.
- **Pistas:** (opcionales, sin bloquear)
  - Pista 1: Piensa primero en el problema que resuelve la pieza antes de
    pensar en su forma.
  - Pista 2: Una pieza simple y bien justificada vale más que una compleja
    sin explicación clara.
  - Pista 3: Si tienes dudas de alcance, es mejor entregar algo funcional y
    simple que algo ambicioso a medio terminar.
- **Feedback al entregar:** "¡Gracias por tu diseño! No hay una respuesta
  'correcta' aquí — lo que nos importa es cómo pensaste el problema. Tu
  entrega quedó guardada y será revisada como parte de tu perfil."
- **Notas para el evaluador:** Este nodo se revisa 100% de forma manual; no
  hay validación automática de "correcto/incorrecto". Criterios sugeridos
  para el evaluador: claridad del problema que resuelve, coherencia entre
  forma y función, calidad de la justificación escrita, y nivel de detalle
  técnico (material, tolerancias, manufactura) que el aspirante decidió
  incluir por iniciativa propia.

---

## D5 — Muéstranos tu mejor trabajo

**Estado en la app:** Reto libre · sin requisitos · disponible desde el
inicio · no desbloquea nada (nodo independiente del árbol principal)

### Ya definido

- **Mini-descripción actual (panel de debug):** _(nodo nuevo — no existía
  placeholder previo)._
- **Origen:** Nodo agregado a solicitud explícita, pensado para que el
  aspirante muestre un modelo CAD real que ya haya hecho por su cuenta
  (proyecto personal, universitario, de otro semillero, freelance, etc.),
  no algo creado para esta prueba.

### Por definir → ya completado

- **Tipo de reto sugerido:** H (subida de evidencia) + I (respuesta abierta)
- **Enunciado final:**
  > Cuéntanos sobre el modelo CAD del que te sientas más orgulloso — algo
  > en lo que ya hayas puesto tu mejor esfuerzo, sin importar si lo hiciste
  > para un curso, un proyecto personal, otro semillero o simplemente por
  > curiosidad. Sube el archivo (o capturas si el archivo es muy pesado o
  > confidencial) y cuéntanos: qué es, qué problema resolvía, qué fue lo más
  > difícil de lograr, y qué harías distinto si lo rehicieras hoy.
- **Recursos que se muestran:** Ninguno — el aspirante trae su propio
  contenido. La interfaz solo debe mostrar el enunciado, el campo de subida
  de archivo y el campo de texto abierto.
- **Qué debe entregar exactamente:**
  - Obligatorio: al menos un archivo CAD (cualquier formato: `.sldprt`,
    `.step`, `.f3d`, `.iges`, `.fcstd`, etc.) **o**, si no puede exportarlo,
    un mínimo de 2-3 capturas de pantalla claras del modelo (vistas
    distintas); y una explicación escrita (mínimo ~80 palabras) de qué es,
    para qué sirve y qué tan difícil fue hacerlo.
  - Opcional: fecha aproximada en que lo hizo, contexto (materia, proyecto,
    equipo), y qué mejoraría si lo retomara ahora.
- **Pistas:** No aplica — es un reto de "trae lo que ya tienes", no hay pista
  técnica que dar; si el aspirante nunca ha hecho CAD, puede omitir este
  nodo sin penalización.
- **Feedback al entregar:** "Gracias por compartir tu trabajo. Esto nos
  ayuda muchísimo a conocer tu nivel real y tu forma de pensar el diseño,
  más allá de los retos guiados."
- **Intentos máximos:** Ilimitado — puede reemplazar su entrega si luego
  quiere subir un trabajo distinto o mejor.
- **Notas para el evaluador:** Reto 100% de revisión manual, sin
  correcto/incorrecto. Es la señal más directa de nivel real y trayectoria
  previa del aspirante en CAD, por eso se mantiene fuera del árbol de
  progresión (no debe sentirse como un "premio" ni un "castigo" por no
  tenerlo, ya que no todos los aspirantes tendrán trabajo previo en CAD).
  Sugerencia: en la UI, marcarlo como "opcional" y dejarlo visible desde el
  primer momento junto al resto del árbol, quizás en una tarjeta separada
  tipo "¿Ya tienes experiencia en CAD? Muéstranosla aquí" para que no se
  confunda con los nodos D0–D4.
