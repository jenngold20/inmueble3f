# Guía Metodológica y Directiva de Sistema: Historias de Usuario, Estimación en Fibonacci y Descomposición de Tareas para Agentes de IA

Esta directiva define el marco operativo, los criterios de estimación y el protocolo de interacción para agentes de inteligencia artificial y desarrolladores que operan bajo metodologías ágiles. Su propósito es establecer un puente riguroso entre la especificación de negocio de alto nivel (Historias de Usuario) y la ejecución técnica atómica en tableros de gestión visual (Trello, Jira o GitHub Projects), garantizando que ninguna tarea técnica sobrecargue la capacidad analítica ni la ventana de contexto del agente.

---

## 1. Fundamentos de las Historias de Usuario en Entornos Profesionales

Una Historia de Usuario profesional no es un simple enunciado declarativo ni una orden de trabajo estática; constituye una herramienta viva de articulación entre los requerimientos de negocio y la ingeniería de software. A diferencia de las especificaciones funcionales monolíticas, su concepción moderna se sustenta en tres principios complementarios.

### 1.1 El Modelo de las Tres C (Ron Jeffries)

El ciclo de vida de una Historia de Usuario integra tres componentes inseparables:

1. **Card (Tarjeta):** Representa el soporte físico o digital sintético que captura el problema de negocio, el rol beneficiario y el valor esperado. Funciona como un disparador o recordatorio de una necesidad que debe ser atendida.
2. **Conversation (Conversación):** Corresponde al intercambio colaborativo continuo entre el Product Owner, el Tech Lead, los desarrolladores y los especialistas de aseguramiento de calidad (QA). En esta instancia se refinan los detalles, se clarifican las reglas de validación y se detectan dependencias técnicas.
3. **Confirmation (Confirmación):** Define las condiciones objetivas, cuantitativas y ejecutables que determinan cuándo la funcionalidad se considera terminada y aceptada por el negocio. Estos criterios se formalizan a través de Criterios de Aceptación.

### 1.2 El Criterio INVEST (Bill Wake)

Para que una Historia de Usuario sea considerada madura para ingresar a un ciclo de desarrollo (Sprint), debe cumplir de manera estricta con las seis características del acrónimo INVEST:

* **Independent (Independiente):** La historia debe poder ser desarrollada, evaluada y desplegada de forma autónoma, minimizando el acoplamiento con otras historias del backlog.
* **Negotiable (Negociable):** La tarjeta captura la esencia de la necesidad, pero los mecanismos técnicos específicos para resolverla quedan abiertos a discusión y optimización durante la conversación con el equipo.
* **Valuable (Valiosa):** Cada historia debe aportar un incremento de valor tangible y medible para el usuario final o el negocio. Quedan excluidas las tareas puramente técnicas desprovistas de contexto operativo.
* **Estimable (Estimable):** El equipo debe comprender con suficiente claridad el alcance y las reglas involucradas para poder asignarle un tamaño relativo de esfuerzo.
* **Small (Pequeña):** Su volumen y complejidad deben permitir completarla holgadamente dentro de los límites de una iteración.
* **Testable (Comprobable / Verificable):** Debe existir un procedimiento claro, reproducible y objetivo para verificar si el comportamiento implementado satisface la necesidad planteada.

### 1.3 Estructura Formal y Criterios de Aceptación en Gherkin (BDD)

La estructura completa de una Historia de Usuario profesional combina la narrativa de tres partes con escenarios estructurados bajo la sintaxis Gherkin (Behavior-Driven Development):

* **Narrativa Connextra:**
  * **Como** [rol específico del usuario o actor del dominio]
  * **Quiero** [funcionalidad, capacidad operativa o interacción específica]
  * **Para** [beneficio cuantificable, mitigación de riesgo o valor de negocio]
* **Escenarios de Comportamiento (Dado / Cuando / Entonces):**
  * **Dado** [el contexto o estado previo del sistema].
  * **Cuando** [ocurre una acción del usuario o un evento del entorno].
  * **Entonces** [el sistema produce un resultado verificable, una notificación o un cambio de estado].

---

## 2. Marco de Estimación Relativa en Fibonacci y Filosofía de Slicing

La estimación ágil no mide horas reloj directas de programación, sino el esfuerzo relativo global que demanda transformar un requerimiento en código productivo y probado.

### 2.1 La Secuencia de Fibonacci en Planning Poker

Se utiliza la escala modificada de Mike Cohn derivada de la sucesión de Fibonacci:

$$\{1, 2, 3, 5, 8, 13, 20, 40, 100\}$$

Cada salto en la escala refleja una tasa de crecimiento exponencial en la incertidumbre y la dificultad. Los factores constitutivos de los Puntos de Historia (Story Points - SP) son:

1. **Volumen de Trabajo:** Cantidad neta de componentes, capas arquitectónicas y líneas de código a redactar.
2. **Complejidad Algorítmica y Lógica:** Densidad de validaciones cruzadas, cálculos matemáticos, transacciones de base de datos e integraciones con librerías o servicios de terceros.
3. **Incertidumbre y Riesgo:** Grado de desconocimiento sobre la tecnología, la estabilidad de las dependencias externas o la ambigüedad en las reglas de negocio.

### 2.2 La Regla Estricta de los Tres Puntos para Tareas de Ejecución

Cuando una Historia de Usuario se descompone en tareas técnicas operativas para ser asignadas a un tablero de gestión visual (como Trello o Jira) y ejecutadas por un agente de inteligencia artificial o un programador, se aplica una restricción ineludible:

> **Límite Máximo de Tarjeta:** Ninguna tarea individual de Trello puede tener una estimación superior a 3 Puntos de Historia. Los únicos valores admisibles para una tarjeta final de trabajo son 1 SP, 2 SP o 3 SP.

Si durante el análisis técnico una tarea preliminar arroja una puntuación de 5 SP o superior, dicha tarea es clasificada automáticamente como **sobredimensionada** y debe ser sometida a un proceso obligatorio de partición (*Slicing*).

| Estimación | Nivel de Complejidad | Características Técnicas de la Tarea | Acción Requerida |
| :--- | :--- | :--- | :--- |
| **1 SP** | Trivial / Muy Baja | Ajustes de configuración, consultas de lectura directa (GET simple), componentes de UI estáticos sin estado, pruebas unitarias aisladas de funciones puras. | Aprobada para ejecución directa. |
| **2 SP** | Estándar / Moderada | CRUD básico con validación de entradas, formularios interactivos con manejo de estado local, lógica de negocio estándar, pruebas de integración API-BD. | Aprobada para ejecución directa. |
| **3 SP** | Compleja (Límite Máximo) | Transacciones de base de datos con atomicidad (Commit/Rollback), validación cruzada entre múltiples entidades, reportes con consolidación de datos, integraciones externas simuladas con mocks. | Aprobada para ejecución directa (Tope máximo). |
| **5 SP** | Épica / Sobredimensionada | Tareas que involucran múltiples capas simultáneamente (base de datos + backend + frontend + testing), procesos con alta incertidumbre técnica o flujos con bifurcaciones múltiples. | **Prohibida para ejecución directa.** Debe dividirse obligatoriamente en 2 o más tareas de 1, 2 o 3 SP. |
| **8 SP o más** | Bloque Arquitectónico Mayor | Funcionalidades de infraestructura completa, migraciones complejas o subsistemas enteros. | **Prohibida para ejecución directa.** Requiere división a nivel de historias y posterior desglose en tareas. |

---

## 3. Protocolo de Interacción con Agentes de IA: Flujo en Dos Fases

Para maximizar la precisión, evitar alucinaciones técnicas y asegurar que el desarrollador conserve el control total de la arquitectura, el agente de IA debe operar obligatoriamente bajo un protocolo de dos etapas con punto de control estricto (*Stop & Confirm*).

### 3.1 Fase 1: Análisis, Slicing y Planificación

Al recibir una Historia de Usuario completa, el agente ejecuta las siguientes acciones:

1. Desglosa los criterios de aceptación y las reglas de negocio.
2. Identifica las capas de software afectadas (Base de datos, Lógica de Negocio, APIs, Interfaz de Usuario y Pruebas).
3. Elabora las tarjetas de Trello asegurando que cada una sea menor o igual a 3 SP.
4. Redacta el checklist técnico de implementación para cada tarjeta.
5. **PUNTO DE DETENCIÓN OBLIGATORIO (STOP):** El agente presenta la propuesta completa de tarjetas al usuario y se detiene por completo. Queda terminantemente prohibido generar código fuente, crear archivos de proyecto o ejecutar herramientas en esta etapa.

El agente cierra la Fase 1 con el siguiente mensaje de control:

> *"He diseñado el desglose de tareas respetando el límite máximo de 3 Puntos de Historia por tarjeta. Por favor, revisa el alcance, los criterios y las estimaciones. ¿Estás de acuerdo con esta estructura o deseas ajustar alguna tarjeta antes de comenzar la implementación?"*

### 3.2 Fase 2: Ejecución e Implementación Iterativa

La Fase 2 se activa única y exclusivamente tras la confirmación explícita del usuario (por ejemplo: *"Aprobado"*, *"Proceder"*, *"Comenzar implementación"*).

En esta fase, el agente:
* Toma una única tarjeta de Trello a la vez, respetando el orden de dependencias técnicas (típicamente: persistencia $\rightarrow$ lógica/API $\rightarrow$ interfaz $\rightarrow$ pruebas).
* Implementa las líneas de código y archivos asociados a los pasos de la tarjeta.
* Ejecuta o diseña las pruebas correspondientes para verificar el Criterio de Aceptación específico de la tarjeta.
* Notifica la finalización de la tarjeta antes de solicitar autorización para abordar la siguiente.

---

## 4. Plantilla Estandarizada de Tarjeta de Trello

Toda tarjeta generada por el agente debe estructurarse bajo el siguiente formato uniforme para permitir su interpretación inmediata tanto por humanos como por parsers automatizados:

```markdown
### 📋 [CARD-ID]: [Título Técnico en Infinitivo]
* **Historia de Usuario Asociada:** [Código de la HU, ej: HU-ADM-21]
* **Estimación:** [1 SP | 2 SP | 3 SP]
* **Capa Arquitectónica:** [Database / Backend / Frontend / QA / DevOps]
* **Dependencias Previas:** [ID de tarjeta previa requerida, o "Ninguna"]

#### 📝 Alcance y Objetivo Técnico:
[Descripción clara y sin ambigüedades de la funcionalidad concreta a construir en esta tarjeta].

#### ⚙️ Especificaciones Técnicas:
* Entidades / Tablas involucradas: [Nombres de tablas o esquemas].
* Endpoints / Interfaces: [Firmas de métodos, rutas HTTP o componentes].
* Reglas de validación aplicables: [Detalle de las condiciones de negocio a verificar].

#### ✅ Checklist de Implementación (To-Do):
- [ ] [Paso 1: ej. Crear migración y esquema relacional con restricciones].
- [ ] [Paso 2: ej. Implementar servicio de dominio y lógica de cálculo].
- [ ] [Paso 3: ej. Exponer controlador y validadores de entrada].

#### 🎯 Criterio de Aceptación de la Tarjeta (Definition of Done - DoD):
[Condición objetiva para dar la tarjeta por finalizada, ej.: "El endpoint responde código HTTP 200 con la carga JSON esperada y los tests unitarios alcanzan cobertura completa sobre la regla de negocio"].
```

---

## 5. Caso Práctico de Slicing: De Requerimiento Complejo a Tareas Atómicas

A continuación se ilustra la aplicación del método sobre una funcionalidad crítica del dominio inmobiliario y administrativo: el cobro de expensas con recargo automático por mora.

### 5.1 Historia de Usuario Base (Entrada de Alto Nivel)

* **Código:** HU-ADM-21
* **Título:** Registrar cobro de expensas con cálculo automatizado de mora
* **Narrativa:** Como empleado administrativo de cobranzas, quiero registrar el pago de expensas de una unidad funcional para mantener actualizado el estado de cuenta y aplicar de forma transparente el 10% de recargo si el pago se realiza fuera de término (posterior al día 10 del mes).
* **Criterios de Aceptación Principales:**
  1. Si la fecha de registro es menor o igual al día 10, se cobra el monto base liquidado y el estado pasa a "Saldada".
  2. Si la fecha de registro es posterior al día 10, el sistema añade un 10% de recargo sobre el valor base de la expensa.
  3. No se admiten pagos parciales; el monto entregado debe cubrir la totalidad adeudada (base más recargo si corresponde).
  4. El sistema emite un comprobante de pago digital en formato PDF con el desglose correspondiente.

### 5.2 Error de Descomposición Típico (Sobredimensionamiento)

Un agente sin directivas de control suele proponer una única tarea de desarrollo:

* **Tarjeta Propuesta:** *Implementar el módulo completo de cobro de expensas con cálculo de mora, interfaz gráfica y generación de PDF*.
* **Estimación:** **5 SP (o 8 SP)**.
* **Diagnóstico de Falla:** Esta tarea viola la regla de los 3 puntos. Abarca cuatro capas tecnológicas simultáneas, diluye la responsabilidad del código y conduce a respuestas truncadas o código incompleto.

### 5.3 Descomposición Correcta (Slicing Técnico $\le 3\text{ SP}$)

El agente aplica la directiva y divide la funcionalidad en cuatro tareas atómicas coordinadas:

#### Tarjeta 1: Persistencia y Lógica de Cálculo de Mora
* **ID:** CARD-21-01
* **Estimación:** **2 SP**
* **Capa:** Backend / Domain Logic
* **Alcance:** Implementar la lógica pura de validación temporal y cálculo del recargo del 10% según la fecha del sistema, junto con la consulta de saldos pendientes de la unidad funcional.
* **Checklist:**
  - [ ] Implementar función de cálculo de mora comparando fecha de cobro vs. fecha límite (día 10).
  - [ ] Crear consulta transaccional para recuperar la cuota pendiente de la unidad funcional.
  - [ ] Escribir pruebas unitarias parametrizadas verificando pagos en día 10 (sin mora) y día 11 (con 10% de recargo).
* **DoD:** Módulo de cálculo probado con cobertura del 100% de casos borde de fecha.

#### Tarjeta 2: Transacción Atómica de Cobro y Persistencia
* **ID:** CARD-21-02
* **Estimación:** **2 SP**
* **Capa:** Backend / API & Database
* **Alcance:** Exponer el endpoint HTTP POST para asentar el cobro, garantizando la atomicidad entre la actualización del estado de la expensa a "Saldada" y la inserción del registro de recibo.
* **Checklist:**
  - [ ] Crear migración para la tabla de comprobantes de cobro y auditoría.
  - [ ] Implementar endpoint `POST /api/v1/expensas/{id}/cobros` con validación de payload.
  - [ ] Envolver la operación en una transacción de base de datos con mecanismo de rollback ante fallos.
* **DoD:** El endpoint responde 200 OK actualizando la base de datos de forma atómica y rechaza pagos con montos insuficientes con código HTTP 422.

#### Tarjeta 3: Formulario Interactivo de Cobranzas
* **ID:** CARD-21-03
* **Estimación:** **2 SP**
* **Capa:** Frontend / UI
* **Alcance:** Maquetar la interfaz de cobro en pantalla, integrando la consulta en tiempo real de deuda y el desglose visual automático del recargo por mora.
* **Checklist:**
  - [ ] Diseñar formulario de selección de consorcio, unidad funcional y período.
  - [ ] Mostrar indicador visual destacado si la fecha actual aplica recargo del 10%.
  - [ ] Implementar validación en el cliente que impida confirmar montos menores al total adeudado.
* **DoD:** La vista renderiza correctamente los datos traídos de la API y maneja los estados de carga y error visual.

#### Tarjeta 4: Generación de Comprobante PDF y Pruebas E2E
* **ID:** CARD-21-04
* **Estimación:** **2 SP**
* **Capa:** Reporting & QA
* **Alcance:** Construir la plantilla del comprobante oficial de pago en PDF con los datos del consorcio, propietario, desglose de recargo y saldo resultante, junto con las pruebas de integración final.
* **Checklist:**
  - [ ] Diseñar plantilla del recibo de cobro con metadatos requeridos.
  - [ ] Integrar librería de generación documental para descarga inmediata.
  - [ ] Ejecutar prueba de extremo a extremo que valide desde el ingreso del cobro en UI hasta la descarga del PDF.
* **DoD:** El sistema genera y descarga un archivo PDF legible con el resumen de la operación validado de punta a punta.

---

## 6. Justificación Técnica: Por Qué este Enfoque Optimiza el Trabajo con Agentes de IA

La imposición de un límite rígido de 3 Puntos de Historia para las tareas de un agente no es una decisión burocrática, sino un principio de diseño de sistemas basado en las limitaciones operativas de los Modelos de Lenguaje Grande (LLMs):

1. **Prevención de la Degradación de Contexto (Context Drift):** Cuando a un agente se le encomienda una tarea grande (5 SP o más), la cantidad de archivos, contratos de interfaz y detalles de sintaxis que debe mantener en memoria activa satura su ventana de atención. Al restringir las tareas a 3 SP, el modelo opera en su zona de máxima fidelidad cognitiva.
2. **Atomicidad y Reducción del Costo de Re-trabajo:** Si una tarea pequeña de 2 SP presenta un defecto, corregir el código o revertir el commit toma pocos segundos y afecta un área delimitada. Por el contrario, un fallo en una tarea masiva suele exigir reescribir componentes completos e introduce regresiones en partes previamente validadas.
3. **Mantenimiento del Control Humano en la Arquitectura (Human-in-the-Loop):** El punto de detención obligatorio al final de la Fase 1 permite al desarrollador auditar la estrategia técnica del agente antes de que se escriba una sola línea de código. Esto garantiza que la estructura de la base de datos, los nombres de endpoints y las convenciones de diseño se adapten a las pautas del proyecto desde el inicio.
