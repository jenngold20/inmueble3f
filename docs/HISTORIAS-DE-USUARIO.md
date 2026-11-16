# Especificación Funcional: Historias de Usuario del Sistema
## Plataforma de Oferta Inmobiliaria de Tres de Febrero (Inmuebles 3F)

Este documento formaliza el conjunto integral de **Historias de Usuario (HU)** para la plataforma web de la **Dirección de Inversiones de la Municipalidad de Tres de Febrero**. Cada historia se rige bajo el marco metodológico definido en [`docs/HISTORIAS-DE-USUARIO-ESTIMACION.md`](file:///c:/Users/Tecno3F/apps/inmuebles-3f/docs/HISTORIAS-DE-USUARIO-ESTIMACION.md):
- Estructura **INVEST** (Independent, Negotiable, Valuable, Estimable, Small, Testable).
- Modelo de las **Tres C** (Card, Conversation, Confirmation).
- Narrativa **Connextra** (*Como... Quiero... Para...*).
- Criterios de Aceptación ejecutables en sintaxis **Gherkin (BDD)** (*Dado... Cuando... Entonces...*).
- Estimación de esfuerzo relativo en la escala modificada de **Fibonacci** ($1, 2, 3, 5, 8, 13\text{ SP}$).

---

## 🗺️ Mapa de Épicas del Backlog

```
┌────────────────────────────────────────────────────────────────────────┐
│               PLATAFORMA INMOBILIARIA TRES DE FEBRERO                  │
└────────────────────────────────────────────────────────────────────────┘
     │
     ├─► ÉPICA 1: Ingesta Multicanal, Normalización y Deduplicación
     │    ├─ HU-ING-01: Extracción Automatizada Diaria de Portales (Scraper) [5 SP]
     │    ├─ HU-ING-02: Geocodificación y Normalización de Direcciones (Georef) [3 SP]
     │    ├─ HU-ING-03: Deduplicación Heurística de Inmuebles en Parcela Única [5 SP]
     │    ├─ HU-ING-04: Carga Manual y Carga Masiva por Planillas (Brokers) [3 SP]
     │    └─ HU-ING-05: Ingesta de Bajas de Habilitaciones Comerciales (Alerta Temprana) [3 SP]
     │
     ├─► ÉPICA 2: Cruce Espacial y Zonificación Municipal (GIS & Turf.js)
     │    ├─ HU-GEO-06: Determinación Automatizada de Zona por Coordenadas [3 SP]
     │    ├─ HU-GEO-07: Delimitación de Sectores Camino del Buen Ayre (RC1, RC2, RC3) [3 SP]
     │    └─ HU-GEO-08: Visualización de Capas de Zonificación en Mapa Leaflet [3 SP]
     │
     ├─► ÉPICA 3: Búsqueda, Filtrado y Visualización en Mapa (Frontend / UX)
     │    ├─ HU-MAP-09: Navegación Geoespacial y Clúster de Inmuebles [3 SP]
     │    ├─ HU-MAP-10: Filtrado Dinámico Multicriterio de la Oferta [3 SP]
     │    ├─ HU-MAP-11: Filtro Inteligente de Aptitud por Rubro Empresarial [5 SP]
     │    ├─ HU-MAP-12: Ficha Técnica Detallada y Datos de Comercialización [2 SP]
     │    └─ HU-MAP-13: Persistencia de Filtros y Búsquedas en URL (Deep Linking) [2 SP]
     │
     └─► ÉPICA 4: Inteligencia de Demanda, Métricas y Monitoreo
          ├─ HU-MTR-14: Registro de Consultas y Búsquedas de Empresas [3 SP]
          ├─ HU-MTR-15: Tablero de Demanda Insatisfecha para Política de Suelo [5 SP]
          └─ HU-MTR-16: Semáforo de Salud y Monitoreo de Scrapers (Anti Silent-Fail) [3 SP]
```

---

## 👥 Actores y Roles del Dominio
- **Asesor de Inversiones:** Funcionario o agente de la Dirección de Inversiones que atiende consultas de empresas interesadas en radicarse o expandirse en Tres de Febrero.
- **Coordinador / Director de Inversiones:** Administrador del área que analiza estadísticas de demanda, detecta vacancias industriales y orienta políticas públicas de suelo y parques industriales.
- **Operador de Datos:** Personal municipal encargado de cargar expedientes de bajas de habilitación comercial o importar planillas provistas por cámaras inmobiliarias.
- **Sistema Automatizado (Cron / Scraper):** Servicio desatendido en background que recolecta, limpia, geocodifica y vincula datos de fuentes externas.

---

# 📦 ÉPICA 1: Ingesta Multicanal, Normalización y Deduplicación

---

### 📋 HU-ING-01: Extracción Automatizada Diaria de Portales Inmobiliarios
* **Código:** `HU-ING-01`
* **Épica:** Ingesta Multicanal
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **5 SP** *(Requiere slicing a nivel de tareas técnicas $\le 3\text{ SP}$)*

#### Narrativa:
> **Como** Sistema Automatizado de Ingesta,  
> **Quiero** recolectar a diario las publicaciones inmobiliarias activas de Tres de Febrero desde portales públicos (comenzando por Argenprop),  
> **Para** disponer de la mayor oferta comercial e industrial actualizada sin requerir carga manual de los agentes municipales.

#### Contexto y Reglas de Dominio:
- **Offline-First:** Se deben testear primero fixtures estáticos en `/data/html-fixtures/`.
- **Estructura Embebida:** Inspeccionar antes que nada scripts inyectados (`__NEXT_DATA__` o `application/ld+json`) para evitar parseos CSS frágiles.
- **Esquema Zod:** La salida debe ajustarse obligatoriamente a `AvisoCrudoSchema` con los enums oficiales (`TipoInmueble`: `local | galpon | oficina | terreno`, `TipoOperacion`: `venta | alquiler`, `Moneda`: `USD | ARS`).
- **Trazabilidad:** Cada corrida debe registrar métricas en la tabla `CorridasScraper` (avisos leídos, nuevos, actualizados, errores).

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Extracción exitosa de avisos con payload JSON embebido
  Dado que el scraper procesa un listado de Argenprop con avisos en Tres de Febrero
  Cuando el parser detecta un bloque <script id="__NEXT_DATA__"> válido
  Entonces extrae los campos requeridos (título, precio, moneda, superficie, dirección, URL y anunciante)
  Y valida cada objeto contra el esquema Zod AvisoCrudoSchema sin errores de tipado.

Escenario: Mapeo de términos a la taxonomía normalizada de 3F
  Dado un aviso clasificado en el portal como "depósito industrial" o "nave logística"
  Cuando el pipeline normaliza el campo tipo
  Entonces el inmueble es categorizado con el enum estricto "galpon".

Escenario: Falla estructural del portal y prevención de falla silenciosa
  Dado que el portal de origen cambió su maquetado y no contiene los selectores ni el script JSON esperado
  Cuando el scraper ejecuta la corrida diaria
  Entonces registra una corrida fallida en la tabla CorridasScraper con el detalle del error
  Y emite una alerta al semáforo de monitoreo sin corromper los registros previos en base de datos.
```

---

### 📋 HU-ING-02: Geocodificación y Normalización de Direcciones
* **Código:** `HU-ING-02`
* **Épica:** Ingesta Multicanal
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Sistema de Normalización de Datos,  
> **Quiero** obtener coordenadas precisas `(latitud, longitud)` y estandarizar la dirección de cada aviso mediante la API oficial de Georef cuando el portal no informe coordenadas,  
> **Para** poder situar geográficamente el inmueble en el mapa del partido y cruzarlo con la zonificación municipal.

#### Contexto y Reglas de Dominio:
- Fallback a API pública Georef (`https://apis.datos.gob.ar/georef/api/direcciones`).
- Filtros fijos requeridos: `provincia=Buenos Aires` y `departamento=Tres de Febrero`.
- Si las coordenadas ya vienen en el aviso del portal, se validan contra el bounding box de Tres de Febrero (aprox. `lat: [-34.64, -34.56]`, `lng: [-58.62, -58.53]`).

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Geocodificación de aviso sin coordenadas nativas
  Dado un aviso scrapeado con dirección "Av. San Martín 2500, Caseros" sin coordenadas geográficas
  Cuando el servicio consulta la API de Georef filtrando por departamento Tres de Febrero
  Entonces obtiene latitud y longitud oficiales con nivel de precisión a nivel de altura
  Y asigna la dirección normalizada al registro del aviso.

Escenario: Dirección ambigua o fuera del municipio
  Dado un aviso cuya dirección no puede ser localizada fehacientemente en Tres de Febrero por Georef
  Cuando finaliza el intento de geocodificación
  Entonces el registro se marca con estado "requiere_revision_geografica"
  Y no se proyecta en el mapa hasta que sea subsanado por un operador.
```

---

### 📋 HU-ING-03: Deduplicación Heurística de Inmuebles en Parcela Única
* **Código:** `HU-ING-03`
* **Épica:** Ingesta Multicanal
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **5 SP** *(Requiere slicing a nivel de tareas técnicas $\le 3\text{ SP}$)*

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** que el sistema unifique automáticamente los avisos de distintas inmobiliarias que hacen referencia a la misma propiedad física real,  
> **Para** visualizar un único punto en el mapa por parcela y tener un histórico consolidado de sus comercializadoras y precios.

#### Contexto y Reglas de Dominio:
- Separación estricta de entidades: un `Inmueble` (propiedad física en parcela) tiene asociados uno o más `Avisos` (publicaciones comerciales).
- **Heurística de Deduplicación (4 condiciones simultáneas):**
  1. Mismo `tipo` de propiedad (`galpon`, `local`, `oficina`, `terreno`).
  2. Misma `localidad` normalizada.
  3. Superficie total o cubierta con tolerancia de $\pm 5\%$.
  4. Distancia geodésica $\le 80\text{ metros}$ calculada con `@turf/distance`.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Vinculación exitosa de aviso duplicado a inmueble existente
  Dado un inmueble existente en base de datos de tipo "galpon" en "Caseros" de 1000 m²
  Cuando ingresa un nuevo aviso de otra inmobiliaria de tipo "galpon", en "Caseros", de 1020 m² (+2%) a 35 metros de distancia
  Entonces el sistema vincula el aviso al Inmueble preexistente
  Y actualiza la fecha de visto por última vez sin crear una nueva entidad Inmueble.

Escenario: Creación de nuevo inmueble por superar tolerancia de superficie
  Dado un inmueble existente de tipo "local" en "Ciudadela" de 200 m²
  Cuando ingresa un aviso en las mismas coordenadas de tipo "local" pero con 300 m² (+50% de superficie)
  Entonces el sistema determina que no corresponden a la misma unidad funcional
  Y genera un nuevo registro independiente en la tabla Inmueble.
```

---

### 📋 HU-ING-04: Carga Manual y Carga Masiva por Planillas (Brokers)
* **Código:** `HU-ING-04`
* **Épica:** Ingesta Multicanal
* **Prioridad:** Media (Sprint 2)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Operador de Datos Municipal,  
> **Quiero** cargar inmuebles individuales mediante un formulario o importar carteras enteras desde archivos Excel/CSV,  
> **Para** incorporar inmuebles ociosos de grandes empresas, depósitos no publicados en portales o convenios con cámaras inmobiliarias.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Carga manual individual exitosa
  Dado que el operador completa el formulario con tipo, superficie, dirección, precio y datos del titular
  Cuando envía el formulario con datos válidos
  Entonces el sistema geocodifica la dirección, aplica la deduplicación y persiste el inmueble con fuente "manual_municipal".

Escenario: Importación masiva con reporte de inconsistencias
  Dado un archivo Excel con 50 inmuebles provisto por un broker
  Cuando el operador ejecuta la importación masiva
  Entonces el backend procesa las filas, importa los registros válidos
  Y devuelve un resumen descargable con la cantidad de altas y el listado de filas que fallaron por datos incompletos.
```

---

### 📋 HU-ING-05: Ingesta de Bajas de Habilitaciones Comerciales (Alerta Temprana)
* **Código:** `HU-ING-05`
* **Épica:** Ingesta Multicanal
* **Prioridad:** Media (Sprint 2)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** registrar los locales comerciales que tramitan su baja definitiva en la Dirección de Habilitaciones,  
> **Para** detectar inmuebles vacantes meses antes de que salgan a la venta o alquiler en los portales públicos.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Registro de baja comercial como oportunidad inmobiliaria
  Dado un trámite de baja comercial con número de cuenta municipal, dirección y metros cuadrados habilitados
  Cuando el operador registra el cese en la plataforma
  Entonces el sistema crea un Inmueble con etiqueta "Oportunidad Vacante (Baja Comercial)"
  Y lo destaca en el mapa para que el equipo pueda contactar al propietario antes de su publicación general.
```

---

# 🌍 ÉPICA 2: Cruce Espacial y Zonificación Municipal (GIS & Turf.js)

---

### 📋 HU-GEO-06: Determinación Automatizada de Zona por Coordenadas
* **Código:** `HU-GEO-06`
* **Épica:** Cruce Espacial
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Sistema de Zonificación,  
> **Quiero** evaluar la posición geográfica `(lat, lng)` de cada inmueble contra los polígonos vectoriales oficiales en memoria usando Turf.js,  
> **Para** clasificar automáticamente el código de zona urbanística de la propiedad sin requerir extensiones espaciales pesadas en base de datos.

#### Contexto y Reglas de Dominio:
- **Restricción dura:** Prohibido PostGIS. Se resuelve en Node.js con `@turf/boolean-point-in-polygon`.
- **Zonas contempladas:**
  - Comerciales: `C1`, `C2`, `C3`.
  - Mixto Industrial: `RMI1`, `RMI2`, `RMI3`.
  - Residenciales: `R1a`, `R1b`, `R2a`, `R2b`.
  - Macrozonas: `Desarrollo Prioritario`, `Promoción del Hábitat`, `Protección Patrimonial`.
- Las capas GeoJSON se cargan en memoria en el arranque del servidor para máxima velocidad.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Inmueble situado en zona Mixto Industrial
  Dado un inmueble con coordenadas en el barrio industrial de Caseros
  Cuando el servicio ejecuta booleanPointInPolygon contra las capas cargadas
  Entonces el inmueble es etiquetado con el código "RMI2"
  Y se asigna a la macrozona correspondiente.

Escenario: Inmueble sobre límite o fuera del ejido municipal
  Dado un inmueble con coordenadas que caen fuera de los límites de Tres de Febrero
  Cuando se evalúa contra los polígonos del partido
  Entonces el sistema marca el registro como "fuera_de_ejido" y no le asigna código de zonificación municipal.
```

---

### 📋 HU-GEO-07: Delimitación de Sectores Camino del Buen Ayre (RC1, RC2, RC3)
* **Código:** `HU-GEO-07`
* **Épica:** Cruce Espacial
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** que el sistema identifique si una propiedad se ubica dentro de los sectores `RC1`, `RC2` o `RC3` del Plan Buen Ayre 2024 (U.F. 12),  
> **Para** asesorar con prioridad a empresas de logística pesada y grandes centros de distribución que buscan radicarse junto a la autopista.

#### Contexto y Reglas de Dominio:
- Delimitación oficial de la Ordenanza U.F. 12:
  - `RC 1`: Entre Arroyo Morón, Las Flores (918), Miramar (979), Autopista Buen Ayre, Río Reconquista y Pte. Perón.
  - `RC 2`: Entre Juan Lavalle (900), Buen Ayre, Arroyo Morón y Río Reconquista.
  - `RC 3`: Delimitado por Las Flores, Rosella, Ruta Nacional N° 8 (Av. Eva Perón), Entre Ríos, Pte. Perón.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Detección de inmueble en el polo logístico Buen Ayre
  Dado un galpón ubicado sobre Av. Presidente Perón y Arroyo Morón
  Cuando el cruce espacial evalúa el polígono del sector RC1
  Entonces la propiedad es marcada con zonificación "RC1 (Buen Ayre)"
  Y se destaca con la insignia de "Apto Gran Logística".
```

---

### 📋 HU-GEO-08: Visualización de Capas de Zonificación en Mapa Leaflet
* **Código:** `HU-GEO-08`
* **Épica:** Cruce Espacial
* **Prioridad:** Media (Sprint 1 / Sprint 2)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** activar y desactivar capas visuales de zonificación coloreadas sobre el mapa de Leaflet,  
> **Para** mostrarle visualmente a la empresa consultante cómo se distribuyen las zonas industriales y comerciales respecto de las calles principales y accesos pesados.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Encendido de la capa Mixto Industrial (RMI)
  Dado que el asesor tiene el mapa abierto en Tres de Febrero
  Cuando hace clic en el control de capas y activa "Zonas Industriales (RMI)"
  Entonces se dibujan los polígonos RMI con color distintivo semitransparente (opacidad 0.35)
  Y los pines de inmuebles permanecen visibles y clickeables sobre la capa.
```

---

# 🖥️ ÉPICA 3: Búsqueda, Filtrado y Visualización en Mapa (Frontend / UX)

---

### 📋 HU-MAP-09: Navegación Geoespacial y Clúster de Inmuebles
* **Código:** `HU-MAP-09`
* **Épica:** Búsqueda y Visualización
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** explorar un mapa interactivo dividido con barra lateral que agrupe marcadores cuando haya alta densidad de propiedades,  
> **Para** navegar fluidamente el territorio municipal sin saturación visual y hacer foco rápido en cualquier barrio.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Carga inicial del mapa centrado en el distrito
  Dado que el usuario accede a la plataforma web
  Cuando finaliza la carga de la vista principal
  Entonces el mapa de React-Leaflet se centra exactamente en las coordenadas oficiales de Tres de Febrero (-34.6037, -58.5626) con zoom 13.

Escenario: Agrupamiento de pines en zonas de alta densidad
  Dado un área de Caseros Centro con más de 25 inmuebles disponibles
  Cuando el usuario se encuentra en un nivel de zoom general (zoom 12 o 13)
  Entonces los marcadores se agrupan en un clúster numérico que al hacer clic hace zoom automático sobre las parcelas individuales.
```

---

### 📋 HU-MAP-10: Filtrado Dinámico Multicriterio de la Oferta
* **Código:** `HU-MAP-10`
* **Épica:** Búsqueda y Visualización
* **Prioridad:** Alta (MVP - Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** filtrar instantáneamente los inmuebles por tipo, operación, superficie mínima/máxima, localidad y rango de precios,  
> **Para** responder en minutos una consulta de una empresa que requiere especificaciones físicas concretas (ej. "galpón en alquiler de más de 800 m²").

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Filtrado combinado de galpones industriales en alquiler
  Dado un listado general de 500 inmuebles en base de datos
  Cuando el asesor selecciona tipo "Galpón", operación "Alquiler" y superficie mínima "800 m²"
  Entonces el mapa y el panel lateral actualizan sus resultados en menos de 300 ms
  Y quedan visibles únicamente los inmuebles que cumplen simultáneamente todas las condiciones.

Escenario: Búsqueda sin resultados compatibles
  Dado que el asesor ingresa filtros con un criterio inexistente (ej. Local en venta de 10.000 m²)
  Cuando se aplica el filtro
  Entonces el mapa limpia los pines, el panel lateral muestra el mensaje "No se encontraron inmuebles con estos criterios"
  Y ofrece un botón para restablecer los filtros.
```

---

### 📋 HU-MAP-11: Filtro Inteligente de Aptitud por Rubro Empresarial
* **Código:** `HU-MAP-11`
* **Épica:** Búsqueda y Visualización
* **Prioridad:** Alta (Sprint 2)
* **Estimación:** **5 SP** *(Requiere slicing a nivel de tareas técnicas $\le 3\text{ SP}$)*

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** seleccionar el rubro productivo de la empresa interesada (ej. metalúrgica, logística, taller, alimentos, comercio minorista) para que el sistema resalte únicamente las propiedades en zonas habilitables,  
> **Para** garantizar que nunca se recomiende un inmueble en una zona con prohibición de radicación según la normativa municipal.

#### Contexto y Reglas de Dominio:
- La matriz de rubros vincula cada actividad económica con los códigos permitidos (`Permitido`, `Condicionado`, `Prohibido`).
- Si una empresa es del rubro *"Industria pesada / Logística masiva"*, el sistema solo destaca inmuebles en `RMI3`, `RC1`, `RC2` y `RC3`.
- Las zonas residenciales (`R1`, `R2`) quedan deshabilitadas o señalizadas con advertencia de incompatibilidad de habilitación.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Filtrado por rubro industrial pesado
  Dado que el asesor selecciona el rubro "Logística y Transporte Pesado"
  Cuando se activa el filtro inteligente
  Entonces el mapa atenúa las zonas comerciales y residenciales
  Y resalta los galpones y terrenos situados exclusivamente en corredores aptos (RMI y Buen Ayre).

Escenario: Advertencia de actividad condicionada
  Dado un inmueble situado en zona C2 y una consulta para rubro "Depósito de distribución"
  Cuando el asesor inspecciona la ficha de la propiedad
  Entonces el sistema muestra una advertencia amarilla: "Habilitación Condicionada a Factor de Ocupación e Impacto Vial".
```

---

### 📋 HU-MAP-12: Ficha Técnica Detallada y Datos de Comercialización
* **Código:** `HU-MAP-12`
* **Épica:** Búsqueda y Visualización
* **Prioridad:** Media (Sprint 1)
* **Estimación:** **2 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** abrir una ficha lateral completa al seleccionar un inmueble en el mapa,  
> **Para** conocer la superficie total y cubierta, precio, estado de la habilitación, fotos y los datos de contacto de la inmobiliaria o dueño directo para comunicárselos al inversor.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Apertura de ficha de propiedad
  Dado que el asesor hace clic sobre un pin en el mapa o sobre una tarjeta del panel lateral
  Cuando se despliega la ficha técnica
  Entonces se muestran: galería de imágenes, superficie (m² total y cubierta), valor y moneda, código de zonificación oficial con su descripción, y datos de la comercializadora (nombre, teléfono, enlace al aviso original).
```

---

### 📋 HU-MAP-13: Persistencia de Filtros y Búsquedas en URL (Deep Linking)
* **Código:** `HU-MAP-13`
* **Épica:** Búsqueda y Visualización
* **Prioridad:** Media (Sprint 1)
* **Estimación:** **2 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** que todos los filtros activos se sincronicen en los parámetros de la URL (`searchParams`),  
> **Para** copiar el enlace del navegador y enviárselo por correo o chat a un colega o al inversor y que vea exactamente el mismo mapa y propiedades filtradas.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Compartir link con filtros aplicados
  Dado que el asesor filtró "tipo=galpon&operacion=alquiler&localidad=caseros&minM2=500"
  Cuando copia la URL del navegador y se abre en una nueva pestaña o sesión
  Entonces la aplicación inicializa con esos mismos filtros seleccionados y el mapa centrado en los resultados correspondientes.
```

---

# 📊 ÉPICA 4: Inteligencia de Demanda, Métricas y Monitoreo

---

### 📋 HU-MTR-14: Registro de Consultas y Búsquedas de Empresas
* **Código:** `HU-MTR-14`
* **Épica:** Inteligencia y Métricas
* **Prioridad:** Media (Sprint 2)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Asesor de Inversiones,  
> **Quiero** registrar con un clic cada consulta atendida guardando el rubro de la empresa, los requerimientos solicitados y si se encontraron opciones viables,  
> **Para** alimentar el registro histórico de demanda comercial e industrial del distrito.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Registro de consulta atendida
  Dado que el asesor completó una búsqueda de inmuebles para la empresa "Logística Norte"
  Cuando hace clic en "Registrar Consulta" e ingresa el nombre de la firma y contacto
  Entonces el sistema guarda en la tabla Consultas la fecha, rubro, metros solicitados, zona de interés y los inmuebles recomendados.
```

---

### 📋 HU-MTR-15: Tablero de Demanda Insatisfecha para Política de Suelo
* **Código:** `HU-MTR-15`
* **Épica:** Inteligencia y Métricas
* **Prioridad:** Baja (Fase 2 / Posterior a MVP)
* **Estimación:** **5 SP** *(Requiere slicing a nivel de tareas técnicas $\le 3\text{ SP}$)*

#### Narrativa:
> **Como** Director de Inversiones,  
> **Quiero** consultar un panel de estadísticas con las búsquedas que arrojaron cero resultados en el partido,  
> **Para** saber qué tipologías o dimensiones de galpones busca el mercado y no se consiguen, utilizándolo como insumo estratégico para la planificación de Parques Industriales.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Identificación de brecha de oferta en grandes superficies
  Dado un período mensual con 15 búsquedas de galpones de más de 3000 m² en Ciudadela que finalizaron sin resultados
  Cuando el Director consulta el reporte de demanda insatisfecha
  Entonces el tablero grafica la brecha indicando "Rubro: Logística - Superficie: >3000 m² - Localidad: Ciudadela - 15 búsquedas no resueltas".
```

---

### 📋 HU-MTR-16: Semáforo de Salud y Monitoreo de Scrapers (Anti Silent-Fail)
* **Código:** `HU-MTR-16`
* **Épica:** Inteligencia y Métricas
* **Prioridad:** Alta (Sprint 1)
* **Estimación:** **3 SP**

#### Narrativa:
> **Como** Administrador del Sistema,  
> **Quiero** que la plataforma disponga de un semáforo de monitoreo diario del estado de cada fuente de datos,  
> **Para** detectar de inmediato si un portal cambió su estructura y dejó de actualizarse, evitando que los asesores tomen decisiones sobre datos viejos.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Alerta de fuente desactualizada (Semáforo Amarillo/Rojo)
  Dado que el scraper de un portal inmobiliario no registra nuevas publicaciones hace más de 48 horas o arrojó error de parseo
  Cuando el usuario ingresa al panel de control o barra de estado
  Entonces el semáforo muestra la fuente en rojo con el mensaje "Argenprop: 48 hs sin actualización - Posible cambio de diseño".

Escenario: Fuente en estado saludable (Semáforo Verde)
  Dado que la corrida de hoy procesó exitosamente los avisos de la fuente
  Cuando se consulta el estado
  Entonces el indicador figura en verde mostrando "Actualizado hoy a las 06:00 hs - 1.540 avisos activos".
```

---

## 📈 Matriz de Estimación y Planificación por Sprints

### 🎯 Plazo y Objetivo de Entrega: Sprint 1 (1 de Diciembre de 2026)
Con un marco temporal de **15 días** (16 de noviembre al 1 de diciembre de 2026), el **Sprint 1** se enfoca exclusivamente en entregar un **MVP funcional de punta a punta (Walking Skeleton consolidado a producto demostrable)**:
1. Base de datos con modelos de dominio (`Inmueble`, `Publicacion`, `Zona`, `Foto`) y contratos Zod.
2. Ingesta de avisos reales mediante parser offline/online de Argenprop.
3. Cruce geoespacial con Turf.js para asignación automática de zonificación (C1..C3, RMI 1..3, Buen Ayre).
4. Interfaz interactiva en React-Leaflet con filtros básicos por superficie, precio, operación y visualización de polígonos.
5. Semáforo de salud de base de datos y fuentes de datos.

Siguiendo la directiva de no superar **3 SP por tarea técnica atómica**, las historias estimadas originalmente en **5 SP** han sido divididas (*slicing*) en tarjetas técnicas de 1, 2 o 3 SP en Trello, distribuidas entre el equipo bajo una **proporción de capacidad 5 : 3 : 2** (Leonardo 50%, Luis 30%, Jenni 20%), asegurando que las **tareas iniciales bloqueantes** sean ejecutadas por Leonardo para desbloquear al equipo:

| Código HU | Título de la Historia de Usuario | Épica | SP Orig. | Slicing Técnico (Tarjetas Trello $\le 3\text{ SP}$) | Responsable Asignado | Sprint |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **HU-BD-01** | Modelos y Contratos de Dominio | DB | **3 SP** | `[CARD-BD-01]` Modelos Sequelize y Contratos Zod [3 SP] | **Leonardo (Bloqueante)** | Sprint 1 (1 Dic) |
| **HU-GEO-07** | Delimitación de Sectores y Capas GIS | GIS | **3 SP** | `[CARD-GEO-07]` Captura y Digitalización GeoJSON [2 SP] | **Leonardo (Bloqueante)** | Sprint 1 (1 Dic) |
| **HU-ING-01** | Extracción Diaria (Scraper Argenprop) | Ingesta | **5 SP** | `[CARD-ING-01A]` Parser Cheerio sobre Fixtures [3 SP]<br>`[CARD-ING-01B]` Ingesta Zod y CorridasScraper [2 SP] | **Leonardo (Bloqueante)**<br>**Luis** | Sprint 1 (1 Dic) |
| **HU-GEO-06** | Determinación de Zona por Coordenadas | GIS | **3 SP** | `[CARD-GEO-06]` Cruce Espacial con Turf.js [3 SP] | **Leonardo (Bloqueante)** | Sprint 1 (1 Dic) |
| **HU-ING-03** | Deduplicación Heurística en Parcela Única | Ingesta | **5 SP** | `[CARD-ING-03A]` Deduplicación Espacial Turf.js [3 SP]<br>`[CARD-ING-03B]` Persistencia Relacional 1 a N [2 SP] | **Leonardo (Bloqueante)**<br>**Luis** | Sprint 1 (1 Dic) |
| **HU-GEO-08** | Capas de Zonificación en Leaflet | GIS | **3 SP** | `[CARD-GEO-08]` Renderizado Capas Leaflet [2 SP] | **Luis** | Sprint 1 (1 Dic) |
| **HU-MAP-09** | Navegación en Mapa de Tres de Febrero | Frontend | **3 SP** | `[CARD-MAP-09]` Listado Inmuebles Mock Sidebar [2 SP] | **Jenni** | Sprint 1 (1 Dic) |
| **HU-MAP-10** | Filtrado Dinámico Multicriterio | Frontend | **3 SP** | `[CARD-MAP-10]` Panel Filtros Multicriterio React [3 SP] | **Luis** | Sprint 1 (1 Dic) |
| **HU-MAP-12** | Ficha Técnica Detallada | Frontend | **2 SP** | `[CARD-MAP-12]` Ficha Detallada en Drawer [2 SP] | **Jenni** | Sprint 1 (1 Dic) |
| **HU-MAP-13** | Sincronización en URL (Deep Linking) | Frontend | **2 SP** | `[CARD-MAP-13]` Sincronización Filtros en URL [2 SP] | **Jenni** | Sprint 1 (1 Dic) |
| **HU-MTR-16** | Semáforo de Salud y Monitoreo | Monitoreo | **3 SP** | `[CARD-MTR-16]` Semáforo Salud Scrapers [2 SP] | **Leonardo** | Sprint 1 (1 Dic) |
| **DOC-01/02** | Documentación y Presentación Demo | Gestión | **2 SP** | `[CARD-DOC-01]` Arquitectura, DER y APIs [1 SP]<br>`[CARD-DOC-02]` Guía y Demo para Dirección [1 SP] | **Leonardo**<br>**Luis** | Sprint 1 (1 Dic) |
| **HU-ING-04** | Carga Manual y Carga Masiva por Planillas | Ingesta | **3 SP** | Post 1 de Diciembre | A definir | Sprint 2 |
| **HU-ING-05** | Ingesta de Bajas de Habilitaciones | Ingesta | **3 SP** | Post 1 de Diciembre | A definir | Sprint 2 |
| **HU-MAP-11** | Filtro Inteligente de Aptitud por Rubro | Frontend | **5 SP** | Post 1 de Diciembre (Requiere Matriz) | A definir | Sprint 2 |
| **HU-MTR-14** | Registro de Consultas y Búsquedas | Métricas | **3 SP** | Post 1 de Diciembre | A definir | Sprint 2 |
| **HU-MTR-15** | Tablero de Demanda Insatisfecha | Métricas | **5 SP** | Post 1 de Diciembre | A definir | Sprint 3 / V2.0 |

### 👥 Resumen de Capacidad del Equipo (Sprint 1)
- **Leonardo Murano (50% - 5 de 10):** 7 tarjetas, 17 SP. Asume las 5 tareas iniciales bloqueantes (`CARD-BD-01`, `CARD-GEO-07`, `CARD-ING-01A`, `CARD-GEO-06`, `CARD-ING-03A`), más monitoreo (`CARD-MTR-16`) y documentación DER (`CARD-DOC-01`).
- **Luis M (30% - 3 de 10):** 5 tarjetas, 10 SP. Asume persistencia de ingesta (`CARD-ING-01B`), relaciones 1 a N (`CARD-ING-03B`), capas Leaflet (`CARD-GEO-08`), lógica de filtros (`CARD-MAP-10`) y demo municipal (`CARD-DOC-02`).
- **Jennifer Goldfeld (20% - 2 de 10):** 3 tarjetas, 6 SP. Asume diseño UI de tarjetas mock (`CARD-MAP-09`), modal drawer de propiedad (`CARD-MAP-12`) y sincronización deep linking en URL (`CARD-MAP-13`).

---

## 📌 Alcance de la Versión 1.0 (MVP) vs Versión 2.0 (Evolutivo)

### 🚀 ¿Qué es la Versión 1.0 (MVP Integral)?
Las **16 Historias de Usuario documentadas constituyen en su totalidad la Versión 1.0 (MVP Completo)** de la plataforma. Cubren los 4 pilares esenciales requeridos por la Dirección de Inversiones:
1. **Pilar Ingesta:** Captura automatizada (Argenprop), normalización, geocodificación, deduplicación y carga complementaria por planillas / bajas comerciales.
2. **Pilar Territorial (GIS):** Georreferenciación precisa, cruce con Zonificación 2020 y Camino del Buen Ayre.
3. **Pilar Experiencia (UX):** Visualización interactiva en mapa, listado sincronizado, filtros multicriterio, filtro por rubro y fichas de comercialización.
4. **Pilar Inteligencia & Monitoreo:** Registro de consultas empresariales, tablero de demanda insatisfecha y semáforo anti silencios.

### 🔮 ¿Qué queda reservado para la Versión 2.0 (Fase Evolutiva)?
Para no comprometer los tiempos ni complejizar innecesariamente la primera versión, quedan formalmente fuera de la V1.0 e identificados para una **Versión 2.0**:
- **Scraping Multicanal Adicional:** Soporte para portales secundarios o complejos con protecciones avanzadas (Zonaprop, MercadoLibre Inmuebles, Properati).
- **Integración Catastral Oficial:** Cruce con número de partida inmobiliaria ARBA y titularidad registral.
- **Sistema de Autenticación y Perfiles (RBAC):** Login con roles diferenciados (Asesor, Director, Inmobiliaria Externa, Administrador).
- **Notificaciones Automáticas a Inversores:** Envío automático de alertas por Email / WhatsApp ante el ingreso de nuevas parcelas que coincidan con demandas insatisfechas registradas.
- **Integración por Webhook / API con el Sistema Municipal de Habilitaciones:** Ingesta desatendida en tiempo real cuando un inspector firma la baja de una habilitación en el palacio municipal.  

