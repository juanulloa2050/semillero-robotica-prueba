# Sistemas e Integración Robótica

Color de rama: `#A9E4F2` · Linux, ROS 2, Git y despliegue.

## Progresión

```text
SI0 — Entra a la terminal (Fundamentos Linux)
├── SI1A — Navega el sistema (Subhabilidad)
└── SI1B — Hazlo ejecutable (Subhabilidad)
        ↓ (con SI1A o SI1B completado)
    SI2 — El entorno está roto (Aplicación)
        ├── SI3A — Encuentra el proceso rebelde (Profundización)
        └── SI3B — ¿Por qué no puedo hablar con el robot? (Profundización)
                ↓ (con SI3A o SI3B completado)
            SI4 — Inspecciona un robot con ROS 2 (Aplicación robótica)
                ├── SI5 — Trabaja como equipo con Git (Profundización)
                └── SI6 — Ponlo a funcionar fuera de tu PC (Reto libre)
```

9 nodos. Esta rama cubre el entorno tecnológico completo: terminal, archivos,
permisos, procesos, red, ROS 2, Git y deployment. A diferencia de las demás
ramas, **termina en dos hojas** (SI5 y SI6) en vez de converger en un único
reto libre — ambas se desbloquean directamente al completar SI4.

## Resumen

| ID | Título | Nivel | Requiere | Desbloquea |
|---|---|---|---|---|
| SI0 | Entra a la terminal | Fundamentos Linux | — | SI1A, SI1B |
| SI1A | Navega el sistema | Subhabilidad | SI0 | SI2 |
| SI1B | Hazlo ejecutable | Subhabilidad | SI0 | SI2 |
| SI2 | El entorno está roto | Aplicación | SI1A o SI1B | SI3A, SI3B |
| SI3A | Encuentra el proceso rebelde | Profundización | SI2 | SI4 |
| SI3B | ¿Por qué no puedo hablar con el robot? | Profundización | SI2 | SI4 |
| SI4 | Inspecciona un robot con ROS 2 | Aplicación robótica | SI3A o SI3B | SI5, SI6 |
| SI5 | Trabaja como equipo con Git | Profundización | SI4 | — |
| SI6 | Ponlo a funcionar fuera de tu PC | Reto libre | SI4 | — |

---

## SI0 — Entra a la terminal

**Estado en la app:** Fundamentos Linux · sin requisitos · desbloquea SI1A, SI1B

### Ya definido

- **Mini-descripción actual (panel de debug):** "En una terminal simulada,
  encuentra un archivo usando ls, cd, pwd y cat."
- **De la especificación original:**
  - Terminal simulada de referencia: `robot@semillero:~$`
  - Reto: "Dentro del computador existe un archivo con el nombre del robot.
    Encuéntralo." Comandos posibles: `ls`, `cd`, `pwd`, `cat`.
  - Métricas sugeridas a registrar: comandos usados, errores, uso de ayuda,
    tiempo, secuencia.

### Por definir

- **Tipo de reto sugerido:** G (interacción visual: terminal simulada real)
- **Enunciado final:** _(completar)_
- **Estructura de archivos simulada:** _(completar — árbol de carpetas/archivos exacto, dónde está el archivo objetivo)_
- **Comandos válidos / respuesta correcta:** _(completar — ¿se valida por comando final o por llegar al archivo correcto?)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI1A — Navega el sistema

**Estado en la app:** Subhabilidad · requiere SI0 · desbloquea SI2 (junto con SI1B, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Crea, copia, mueve, busca y
  elimina archivos usando comandos del sistema de archivos."
- **De la especificación original:**
  - Reto: crear directorio, copiar archivo, mover, buscar, eliminar.
  - Comandos esperables: `mkdir`, `cp`, `mv`, `rm`, `find`.

### Por definir

- **Tipo de reto sugerido:** G (terminal simulada) o D (ordenar la secuencia correcta de comandos)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar)_
- **Opciones / respuesta correcta:** _(completar)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI1B — Hazlo ejecutable

**Estado en la app:** Subhabilidad · requiere SI0 · desbloquea SI2 (junto con SI1A, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Un script no tiene permisos
  de ejecución: diagnostica y resuelve el problema con chmod."
- **De la especificación original:**
  - Escenario: `./start_robot.sh` → `Permission denied`.
  - Solución esperada: `chmod +x start_robot.sh` y volver a ejecutar.

### Por definir

- **Tipo de reto sugerido:** G (terminal simulada) o A (selección del comando correcto)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar)_
- **Opciones / respuesta correcta:** _(completar)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI2 — El entorno está roto

**Estado en la app:** Aplicación · requiere SI1A o SI1B · desbloquea SI3A, SI3B

### Ya definido

- **Mini-descripción actual (panel de debug):** "Un script falla por una
  dependencia faltante: investiga el entorno de Python y diagnostica la
  causa."
- **De la especificación original:**
  - Escenario: `python3 controller.py` → `ModuleNotFoundError: No module
    named 'serial'`.
  - Herramientas de investigación: `python3 --version`, `which python3`,
    `pip`, `pip list`.
  - Nota explícita de la spec: "no evaluar solo memorización del comando:
    evaluar estrategia de diagnóstico."

### Por definir

- **Tipo de reto sugerido:** G (terminal simulada) o D (ordenar los pasos de diagnóstico)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar)_
- **Opciones / respuesta correcta:** _(completar — ¿cómo se mide "estrategia" y no solo el comando final?)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI3A — Encuentra el proceso rebelde

**Estado en la app:** Profundización · requiere SI2 · desbloquea SI4 (junto con SI3B, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "Un proceso está consumiendo
  toda la CPU: encuéntralo y detenlo con las herramientas adecuadas."
- **De la especificación original:**
  - Escenario: `vision_node` consume toda la CPU.
  - Herramientas posibles: `ps`, `top`, `htop`, `kill`, `killall`.
  - Debe identificar y detener el proceso correcto (no cualquier proceso).

### Por definir

- **Tipo de reto sugerido:** G (terminal/lista de procesos simulada)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar — lista de procesos simulada con PIDs)_
- **Opciones / respuesta correcta:** _(completar)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI3B — ¿Por qué no puedo hablar con el robot?

**Estado en la app:** Profundización · requiere SI2 · desbloquea SI4 (junto con SI3A, basta uno)

### Ya definido

- **Mini-descripción actual (panel de debug):** "El robot y tu computador no
  se comunican: diagnostica la conectividad de red entre ambos."
- **De la especificación original:**
  - Escenario: Robot en `192.168.1.52`, PC en `192.168.0.23` (subredes
    distintas).
  - Comandos/conceptos: `ping`, `ip addr`, `ip route`.
  - Conecta con: S3A (Software) — referencia conceptual.

### Por definir

- **Tipo de reto sugerido:** A (selección de la causa) o G (terminal simulada)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar)_
- **Opciones / respuesta correcta:** _(completar)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI4 — Inspecciona un robot con ROS 2

**Estado en la app:** Aplicación robótica · requiere SI3A o SI3B · desbloquea SI5, SI6

### Ya definido

- **Mini-descripción actual (panel de debug):** "El robot detecta objetos
  pero no se mueve: inspecciona nodos y tópicos de ROS 2 para encontrar dónde
  se rompe la comunicación."
- **De la especificación original:**
  - Sistema de referencia: `/camera → detector → /objects → planner →
    /cmd_vel`.
  - Comandos: `ros2 node list`, `ros2 topic list`, `ros2 topic echo
    /objects`, `ros2 topic info /cmd_vel`.
  - Reto: "El robot detecta objetos pero no se mueve. Encuentra dónde se
    rompe la comunicación."
  - Fallas posibles: topic incorrecto, nodo muerto, mensaje ausente, typo,
    publisher inexistente.
  - Conecta con: S3B (Software), E2 (Electrónica), C4 (Control) — referencia
    conceptual.

### Por definir

- **Tipo de reto sugerido:** G (terminal ROS 2 simulada) + A (selección de la causa)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar — salida simulada de los comandos ros2)_
- **Opciones / respuesta correcta:** _(completar — ¿cuál falla específica se plantó?)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI5 — Trabaja como equipo con Git

**Estado en la app:** Profundización · requiere SI4 · no desbloquea nada más en esta rama

### Ya definido

- **Mini-descripción actual (panel de debug):** "Interpreta y usa comandos de
  Git (status, diff, add, commit, branch) en un repositorio con un conflicto
  sencillo."
- **De la especificación original:**
  - Reto: repositorio ficticio; debe interpretar y usar `git status`, `git
    diff`, `git add`, `git commit`, `git branch`. Puede incluir conflicto
    sencillo.
  - Nota explícita de la spec: "no convertirlo en trivia sobre Git" — debe
    evaluar uso real, no memorización de comandos sueltos.

### Por definir

- **Tipo de reto sugerido:** G (terminal Git simulada) o D (ordenar pasos)
- **Enunciado final:** _(completar)_
- **Recursos que se muestran:** _(completar — estado inicial del repo ficticio, ¿hay conflicto?)_
- **Opciones / respuesta correcta:** _(completar)_
- **Pistas:**
  - Pista 1: _(completar)_
  - Pista 2: _(completar)_
  - Pista 3: _(completar)_
- **Feedback si acierta:** _(completar)_
- **Feedback si no acierta:** _(completar)_
- **Intentos máximos:** _(completar — sugerido: ilimitado)_
- **Notas para el evaluador:** _(completar)_

---

## SI6 — Ponlo a funcionar fuera de tu PC

**Estado en la app:** Reto libre / Deployment · requiere SI4 · no desbloquea nada más en esta rama

### Ya definido

- **Mini-descripción actual (panel de debug):** "Prepara un entorno de
  ejecución reproducible para una pequeña aplicación robótica."
- **De la especificación original:**
  - Enunciado: "Prepara un entorno de ejecución para una pequeña aplicación
    robótica."
  - Opciones: script Bash, servicio, Docker, paquete ROS 2, logging,
    automatización, comunicación entre dispositivos.
  - Conecta con: A3 (IA), S4 (Software) e IR — referencia conceptual, y
    además es uno de los caminos de entrada a IR (ver `08-integracion-robotica-ir.md`).

### Por definir

- **Tipo de reto sugerido:** J (reto libre, múltiples evidencias)
- **Enunciado final:** _(completar)_
- **Qué debe entregar exactamente:** _(completar)_
- **Pistas:** _(completar, opcional)_
- **Feedback al entregar:** _(completar)_
- **Notas para el evaluador:** _(completar)_
