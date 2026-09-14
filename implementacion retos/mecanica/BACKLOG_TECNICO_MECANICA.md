# Backlog técnico — Rama de Mecánica
## Prueba de ingreso · Semillero de Robótica
**Base funcional:** `PRUEBA_SEMILLERO_ROBOTICA_V3_DEFINITIVA.md` (sección 13 y sección 63)

**Objetivo:** traducir la especificación pedagógica de Mecánica a tareas directamente implementables, con el mismo modelo de datos y arquitectura que ya usa la rama de Electrónica.

---

# 1. Alcance

Implementar los 7 nodos:

- M0 — Piensa como un mecanismo
- M1A — Fuerzas que cuentan una historia
- M1B — Cambia velocidad por fuerza
- M2 — Elige el actuador correcto
- M3A — ¿La estructura aguanta?
- M3B — Inventa el movimiento
- M4 — Mecánica libre

La implementación debe registrar intentos, pistas, tiempo, respuestas y evidencias, reutilizando `src/lib/challenges/progress.ts` y el mismo `NodeChallengeProgress` que Electrónica.

---

# 2. Stack asumido

Igual al de Electrónica, sin dependencias nuevas:

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- SVG inline para diagramas de mecanismos (engranajes, poleas, palancas) en lugar de imágenes estáticas, para evitar assets pendientes

---

# 3. Arquitectura de contenido

Igual convención que Electrónica: motor de contenido puro (sin React) por nodo, más un componente de presentación.

## 3.1 Modelo base

Reutiliza el mismo patrón de `E0ChallengeDefinition` / `E0StepDefinition` de `src/lib/challenges/electronics/e0.ts`, namespaced por nodo (`M0StepId`, `M0QuestionDefinition`, etc.). No se introduce un tipo genérico compartido entre ramas todavía; cada rama mantiene su propio módulo puro y expone su propio `evaluate<Nodo>Step`.

## 3.2 Attempt

Se reutiliza `ChallengeAttempt` de `src/lib/types.ts` sin cambios (ya es genérico por `nodeId`/`stepId`).

## 3.3 Registro combinado

`AppStateContext.tsx` deja de asumir que solo existe Electrónica: usa un resolutor `getChallengeProgressDefinition(nodeId)` que consulta primero `electronics/registry.ts` y luego `mechanics/registry.ts` (y así sucesivamente cuando se agreguen más ramas detalladas).

---

# 4. Componentes comunes

Los mismos siete bloques de Electrónica aplican, más uno nuevo específico de Mecánica:

## MC-C01 — MechanicsNodeShell (reutiliza el shell de pasos de E0Challenge)
- cabecera del nodo;
- progreso interno (barra `paso/total`);
- navegación secuencial entre pasos (no se puede saltar un paso sin resolver);
- autosave con debounce;
- estado de guardado visible;
- botón de pista (1 pista por paso, igual que Electrónica).

## MC-C02 — HintPanel
Reutiliza el mismo componente/patrón que `EL-C02` en Electrónica.

## MC-C03 — ChoiceChallenge
Reutiliza el mismo patrón que `EL-C03`: single choice, opciones en orden determinístico (semilla por candidato), feedback inmediato, reintentos ilimitados.

## MC-C04 — NumericChallenge
Reutiliza el mismo patrón que `EL-C04`: valor + unidad, tolerancia numérica, sin comparación de strings.

## MC-C05 — MechanismDiagram (nuevo)
- dibuja engranajes, poleas o palancas como SVG inline (sin depender de archivos de imagen externos);
- reutilizable entre M0, M1A, M1B, M2, M3B;
- no depende solo de color para indicar sentido de giro o dirección de fuerza (usa flechas y etiquetas).

---

# 5. EPIC M0 — Piensa como un mecanismo

**Tipo:** Fundamentos · **Qué evalúa:** intuición mecánica.
**Desbloquea:** M1A, M1B.

## M0-US01 — Shell secuencial de 5 pasos

**Como** aspirante
**quiero** avanzar por cinco minirretos de intuición mecánica
**para** demostrar que entiendo mecanismos básicos antes de calcular fuerzas.

**Pasos**
1. Engranajes (sentido de giro y relación de dientes)
2. Poleas (ventaja mecánica)
3. Palancas (clases y equilibrio)
4. Ventaja mecánica (cálculo con brazo de palanca)
5. Velocidad y torque (relación de transmisión)

**Aceptación**
- [x] barra 1/5 a 5/5;
- [x] cada paso guarda su propia analítica (intentos, pistas, tiempo activo);
- [x] sólo completa M0 cuando los cinco pasos fueron resueltos;
- [x] reintentos ilimitados, igual que E0.

---

## M0-US02 — Engranajes: sentido de giro y relación de dientes

**Diagrama:** engranajes en contacto directo, dibujados inline (dos y luego tres en línea).

**Preguntas**
1. Par motriz/conducido en contacto directo: el conducido gira en sentido **contrario** al motriz.
2. Se agrega un tercer engranaje intermedio (loco) en línea: el último conducido gira en el **mismo** sentido que el motriz (dos contactos = dos inversiones que se cancelan).
3. Motriz de 10 dientes mueve uno conducido de 40 dientes: el conducido gira **más lento y con más torque**.

**Aceptación**
- [x] tres tarjetas independientes, feedback por tarjeta;
- [x] opciones en orden determinístico (no aleatorio real, para reproducibilidad);
- [x] pista 1 por tarjeta/paso;
- [x] el caso del engranaje loco queda explícito para no repetir un error físico común (asumir que un tercer engranaje en línea invierte el sentido).

---

## M0-US03 — Poleas: ventaja mecánica

**Preguntas**
1. Polea fija simple: solo cambia la dirección de la fuerza, no la magnitud.
2. Polea móvil: reduce la fuerza a la mitad, pero exige tirar del doble de cuerda.
3. Sistema con 3 tramos de cuerda sosteniendo la carga: fuerza aproximada = carga / 3 (sin fricción).

**Aceptación**
- [x] igual estructura que M0-US02;
- [x] feedback explica por qué la polea fija no reduce el esfuerzo.

---

## M0-US04 — Palancas: clases y equilibrio

**Preguntas**
1. Palanca de primera clase (balancín/tijeras): el punto de apoyo está entre la fuerza y la carga.
2. Palanca de segunda clase (carretilla): la carga está entre el apoyo y la fuerza aplicada.
3. Alargar el brazo donde se aplica la fuerza, con la misma carga y el mismo apoyo: se necesita **menos** fuerza.

**Aceptación**
- [x] igual estructura que los pasos anteriores.

---

## M0-US05 — Ventaja mecánica (numérico)

**Escenario:** palanca en equilibrio, carga de 60 N a 0.2 m del apoyo, fuerza aplicada a 0.6 m del apoyo.

**Preguntas**
- fuerza mínima necesaria (N) → 20 N, tolerancia ±1 N;
- ventaja mecánica (adimensional) → 3, tolerancia ±0.1.

**Aceptación**
- [x] fórmula visible (`F1·d1 = F2·d2`);
- [x] normaliza coma/punto decimal, igual que `E0-US05`.

---

## M0-US06 — Velocidad y torque (numérico)

**Escenario:** motor a 1000 rpm y 2 N·m, con una reducción 5:1 hacia la salida.

**Preguntas**
- velocidad de salida (rpm) → 200 rpm, tolerancia ±10 rpm;
- torque de salida (N·m) → 10 N·m, tolerancia ±0.5 N·m.

**Aceptación**
- [x] fórmulas visibles (`n_out = n_in / i`, `T_out = T_in · i`);
- [x] deja explícito que el modelo es ideal (sin pérdidas por fricción/eficiencia).

---

# 6. EPIC M1A — Fuerzas que cuentan una historia

**Tipo:** Subhabilidad — Estática · **Qué evalúa:** fuerza, torque y equilibrio.
**Desbloquea:** M2.

## M1A-US01 — Problemas visuales de estática

Resolver uno o varios problemas visuales sencillos: reacción, momento, torque, brazo de palanca.

**Pasos**
1. Reacciones en apoyos (viga simple con dos apoyos y una carga)
2. Momento de una fuerza (puerta, comparando dos distancias a la bisagra)
3. Torque directo e inverso (llave sobre un perno)
4. Brazo de palanca (barra haciendo palanca sobre una piedra)

**Aceptación**
- [x] cuatro escenarios visuales distintos (reacción, momento, torque, brazo de palanca);
- [x] respuesta numérica con tolerancia, igual patrón que M0-US05;
- [x] pistas escalonadas (2 pistas por paso, reveladas en orden, cada una más específica que la anterior);
- [x] sólo completa M1A cuando los cuatro pasos fueron resueltos;
- [x] reintentos ilimitados, igual que M0/E0.

---

# 7. EPIC M1B — Cambia velocidad por fuerza

**Tipo:** Subhabilidad — Transmisiones · **Qué evalúa:** relación de transmisión.
**Desbloquea:** M2.

## M1B-US01 — Selección de reducción

A partir de motor, velocidad, torque y carga, elegir una reducción adecuada.

**Pasos**
1. Brazo que levanta una carga (relación de reducción entre 3:1, 6:1, 8:1 y 12:1)
2. Banda transportadora (relación de reducción entre 5:1, 10:1, 15:1 y 20:1)
3. Torno de izado (relación de reducción entre 10:1, 15:1, 20:1 y 30:1)

**Aleatoriedad por candidato**
Las reducciones ofrecidas por escenario son fijas, pero el motor (rpm y N·m) y cuál de las 4 reducciones es la correcta se generan a partir de la semilla del candidato (`shuffleSeed`), igual que el orden de las opciones. Los mínimos de velocidad/torque se derivan exactamente de la reducción elegida como correcta para ese candidato, de forma que las reducciones vecinas siempre fallan por velocidad o por torque (verificado programáticamente contra las 192 combinaciones posibles de motor × torque × reducción correcta, para los 3 escenarios). Esto evita que la respuesta ("la reducción correcta es X:1") pueda compartirse entre candidatos.

**Interacción**
- diagrama motor → reducción → carga con los mínimos de velocidad/torque como etiquetas fijas, ya generados para ese candidato (representación estática, según lo permite esta misma US);
- selección de relación de reducción entre 4 opciones por escenario (single choice, orden determinístico por semilla, igual patrón que MC-C03);
- **no** hay vista previa del resultado antes de comprobar la respuesta: el candidato debe calcular la velocidad/torque de cada opción él mismo (con las fórmulas del enunciado y las pistas) antes de elegir, igual que en M0/M1A. El resultado numérico solo aparece en el feedback, después de comprobar.

**Aceptación**
- [x] tres escenarios, cada uno con una única opción que cumple ambos mínimos a la vez para cualquier combinación generable por semilla;
- [x] la reducción correcta varía por candidato (no es la misma para todos);
- [x] no hay vista previa del resultado antes de comprobar la respuesta;
- [x] feedback explica la relación velocidad↔torque (a mayor reducción, menor velocidad y mayor torque, en la misma proporción).

---

# 8. EPIC M2 — Elige el actuador correcto

**Tipo:** Aplicación · **Qué evalúa:** dimensionamiento básico.
**Desbloquea:** M3A, M3B.

## M2-US01 — Dimensionamiento de un brazo

**Escenarios:** brazo articulado, puerta automática, plataforma elevadora (3 escenarios, no solo el del ejemplo original).

Cada paso pide, en orden: torque necesario (T = m·g·d), velocidad de salida mínima (a partir del ángulo y el tiempo disponibles), torque de diseño (con factor de seguridad 1.5), y por último la elección del motor que cumple ambos mínimos — mismo patrón de "opción correcta por construcción" que M1B.

**Aleatoriedad por candidato:** masa, brazo de palanca y tiempo disponible se generan por `shuffleSeed`; el motor correcto entre las 4 opciones también depende del candidato. Verificado programáticamente contra las 64 combinaciones posibles (4 masas × 4 brazos × 4 tiempos, por cada uno de los 3 escenarios): 0 casos con más o menos de una opción correcta.

**Aceptación**
- [x] cálculo guiado paso a paso (torque → velocidad → margen → selección de motor);
- [x] tolerancias numéricas por subcampo.

---

# 9. EPIC M3A — ¿La estructura aguanta?

**Tipo:** Profundización — Estructuras · **Qué evalúa:** interpretación de análisis estructural.
**Desbloquea:** M4.

## M3A-US01 — Lectura de un FEA/escenario

Se entrega un FEA o escenario. Debe identificar: restricciones, cargas, deformación, factor de seguridad, y si la simulación es físicamente coherente.

**Pasos**
1. Ménsula en L (empotrada, carga en la punta) — caso coherente.
2. Viga con un solo apoyo — caso **deliberadamente inconsistente**: el modelo solo tiene un pasador, así que la pieza no está en equilibrio y el resultado numérico reportado no es válido, aunque el software lo entregue.
3. Placa con agujero en tracción (concentración de esfuerzo clásica) — caso coherente.

**Diagramas "3D":** cada escenario se dibuja en proyección isométrica (SVG inline, sin librería 3D — mantiene la política de "sin dependencias nuevas" de la sección 2) con un mapa de color simulando el resultado del FEA (azul = bajo esfuerzo, rojo = alto esfuerzo) y una leyenda. No es una simulación real; es una representación para practicar la lectura de resultados, coherente con el resto de diagramas de la rama (SVG inline, no imágenes estáticas).

**Interacción por paso:** 3 preguntas guiadas de opción múltiple (restricción, ubicación de la concentración de esfuerzo, interpretación del FoS o de la validez del modelo) + 1 justificación abierta obligatoria (mínimo 100 caracteres, queda marcada para revisión manual — mismo patrón que `E3A` con su paso `rail-separation`).

**Aceptación**
- [x] imagen/caso con datos incompletos o inconsistentes a propósito en al menos un escenario (el de la viga con un solo apoyo);
- [x] respuesta guiada (3 preguntas de opción múltiple, auto-evaluadas) + justificación abierta (obligatoria, revisión manual).

---

# 10. EPIC M3B — Inventa el movimiento

**Tipo:** Profundización — Mecanismos · **Qué evalúa:** síntesis conceptual.
**Desbloquea:** M4.

## M3B-US01 — Selección o propuesta de mecanismo

**Ejemplo:** `Necesitas mover una plataforma 150 mm dentro de este volumen.`

Puede seleccionar o proponer: husillo, cuatro barras, piñón-cremallera, actuador lineal, otro. Debe justificar.

**Implementación:** catálogo fijo de 5 mecanismos (husillo, cuatro barras, piñón-cremallera, actuador lineal, polea y correa) mostrado como tabla comparativa (carrera, precisión, costo, complejidad) en los 3 pasos. Cada paso plantea un escenario distinto que favorece un mecanismo diferente del catálogo (plataforma deslizante → piñón-cremallera; pinza de precisión → husillo; escotilla giratoria → cuatro barras), para que no baste con memorizar una sola respuesta. Selección de opción múltiple + justificación abierta obligatoria (mínimo 100 caracteres, revisión manual).

**Aceptación**
- [x] catálogo de mecanismos con criterios (carrera, precisión, costo, complejidad);
- [x] respuesta abierta obligatoria de justificación.

---

# 11. EPIC M4 — Mecánica libre

**Tipo:** Reto libre.

## M4-US01 — Formulario de proyecto

`Diseña o analiza un subsistema mecánico para un robot.`

Ejemplos: transmisión, manipulador, suspensión, estructura, otro.

## M4-US02 — Evidencias

Igual patrón que `E4-US02`: esquema/diagrama, foto/captura/video, cálculos, opcionalmente CAD (SolidWorks/Fusion/otro).

**Implementación:** formulario de un solo paso (no secuencial, igual que E4), reutilizando `LocalEvidenceUploader` y el almacén de evidencias existente (`src/lib/challenges/evidenceStore.ts`, compartido entre ramas). Campos: título, problema, funcionamiento, lista de piezas (mínimo 3), reflexión final; evidencias obligatorias de esquema/diagrama, foto/video y cálculos; CAD opcional (archivo o enlace) con el mismo patrón de alternancia que `codeApplies` en E4. Enlaces opcionales a CAD en línea, documentación y adicional. Cabecera con iconos SVG inline (esquema, foto/video, cálculos, CAD) en vez de la imagen PNG que usa E4, para mantener la política de "sin assets pendientes" de esta rama.

**Aceptación**
- [x] envío múltiple (varias evidencias por campo, hasta 5 en foto/video, cálculos y CAD);
- [x] enlaces (CAD en línea, documentación, adicional — validados como URL http/https);
- [x] archivos privados (mismo almacén local/IndexedDB que usa Electrónica, sin subir a ningún servidor);
- [ ] reviewer puede abrir todo (no existe todavía ninguna vista de reviewer en la app — ver sección 12, es aspiración de backlog sin UI construida en ninguna rama).

---

# 12. Reviewer — Mecánica

## MC-R01 — Vista de progreso

Igual que `EL-R01`: nodo máximo, intentos, pistas, tiempo, open responses, evidencias.

## MC-R02 — Rúbricas

### M3A / M4
5 criterios x 0–2, igual patrón que `E2`/`E4` en Electrónica.

**Aceptación**
- [ ] notas privadas;
- [ ] guardar borrador;
- [ ] marcar reviewed.

---

# 13. QA mínimo

## M0
- [x] no hay respuestas dependientes de orden real (semilla determinística);
- [x] el caso del engranaje intermedio queda validado explícitamente (ver M0-US02);
- [x] unidades numéricas (N, N·m, rpm) se muestran junto al campo, sin selector de unidad ambiguo.

## M1A
- [x] las cuatro escenas cubren los cuatro conceptos pedidos (reacción, momento, torque, brazo de palanca) sin solaparse;
- [x] unidades numéricas (N, N·m) se muestran junto al campo, sin selector de unidad ambiguo;
- [x] tolerancias numéricas verificadas contra el cálculo exacto de cada escenario.

## M1B
- [x] las 192 combinaciones posibles (3 escenarios × 4 motores × 4 torques × 4 reducciones correctas) se verificaron por script: exactamente una opción cumple ambos mínimos en cada una;
- [x] eliminada la vista previa del resultado antes de comprobar (mostraba el cálculo ya hecho para la opción seleccionada, lo que trivializaba el ejercicio);
- [x] la reducción correcta se deriva de `shuffleSeed` (semilla por candidato), no es una constante fija igual para todos.

## M2
- [x] las 64 combinaciones posibles (3 escenarios × 4 masas × 4 brazos × 4 tiempos) se verificaron por script: exactamente un motor cumple ambos mínimos en cada una;
- [x] el motor correcto se deriva de `shuffleSeed`, no es una constante fija igual para todos.

## M3A
- [x] el caso de la viga con un solo apoyo queda validado como el escenario deliberadamente inconsistente (ver M3A-US01);
- [x] las 3 preguntas de opción múltiple por paso son auto-evaluables; la justificación abierta se marca `isCorrect: null` para revisión manual, igual patrón que `E3A`.

## M3B
- [x] el catálogo de 5 mecanismos es el mismo en los 3 pasos; cada escenario favorece un mecanismo distinto (piñón-cremallera, husillo, cuatro barras), no siempre el mismo.

## M4
- [x] reutiliza `LocalEvidenceUploader` y `evidenceStore.ts` sin cambios, igual patrón que `E4`;
- [x] formulario de un solo paso (no secuencial), consistente con cómo está construido `E4Challenge.tsx`.

---

# 14. Fases de desarrollo

## Sprint MC-01 — Base + M0
- registro combinado de progreso (Electrónica + Mecánica) en `AppStateContext`;
- M0 completo (5 pasos);
- analytics de intentos/pistas reutilizando `src/lib/challenges/progress.ts`.

## Sprint MC-02 — M1A + M1B
- problemas visuales de estática;
- selector de reducción con sliders.

## Sprint MC-03 — M2 + M3A
- dimensionamiento guiado de actuador;
- lectura de FEA/escenario.

## Sprint MC-04 — M3B + M4
- catálogo de mecanismos con justificación;
- formulario y evidencias de proyecto libre.

## Sprint MC-05 — Pulido
- responsive;
- accesibilidad;
- animaciones;
- QA;
- integración al árbol global.

---

# 15. Definition of Done de la rama

- [x] 7 nodos implementados (M0 a M4 completos);
- [x] M0 contiene sus 5 minirretos;
- [x] M1A contiene sus 4 problemas visuales de estática (reacción, momento, torque, brazo de palanca);
- [x] M1B contiene su selector de reducción (3 escenarios, sin vista previa antes de comprobar);
- [x] M2 dimensiona un actuador (torque, velocidad, margen, motor/reducción — 3 escenarios);
- [x] M3A interpreta un análisis estructural (3 escenarios FEA isométricos, uno deliberadamente inconsistente);
- [x] M3B selecciona/propone un mecanismo con justificación (catálogo de 5, 3 escenarios);
- [x] M4 acepta proyecto libre (formulario + evidencias, igual patrón que E4);
- [x] reintentos y pistas quedan registrados;
- [x] evidencia es privada (M4 usa el mismo almacén local/IndexedDB que Electrónica; nada se sube a un servidor);
- [ ] reviewer puede revisar respuestas abiertas (no existe todavía ninguna vista de reviewer en la app, en ninguna rama — es trabajo de UI aparte, no cubierto por esta implementación);
- [x] árbol desbloquea nodos correctamente (M0 → M1A, M1B; M1A + M1B → M2; M2 → M3A, M3B; M3A + M3B → M4);
- [x] desktop y mobile funcionales;
- [x] accesibilidad básica WCAG AA (reutiliza los mismos patrones de foco/aria de E0).
