# IR — Integración Robótica (reto transversal)

No es una octava rama: es un único nodo especial que combina lo que el
aspirante ya exploró en varias ramas. En el árbol aparece como una tarjeta más
grande, tipo "capstone", conectada por líneas de convergencia a los nodos de
nivel Aplicación de cada rama.

## Progresión / regla de desbloqueo

**Regla implementada hoy en la app:** IR se desbloquea al completar **al
menos 2** de los siguientes 7 nodos (uno por rama, todos de nivel Aplicación):

```text
D2 (Diseño) · M2 (Mecánica) · E2 (Electrónica) · C2 (Control)
S2 (Software) · A2-YOLO o A2-OpenCV (IA) · SI2 (Sistemas)
```

```text
        D2   M2   E2   C2   S2   A2*  SI2
         \    \    |    |    /    /    /
          \    \   |    |   /    /    /
           ---------- IR ----------
        (con ≥ 2 de los 7 completados)

        * cualquiera de A2-YOLO o A2-OpenCV cuenta como el nivel
          de Aplicación de IA (basta uno de los dos).
```

### Ya definido

- **Mini-descripción actual (panel de debug):** "Combina al menos dos de las
  áreas que exploraste para proponer o construir una solución robótica
  completa."
- **De la especificación original:**
  - Nombre: "IR — Conecta tus habilidades".
  - Visual sugerido: forma hexagonal, borde cian animado, conexiones desde las
    ramas ya exploradas, **con estética de "boss final" de videojuego**.
  - Regla de desbloqueo sugerida (más rica que la implementada hoy, dos rutas
    alternativas):
    - **Ruta multidisciplinar:** nivel de Aplicación alcanzado en dos ramas
      distintas (ej. D2+M2, E2+S2, A2-YOLO+S2). *(Esta es la que está implementada
      hoy, simplificada a "cualquiera 2 de los 7".)*
    - **Ruta especialista:** nivel avanzado en una rama + fundamentos en otras
      dos (ej. S3B + A1 + SI1A). *(No implementada todavía — ver "Por
      definir" más abajo si quieres agregarla.)*
  - Enunciado original: "Combina al menos dos de las áreas que exploraste
    para proponer o construir una solución robótica."
  - Entregables sugeridos: problema, solución, diagrama, áreas utilizadas,
    evidencia, decisiones, pruebas, limitaciones, próximos pasos.
  - Ejemplos de combinación dados en la spec:
    - Software + IA: Cámara → Modelo → ROS 2 → Comportamiento
    - Mecánica + Diseño: Necesidad → Mecanismo → Cálculo → CAD → Manufactura
    - Electrónica + Software: Sensor → ESP32 → Comunicación → Interfaz
    - Control + Electrónica + Software: Sensor → Controlador → PWM → Motor (ciclo)

### Implementación actual

- **Tipo de reto:** J (proyecto abierto con revisión humana).
- **Regla de desbloqueo:** nivel de Aplicación completado en dos ramas
  distintas; es decir, al menos dos de `D2`, `M2`, `E2`, `C2`, `S2`,
  `A2_YOLO`/`A2_OPENCV` (cualquiera de los dos cuenta como IA) y `SI2`.
- **Enunciado:** formular un proyecto de investigación en robótica que integre
  al menos dos áreas y pueda validarse mediante evidencia observable.
- **Etapas obligatorias:**
  1. contexto, problema, pregunta de investigación y justificación;
  2. objetivo general, mínimo tres objetivos específicos con indicadores e
     hipótesis;
  3. solución, arquitectura del sistema, aporte o novedad y diagrama;
  4. plan de acción de mínimo cuatro fases y recursos necesarios;
  5. métricas, riesgos y mitigaciones, ética/seguridad, impacto, limitaciones
     y mínimo dos fuentes.
- **Evidencia:** diagrama de arquitectura obligatorio; documentos de apoyo
  opcionales.
- **Evaluación:** no existe una respuesta automática correcta. La plataforma
  valida que la propuesta esté completa, guarda una rúbrica preliminar y la
  remite al evaluador para revisión humana.

---

## Conexiones híbridas de referencia (no implementadas, solo contexto)

La especificación original menciona varias combinaciones de nodos que podrían
convertirse en "insignias" o rutas alternativas de acceso a IR más adelante,
sin ser nodos nuevos del árbol:

| Combinación | Resultado conceptual |
|---|---|
| E2 + C4 | Control embebido |
| S3B + SI4 | Arquitectura ROS 2 |
| S3A + SI3B + E2 | Comunicación robótica |
| A3 + SI6 | IA en robot |
| D2 + M2 + E2 | Diseño mecatrónico |
| A2-YOLO + S2 + C4 | Autonomía |

_(Completar solo si decides implementar insignias/rutas alternativas — no es
necesario para que IR funcione.)_
