# Inteligencia Artificial

Color de rama: `#35C4E8` · Datos, modelos y criterio.

## Progresión

```text
A0 — ¿Puedes confiar en tus datos? (Fundamentos)
        ↓
    A1 — ¿Entiendes lo que estás observando? (Subhabilidad)
        ↓
        ├── A2-YOLO — Entrena, pero primero formula una hipótesis (Aplicación)
        └── A2-OpenCV — ¿Realmente necesitas Deep Learning? (Aplicación)
                ↓ (con AMBAS completadas — no basta una)
            A3 — ¿Tu solución funciona fuera del caso ideal? (Profundización)
                ↓
                ├── A4-RL — El agente optimiza lo que escribiste (BONUS)
                └── A4-GENERAL — ¿Puedes salirte del dataset? (BONUS)
```

7 nodos. A diferencia de las demás bifurcaciones del árbol (donde basta
completar **una** de las dos ramas paralelas para avanzar), **A3 exige
completar A2-YOLO y A2-OpenCV** — es el punto donde ambas soluciones se
comparan experimentalmente, así que no tiene sentido desbloquearlo con solo
una. Los dos nodos `A4_*` son **bonus explícitos**: no bloquean el cierre de
la prueba principal (que se considera completa con A0–A3) y se marcan con un
badge `BONUS` en la UI.

## Estado: los 7 nodos están implementados

Este documento empezó como plantilla genérica (mismo patrón A0 → A1A/A1B →
A2 → A3A/A3B → A4 que las demás ramas). **Se reemplazó por completo**
siguiendo `ESPECIFICACION_PRUEBA_IA_ROBOTICA_NODOS_v2.md`, un documento de
especificación aparte diseñado específicamente para esta rama, que gira
alrededor de un único problema — detección de una pelota de tenis de mesa —
en vez del catálogo genérico de subtemas de IA que tenían las demás ramas
como plantilla.

Lo que sigue describe **lo que hay hoy en el código**
(`semillero-app/src/lib/challenges/ai/*.ts` +
`semillero-app/src/components/challenges/ai/AiNodeChallenge.tsx`), no un
plan. A diferencia de las demás ramas implementadas (un componente React
distinto por nodo), los 7 nodos de IA comparten **un solo componente
dirigido por schema** (`AiNodeChallenge`): cada archivo `a0.ts`, `a1.ts`,
`a2-yolo.ts`, etc. solo declara secciones y campos (texto, texto largo,
opción única, listas repetibles, evidencia), y tanto el render como la
validación son genéricos. Se optó por este diseño en vez de siete archivos
bespoke porque los 7 nodos comparten la misma forma (contexto + preguntas
explícitas/implícitas + evidencia + reflexión), a diferencia de electrónica
o mecánica donde cada nodo tiene una interacción visual distinta.

Todos los nodos usan `completionRule` de revisión humana (no hay
"correcto"/"incorrecto" automático): la app valida longitudes mínimas y
campos requeridos para saber cuándo una entrega está completa, pero el
criterio real —justificación, diseño experimental, autocrítica— lo evalúa
una persona.

## Resumen

| ID | Título en el árbol | Nivel | Requiere | Desbloquea | Bonus |
|---|---|---|---|---|---|
| A0 | ¿Puedes confiar en tus datos? | Fundamentos | — | A1 | — |
| A1 | ¿Entiendes lo que estás observando? | Subhabilidad | A0 | A2-YOLO, A2-OpenCV | — |
| A2_YOLO | Entrena, pero primero formula una hipótesis | Aplicación | A1 | A3 (junto con A2-OpenCV) | — |
| A2_OPENCV | ¿Realmente necesitas Deep Learning? | Aplicación | A1 | A3 (junto con A2-YOLO) | — |
| A3 | ¿Tu solución funciona fuera del caso ideal? | Profundización | A2_YOLO **y** A2_OPENCV | A4_RL, A4_GENERAL | — |
| A4_RL | El agente optimiza lo que escribiste | Reto libre | A3 | — | Sí |
| A4_GENERAL | ¿Puedes salirte del dataset? | Reto libre | A3 | — | Sí |

---

## A0 — ¿Puedes confiar en tus datos?

**Estado en la app:** Fundamentos · sin requisitos · desbloquea A1

### Implementado

Instrucción abierta (no se enumeran los problemas del dataset de antemano).
Incluye un enlace de descarga al dataset contaminado para estudiantes
(`public/challenges/ai/a0/table-tennis-ball-dataset-student.zip`, ~37 MB —
generado con `C:\ROBOTICA\PRUEBA\exam_dataset_build\build_exam_dataset.py`,
seed fija, sin las claves de respuesta privadas).

4 secciones: estructura del dataset (clases, monoclase, remapeo de IDs,
negativos vs. missing annotations), auditoría técnica (validaciones sin
mirar la imagen, errores solo visibles comparando imagen/anotación,
decisión sobre motion blur, evidencia de auditoría), limpieza reproducible
(proceso de limpieza, orden split/augmentation con justificación anti-leakage)
y la reflexión final compartida "¿Qué podría estar mal?".

---

## A1 — ¿Entiendes lo que estás observando?

**Estado en la app:** Subhabilidad · requiere A0 · desbloquea A2_YOLO y A2_OPENCV (ambos, no uno solo)

### Implementado

5 secciones: EDA cuantitativo (cuartiles de width/height/área/aspect ratio),
hipótesis física de movimiento (¿más de un régimen geométrico? ¿por qué?),
Precision vs. Recall (elección + justificación pensando en un robot físico,
sin ofrecer "ambas" como opción ni sugerir tracking), color/HSV (histogramas,
thresholds justificados, HSV vs. motion blur) y límites del dominio (HSV vs.
Deep Learning, qué se puede/no se puede afirmar con este dataset). Cierra
con la reflexión final compartida.

---

## A2_YOLO — Entrena, pero primero formula una hipótesis

**Estado en la app:** Aplicación · requiere A1 · desbloquea A3 (junto con A2_OPENCV, **se necesitan ambos**)

### Implementado

4 secciones: baseline reproducible (config + métricas + evidencia),
experimentación controlada — incluye una **bitácora repetible** (mínimo 3
filas) con columnas Cambio / Hipótesis / Resultado / Interpretación, más
explicación de las pérdidas reportadas por YOLO; augmentations justificadas
físicamente; y una sección bonus **opcional** ("¿Modificarías la
arquitectura?") que no bloquea completar el nodo si se deja en blanco.
Cierra con la reflexión final compartida.

---

## A2_OPENCV — ¿Realmente necesitas Deep Learning?

**Estado en la app:** Aplicación · requiere A1 · desbloquea A3 (junto con A2_YOLO, **se necesitan ambos**)

### Implementado

3 secciones: pipeline clásico (descripción + código + thresholds HSV),
auditoría del código (qué revisó el estudiante de código generado por IA,
en particular la conversión de espacio de color BGR/RGB al usar
`cv2.imread`) y resultados/límites (ejemplos correctos y fallidos, FPS,
cuándo preferiría esta solución sobre YOLO). Cierra con la reflexión final
compartida.

---

## A3 — ¿Tu solución funciona fuera del caso ideal?

**Estado en la app:** Profundización · requiere A2_YOLO **y** A2_OPENCV · desbloquea A4_RL, A4_GENERAL

### Implementado

3 secciones: diseño del stress test (reducción de brillo 100/80/60/40 % y
~-60 % obligatoria, degradaciones adicionales opcionales), comparación
experimental (Precision/Recall/F1/latencia/FPS/p50/p95/fallos por
condición) e interpretación crítica (mAP vs. mejor solución real, elección
bajo CPU limitada, propuesta híbrida opcional). Ninguna conclusión se
revela de antemano en el enunciado. Cierra con la reflexión final
compartida.

---

## A4_RL — El agente optimiza lo que escribiste

**Estado en la app:** Reto libre · **BONUS** · requiere A3 · no bloquea el cierre de la prueba principal

### Implementado

3 secciones: entrenamiento y curva de recompensa, comportamiento y reward
hacking (política degenerada, ¿reward mayor implica mejor comportamiento?)
y rediseño de la recompensa con reevaluación. Sin sección de reflexión
final (el spec la excluye explícitamente de los nodos A4).

---

## A4_GENERAL — ¿Puedes salirte del dataset?

**Estado en la app:** Reto libre · **BONUS** · requiere A3 · no bloquea el cierre de la prueba principal

### Implementado

2 secciones: Nivel 1, generalización fuera del dataset (estrategia, evidencia
fuera del dominio original —no se acepta solo el validation original—,
nuevos falsos positivos, origen de la mejora), y Nivel 2, tracking eficiente
(estrategia, video/evidencia y métricas), **completamente opcional** y que
solo suma sobre el Nivel 1.
