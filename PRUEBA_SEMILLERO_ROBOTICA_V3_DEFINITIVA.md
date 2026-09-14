# Especificación funcional — Prueba de ingreso al Semillero de Robótica
## Versión alternativa: Perfil libre + Árbol de Habilidades

**Estado:** Propuesta para validación con docente  
**Objetivo del documento:** servir como especificación funcional y visual suficientemente detallada para implementar la plataforma web.

---

# 1. Idea central

La prueba no debe sentirse como un examen tradicional. Debe funcionar como una **experiencia de exploración del perfil del aspirante**.

La plataforma debe permitir observar:

- quién es la persona;
- cómo decide presentarse;
- qué áreas de la robótica le interesan;
- qué conocimientos posee actualmente;
- hasta qué nivel intenta avanzar;
- cómo responde ante el error;
- si aprende después de varios intentos;
- cuánto explora por iniciativa propia;
- qué evidencia es capaz de producir;
- cómo comunica y justifica sus decisiones;
- y qué puede crear cuando recibe un problema abierto.

La prueba debe premiar la exploración, la persistencia y la profundidad, no únicamente acertar una respuesta en el primer intento.

---

# 2. Principios de diseño de la experiencia

## 2.1 No es un examen convencional

En la introducción debe aparecer explícitamente un mensaje similar a:

> Esto no es un examen tradicional. Queremos conocerte, descubrir qué sabes hacer hoy y, sobre todo, ver cómo exploras, aprendes y resuelves problemas.

No debe existir una sensación constante de "aprobado/reprobado".

## 2.2 Libertad para explorar

Después del registro y presentación personal, las siete ramas principales estarán visibles desde el inicio.

El aspirante puede decidir:

- por cuál comenzar;
- cuánto avanzar en cada una;
- si profundiza en una sola habilidad;
- si prueba todas;
- si vuelve posteriormente;
- y qué retos abiertos desea completar.

## 2.3 Reintentos ilimitados

Los retos cerrados pueden reintentarse.

El sistema **no debe bloquear al usuario por fallar**.

El sistema sí debe registrar internamente:

- número de intentos;
- respuestas seleccionadas;
- tiempo entre intentos;
- tiempo total en el reto;
- pistas utilizadas;
- archivos enviados;
- respuesta finalmente correcta o incompleta.

Esto permite analizar aprendizaje y persistencia.

## 2.4 El usuario ve progreso; el evaluador ve analítica

El aspirante debe ver:

- nodos completados;
- ramas desbloqueadas;
- porcentaje explorado;
- logros;
- evidencias subidas;
- retos abiertos completados.

El aspirante NO debería ver una nota académica del tipo `63/100`.

El evaluador sí podrá consultar métricas detalladas.

## 2.5 Autosave

Todo debe guardarse automáticamente.

Si el usuario cierra la página debe poder continuar posteriormente desde el mismo punto.

---

# 3. Flujo general de la plataforma

```text
Landing
   ↓
Conoce el Semillero
   ↓
Registro
   ↓
Preséntate como quieras
   ↓
Árbol de Habilidades
   ├── Electrónica
   ├── Mecánica
   ├── Diseño / CAD
   ├── Software
   └── Inteligencia Artificial
            ↓
     Reto Integrador Opcional
            ↓
      Resumen del Perfil
            ↓
        Enviar prueba
```

---

# 4. Pantalla 1 — Landing

## Objetivo

Dar una primera impresión seria, tecnológica, atractiva y ligada a robótica.

## Contenido recomendado

### Hero

**Título sugerido:**

`Explora hasta dónde puedes llegar.`

**Subtítulo:**

`Esta no es una prueba para demostrar que ya lo sabes todo. Es una oportunidad para mostrarnos cómo piensas, qué construyes y qué quieres aprender.`

Botón principal:

`Comenzar experiencia`

Botón secundario:

`Conocer el semillero`

### Elementos visuales

- fondo azul oscuro;
- retícula técnica o patrón de nodos muy sutil;
- líneas de circuito o conexiones animadas lentamente;
- partículas mínimas;
- ilustración abstracta de un robot, manipulador, PCB o grafo tecnológico;
- pequeñas tarjetas con las siete áreas;
- nada excesivamente "gamer".

## Animaciones

- entrada suave de elementos;
- conexiones luminosas discretas;
- hover en botones;
- pequeños movimientos parallax opcionales;
- evitar animaciones rápidas o distractoras.

---

# 5. Pantalla 2 — El Semillero

Debe explicar brevemente:

- qué es el semillero;
- qué tipo de proyectos desarrolla;
- qué significa pertenecer;
- que se valora aprender y construir;
- que no es necesario dominar todas las áreas;
- que los equipos son multidisciplinarios.

La sección puede mostrar cinco tarjetas:

1. Electrónica
2. Mecánica
3. Diseño
4. Control y Automatización
5. Software
6. Inteligencia Artificial
7. Sistemas e Integración Robótica

Cada tarjeta tendrá:

- ícono;
- frase de una línea;
- animación hover;
- conexión visual al árbol de habilidades que aparecerá después.

---

# 6. Pantalla 3 — Registro

## Campos mínimos obligatorios

- Nombre completo
- Correo electrónico
- Programa / carrera
- Semestre
- Código o identificador institucional, si aplica
- Aceptación de tratamiento de datos
- Aceptación de uso de archivos enviados para proceso de selección

## Campos opcionales

- GitHub
- LinkedIn
- Portafolio
- Página personal
- Instagram profesional
- Otro enlace

La interfaz debe indicar claramente qué campos son opcionales.

---

# 7. Pantalla 4 — "Preséntate como quieras"

Esta es una de las partes centrales de la propuesta.

## Mensaje principal

`Antes de ver qué sabes hacer, queremos saber quién eres.`

## Instrucción

El candidato puede presentarse mediante uno o varios formatos.

### Formatos aceptados

- texto;
- dibujo;
- imagen;
- fotografías;
- audio;
- video;
- PDF;
- presentación;
- enlace a portafolio;
- combinación de varios formatos.

## Preguntas guía

Las preguntas son **orientadoras**, no deben obligar a responder en cajas separadas.

- ¿Quién eres?
- ¿Qué cosas disfrutas hacer?
- ¿Qué haces en tu tiempo libre?
- ¿Qué te gusta construir, investigar o aprender?
- ¿Has participado en algún proyecto del que te sientas orgulloso?
- ¿Qué te llama la atención de la robótica?
- ¿Qué te gustaría aprender dentro del semillero?
- ¿Qué crees que podrías aportar?
- ¿Prefieres trabajar diseñando, construyendo, programando, investigando o probando?
- ¿Hay algo más que creas que deberíamos saber de ti?

## Interfaz

Mostrar una zona principal tipo canvas / uploader con botones:

- `Escribir`
- `Subir imagen`
- `Subir audio`
- `Subir video`
- `Subir archivo`
- `Agregar enlace`

Debe permitir combinar varios tipos de evidencia.

## Requisitos

- preview antes de subir;
- progreso de carga;
- eliminar archivo;
- reemplazar archivo;
- reordenar evidencias;
- autosave;
- límites de tamaño configurables;
- validación de formatos;
- guardar duración de audio/video.

---

# 8. Transición al árbol

Al terminar la presentación creativa, el aspirante debe continuar directamente al Árbol de Habilidades.

No debe existir un formulario intermedio. Las áreas de interés se infieren de las ramas que la persona decide explorar voluntariamente.

---

# 9. Pantalla principal — Árbol de Habilidades

## 9.1 Concepto visual

En el centro debe aparecer una tarjeta o nodo correspondiente al aspirante.

Ejemplo:

```text
                         Inteligencia Artificial
                                  ╱
                                 ╱
          Software ─────── [ ASPIRANTE ] ─────── Diseño / CAD
                                 ╲
                                  ╲
                        Electrónica      Mecánica
```

En implementación real, las ramas deberán distribuirse radialmente de manera equilibrada.

## 9.2 Ramas principales

Las siete ramas serán:

1. Electrónica
2. Mecánica
3. Diseño / CAD
4. Control y Automatización
5. Software
6. Inteligencia Artificial
7. Sistemas e Integración Robótica

No se recomienda agregar más ramas principales. Linux, ROS 2, Git, networking y deployment se agrupan dentro de Sistemas e Integración Robótica; manufactura, visión, simulación, embebidos y otras especialidades aparecen como subnodos o nodos híbridos.

Áreas como:

- ROS 2;
- control;
- manufactura;
- sistemas embebidos;
- simulación;
- visión artificial;
- comunicaciones;
- CAD;
- análisis estructural;

deben aparecer como **subramas**.

---

# 10. Jerarquía de retos

Cada rama tendrá cinco niveles conceptuales.

## Nivel 1 — Semilla

Reto corto y accesible.

Objetivo:

- romper el hielo;
- reconocer fundamentos;
- permitir que personas sin experiencia extrema puedan empezar.

## Nivel 2 — Fundamentos

Se divide la rama en dos o más subhabilidades.

Ejemplo para electrónica:

```text
Electrónica
    ├── Circuitos
    └── Sistemas embebidos
```

## Nivel 3 — Aplicación

Retos prácticos donde se debe utilizar una herramienta o aplicar varios conceptos.

## Nivel 4 — Profundización

Problemas más abiertos y técnicos.

## Nivel 5 — Reto libre

El aspirante propone qué quiere hacer.

Debe entregar:

- resultado;
- evidencia;
- breve explicación;
- herramientas utilizadas;
- qué intentó;
- qué funcionó;
- qué no funcionó;
- qué mejoraría.

---

# 11. Comportamiento del árbol

## Estado de nodos

Cada nodo puede estar en:

- `locked`
- `available`
- `in_progress`
- `completed`
- `submitted`
- `optional`

## Colores sugeridos de estado

- Locked: gris azulado
- Available: azul
- In progress: cian
- Completed: azul claro + check
- Submitted open challenge: borde brillante discreto

## Desbloqueo

Al comenzar:

- Nivel 1 de las siete ramas está disponible.

Cuando el Nivel 1 de una rama se completa:

- aparecen visualmente las subramas del Nivel 2.

Cuando un nodo de Nivel 2 se completa:

- se desbloquea su reto de Nivel 3.

Los retos Nivel 4 pueden requerir:

- completar al menos un Nivel 3 de la misma rama.

El reto libre de Nivel 5 se desbloquea cuando:

- se completa al menos un reto de Nivel 4;
- O el docente configura otra regla.

La regla de desbloqueo debe ser configurable.

---

# 12. Rama — Diseño / CAD

## Nivel 1 — Reconstrucción desde plano

Mostrar el plano técnico de una pieza sencilla.

Solicitar:

1. modelar la pieza;
2. subir archivo CAD o captura;
3. seleccionar las dimensiones principales obtenidas.

Evaluación automática parcial mediante preguntas.

## Nivel 2A — Materiales

Después de crear el modelo:

`Asigna aluminio 6061 a la pieza. ¿Cuál es su masa?`

Mostrar cuatro respuestas posibles.

Registrar todos los intentos.

## Nivel 2B — Propiedades geométricas

Preguntas como:

- volumen;
- área superficial;
- centro de masa;
- momento de inercia simplificado.

## Nivel 3 — Modificación

Ejemplo:

`Modifica la pieza para reducir 20 % de masa sin cambiar los puntos de montaje.`

Debe subir:

- captura antes;
- captura después;
- masa antes;
- masa después;
- explicación breve.

## Nivel 4 — Diseño para manufactura

Presentar una pieza problemática.

Pedir:

- identificar problemas;
- modificar diseño;
- justificar manufactura seleccionada.

Opciones:

- impresión 3D;
- CNC;
- corte láser;
- manufactura convencional.

## Nivel 5 — Reto libre

`Diseña una pieza o mecanismo que consideres útil para un proyecto robótico.`

Entregables:

- archivo o enlace;
- capturas;
- descripción;
- material;
- método de manufactura;
- decisiones principales.

---

# 13. Rama — Mecánica

## Nivel 1 — Intuición mecánica

Retos visuales como:

- dirección de movimiento;
- ventaja mecánica;
- relación de engranajes;
- sentido de giro;
- selección de mecanismo.

## Nivel 2A — Estática

Ejemplo:

- calcular reacción;
- torque;
- fuerza;
- brazo de palanca.

## Nivel 2B — Mecanismos

Seleccionar mecanismos para diferentes necesidades:

- velocidad;
- torque;
- movimiento lineal;
- transmisión;
- elevación.

## Nivel 3 — Dimensionamiento

Ejemplo:

`Un robot requiere 12 N·m a la salida. Selecciona una relación de reducción adecuada usando las opciones disponibles.`

## Nivel 4 — Simulación / análisis

Permitir utilizar:

- SolidWorks Simulation;
- Fusion;
- Ansys;
- MATLAB;
- cálculos manuales;
- otra herramienta.

Pedir:

- condiciones de frontera;
- carga;
- material;
- resultado;
- factor de seguridad;
- captura.

## Nivel 5 — Reto libre

`Analiza o diseña un elemento mecánico que pueda pertenecer a un robot.`

La solución puede ser:

- mecanismo;
- transmisión;
- soporte;
- suspensión;
- manipulador;
- estructura;
- otro.

---

# 14. Rama — Electrónica

## Nivel 1 — Reconocimiento

Mini retos visuales:

- identificar componentes;
- leer símbolos;
- reconocer conexión correcta;
- diferenciar entrada/salida;
- detectar polaridad.

## Nivel 2A — Circuitos

Ejemplos:

- ley de Ohm;
- divisor de tensión;
- potencia;
- resistencia para LED;
- conexiones serie/paralelo.

## Nivel 2B — Sistemas embebidos

Conceptos:

- GPIO;
- ADC;
- PWM;
- UART;
- I2C;
- SPI.

## Nivel 3 — Sensor + microcontrolador

Mostrar un sensor y una placa.

Pedir:

- seleccionar conexión;
- alimentación;
- interfaz;
- pequeña lógica de lectura.

## Nivel 4 — Debugging

Presentar un circuito con una falla.

Ejemplos:

- pull-up ausente;
- tierra no común;
- tensión incorrecta;
- LED invertido;
- pin incorrecto;
- ruido o alimentación insuficiente.

El usuario debe encontrar la causa.

## Nivel 5 — Reto libre

`Construye o simula un circuito relacionado con robótica.`

Puede usar:

- Arduino;
- ESP32;
- STM32;
- Raspberry Pi Pico;
- Tinkercad;
- Wokwi;
- Proteus;
- KiCad;
- otra herramienta.

Debe adjuntar evidencia.

---

# 15. Rama — Software

## Nivel 1 — Lógica

Retos interactivos:

- secuencias;
- condiciones;
- bucles;
- variables;
- diagramas de flujo;
- pseudocódigo.

## Nivel 2A — Programación

Editor embebido.

Lenguajes iniciales recomendados:

- Python;
- C++;
- opcionalmente JavaScript.

## Nivel 2B — Debugging

Código con errores sencillos.

El aspirante debe:

- identificar error;
- corregirlo;
- ejecutar pruebas.

## Nivel 3 — Problema aplicado

Ejemplo:

`Programa una función que reciba distancias de un sensor y determine si un robot debe avanzar, reducir velocidad o detenerse.`

## Nivel 4 — Arquitectura / robótica

Ejemplo:

Diseñar el flujo:

```text
sensor → procesamiento → decisión → actuador
```

o resolver un pequeño problema con:

- estados;
- eventos;
- comunicaciones;
- ROS 2 conceptual;
- máquina de estados.

## Nivel 5 — Reto libre

`Crea una pequeña herramienta de software útil para un robot.`

Ejemplos:

- simulador;
- controlador;
- interfaz;
- visualizador;
- procesador de datos;
- nodo ROS;
- algoritmo de navegación simple.

---

# 16. Rama — Inteligencia Artificial

## Nivel 1 — Datos

Retos sobre:

- clasificación;
- etiquetas;
- entradas;
- salidas;
- train / validation / test;
- ejemplos buenos y malos.

## Nivel 2A — Métricas

Interpretar:

- accuracy;
- precision;
- recall;
- F1;
- matriz de confusión.

No enfocarse inicialmente en fórmulas complejas.

## Nivel 2B — Preparación de datos

Ejemplos:

- imágenes mal etiquetadas;
- clases desbalanceadas;
- datos duplicados;
- augmentations;
- normalización.

## Nivel 3 — Entrenamiento sencillo

Puede utilizar:

- Teachable Machine;
- Edge Impulse;
- notebook preparado;
- plataforma propia.

La plataforma debe permitir adjuntar:

- captura;
- métrica;
- archivo o enlace;
- explicación.

## Nivel 4 — Evaluación crítica

Mostrar dos modelos.

Pedir decidir cuál usar teniendo en cuenta:

- precisión;
- latencia;
- tamaño;
- consumo;
- hardware disponible.

Esto conecta IA con robótica real.

## Nivel 5 — Reto libre

`Entrena un modelo de IA que resuelva un problema que te interese.`

Debe entregar:

- objetivo;
- datos;
- modelo;
- métricas;
- evidencia;
- conclusión;
- limitaciones.

No es obligatorio utilizar deep learning.

---

# 17. Reto transversal — Integración Robótica

No debe ser una sexta rama principal.

Debe aparecer como un nodo especial cuando el aspirante haya avanzado en varias ramas.

## Regla sugerida

Desbloquear cuando el usuario complete al menos:

- Nivel 3 en dos ramas distintas;
- o Nivel 2 en tres ramas.

## Enunciado conceptual

`Combina dos o más de tus habilidades para proponer una solución robótica.`

Ejemplos:

- CAD + electrónica;
- electrónica + software;
- software + IA;
- mecánica + diseño;
- IA + embebidos;
- ROS + percepción + hardware.

## Entrega

- problema;
- solución propuesta;
- diagrama;
- evidencia;
- decisiones;
- limitaciones;
- próximos pasos.

Puede ser conceptual si no dispone del hardware.

---

# 18. Tipos de reto soportados por la plataforma

El motor de retos debe permitir los siguientes tipos.

## Tipo A — Selección única

- pregunta;
- imagen opcional;
- opciones;
- respuesta correcta;
- feedback.

## Tipo B — Selección múltiple

Puede haber varias respuestas correctas.

## Tipo C — Valor numérico

Permitir:

- valor;
- unidad;
- tolerancia.

Ejemplo:

```json
{
  "expected": 152.4,
  "unit": "g",
  "tolerance": 2.0
}
```

## Tipo D — Ordenar

Ordenar:

- pasos;
- instrucciones;
- señales;
- componentes.

## Tipo E — Matching

Relacionar conceptos.

## Tipo F — Editor de código

Debe soportar:

- ejecución;
- tests;
- timeout;
- resultados;
- número de ejecuciones.

## Tipo G — Interacción visual

Ejemplos:

- conectar circuito;
- arrastrar componentes;
- seleccionar error;
- construir flujo lógico.

## Tipo H — Subida de evidencia

- imagen;
- video;
- PDF;
- CAD;
- ZIP;
- código;
- enlace.

## Tipo I — Respuesta abierta

Texto o audio.

## Tipo J — Reto libre

Permite combinar múltiples evidencias.

---

# 19. Sistema de pistas

Cada reto puede contener pistas.

Ejemplo:

```text
Pista 1 → orientación conceptual
Pista 2 → recordatorio de fórmula o principio
Pista 3 → ejemplo similar
```

Las pistas:

- no bloquean el reto;
- deben registrarse;
- no se presentan automáticamente;
- se muestran bajo botón `Necesito una pista`.

El evaluador debe poder ver cuántas fueron utilizadas.

---

# 20. Feedback inmediato

Después de cada intento cerrado:

## Si es correcto

Mensaje:

`Bien. Desbloqueaste una nueva parte de esta habilidad.`

Mostrar una explicación corta.

## Si es incorrecto

No utilizar:

- "Fallaste";
- "Incorrecto — 0 puntos";
- mensajes agresivos.

Utilizar:

`Todavía no. Puedes revisar tu solución e intentarlo otra vez.`

Se puede mostrar una pista conceptual después de varios intentos.

---

# 21. Información que debe almacenar cada intento

```json
{
  "candidateId": "uuid",
  "challengeId": "cad_material_mass_01",
  "attemptNumber": 3,
  "startedAt": "timestamp",
  "submittedAt": "timestamp",
  "durationSeconds": 87,
  "answer": "...",
  "isCorrect": true,
  "hintsUsed": 1,
  "files": [],
  "clientMetadata": {}
}
```

---

# 22. Información del progreso por nodo

```json
{
  "candidateId": "uuid",
  "nodeId": "software_debugging_02",
  "status": "completed",
  "unlockedAt": "timestamp",
  "completedAt": "timestamp",
  "attempts": 2,
  "timeSpentSeconds": 512,
  "evidenceCount": 1
}
```

---

# 23. Perfil generado para evaluación

La plataforma debe generar un perfil multidimensional.

No resumir al aspirante únicamente en una nota.

## Variables sugeridas

### Exploración

¿Cuántas ramas decidió visitar?

### Profundidad

¿Cuánto avanzó dentro de sus ramas favoritas?

### Exactitud

¿Qué porcentaje de retos cerrados resolvió correctamente?

### Persistencia

¿Volvió a intentar los retos?

### Autonomía

¿Cuántas pistas necesitó?

### Creación

¿Cuántos retos abiertos completó?

### Comunicación

¿Justifica y explica sus decisiones?

### Evidencia

¿Entrega resultados verificables?

### Afinidad

¿Qué áreas seleccionó voluntariamente?

---

# 24. Radar interno del candidato

El dashboard del evaluador puede mostrar:

```text
             Profundidad
                 8
                 |
     IA 7 -------+------- Software 9
                / \
               /   \
       Diseño 6     Electrónica 4
                 |
              Mecánica 5
```

También puede existir otro radar con:

- Curiosidad
- Persistencia
- Autonomía
- Comunicación
- Ejecución

Estos valores pueden ser calculados o asignados por evaluadores.

---

# 25. No utilizar una sola clasificación automática

La herramienta puede producir métricas, pero la decisión final debe permanecer humana.

Evitar:

`Candidato aprobado automáticamente porque obtuvo 78 puntos.`

Preferir:

`Perfil recomendado para revisión: alta profundidad en software e IA, exploración media, alta persistencia.`

---

# 26. Dashboard del evaluador

## Vista general

Tabla de candidatos:

- Nombre
- Carrera
- Semestre
- Progreso total
- Ramas exploradas
- Ramas profundas
- Retos abiertos
- Última actividad
- Estado de revisión

## Filtros

- carrera;
- semestre;
- área de fortaleza;
- progreso;
- retos abiertos completados;
- estado.

## Vista individual

Debe contener:

### Perfil
Información del registro.

### Presentación libre
Reproductor / visor de todos los archivos enviados.

### Árbol
Mismo árbol del aspirante, pero con analítica.

### Timeline

```text
20:03 Registro
20:08 Presentación subida
20:15 Diseño N1 — intento 1
20:18 Diseño N1 — intento 2
20:22 Diseño N1 completado
20:28 Electrónica N1 completado
...
```

### Evidencias

Galería de:

- imágenes;
- videos;
- PDFs;
- código;
- CAD;
- enlaces.

### Notas del evaluador

Campo privado.

### Etiquetas internas

Ejemplos:

- Software
- CAD
- Electrónica
- IA
- Mecánica
- Creativo
- Persistente
- Buena comunicación
- Revisar entrevista

---

# 27. Resumen final del aspirante

Antes de enviar definitivamente, mostrar una pantalla tipo perfil.

## Ejemplo

```text
Tu exploración

Diseño              ██████████  82 %
Software            ████████    67 %
IA                  █████       41 %
Electrónica         ███         25 %
Mecánica            ██          17 %

Retos completados: 18
Retos abiertos: 2
Evidencias: 11
```

No mostrar ranking contra otras personas.

## Mensaje

`No necesitas completar todo. Este mapa representa lo que decidiste explorar y hasta dónde quisiste llegar.`

Botón:

`Enviar mi prueba`

---

# 28. Duración

No debe existir un temporizador global agresivo.

Propuesta:

- sesión inicial recomendada: 60–90 minutos;
- permitir guardar y continuar;
- el administrador puede definir fecha límite;
- cada reto registra tiempo internamente.

Si el proceso requiere realizarse presencialmente, el modo de sesión cerrada puede limitar la duración.

---

# 29. Sistema de logros

Los logros deben motivar, no infantilizar.

Ejemplos:

- `Primer nodo`
- `Explorador` — probó las siete ramas
- `Especialista` — llegó a Nivel 4 en una rama
- `Constructor` — completó un reto libre
- `Multidisciplinar` — alcanzó Nivel 3 en tres ramas
- `Integrador` — completó Integración Robótica
- `Persistente` — superó un reto después de varios intentos

Los nombres pueden ajustarse a la identidad del semillero.

---

# 30. Dirección visual

## Personalidad

La interfaz debe sentirse:

- tecnológica;
- universitaria;
- seria;
- moderna;
- limpia;
- experimental;
- premium;
- relacionada con ingeniería y robótica.

Evitar que parezca:

- videojuego infantil;
- plataforma escolar genérica;
- formulario institucional viejo;
- dashboard empresarial sin personalidad.

---

# 31. Paleta de colores propuesta

## Fondo principal

`#061827`

Azul casi negro.

## Superficie

`#0B2438`

Tarjetas y paneles.

## Azul institucional / acción

`#1267B1`

Botones y elementos principales.

## Azul tecnológico

`#168DD0`

Estados interactivos.

## Cian

`#35C4E8`

Conexiones, nodos activos y pequeños highlights.

## Azul muy claro

`#DDF4FF`

Textos destacados sobre fondos oscuros.

## Texto principal

`#F5FAFD`

## Texto secundario

`#9CB6C8`

## Bordes

`rgba(117, 186, 224, 0.18)`

## Error

Usar rojo únicamente donde sea realmente necesario.

`#EF6A6A`

## Éxito

`#58C7A2`

El verde debe utilizarse con moderación para no romper la identidad azul.

---

# 32. Gradientes

Gradiente hero recomendado:

```css
background:
  radial-gradient(circle at 70% 20%, rgba(22, 141, 208, 0.18), transparent 35%),
  linear-gradient(135deg, #061827 0%, #081F33 55%, #0A2942 100%);
```

Nodos activos:

```css
background: linear-gradient(135deg, #1267B1, #168DD0);
```

---

# 33. Tipografía

Recomendadas:

## Opción 1

- Headings: Space Grotesk
- Body: Inter

## Opción 2

- Headings: Sora
- Body: Inter

## Opción 3

- Headings y body: Manrope

No utilizar fuentes excesivamente futuristas.

---

# 34. Diseño del árbol

## Desktop

El árbol debe ocupar la mayor parte del viewport.

### Centro

Avatar o iniciales del candidato.

Debajo:

- nombre;
- progreso;
- botón `Ver perfil`.

### Ramas

Cada rama tiene:

- ícono;
- nombre;
- porcentaje;
- nodos conectados.

## Interacciones

### Hover

Mostrar tooltip:

- nombre del reto;
- dificultad;
- estado;
- estimación orientativa.

### Click

Abrir reto en:

- panel lateral;
- modal grande;
- o vista dedicada.

Se recomienda una vista dedicada para retos complejos.

## Zoom

Para árboles grandes:

- zoom in;
- zoom out;
- centrar;
- reset;
- pan.

Tecnologías recomendables:

- React Flow;
- Cytoscape.js;
- D3;
- SVG personalizado.

React Flow es una opción especialmente adecuada para una implementación rápida.

---

# 35. Mobile

El árbol radial completo puede ser difícil en móvil.

En pantallas pequeñas:

- mostrar árbol vertical o por carriles;
- conservar la lógica de desbloqueo;
- permitir cambiar de rama mediante tabs;
- mantener progreso visible.

La aplicación debe ser responsive, pero la experiencia óptima puede indicarse para computador.

---

# 36. Microinteracciones

Permitidas:

- pulso sutil en nodo recién desbloqueado;
- línea que se dibuja cuando aparece una subrama;
- contador de progreso;
- check animado;
- glow sutil;
- pequeñas partículas en el hero.

Evitar:

- sonidos por defecto;
- confetti constante;
- elementos que tiemblen;
- efectos arcade;
- animaciones largas.

---

# 37. Arquitectura recomendada

## Frontend

Recomendado:

- Next.js
- TypeScript
- Tailwind CSS
- React Flow
- Framer Motion
- React Hook Form
- Zod

## Backend

Opciones:

### Opción A — Supabase

Adecuada para prototipo rápido.

- Auth
- PostgreSQL
- Storage
- Row Level Security

### Opción B — Next.js + PostgreSQL

Mayor control.

- Next.js API Routes / Server Actions
- PostgreSQL
- Prisma
- S3 / compatible storage

## Recomendación

Para primera versión:

`Next.js + TypeScript + Supabase`

---

# 38. Modelo de datos mínimo

## User

```text
id
email
role
created_at
last_login
```

## CandidateProfile

```text
id
user_id
full_name
program
semester
student_code
github_url
linkedin_url
portfolio_url
submitted_at
```

## IntroductionArtifact

```text
id
candidate_id
type
url
title
description
sort_order
created_at
```

## SkillBranch

```text
id
slug
name
description
icon
sort_order
```

## SkillNode

```text
id
branch_id
parent_node_id
level
slug
name
description
challenge_id
unlock_rule
position_x
position_y
```

## Challenge

```text
id
type
title
statement
difficulty
configuration_json
is_repeatable
max_attempts
active
```

`max_attempts = null` significa ilimitado.

## ChallengeAttempt

```text
id
candidate_id
challenge_id
attempt_number
answer_json
correct
started_at
submitted_at
duration_seconds
hints_used
```

## Evidence

```text
id
attempt_id
candidate_id
type
storage_url
original_filename
mime_type
size
created_at
```

## CandidateNodeProgress

```text
id
candidate_id
node_id
status
unlocked_at
completed_at
time_spent
```

## ReviewerNote

```text
id
candidate_id
reviewer_id
text
created_at
```

---

# 39. Motor de configuración

Los retos NO deberían estar hardcodeados directamente en componentes.

Cada reto debe cargarse desde base de datos o configuración.

Ejemplo:

```json
{
  "id": "electronics_ohm_01",
  "type": "numeric",
  "title": "Resistencia para LED",
  "statement": "Calcula la resistencia necesaria.",
  "difficulty": 1,
  "expected": 220,
  "unit": "ohm",
  "tolerance": 10,
  "feedback": {
    "correct": "Bien. Revisa también la potencia disipada.",
    "incorrect": "Revisa la caída de tensión en el LED."
  }
}
```

Esto permitirá agregar o cambiar retos sin reconstruir toda la aplicación.

---

# 40. Panel administrativo

Debe permitir:

- crear reto;
- editar reto;
- desactivar reto;
- asignar reto a nodo;
- definir prerequisitos;
- crear pistas;
- modificar feedback;
- modificar opciones;
- cambiar fecha límite;
- visualizar candidatos;
- exportar resultados.

Idealmente no debe requerir editar código para cambiar una pregunta.

---

# 41. Exportación

Debe permitir exportar:

## CSV

Resumen de candidatos.

## ZIP

Evidencias de un candidato.

## PDF opcional

Perfil individual generado.

## JSON opcional

Toda la trazabilidad para análisis posterior.

---

# 42. Seguridad

## Requisitos mínimos

- autenticación;
- autorización por roles;
- archivos privados;
- URLs firmadas para descargas;
- validación MIME;
- límite de tamaño;
- sanitización de nombres;
- validación server-side;
- rate limiting;
- protección de endpoints de evaluador;
- logs de cambios administrativos.

## Roles

### Candidate

Solo puede:

- modificar su perfil;
- realizar sus retos;
- ver su progreso.

### Reviewer

Puede:

- revisar candidatos;
- visualizar evidencias;
- agregar notas.

### Admin

Puede:

- administrar retos;
- usuarios;
- configuración;
- fechas;
- exportaciones.

---

# 43. Privacidad

Antes de subir video/audio/documentos debe existir consentimiento claro.

Texto configurable indicando:

- para qué se utilizarán;
- quién podrá verlos;
- cuánto tiempo se conservarán;
- cómo solicitar eliminación.

No hacer públicas las evidencias.

---

# 44. Accesibilidad

- contraste WCAG AA;
- navegación con teclado;
- labels en inputs;
- texto alternativo;
- no depender únicamente de color;
- subtítulos recomendados para videos institucionales;
- indicadores de foco;
- reducir animaciones si `prefers-reduced-motion`.

---

# 45. Analítica útil para selección

Guardar:

- hora de inicio;
- hora de última actividad;
- duración;
- ramas visitadas;
- nivel máximo por rama;
- retos completados;
- intentos;
- pistas;
- retos abandonados;
- retornos posteriores;
- archivos enviados;
- retos libres;
- reto integrador.

No utilizar métricas invasivas como movimientos de mouse o webcam.

---

# 46. Métricas derivadas sugeridas

## Exploration Score

Basado en ramas distintas visitadas.

## Depth Score

Basado en nivel máximo alcanzado.

## Persistence Indicator

Basado en retos finalmente resueltos después de errores.

## Autonomy Indicator

Basado en resolución sin pistas.

## Creation Indicator

Basado en retos abiertos y evidencias.

## Multidisciplinary Indicator

Basado en ramas con progreso significativo.

Estas métricas son apoyo para el evaluador, no una decisión automática.

---

# 47. Pantallas mínimas del MVP

1. Landing
2. Información del semillero
3. Login / registro
4. Presentación libre
5. Árbol de habilidades
6. Vista de reto
7. Evidencias
8. Perfil / progreso final
9. Confirmación `Finalizar mi recorrido`
10. Reflexión final en video
11. Envío final
12. Dashboard de evaluador
13. Vista individual de candidato
14. Administración básica de retos

---

# 48. Funcionalidades para una segunda fase

- comentarios del evaluador sobre evidencias;
- entrevistas agendadas;
- badges adicionales;
- comparación entre cohortes;
- generación de perfil PDF;
- editor visual de árbol;
- retos colaborativos;
- retos en tiempo real;
- ranking interno NO visible al candidato;
- integración con GitHub;
- integración con almacenamiento institucional;
- IA para resumir evidencia, únicamente como apoyo humano.

---

# 49. Propuesta de navegación

```text
/
├── /semillero
├── /login
├── /registro
├── /presentacion
├── /skills
│   ├── /design
│   ├── /mechanics
│   ├── /electronics
│   ├── /software
│   └── /ai
├── /challenge/[id]
├── /profile
├── /submit
└── /reviewer
    ├── /candidates
    ├── /candidate/[id]
    └── /challenges
```

---

# 50. Componentes frontend sugeridos

```text
AppShell
Navbar
HeroSection
SemilleroOverview
CandidateRegistrationForm
CreativeIntroductionUploader
AvailabilitySelector

SkillTree
SkillBranch
SkillNode
SkillNodeTooltip
SkillProgressRing
TreeControls

ChallengeShell
SingleChoiceChallenge
MultipleChoiceChallenge
NumericChallenge
OrderingChallenge
MatchingChallenge
CodeChallenge
VisualChallenge
OpenChallenge
EvidenceUploader
HintPanel
FeedbackPanel

CandidateProfileSummary
AchievementCard
SubmissionConfirmation

ReviewerDashboard
CandidateTable
CandidateSkillTree
CandidateTimeline
EvidenceGallery
ReviewerNotes
ChallengeAdmin
```

---

# 51. Estado global requerido

Debe conservar:

```text
auth
candidateProfile
introductionArtifacts
availability
branches
nodes
progress
currentChallenge
attempts
evidence
achievements
submissionStatus
```

---

# 52. Requisitos de UX críticos

## Nunca perder trabajo

Todo texto abierto debe guardarse automáticamente.

## Dar feedback de guardado

Mostrar:

`Guardado`

o

`Guardando...`

## No bloquear navegación

Si un reto está incompleto, permitir salir.

## Confirmar antes de envío final

Después de enviar:

- la prueba queda cerrada para edición;
- un administrador puede reabrirla.

## Mostrar siempre progreso

Header:

`18 nodos completados · 5 ramas exploradas`

---

# 53. Semántica de dificultad

No mostrar:

`Fácil / Medio / Difícil`

Preferir:

- Nivel 1 — Fundamentos
- Nivel 2 — Exploración
- Nivel 3 — Aplicación
- Nivel 4 — Profundización
- Nivel 5 — Reto libre

Esto evita intimidar.

---

# 54. Criterios de aceptación del MVP

La versión se considera funcional cuando:

- [ ] un candidato puede registrarse;
- [ ] puede realizar una presentación multimodal;
- [ ] puede visualizar las siete ramas;
- [ ] puede abrir un reto;
- [ ] puede responder y reintentar;
- [ ] los intentos quedan registrados;
- [ ] completar un nodo desbloquea otro;
- [ ] el árbol refleja el progreso;
- [ ] puede subir evidencia;
- [ ] existe al menos un reto abierto por rama;
- [ ] puede guardar y continuar posteriormente;
- [ ] el nodo central permite `Finalizar mi recorrido` cuando se cumple el mínimo configurable;
- [ ] puede visualizar un resumen de su recorrido antes del cierre;
- [ ] puede grabar o adjuntar la reflexión final en video;
- [ ] puede enviar definitivamente la prueba;
- [ ] un evaluador puede ver candidatos;
- [ ] puede revisar el árbol de un candidato;
- [ ] puede ver historial de intentos;
- [ ] puede visualizar evidencias;
- [ ] puede agregar notas;
- [ ] un administrador puede editar contenido básico de retos;
- [ ] los archivos no son públicos;
- [ ] la interfaz funciona correctamente en desktop;
- [ ] existe adaptación responsive mínima para móvil.

---

# 55. Contenido mínimo para primera demo

Para demostrar el concepto no es necesario implementar todos los retos.

Crear inicialmente:

## Presentación libre

Completa.

## Diseño

- Nivel 1
- una subrama Nivel 2
- Nivel 3
- reto libre

## Electrónica

- Nivel 1
- Nivel 2
- reto libre

## Software

- Nivel 1
- Nivel 2
- reto libre

## Mecánica

- Nivel 1
- reto libre

## IA

- Nivel 1
- Nivel 2
- reto libre

## Control y Automatización

- C0 — intuición de error
- C2 — control proporcional interactivo
- C4 — aplicación robótica
- C6 — reto libre

## Sistemas e Integración Robótica

- SI0 — terminal Linux
- SI2 — debugging de entorno
- SI4 — inspección ROS 2
- SI6 — reto libre / deployment

## Cierre

- nodo central `Finalizar mi recorrido`;
- resumen automático del árbol;
- reflexión final obligatoria en video;
- envío definitivo.

Así se puede demostrar:

- ramificación;
- desbloqueo;
- diferentes tipos de reto;
- profundidad;
- libertad;
- analítica.

---

# 56. Elemento diferenciador frente a una prueba convencional

Esta plataforma no busca responder únicamente:

`¿Cuánto sabe esta persona?`

Busca responder:

- ¿Qué decide explorar?
- ¿Dónde profundiza?
- ¿Qué hace cuando no sabe?
- ¿Insiste?
- ¿Busca pistas?
- ¿aprende?
- ¿puede explicar lo que hizo?
- ¿puede construir evidencia?
- ¿qué área le interesa realmente?
- ¿cómo combina conocimientos?
- ¿qué tan autónomo es?
- ¿qué quiere aprender?

Ese debe ser el argumento principal para defender esta versión frente al profesor.

---

# 57. Resultado esperado

Al terminar, el evaluador debería poder abrir a un candidato y comprender rápidamente:

```text
Quién es
↓
Qué le interesa
↓
Qué exploró
↓
Hasta dónde llegó
↓
Cómo resolvió
↓
Cómo reaccionó al error
↓
Qué fue capaz de construir
↓
Cuánto tiempo puede dedicar
```

La experiencia debe sentirse menos como un formulario de admisión y más como **construir visualmente el mapa de habilidades propio**.

---

# 58. Frase conceptual de la plataforma

Opciones:

### Principal recomendada

**Explora. Construye. Muéstranos cómo piensas.**

### Alternativa

**Tu perfil no es una nota. Es todo lo que decides construir.**

### Alternativa técnica

**Siete ramas. Decenas de caminos. Un perfil construido por ti.**

---

# 59. Decisiones recomendadas antes de producción

Antes de convertir el prototipo en plataforma oficial, definir con el docente:

1. fecha límite;
2. si se permitirá continuar varios días;
3. formatos máximos de archivos;
4. duración máxima de video;
5. número real de retos por nivel;
6. cuáles retos tendrán corrección automática;
7. cuáles serán revisados manualmente;
8. qué datos serán utilizados para selección;
9. quién tendrá rol de evaluador;
10. tiempo de conservación de evidencias.

---


# 60. Especificación definitiva del árbol de habilidades — V3

Esta sección reemplaza cualquier conteo o estructura anterior que indique cinco ramas o treinta y cinco nodos. La arquitectura definitiva usa **siete ramas principales** y un sistema de nodos progresivos, subnodos y conexiones híbridas.

---

## 60.1 Recuento general definitivo

### Ramas principales

1. **Diseño / CAD**
2. **Mecánica**
3. **Electrónica**
4. **Control y Automatización**
5. **Software**
6. **Inteligencia Artificial**
7. **Sistemas e Integración Robótica**

### Conteo de nodos técnicos

| Rama | Código | Nodos |
|---|---|---:|
| Diseño / CAD | D | 7 |
| Mecánica | M | 7 |
| Electrónica | E | 7 |
| Control y Automatización | C | 9 |
| Software | S | 7 |
| Inteligencia Artificial | A | 7 |
| Sistemas e Integración Robótica | SI | 9 |
| **Subtotal nodos de rama** |  | **53** |
| Integración Robótica transversal | IR | 1 |
| **Total de nodos técnicos** |  | **54** |

### Experiencias adicionales fuera del árbol técnico

| Experiencia | Cantidad |
|---|---:|
| Presentación inicial multimodal | 1 |
| Reflexión final obligatoria en video | 1 |
| **Total de experiencias completas de la plataforma** | **56** |

El aspirante **no está obligado a completar los 54 nodos técnicos**. El árbol funciona como espacio de exploración. Una sesión normal puede cubrir aproximadamente entre 10 y 18 nodos, mientras que un candidato que quiera profundizar puede volver y seguir avanzando hasta la fecha límite.

---

# 61. Estructura visual y conexiones del árbol

## 61.1 Nodo central

El nodo central representa al candidato.

Estados:

### Estado inicial

Muestra:

- avatar o iniciales;
- nombre;
- texto `Comienza tu recorrido`.

### Estado de exploración

Muestra:

- retos completados;
- ramas exploradas;
- nivel máximo alcanzado;
- acceso al perfil.

Ejemplo:

```text
JUAN
14 retos
4 ramas
```

### Estado de finalización disponible

Cuando cumple el mínimo de exploración, el nodo central empieza a pulsar sutilmente y muestra:

`Finalizar mi recorrido`

Regla mínima recomendada:

```text
4 nodos completados
+
progreso en al menos 2 ramas diferentes
```

La regla debe ser configurable por administrador.

---

## 61.2 Finalización desde el nodo central

Al hacer clic:

### Confirmación

```text
Estás a punto de cerrar tu recorrido.

No necesitas completar todo el árbol.
Queremos conocer hasta dónde decidiste explorar.

Después del envío final no podrás modificar tus respuestas.
```

Botones:

- `Seguir explorando`
- `Finalizar mi recorrido`

Si confirma, pasa al resumen final y posteriormente a la reflexión en video.

---

## 61.3 Mapa conceptual de ramas

```text
                              IA
                               │
                        A0 → A1 → A2...
                               │
                               │
            Software ───── [ CANDIDATO ] ───── Diseño / CAD
               │               │                  │
               │               │                  │
      Sistemas / Linux         │              Mecánica
               │               │                  │
               └────── Control y Automatización ─┘
                               │
                          Electrónica
```

La implementación real deberá ser radial y ordenada, no necesariamente idéntica al ASCII.

---

## 61.4 Filosofía de conexiones

Existen tres clases de conexión:

### A. Conexión jerárquica

Un nodo desbloquea otro dentro de la misma rama.

Ejemplo:

```text
D0 → D1A → D2 → D3A → D4
```

### B. Bifurcación

Un nodo inicial puede desbloquear dos subhabilidades.

Ejemplo:

```text
D0
├── D1A Geometría y restricciones
└── D1B Materiales y propiedades
```

### C. Conexión híbrida

Un nodo avanzado de una rama puede conectarse visualmente con uno de otra rama.

Ejemplo:

```text
E2 Sensor + MCU
+
C4 Control de robot
↓
Nodo híbrido conceptual: Control embebido
```

Los nodos híbridos no tienen que sumar un nuevo reto obligatorio. Pueden actuar como conexiones visuales, recomendaciones o prerequisitos alternativos del reto IR.

---

# 62. Catálogo definitivo — Diseño / CAD

## D0 — Del plano al modelo

**Tipo:** Fundamentos  
**Qué evalúa:** lectura de planos, interpretación dimensional y modelado básico.

### Reto

Se entrega un plano técnico sencillo.

El candidato debe:

- modelar la pieza en el CAD que prefiera;
- subir archivo o capturas;
- responder dimensiones verificables.

### Interacción

- visor de plano;
- campos numéricos;
- carga de evidencia.

### Evidencia

- captura o archivo CAD;
- respuestas dimensionales.

### Desbloquea

- D1A
- D1B

---

## D1A — Geometría bajo control

**Tipo:** Subhabilidad — Croquis y restricciones  
**Qué evalúa:** comprensión de relaciones geométricas y definición de sketches.

### Reto

Se presentan varios croquis.

Debe identificar:

- cuál está completamente definido;
- qué restricción falta;
- qué dimensión controla determinado cambio.

### Interacción

- selección;
- highlight visual;
- matching.

### Desbloquea

D2 cuando D1A o D1B ha sido completado.

---

## D1B — El material también diseña

**Tipo:** Subhabilidad — Materiales y propiedades  
**Qué evalúa:** propiedades físicas derivadas del modelo.

### Reto

Asignar un material definido, por ejemplo:

`Aluminio 6061`

Responder:

- masa;
- volumen;
- centro de masa;
- área superficial opcional.

### Evaluación

Valores numéricos con tolerancia.

### Desbloquea

D2 cuando D1A o D1B ha sido completado.

---

## D2 — Diseña menos, logra más

**Tipo:** Aplicación  
**Qué evalúa:** optimización geométrica y criterio.

### Reto

`Reduce al menos 15 % la masa sin modificar las superficies de montaje.`

### Entrega

- captura antes;
- captura después;
- masa antes;
- masa después;
- explicación de las decisiones.

### Desbloquea

- D3A
- D3B

---

## D3A — Diseña para imprimir

**Tipo:** Profundización — Manufactura aditiva  
**Qué evalúa:** DfAM.

### Reto

Se presenta una pieza deliberadamente problemática para impresión 3D.

Problemas posibles:

- overhang;
- orientación;
- espesor insuficiente;
- exceso de soportes;
- anisotropía;
- tolerancias.

Debe identificar y corregir los problemas.

### Desbloquea

D4.

---

## D3B — Diseña para fabricar y ensamblar

**Tipo:** Profundización — DFM/DFA  
**Qué evalúa:** manufacturabilidad y ensamble.

### Reto

Detectar problemas como:

- acceso imposible de herramienta;
- tolerancias absurdas;
- tornillos inaccesibles;
- geometrías innecesarias;
- exceso de piezas.

Debe modificar y justificar.

### Desbloquea

D4.

---

## D4 — Diseña algo que exista

**Tipo:** Reto libre  
**Qué evalúa:** creación autónoma.

### Enunciado

`Diseña una pieza, conjunto o mecanismo que consideres útil para un robot.`

### Entrega

- CAD o enlace;
- capturas;
- material;
- proceso de manufactura;
- explicación;
- limitaciones.

---

# 63. Catálogo definitivo — Mecánica

## M0 — Piensa como un mecanismo

**Tipo:** Fundamentos  
**Qué evalúa:** intuición mecánica.

### Reto

Minijuegos sobre:

- engranajes;
- poleas;
- palancas;
- sentido de giro;
- ventaja mecánica;
- velocidad y torque.

### Desbloquea

- M1A
- M1B

---

## M1A — Fuerzas que cuentan una historia

**Tipo:** Subhabilidad — Estática  
**Qué evalúa:** fuerza, torque y equilibrio.

### Reto

Resolver uno o varios problemas visuales sencillos:

- reacción;
- momento;
- torque;
- brazo de palanca.

### Desbloquea

M2.

---

## M1B — Cambia velocidad por fuerza

**Tipo:** Subhabilidad — Transmisiones  
**Qué evalúa:** relación de transmisión.

### Reto

A partir de motor, velocidad, torque y carga debe elegir una reducción adecuada.

### Interacción

- sliders;
- selección;
- animación de velocidad/torque.

### Desbloquea

M2.

---

## M2 — Elige el actuador correcto

**Tipo:** Aplicación  
**Qué evalúa:** dimensionamiento básico.

### Ejemplo

`Un brazo levanta 2 kg a 0.25 m y debe completar el movimiento en 1.5 s.`

Debe estimar:

- torque;
- velocidad;
- margen;
- motor/reducción.

### Desbloquea

- M3A
- M3B

---

## M3A — ¿La estructura aguanta?

**Tipo:** Profundización — Estructuras  
**Qué evalúa:** interpretación de análisis estructural.

### Reto

Se entrega un FEA o escenario.

Debe identificar:

- restricciones;
- cargas;
- deformación;
- factor de seguridad;
- si la simulación es físicamente coherente.

### Desbloquea

M4.

---

## M3B — Inventa el movimiento

**Tipo:** Profundización — Mecanismos  
**Qué evalúa:** síntesis conceptual.

### Reto

`Necesitas mover una plataforma 150 mm dentro de este volumen.`

Puede seleccionar o proponer:

- husillo;
- cuatro barras;
- piñón-cremallera;
- actuador lineal;
- otro.

Debe justificar.

### Desbloquea

M4.

---

## M4 — Mecánica libre

**Tipo:** Reto libre

### Enunciado

`Diseña o analiza un subsistema mecánico para un robot.`

Ejemplos:

- transmisión;
- manipulador;
- suspensión;
- estructura;
- soporte;
- mecanismo.

---

# 64. Catálogo definitivo — Electrónica

## E0 — Encuentra qué no cuadra

**Tipo:** Fundamentos  
**Qué evalúa:** reconocimiento visual y razonamiento básico.

### Reto

Circuito sencillo con una falla.

Puede incluir:

- LED invertido;
- falta de resistencia;
- alimentación incorrecta;
- polaridad;
- conexión errónea.

### Desbloquea

- E1A
- E1B

---

## E1A — Haz que los números cierren

**Tipo:** Subhabilidad — Circuitos  
**Qué evalúa:** fundamentos eléctricos.

### Reto

Problemas cortos sobre:

- Ley de Ohm;
- potencia;
- divisor de tensión;
- serie/paralelo;
- resistencia para LED.

### Desbloquea

E2.

---

## E1B — Habla con el microcontrolador

**Tipo:** Subhabilidad — Embebidos  
**Qué evalúa:** GPIO e interfaces.

### Reto

Elegir el recurso adecuado:

- GPIO;
- ADC;
- PWM;
- UART;
- I2C;
- SPI.

Ejemplos aplicados a ESP32, Arduino o STM32.

### Desbloquea

E2.

---

## E2 — Del sensor al motor

**Tipo:** Aplicación  
**Qué evalúa:** integración básica sensor–MCU–actuador.

### Reto

Construir o completar:

```text
Sensor
↓
Microcontrolador
↓
Driver
↓
Actuador
```

Debe definir:

- alimentación;
- pines;
- interfaz;
- lógica básica.

### Desbloquea

- E3A
- E3B

### Conecta con

- C4
- SI4
- S3A

---

## E3A — Alimenta el robot

**Tipo:** Profundización — Potencia  
**Qué evalúa:** distribución energética.

### Reto

Se entrega un robot con:

- motores;
- servos;
- SBC;
- sensores.

Debe seleccionar:

- batería;
- reguladores;
- corriente;
- distribución.

### Desbloquea

E4.

---

## E3B — Debuggea el hardware

**Tipo:** Profundización — Diagnóstico  
**Qué evalúa:** troubleshooting.

### Fallas posibles

- tierra no común;
- pull-up ausente;
- UART TX-TX;
- tensión incorrecta;
- dirección I2C;
- alimentación insuficiente.

### Desbloquea

E4.

---

## E4 — Electrónica libre

**Tipo:** Reto libre

### Enunciado

`Construye o simula un sistema electrónico relacionado con robótica.`

Herramientas posibles:

- Wokwi;
- Tinkercad;
- Proteus;
- KiCad;
- hardware real.

---

# 65. Catálogo definitivo — Control y Automatización

Esta rama contiene nueve nodos porque cubre fundamentos, experimentación y aplicación robótica directa.

## C0 — Persigue la referencia

**Tipo:** Fundamentos  
**Qué evalúa:** intuición de error y corrección.

### Reto

Un robot debe mantenerse a 50 cm.

La interfaz cambia la distancia y pregunta qué debería hacer.

Sin introducir inicialmente formulación matemática.

### Desbloquea

- C1A
- C1B

---

## C1A — Abierto o realimentado

**Tipo:** Subhabilidad — Open/Closed loop  
**Qué evalúa:** concepto de realimentación.

### Reto

Comparar:

```text
Motor → tiempo → detener
```

con:

```text
Encoder → controlador → motor
```

Elegir cuál usar para posicionamiento preciso.

### Desbloquea

C2.

---

## C1B — ¿Quién mide y quién actúa?

**Tipo:** Subhabilidad — Sensores/actuadores  
**Qué evalúa:** selección funcional.

### Reto

Clasificar:

- encoder;
- IMU;
- LiDAR;
- potenciómetro;
- motor;
- servo.

Luego seleccionar sensores adecuados para cerrar diferentes lazos.

### Desbloquea

C2.

---

## C2 — Domina el Kp

**Tipo:** Aplicación interactiva  
**Qué evalúa:** efecto del control proporcional.

### Reto

Simulación de posición con slider:

`Kp`

Debe conseguir respuesta rápida sin oscilación excesiva.

### Métricas observables

- tiempo de establecimiento;
- overshoot;
- error.

### Desbloquea

- C3A
- C3B

---

## C3A — Afina un PID

**Tipo:** Profundización — PID  
**Qué evalúa:** intuición de P, I y D.

### Reto

Casos:

- error estacionario;
- oscilaciones;
- respuesta lenta;
- ruido.

Debe ajustar o seleccionar modificaciones de:

- Kp;
- Ki;
- Kd.

### Desbloquea

C4.

---

## C3B — Lee la respuesta

**Tipo:** Profundización — Señales  
**Qué evalúa:** interpretación temporal.

### Reto

A partir de gráfica de referencia y salida identificar:

- tiempo de subida;
- overshoot;
- error estacionario;
- estabilidad;
- asentamiento.

### Desbloquea

C4.

---

## C4 — Haz que el robot siga

**Tipo:** Aplicación robótica  
**Qué evalúa:** integración control + software.

### Reto

Robot diferencial sigue línea o referencia.

Debe producir velocidades de motores a partir de error.

Ejemplo:

```python
error = left - right
correction = kp * error
left_motor = base - correction
right_motor = base + correction
```

### Conecta con

- E2;
- S1A;
- S2.

### Desbloquea

C5.

---

## C5 — Diagnostica el controlador

**Tipo:** Evaluación crítica  
**Qué evalúa:** criterio de implementación.

### Reto

Comparar tres respuestas:

- lenta;
- oscilatoria;
- rápida con pequeño overshoot.

Seleccionar cuál implementaría y justificar.

### Desbloquea

C6.

---

## C6 — Control libre

**Tipo:** Reto libre

### Enunciado

`Controla cualquier sistema que quieras.`

Herramientas:

- MATLAB;
- Simulink;
- Python;
- Arduino;
- Gazebo;
- Webots;
- MuJoCo;
- hardware real.

Entregar:

```text
Sistema
↓
Variable controlada
↓
Sensor
↓
Controlador
↓
Actuador
↓
Resultado
```

---

# 66. Catálogo definitivo — Software

## S0 — Haz pensar al robot

**Tipo:** Fundamentos  
**Qué evalúa:** lógica.

### Reto

Robot debe llegar de A a B usando bloques:

- avanzar;
- girar;
- if;
- repeat.

La estética debe ser técnica, no infantil.

### Desbloquea

- S1A
- S1B

---

## S1A — Código que decide

**Tipo:** Subhabilidad — Programación  
**Qué evalúa:** funciones, condiciones y procesamiento.

### Reto

Editor Python/C++.

Ejemplo:

`Procesa cinco mediciones de distancia y decide avanzar, reducir velocidad o detener.`

Tests automáticos.

### Desbloquea

S2.

---

## S1B — Rompe el bug

**Tipo:** Subhabilidad — Debugging  
**Qué evalúa:** lectura y corrección de código.

### Reto

Código con varios errores.

Debe:

- identificar;
- modificar;
- ejecutar tests.

### Desbloquea

S2.

---

## S2 — El robot tiene estados

**Tipo:** Aplicación  
**Qué evalúa:** máquinas de estado.

### Reto

Construir:

```text
SEARCH
↓
APPROACH
↓
INTERACT
↓
RETURN
```

Agregar:

- condiciones;
- eventos;
- transiciones.

### Conecta con

C4.

### Desbloquea

- S3A
- S3B

---

## S3A — Haz que los sistemas hablen

**Tipo:** Profundización — Comunicación  
**Qué evalúa:** mensajes, datos e interfaces.

### Reto

Procesar mensajes de sensores y generar decisiones.

Puede introducir:

- serial;
- JSON;
- pub/sub;
- sockets conceptuales.

### Conecta con

E2 y SI3B.

### Desbloquea

S4.

---

## S3B — Divide un robot en piezas de software

**Tipo:** Profundización — Arquitectura  
**Qué evalúa:** separación de responsabilidades.

### Reto

Dar:

- cámara;
- detector;
- planner;
- controlador;
- motores.

Debe proponer nodos, mensajes y flujo.

Puede introducir ROS 2 conceptualmente.

### Conecta con

SI4.

### Desbloquea

S4.

---

## S4 — Software libre

**Tipo:** Reto libre

### Enunciado

`Crea una herramienta de software útil para un robot.`

Ejemplos:

- nodo;
- controlador;
- GUI;
- simulador;
- visualizador;
- algoritmo.

---

# 67. Catálogo definitivo — Inteligencia Artificial

> **Reemplazado.** El catálogo genérico A0 → A1A/A1B → A2 → A3A/A3B → A4
> descrito originalmente en esta sección ya no refleja lo implementado.
> La rama de IA fue rediseñada por completo alrededor de un único problema
> —detección de una pelota de tenis de mesa— siguiendo
> `ESPECIFICACION_PRUEBA_IA_ROBOTICA_NODOS_v2.md` (raíz del repositorio).
>
> La estructura vigente es:
>
> ```text
> A0 → A1 → { A2_YOLO ‖ A2_OPENCV } → A3 → { A4_RL BONUS ‖ A4_GENERAL BONUS }
> ```
>
> Para el catálogo detallado de lo implementado (contenido real de cada
> nodo, campos, evidencias y decisiones de diseño), ver
> [`retos/06-inteligencia-artificial.md`](./retos/06-inteligencia-artificial.md)
> — ese documento describe el código, no un plan.

---

# 68. Catálogo definitivo — Sistemas e Integración Robótica

Esta rama contiene nueve nodos y representa el manejo del entorno tecnológico donde normalmente vive el software robótico.

Incluye Linux, terminal, procesos, red, ROS 2, Git y deployment.

## SI0 — Entra a la terminal

**Tipo:** Fundamentos Linux  
**Qué evalúa:** exploración básica.

### Terminal simulada

```bash
robot@semillero:~$
```

### Reto

`Dentro del computador existe un archivo con el nombre del robot. Encuéntralo.`

Comandos posibles:

```bash
ls
cd
pwd
cat
```

### Métricas

- comandos;
- errores;
- uso de ayuda;
- tiempo;
- secuencia.

### Desbloquea

- SI1A
- SI1B

---

## SI1A — Navega el sistema

**Tipo:** Subhabilidad — Archivos  
**Qué evalúa:** manejo del filesystem.

### Reto

Debe:

- crear directorio;
- copiar archivo;
- mover;
- buscar;
- eliminar.

Comandos esperables:

```bash
mkdir
cp
mv
rm
find
```

### Desbloquea

SI2.

---

## SI1B — Hazlo ejecutable

**Tipo:** Subhabilidad — Permisos  
**Qué evalúa:** permisos Linux.

### Escenario

```bash
./start_robot.sh
Permission denied
```

Debe resolverlo, por ejemplo:

```bash
chmod +x start_robot.sh
./start_robot.sh
```

### Desbloquea

SI2.

---

## SI2 — El entorno está roto

**Tipo:** Aplicación — Dependencias  
**Qué evalúa:** debugging del entorno.

### Escenario

```bash
python3 controller.py
ModuleNotFoundError: No module named 'serial'
```

Debe investigar usando herramientas como:

```bash
python3 --version
which python3
pip
pip list
```

No evaluar solo memorización del comando: evaluar estrategia de diagnóstico.

### Desbloquea

- SI3A
- SI3B

---

## SI3A — Encuentra el proceso rebelde

**Tipo:** Profundización — Procesos  
**Qué evalúa:** administración básica.

### Escenario

`vision_node` consume toda la CPU.

Puede utilizar:

```bash
ps
top
htop
kill
killall
```

Debe identificar y detener el proceso correcto.

### Desbloquea

SI4 o SI5.

---

## SI3B — ¿Por qué no puedo hablar con el robot?

**Tipo:** Profundización — Networking  
**Qué evalúa:** conectividad.

### Escenario

```text
Robot: 192.168.1.52
PC:    192.168.0.23
```

Debe diagnosticar usando conceptos/comandos:

```bash
ping
ip addr
ip route
```

### Conecta con

S3A.

### Desbloquea

SI4.

---

## SI4 — Inspecciona un robot con ROS 2

**Tipo:** Aplicación robótica  
**Qué evalúa:** introspección ROS 2.

### Sistema

```text
/camera
↓
detector
↓
/objects
↓
planner
↓
/cmd_vel
```

### Terminal

```bash
ros2 node list
ros2 topic list
ros2 topic echo /objects
ros2 topic info /cmd_vel
```

### Reto

`El robot detecta objetos pero no se mueve. Encuentra dónde se rompe la comunicación.`

Posibles fallas:

- topic incorrecto;
- nodo muerto;
- mensaje ausente;
- typo;
- publisher inexistente.

### Conecta con

- S3B;
- E2;
- C4.

### Desbloquea

SI5 y SI6.

---

## SI5 — Trabaja como equipo con Git

**Tipo:** Profundización — Colaboración  
**Qué evalúa:** control de versiones.

### Reto

Repositorio ficticio.

Debe interpretar y usar:

```bash
git status
git diff
git add
git commit
git branch
```

Puede incluir conflicto sencillo.

No convertirlo en trivia sobre Git.

### Desbloquea

SI6.

---

## SI6 — Ponlo a funcionar fuera de tu PC

**Tipo:** Reto libre / Deployment  
**Qué evalúa:** capacidad de preparar un entorno reproducible.

### Enunciado

`Prepara un entorno de ejecución para una pequeña aplicación robótica.`

Opciones:

- script Bash;
- servicio;
- Docker;
- paquete ROS 2;
- logging;
- automatización;
- comunicación entre dispositivos.

### Conecta con

A3 (IA), S4 e IR.

---

# 69. Conexiones híbridas entre ramas

Las conexiones híbridas ayudan a que la visualización parezca un ecosistema de habilidades, no siete listas independientes.

## 69.1 Control embebido

```text
E2 Del sensor al motor
+
C4 Haz que el robot siga
↓
CONTROL EMBEBIDO
```

No necesariamente crea un nodo adicional. Puede desbloquear una insignia o contribuir al acceso a IR.

---

## 69.2 Arquitectura ROS 2

```text
S3B Divide un robot en piezas de software
+
SI4 Inspecciona un robot con ROS 2
↓
ARQUITECTURA ROBÓTICA
```

---

## 69.3 Comunicaciones robóticas

```text
S3A Haz que los sistemas hablen
+
SI3B Networking
+
E2 Integración hardware
↓
COMUNICACIÓN ROBÓTICA
```

---

## 69.4 Percepción desplegada

```text
A3 Stress test y comparación
+
SI6 Deployment
↓
IA EN ROBOT
```

---

## 69.5 Diseño mecatrónico

```text
D2 Optimización
+
M2 Dimensionamiento
+
E2 Integración
↓
DISEÑO MECATRÓNICO
```

---

## 69.6 Sistema autónomo

```text
A2-YOLO Entrenamiento
+
S2 Máquina de estados
+
C4 Control
↓
AUTONOMÍA
```

---

# 70. Nodo especial — IR: Integración Robótica

## Nombre

**IR — Conecta tus habilidades**

## Visual

Nodo especial diferente al resto.

Recomendación:

- forma hexagonal;
- borde cian animado;
- conexiones procedentes de ramas ya exploradas;
- sin estética de "boss final" gamer.

## Regla de desbloqueo recomendada

Se desbloquea si se cumple cualquiera:

### Ruta multidisciplinar

Nivel de Aplicación alcanzado en **dos ramas distintas**.

Ejemplos:

- D2 + M2;
- E2 + S2;
- A2-YOLO + S2.

### Ruta especialista

Nivel avanzado en una rama + fundamentos en otras dos.

Ejemplo:

```text
S3B
+
A1
+
SI1A
```

Regla configurable.

## Enunciado

`Combina al menos dos de las áreas que exploraste para proponer o construir una solución robótica.`

## Entregables

1. problema;
2. solución;
3. diagrama;
4. áreas utilizadas;
5. evidencia;
6. decisiones;
7. pruebas;
8. limitaciones;
9. próximos pasos.

## Ejemplos

### Software + IA

```text
Cámara
↓
Modelo
↓
ROS 2
↓
Comportamiento
```

### Mecánica + Diseño

```text
Necesidad
↓
Mecanismo
↓
Cálculo
↓
CAD
↓
Manufactura
```

### Electrónica + Software

```text
Sensor
↓
ESP32
↓
Comunicación
↓
Interfaz
```

### Control + Electrónica + Software

```text
Sensor
↓
Controlador
↓
PWM
↓
Motor
↺
```

---

# 71. Resumen final antes del envío

Cuando el candidato decide finalizar, la plataforma genera una vista de su recorrido.

Ejemplo:

```text
DISEÑO / CAD                 Nivel 4
MECÁNICA                     Nivel 3
ELECTRÓNICA                  Nivel 3
CONTROL                      Nivel 2
SOFTWARE                     Nivel 4
IA                           Nivel 2
SISTEMAS / INTEGRACIÓN       Nivel 3

17 retos completados
6 ramas exploradas
2 retos libres
1 conexión híbrida
```

No mostrar:

- nota global;
- ranking;
- puesto;
- aprobado/reprobado.

---

# 72. Reflexión final obligatoria en video

## Objetivo

Contrastar la presentación inicial con la experiencia después de resolver los retos.

## Pantalla

Título:

`Antes de irte, queremos escucharte.`

Texto:

`Cuéntanos cómo fue tu recorrido.`

## Preguntas guía

- ¿Por qué quieres pertenecer al Semillero de Robótica?
- ¿Quién eres y qué parte de tu perfil te gustaría que recordáramos?
- ¿Qué rama disfrutaste más?
- ¿Cuál fue el reto que más te costó?
- ¿Aprendiste algo nuevo durante la prueba?
- ¿Hubo algo que inicialmente no sabías resolver y luego entendiste?
- Si tuvieras más tiempo, ¿qué seguirías explorando?
- ¿Qué te gustaría aprender o construir dentro del semillero?

## Formato

Video obligatorio adjuntado por el aspirante. El archivo es privado y solo
puede consultarlo el equipo evaluador.

Duración recomendada:

`2–4 minutos`

## Controles

- `Seleccionar video`
- `Reproducir`
- `Reemplazar video`
- `Eliminar video`

Formatos de video compatibles, con un tamaño máximo de 50 MB.

---

# 73. Botón definitivo

Después de aceptar el video:

`Enviar mi prueba`

Debe mostrar confirmación final.

Al confirmar:

- guardar `submitted_at`;
- bloquear edición;
- guardar snapshot del árbol;
- guardar video final;
- generar resumen del evaluador.

El administrador puede reabrir excepcionalmente una entrega.

---

# 74. Conteo de nodos por rama y flujo

```text
DISEÑO / CAD
D0
├── D1A
├── D1B
└── D2
    ├── D3A
    ├── D3B
    └── D4

7 nodos
```

```text
MECÁNICA
M0
├── M1A
├── M1B
└── M2
    ├── M3A
    ├── M3B
    └── M4

7 nodos
```

```text
ELECTRÓNICA
E0
├── E1A
├── E1B
└── E2
    ├── E3A
    ├── E3B
    └── E4

7 nodos
```

```text
CONTROL
C0
├── C1A
├── C1B
└── C2
    ├── C3A
    ├── C3B
    └── C4
        └── C5
            └── C6

9 nodos
```

```text
SOFTWARE
S0
├── S1A
├── S1B
└── S2
    ├── S3A
    ├── S3B
    └── S4

7 nodos
```

```text
IA (ver ESPECIFICACION_PRUEBA_IA_ROBOTICA_NODOS_v2.md — reemplaza este catálogo genérico)
A0
└── A1
    ├── A2_YOLO ─┐
    └── A2_OPENCV┴── A3 (requiere AMBAS)
                     ├── A4_RL (bonus)
                     └── A4_GENERAL (bonus)

7 nodos
```

```text
SISTEMAS E INTEGRACIÓN
SI0
├── SI1A
├── SI1B
└── SI2
    ├── SI3A
    ├── SI3B
    └── SI4
        ├── SI5
        └── SI6

9 nodos
```

---

# 75. Recuento final definitivo

## Árbol técnico

```text
Diseño / CAD                 7
Mecánica                     7
Electrónica                  7
Control y Automatización     9
Software                     7
Inteligencia Artificial      7
Sistemas e Integración       9
──────────────────────────────
Nodos de ramas              53

Integración Robótica         1
──────────────────────────────
NODOS TÉCNICOS              54
```

## Experiencia completa

```text
Presentación inicial         1
Nodos técnicos              54
Reflexión final en video     1
──────────────────────────────
TOTAL EXPERIENCIAS          56
```

## Filosofía final

El objetivo no es que un candidato complete 56 experiencias.

El objetivo es construir suficiente trazabilidad para responder:

```text
¿Quién es?
¿Qué decidió explorar?
¿Dónde profundizó?
¿Cómo reaccionó al error?
¿Qué aprendió?
¿Qué pudo construir?
¿Cómo conecta conocimientos?
¿Cómo explica lo que hizo?
¿Dónde podría aportar al semillero?
```

---

# 76. Resumen ejecutivo para presentar al profesor

La prueba alternativa queda compuesta por **siete ramas técnicas**:

1. Diseño / CAD
2. Mecánica
3. Electrónica
4. Control y Automatización
5. Software
6. Inteligencia Artificial
7. Sistemas e Integración Robótica

Estas ramas contienen **53 nodos técnicos**, organizados en fundamentos, subhabilidades, aplicación, profundización y retos libres.

Existe además un **reto transversal de Integración Robótica**, para un total de **54 nodos técnicos**.

Sumando la presentación multimodal inicial y la reflexión final obligatoria en video, la plataforma contiene **56 experiencias posibles**.

El candidato no debe completar todas. El sistema está diseñado para que cada persona construya un recorrido diferente.

La navegación termina cuando el propio candidato pulsa el nodo central **Finalizar mi recorrido**, revisa el resumen de su árbol, graba un video reflexivo y confirma **Enviar mi prueba**.

La frase conceptual definitiva propuesta es:

> **Explora. Construye. Muéstranos cómo piensas.**


# 77. Resumen técnico para implementación con Codex

Construir una aplicación web de selección para un Semillero de Robótica basada en un árbol de habilidades progresivo.

Stack recomendado:

```text
Next.js
TypeScript
Tailwind
React Flow
Framer Motion
Supabase
PostgreSQL
Supabase Storage
```

Requisitos centrales:

```text
- registro y autenticación
- presentación multimodal
- siete ramas de habilidad
- nodos desbloqueables
- retos configurables
- reintentos ilimitados
- tracking de intentos
- pistas
- evidencia
- retos abiertos
- autosave
- perfil final
- envío definitivo
- dashboard de evaluación
- roles
- almacenamiento privado
```

Prioridad de diseño:

```text
1. árbol de habilidades visual
2. facilidad de exploración
3. trazabilidad de intentos
4. presentación libre
5. evidencia
6. dashboard del evaluador
7. estética tecnológica seria
```

La interfaz debe utilizar una identidad azul oscura/cian, con profundidad visual, conexiones y microanimaciones, sin caer en estética infantil o excesivamente gamer.
