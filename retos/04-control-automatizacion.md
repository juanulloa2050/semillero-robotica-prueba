# Control y Automatización

Color de rama: `#17A2C9` · Haz que un sistema persiga su referencia.

## Progresión

```text
C0 — Persigue la referencia (Fundamentos)
├── C1A — Abierto o realimentado (Subhabilidad)
└── C1B — ¿Quién mide y quién actúa? (Subhabilidad)
        ↓ (con C1A o C1B completado)
    C2 — Domina el Kp (Aplicación interactiva)
        ├── C3A — Afina un PID (Profundización)
        └── C3B — Lee la respuesta (Profundización)
                ↓ (con C3A o C3B completado)
            C4 — Haz que el robot siga (Aplicación robótica)
                ↓
            C5 — Diagnostica el controlador (Evaluación crítica)
                ↓
            C6 — Control libre (Reto libre)
```

9 nodos — la rama más larga del árbol, porque cubre fundamentos,
experimentación y aplicación robótica directa en una sola línea continua
(C4 → C5 → C6, sin más bifurcaciones después de C2).

## Resumen

| ID | Título | Nivel | Requiere | Desbloquea |
|---|---|---|---|---|
| C0 | Persigue la referencia | Fundamentos | — | C1A, C1B |
| C1A | Abierto o realimentado | Subhabilidad | C0 | C2 |
| C1B | ¿Quién mide y quién actúa? | Subhabilidad | C0 | C2 |
| C2 | Domina el Kp | Aplicación interactiva | C1A o C1B | C3A, C3B |
| C3A | Afina un PID | Profundización | C2 | C4 |
| C3B | Lee la respuesta | Profundización | C2 | C4 |
| C4 | Haz que el robot siga | Aplicación robótica | C3A o C3B | C5 |
| C5 | Diagnostica el controlador | Evaluación crítica | C4 | C6 |
| C6 | Control libre | Reto libre | C5 | — |

---

# C0 — Persigue la referencia

**Estado en la app:** Fundamentos · sin requisitos · desbloquea C1A, C1B

## Ya definido

* **Mini-descripción actual (panel de debug):** "Un robot debe mantenerse a 50 cm de un objetivo: decide qué debería hacer cuando la distancia cambia."

* **De la especificación original:**

  * Reto: un robot debe mantenerse a 50 cm; la interfaz cambia la distancia y pregunta qué debería hacer. Sin introducir formulación matemática todavía.

## Definido e interactivo

* **Tipo de reto sugerido:** G (interacción visual con simulación simple)

* **Enunciado final:** Un robot móvil de reparto se desplaza por un pasillo y debe mantener una distancia constante de 50 cm respecto a la pared frontal. Observa la simulación cuando la distancia cambia de forma imprevista y determina la acción lógica inicial que debe tomar el sistema.

* **Recursos que se muestran:** Una mini-simulación visual interactiva de un robot dotado de un sensor de distancia frente a una pared móvil.

* **Opciones / respuesta correcta:**

  * A) Acelerar hacia adelante si la distancia es mayor a 50 cm y frenar/retroceder si es menor. **(Correcta)**
  * B) Mantener la velocidad de avance constante sin importar la distancia leída por el sensor.
  * C) Apagar los motores inmediatamente para evitar cualquier colisión sin importar la posición.

* **Pistas:**

  * Pista 1: Piensa en qué harías tú de forma instintiva si estuvieras caminando a ciegas detrás de otra persona.
  * Pista 2: Si la distancia supera los 50 cm, el robot se ha alejado del objetivo, por lo que necesita acortar espacio.
  * Pista 3: Relaciona de manera directa el valor medido por el sensor con la velocidad que deben aplicar las ruedas.

* **Feedback si acierta:** ¡Correcto! Has comprendido el principio intuitivo fundamental de generar una acción correctiva basada en la desviación respecto a una referencia deseada.

* **Feedback si no acierta:** Inténtalo de nuevo. Analiza con cuidado cómo debe reaccionar el movimiento del robot si la posición del objetivo cambia respecto al valor ideal.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Ejercicio conceptual puramente introductorio sin introducción de ecuaciones matemáticas formales.

---

# C1A — Abierto o realimentado

**Estado en la app:** Subhabilidad · requiere C0 · desbloquea C2 (junto con C1B, basta uno)

## Ya definido

* **Mini-descripción actual (panel de debug):** "Compara control en lazo abierto y en lazo cerrado, y elige cuál usar para un posicionamiento preciso."

* **De la especificación original:**

  * Reto: comparar `Motor → tiempo → detener` contra `Encoder → controlador → motor`; elegir cuál usar para posicionamiento preciso.

## Definido e interactivo

* **Tipo de reto sugerido:** A (selección única)

* **Enunciado final:** Estás diseñando el sistema de posicionamiento micrométrico para el cabezal de una impresora 3D avanzada. Se te presentan dos arquitecturas posibles: un motor paso a paso controlado únicamente por tiempo sin retroalimentación, o un motor DC equipado con un encoder óptico conectado a un microcontrolador que supervisa y corrige la posición de forma continua. ¿Cuál debes seleccionar para garantizar precisión milimétrica ante perturbaciones externas?

* **Recursos que se muestran:** Diagramas esquemáticos interactivos y comparativos detallando el flujo de señales de Lazo Abierto frente a Lazo Cerrado (Realimentado).

* **Opciones / respuesta correcta:**

  * A) Control en lazo abierto, porque reduce la complejidad del hardware y abaratamiento de costos.
  * B) Control realimentado (lazo cerrado), porque mide constantemente la salida real y corrige de manera automática cualquier desviación o perturbación externa. **(Correcta)**
  * C) Ninguna de las dos opciones anteriores es viable para sistemas electromecánicos modernos.

* **Pistas:**

  * Pista 1: Imagina qué ocurriría si una fuerza externa o fricción inesperada frena levemente el cabezal en pleno proceso.
  * Pista 2: El sistema en lazo abierto carece de mecanismos de percepción sobre el resultado de su propia acción.
  * Pista 3: La realimentación utiliza sensores para comparar en todo momento el estado actual con el valor de referencia deseado.

* **Feedback si acierta:** ¡Exacto! La realimentación es el pilar fundamental de la automatización moderna para rechazar perturbaciones e imperfecciones físicas.

* **Feedback si no acierta:** Revisa detalladamente las diferencias operativas entre un sistema que actúa a ciegas según el tiempo y uno que monitorea permanentemente el resultado.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Validar la comprensión conceptual de la retroalimentación en sistemas dinámicos.

---

# C1B — ¿Quién mide y quién actúa?

**Estado en la app:** Subhabilidad · requiere C0 · desbloquea C2 (junto con C1A, basta uno)

## Ya definido

* **Mini-descripción actual (panel de debug):** "Clasifica sensores y actuadores (encoder, IMU, LiDAR, servo...) y decide cuáles cierran cada lazo."

* **De la especificación original:**

  * Reto: clasificar encoder, IMU, LiDAR, potenciómetro, motor, servo; luego seleccionar sensores adecuados para cerrar diferentes lazos.

## Definido e interactivo

* **Tipo de reto sugerido:** D (ordenar/clasificar)

* **Enunciado final:** Organiza los siguientes componentes de hardware robótico dentro de su categoría operativa correspondiente dentro de una arquitectura de control automatizado: *Encoder, IMU (Unidad de Medición Inercial), LiDAR, Potenciómetro rotativo, Motor DC de corriente continua, Servo-motor estándar.*

* **Recursos que se muestran:** Interfaz gráfica de arrastrar y soltar (Drag & Drop) con dos contenedores principales: "Sensores (Miden el sistema)" y "Actuadores (Modifican el sistema)".

* **Opciones / respuesta correcta:**

  **Sensores (Miden):**

  * Encoder
  * IMU
  * LiDAR
  * Potenciómetro rotativo

  **Actuadores (Actúan):**

  * Motor DC de corriente continua
  * Servo-motor estándar

* **Pistas:**

  * Pista 1: Los dispositivos sensores se encargan estrictamente de adquirir variables físicas del entorno o del estado interno de la máquina.
  * Pista 2: Los actuadores transforman una señal de control eléctrica en un trabajo mecánico, fuerza o movimiento tangible.

* **Feedback si acierta:** ¡Clasificación perfecta! Identificas con precisión los órganos de percepción y los elementos de acción física en un robot.

* **Feedback si no acierta:** Analiza la tarea física de cada componente; algunos recolectan información y otros imprimen movimiento o potencia.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Ejercicio clave para afianzar los bloques de instrumentación industrial y robótica.

---

# C2 — Domina el Kp

**Estado en la app:** Aplicación interactiva · requiere C1A o C1B · desbloquea C3A, C3B

## Ya definido

* **Mini-descripción actual (panel de debug):** "Ajusta un control proporcional (Kp) en una simulación interactiva buscando respuesta rápida sin oscilación."

* **De la especificación original:**

  * Reto: simulación de posición con slider de `Kp`; debe conseguir respuesta rápida sin oscilación excesiva.
  * Métricas observables sugeridas: tiempo de establecimiento, overshoot, error.

## Definido e interactivo

* **Tipo de reto sugerido:** G (interacción visual con slider en vivo)

* **Enunciado final:** Manipula el control deslizante para ajustar en tiempo real la ganancia proporcional ($Kp$) del sistema de control de posición de un eje lineal. Tu misión consiste en encontrar el valor óptimo que logre una respuesta rápida de llegada a la referencia, evitando al mismo tiempo oscilaciones persistentes o un sobreimpulso (overshoot) peligroso.

* **Recursos que se muestran:** Simulador gráfico interactivo en tiempo real que muestra la curva de respuesta escalón, acompañado de métricas instantáneas de *overshoot*, *tiempo de establecimiento* y *error estacionario*.

* **Opciones / respuesta correcta:** Un rango de ganancia $Kp$ calibrado estrictamente entre $2.5$ y $4.0$ (garantizando un sobreimpulso menor al 15% y una estabilización limpia sin oscilaciones perpetuas).

* **Pistas:**

  * Pista 1: Si configuras un $Kp$ demasiado bajo, la fuerza correctiva será insuficiente y el sistema tardará demasiado en llegar a la meta.
  * Pista 2: Si configuras un $Kp$ excesivamente alto, el sistema reaccionará con violencia, rebotando o cruzando la referencia repetidamente (oscilando).
  * Pista 3: Busca el punto de inflexión exacto donde la curva asciende de manera ágil y se aplana suavemente sobre la referencia.

* **Feedback si acierta:** ¡Excelente calibración! Encontraste el punto de balance óptimo entre velocidad de respuesta y estabilidad del sistema.

* **Feedback si no acierta:** Observa con atención el comportamiento de la gráfica: si experimenta rebotes continuos, disminuye la ganancia $Kp$; si la respuesta es lenta y perezosa, súbelo gradualmente.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Actividad práctica interactiva fundamental para internalizar el efecto de la ganancia proporcional pura.

---

# C3A — Afina un PID

**Estado en la app:** Profundización · requiere C2 · desbloquea C4 (junto con C3B, basta uno)

## Ya definido

* **Mini-descripción actual (panel de debug):** "Ante error estacionario, oscilaciones o ruido, ajusta o selecciona las ganancias Kp, Ki y Kd adecuadas."

* **De la especificación original:**

  * Casos a cubrir: error estacionario, oscilaciones, respuesta lenta, ruido.
  * Debe ajustar o seleccionar modificaciones de Kp, Ki, Kd.

## Definido e interactivo

* **Tipo de reto sugerido:** E (matching síntoma → ajuste de ganancia)

* **Enunciado final:** Relaciona cada anomalía o síntoma de comportamiento observados en un lazo de control industrial con la acción correctiva adecuada sobre las ganancias del controlador PID ($Kp$, $Ki$, $Kd$).

* **Recursos que se muestran:** Panel interactivo de emparejamiento basado en tarjetas de diagnóstico clínico de sistemas de control.

* **Opciones / respuesta correcta:**

  1. *El sistema se estabiliza pero queda permanentemente con un pequeño error constante sin alcanzar la referencia.*
     → **Aumentar la acción Integral ($Ki$).**

  2. *La respuesta presenta oscilaciones rápidas y amplias acompañadas de alta sensibilidad al ruido.*
     → **Reducir $Kp$ o incrementar la acción Derivativa ($Kd$).**

  3. *La planta reacciona con extrema lentitud ante los cambios de escalón en la entrada.*
     → **Incrementar la ganancia proporcional ($Kp$).**

* **Pistas:**

  * Pista 1: La componente Integral acumula el error histórico para eliminar por completo los desvíos estáticos permanentes.
  * Pista 2: La componente Derivativa actúa preventivamente como un amortiguador ante variaciones drásticas o ruidosas.

* **Feedback si acierta:** ¡Diagnóstico correcto! Comprendes con claridad quirúrgica qué parámetro del PID manipular ante cada imperfección del sistema.

* **Feedback si no acierta:** Repasa el aporte individual de las acciones Proporcional, Integral y Derivativa frente a errores de régimen permanente y transitorios oscilatorios.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Módulo clave de profundización en sintonización heurística de controladores PID.

---

# C3B — Lee la respuesta

**Estado en la app:** Profundización · requiere C2 · desbloquea C4 (junto con C3A, basta uno)

## Ya definido

* **Mini-descripción actual (panel de debug):** "A partir de una gráfica de respuesta, identifica tiempo de subida, overshoot, error estacionario y estabilidad."

* **De la especificación original:**

  * Reto: a partir de gráfica de referencia y salida, identificar tiempo de subida, overshoot, error estacionario, estabilidad, asentamiento.

## Definido e interactivo

* **Tipo de reto sugerido:** G (interacción visual sobre la gráfica)

* **Enunciado final:** Analiza la gráfica de respuesta temporal generada por un sistema realimentado y utiliza las herramientas de medición integradas para ubicar y reportar de manera exacta los tres parámetros clave de desempeño: el Tiempo de subida ($Tr$), el Porcentaje de sobreimpulso máximo ($Overshoot$) y el Error en estado estacionario ($Ess$).

* **Recursos que se muestran:** Gráfica interactiva de respuesta al escalón equipada con cursores deslizantes de medición directa sobre los ejes de tiempo y amplitud.

* **Opciones / respuesta correcta:** Valores leídos por los cursores interactivos con una tolerancia admisible del $\pm 5%$ respecto a la simulación matemática subyacente.

* **Pistas:**

  * Pista 1: El tiempo de subida ($Tr$) cuantifica cuánto tarda la señal en cruzar desde el 10% hasta el 90% de su valor final objetivo.
  * Pista 2: El sobreimpulso (overshoot) representa el pico máximo que excede la línea de referencia antes de empezar a amortiguarse.
  * Pista 3: Evalúa el error estacionario observando la diferencia vertical entre la salida y la referencia cuando el tiempo transcurrido es prolongado.

* **Feedback si acierta:** ¡Lectura impecable! Has interpretado con exactitud todas las métricas temporales críticas de la respuesta del sistema.

* **Feedback si no acierta:** Revisa cuidadosamente las definiciones geométricas de cada parámetro sobre los ejes cartesianos de la gráfica temporal.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Evalúa la competencia analítica del estudiante en el dominio del tiempo mediante la interpretación gráfica de especificaciones de control.

---

# C4 — Haz que el robot siga

**Estado en la app:** Aplicación robótica · requiere C3A o C3B · desbloquea C5

## Ya definido

* **Mini-descripción actual (panel de debug):** "Programa las velocidades de motor de un robot diferencial a partir del error de seguimiento."

* **De la especificación original:**

  * Reto: robot diferencial sigue línea o referencia; debe producir velocidades de motores a partir del error.
  * Ejemplo de código dado:

```python
error = left - right
correction = kp * error
left_motor = base - correction
right_motor = base + correction
```

* Conecta con: E2 (Electrónica), S1A y S2 (Software) — referencia conceptual.

## Definido e interactivo

* **Tipo de reto sugerido:** F (editor de código con tests)

* **Enunciado final:** Escribe la rutina de control proporcional en Python para regular el desplazamiento de un robot móvil de tracción diferencial. A partir del error de seguimiento medido, calcula de forma dinámica las velocidades individuales aplicadas a los motores izquierdo y derecho para mantener el curso correcto.

* **Recursos que se muestran:** Entorno de programación integrado con una plantilla inicial de código:

```python
def compute_differential_drive(error, base_speed, kp):
    # Implementa la lógica de control proporcional diferencial aquí
    pass
```

Incluye una suite de pruebas automatizadas en tiempo real.

* **Tests / criterio de corrección:**

  * **Test 1 (Error Nulo):** Con `error = 0`, las velocidades devueltas para ambos motores deben ser exactamente iguales a la velocidad base (`base_speed`).
  * **Test 2 (Desvío Positivo):** Con un error positivo, la corrección aplicada debe restar velocidad al motor izquierdo y sumar velocidad al derecho para redirigir el chasis.
  * **Test 3 (Ajuste por ganancia):** Validación matemática estricta usando el patrón de referencia del semillero.

* **Pistas:**

  * Pista 1: Recuerda calcular la magnitud del ajuste multiplicando la ganancia por el error medido (`correction = kp * error`).
  * Pista 2: Distribuye simétricamente la corrección entre las ruedas para lograr el efecto de giro diferencial (`left_motor = base - correction`, `right_motor = base + correction`).

* **Feedback si acierta:** ¡Pruebas superadas con éxito! Tu algoritmo de control diferencial dirige correctamente el comportamiento del robot en base al error.

* **Feedback si no acierta:** Revisa la estructura algebraica de asignación de velocidades para asegurar que la corrección contrarreste el error en la dirección correcta.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Validación mediante pruebas unitarias orientadas a la programación de plataformas robóticas móviles.

---

# C5 — Diagnostica el controlador

**Estado en la app:** Evaluación crítica · requiere C4 · desbloquea C6

## Ya definido

* **Mini-descripción actual (panel de debug):** "Compara tres respuestas de control (lenta, oscilatoria, rápida con overshoot leve) y justifica cuál implementarías."

* **De la especificación original:**

  * Reto: comparar tres respuestas — lenta, oscilatoria, rápida con pequeño overshoot — y seleccionar cuál implementaría, justificando.

## Definido e interactivo

* **Tipo de reto sugerido:** A (selección) + I (justificación abierta)

* **Enunciado final:** Analiza de manera crítica tres curvas de respuesta temporal obtenidas al aplicar distintas estrategias de control sobre un mecanismo de dirección autónoma industrial:

  * **Respuesta A:** Sobreamortiguada, muy lenta y perezosa en alcanzar el punto de consigna.
  * **Respuesta B:** Subamortiguada, con oscilaciones continuas y de larga duración antes de estabilizarse.
  * **Respuesta C:** Rápida, con un sobreimpulso controlado y seguro del 8%.

  Selecciona cuál de las tres alternativas implementarías en un entorno productivo real y redacta una justificación técnica fundamentada en criterios de eficiencia operativa y seguridad mecánica.

* **Recursos que se muestran:** Panel visual interactivo superponiendo las tres curvas de respuesta temporal para su análisis comparativo directo.

* **Opciones / respuesta correcta:** Selección obligatoria de la **Respuesta C**, acompañada de una argumentación técnica coherente que discuta el compromiso (*trade-off*) esencial entre velocidad de transición y estabilidad del sistema físico.

* **Pistas:**

  * Pista 1: Una respuesta excesivamente lenta reduce de forma drástica la productividad general de la máquina.
  * Pista 2: Una respuesta permanentemente oscilatoria genera fatiga y desgaste mecánico prematuro en los actuadores y engranajes.
  * Pista 3: Busca el punto de compromiso ideal exigido en aplicaciones de ingeniería real.

* **Feedback si acierta:** ¡Excelente criterio técnico! Tu argumentación demuestra una sólida comprensión madura de los compromisos prácticos del diseño de sistemas de control.

* **Feedback si no acierta:** Reconsidera el impacto a largo plazo de las oscilaciones mecánicas y los tiempos muertos de producción sobre la opción elegida.

* **Intentos máximos:** Ilimitado.

* **Notas para el evaluador:** Esta actividad requiere revisión cualitativa manual de la justificación técnica redactada por el estudiante.

---

# C6 — Control libre

**Estado en la app:** Reto libre · requiere C5 · no desbloquea nada más en esta rama

## Ya definido

* **Mini-descripción actual (panel de debug):** "Controla cualquier sistema que te interese y documenta sensor, controlador, actuador y resultado."

* **De la especificación original:**

  * Enunciado: "Controla cualquier sistema que quieras."
  * Herramientas posibles: MATLAB, Simulink, Python, Arduino, Gazebo, Webots, MuJoCo, hardware real.
  * Entrega esperada: Sistema → Variable controlada → Sensor → Controlador → Actuador → Resultado.

## Definido e interactivo

* **Tipo de reto sugerido:** J (reto libre, múltiples evidencias)

* **Enunciado final:** Diseña, programa y valida un lazo de control completo sobre un sistema físico o simulado de tu libre elección (por ejemplo: control de temperatura, regulación de nivel de fluidos, control de velocidad de un motor DC, orientación de un cardán o navegación autónoma de un robot móvil) haciendo uso de las herramientas de tu preferencia (Python, MATLAB/Simulink, Arduino, Gazebo, Webots, MuJoCo o hardware real).

* **Qué debe entregar exactamente:** Un informe técnico o repositorio estructurado que contenga obligatoriamente:

  1. **Descripción física del sistema:** Contexto del proceso a controlar.
  2. **Variable controlada:** Magnitud física sobre la cual se ejerce la acción.
  3. **Sensor:** Especificación del dispositivo de medición implementado.
  4. **Controlador:** Código fuente o esquema de bloques del controlador sintonizado.
  5. **Actuador:** Elemento de potencia encargado de transformar la orden.
  6. **Resultado:** Gráfica o evidencia visual cuantitativa comparando la referencia frente a la salida obtenida.

* **Pistas:** Selecciona un sistema cuyo comportamiento conozcas o puedas modelar fácilmente; lo verdaderamente importante es documentar formalmente la cadena completa de control en bucle cerrado.

* **Feedback al entregar:** ¡Proyecto integrador completado con éxito! Has demostrado un dominio absoluto de la automatización y el control al aplicarlo de forma autónoma a un caso práctico.

* **Notas para el evaluador:** Verificar que la documentación entregada cubra explícitamente y con rigor toda la cadena de control exigida (`Sistema → Variable → Sensor → Controlador → Actuador → Resultado`).
