# Plan de Implementación: Listado de Inmuebles Mock en Sidebar y Pines en Mapa
## Tarjeta: [CARD-MAP-09] | Estimación: 2 SP | Rama: feat/listado-inmuebles-mock-sidebar
### Responsable: Jennifer Goldfeld (@jennifergoldfeld)

---

### 1. Contexto y Justificación
La historia **HU-MAP-09** (*Navegación Geoespacial*) requiere que el asesor de inversiones explore un mapa interactivo junto a una barra lateral con el listado de propiedades. Hoy el frontend es un *Walking Skeleton* (Fase 0): el sidebar tiene filtros deshabilitados y el mapa solo muestra un marcador en el centro de Tres de Febrero. El layout split screen y el centrado en `(-34.6037, -58.5626)` con zoom 13 ya están completados.

El objetivo de esta tarjeta **`[CARD-MAP-09]`** es mostrar **25 inmuebles de prueba** como tarjetas en el sidebar y como pines con popup en el mapa. Todavía no existe el endpoint de inmuebles en el backend (solo `/api/health`), por lo que los datos salen de un mock. Para que la migración a la API real sea trivial, el mock:
- Respeta la forma de `InmuebleConAvisos` del backend (`Inmueble` 1 → N `Avisos`).
- Se consume exclusivamente a través de un servicio y un hook, nunca desde los componentes (regla de `ARCHITECTURE.md`: *"los componentes visuales no hacen fetch directo"*).

Esta tarjeta deja preparados los cimientos de `CARD-MAP-12` (ficha en drawer) y `CARD-MAP-13` (filtros en URL), pero **no** los implementa.

**Fuera de alcance:** clustering de pines (requeriría una dependencia nueva), filtros funcionales (`CARD-MAP-10`), capas de zonificación (`CARD-GEO-08`) y drawer de detalle (`CARD-MAP-12`).

---

### 2. Archivos a Crear y Modificar

```
frontend/
├── package.json                          # MODIFICAR: Agregar dependencia zod (ver sección 6)
└── src/
    ├── schemas/
    │   └── inmueble.schema.ts            # NUEVO: Esquemas Zod y tipos inferidos (Inmueble, Aviso, Foto)
    ├── mocks/
    │   └── mock-inmuebles.json           # NUEVO: 25 propiedades de prueba
    ├── services/
    │   └── inmuebles.service.ts          # NUEVO: fetchInmuebles() -> hoy mock validado, mañana API real
    ├── hooks/
    │   └── useInmuebles.ts               # NUEVO: Estado de carga, error y datos
    ├── constants/
    │   ├── zonas.ts                      # NUEVO: Color y etiqueta por código de zona
    │   └── inmuebles.ts                  # NUEVO: Etiquetas de tipo/operación y color de pin por tipo
    ├── utils/
    │   ├── format.ts                     # NUEVO: Formato de precio, moneda y m²
    │   └── inmueble.ts                   # NUEVO: Aviso principal, avisos adicionales y superficie destacada
    ├── components/
    │   ├── FiltersPanel.tsx              # NUEVO: Bloque de filtros extraído del Sidebar (sin cambios de lógica)
    │   ├── InmuebleCard.tsx              # NUEVO: Tarjeta responsiva del inmueble (+ skeleton de carga)
    │   ├── InmuebleIcono.tsx             # NUEVO: Ícono SVG por tipo de inmueble (placeholder de imagen)
    │   ├── ZonaBadge.tsx                 # NUEVO: Badge accesible de zonificación (compartido por tarjeta y popup)
    │   ├── Sidebar.tsx                   # MODIFICAR: Compone FiltersPanel + listado
    │   └── MapView.tsx                   # MODIFICAR: Reemplaza el marcador de prueba por pines con popup
    └── App.tsx                           # MODIFICAR: Consume useInmuebles y reparte los datos

docs/
└── planes/
    └── sprint-1/
        └── 06-plan-listado-inmuebles-mock-sidebar.md # Este plan
```

---

### 3. Diseño del Contrato de Datos

#### A. Esquema Zod del Frontend (`schemas/inmueble.schema.ts`)
Replica los enums oficiales de `docs/DOMINIOS_Y_DATOS.md` y la forma de `backend/src/schemas/dominio.schema.ts`:
- **`TipoInmueble`:** `'local' | 'galpon' | 'oficina' | 'terreno'`.
- **`TipoOperacion`:** `'venta' | 'alquiler'`.
- **`Moneda`:** `'USD' | 'ARS'`.
- **`ZonaCodigo`:** `C1..C3`, `R1a`, `R1b`, `R2a`, `R2b`, `RMI1..RMI3`, `RC1..RC3`.
- **`Macrozona`:** `DESARROLLO_PRIORITARIO | PROMOCION_HABITAT | PROTECCION_PATRIMONIAL`.
- **`Inmueble`:** `id`, `direccion`, `localidad`, `lat`, `lng`, `superficieTotalM2`, `superficieCubiertaM2`, `tipo`, `zonaCodigo`, `macrozona`, `avisos[]`.
- **`Aviso`:** `id`, `fuente`, `url`, `titulo`, `precio`, `moneda`, `operacion`, `comercializadora`, `contactoTelefono`, `fechaVistoUltimaVez`, `estado`, `fotos[]`.

> **Nota de contrato:** las fechas viajan como **string ISO 8601** (así llegan por HTTP). El `InmuebleSchema` del backend usa `z.date()`, que no valida respuestas JSON; cuando se construya el endpoint real habrá que definir el esquema de respuesta con fechas en string. Los enums quedan duplicados entre paquetes porque no existe un paquete compartido en el stack; el diccionario `DOMINIOS_Y_DATOS.md` es la fuente de verdad.

#### B. Aviso Principal de un Inmueble
Un inmueble puede tener varios avisos. La tarjeta y el popup muestran el **aviso principal**, definido como el aviso `activo` con `fechaVistoUltimaVez` más reciente (si no hay activos, el primero de la lista). La tarjeta y el popup muestran el indicador **"+N avisos"**, donde N es la cantidad de **otros avisos activos** (un aviso en estado `baja` no cuenta, para no sugerir oferta que ya no existe).

#### C. Mock de 25 Propiedades (`mocks/mock-inmuebles.json`)
| Criterio | Distribución |
|---|---|
| **Tipos** | 9 galpones, 8 locales, 5 oficinas, 3 terrenos |
| **Localidades** | Caseros (10), Ciudadela (8), Loma Hermosa (7) |
| **Operación** | Mezcla de venta y alquiler |
| **Moneda** | USD y ARS |
| **Casos especiales** | 2 inmuebles con precio nulo (se muestra "Consultar") y 3 inmuebles con 2 avisos (2 con ambos activos y 1 con un aviso en `baja`) |
| **Zonas** | Variedad de códigos, incluyendo al menos un caso `RC1` (Buen Ayre) |

Reglas de calidad del mock:
- Las coordenadas se toman **dentro de los polígonos reales** de `/data/geojson/` y `zonaCodigo` se calcula con `determinarZonaMunicipal` del backend. Cada propiedad queda coherente con el cruce espacial real.
- Inmobiliarias, teléfonos y URLs son **ficticios**, y el sidebar muestra un aviso permanente de **"Datos de prueba"** para que ningún asesor los confunda con oferta real.

---

### 4. Diseño de Componentes y Capas

```
┌────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS DEL FRONTEND                         │
└────────────────────────────────────────────────────────────────────────┘
  mocks/mock-inmuebles.json
            │
            ▼
  services/inmuebles.service.ts   (valida con Zod; futuro fetch('/api/inmuebles'))
            │
            ▼
  hooks/useInmuebles.ts           (loading / error / data)
            │
            ▼
         App.tsx
       ┌────┴─────┐
       ▼          ▼
   Sidebar      MapView
 (FiltersPanel  (pines + popups)
  + lista de
  InmuebleCard)
```

#### A. `InmuebleCard.tsx`
- Imagen (placeholder SVG por tipo de inmueble, sin depender de servicios externos; se usa la primera foto del aviso principal si existe).
- Precio destacado con moneda (`Intl.NumberFormat('es-AR')`) o "Consultar" si es nulo; etiqueta de operación (Venta / Alquiler).
- Superficie en m² (cubierta, o total en su defecto), dirección y localidad.
- **Badge de zona** con el color del código oficial (colores tomados de las `properties` de los GeoJSON, centralizados en `constants/zonas.ts` para reutilizarse en `CARD-GEO-08`).
- Diseño Tailwind responsivo verificado en los anchos del sidebar (`w-80` = 320 px y `md:w-96` = 384 px).

#### B. `Sidebar.tsx`
- El bloque de filtros deshabilitados se extrae **sin cambios de lógica** a `FiltersPanel.tsx`, para que `CARD-MAP-10` construya sobre él sin conflictos de estructura. Mientras los filtros estén deshabilitados se muestran dentro de un `<details>` **colapsado por defecto** (accesible por teclado, sin JavaScript adicional), para que el listado tenga prioridad visual.
- El listado ocupa el espacio restante con scroll propio y un encabezado con el contador ("25 inmuebles").
- Estados explícitos: **cargando**, **error** (con botón de reintento) y **vacío** ("No se encontraron inmuebles con estos criterios").
- El aviso *Walking Skeleton (Fase 0)* se reemplaza por el aviso de **"Datos de prueba"**.

#### C. `MapView.tsx`
- Se elimina el marcador de prueba del centro.
- Un `Marker` por inmueble, con ícono `L.divIcon` por tipo de inmueble. Los íconos se **crean una sola vez a nivel de módulo**, no en cada render (regla de rendimiento en Leaflet).
- Popup descriptivo: dirección, tipo y operación, precio, m², localidad y badge de zona.

---

### 5. Pruebas y Validación

El frontend no cuenta con framework de tests. La validación combina el build estricto, una revisión manual y un **script descartable fuera del repositorio** (no versionado) que corre contra el mock usando el `geo.service.ts` del backend. Los resultados se reportan en el PR.

| # | Escenario de Prueba | Resultado Esperado |
|---|---------------------|--------------------|
| 1 | **Compilación estricta** (`cd frontend && npm run build`) | Cero errores de TypeScript |
| 2 | **Contrato del mock** | 25/25 inmuebles pasan el esquema Zod |
| 3 | **Ubicación** | 25/25 coordenadas dentro del partido (`estaEnTresDeFebrero`) |
| 4 | **Coherencia de zona** | `zonaCodigo` de cada mock coincide con `determinarZonaMunicipal` |
| 5 | **Render del listado** | Se muestran 25 tarjetas con imagen, precio, m², localidad y badge de zona |
| 6 | **Render del mapa** | Se muestran 25 pines; al hacer clic abren un popup coherente con su tarjeta |
| 7 | **Precio nulo** | La tarjeta y el popup muestran "Consultar" |
| 8 | **Inmueble con 2 avisos** | Muestra el precio del aviso principal y el indicador "+1 aviso" |
| 9 | **Estados del listado** | Se visualizan correctamente los estados cargando, error y vacío |
| 10 | **Responsividad** | La tarjeta se ve bien con el sidebar en 320 px y en 384 px |

---

### 6. Justificación de Dependencias (Regla "Cero Dependencias Fantasma")
Se agrega **una sola dependencia**: `zod@^3.24.2` en `/frontend`.
- **Por qué no alcanza Node/TS nativo:** `AGENTS.md` exige que *todo contrato de entrada/salida (API, Scraper, Variables de Entorno) se valide con Zod*. El mock es el sustituto de la respuesta de la API, por lo que su validación en el borde del servicio es obligatoria. Los tipos de TypeScript por sí solos no validan datos en runtime.
- **Impacto:** misma versión que ya usan `backend` y `scraper`; sin librerías de clustering, UI ni estado adicionales.

---

### 7. Criterios de Aceptación (DoD)

1. Existe `mock-inmuebles.json` con 25 propiedades (locales, galpones, oficinas y terrenos) en Caseros, Ciudadela y Loma Hermosa, validadas con Zod.
2. El sidebar renderiza una tarjeta responsiva por inmueble (imagen, precio destacado, m², localidad y badge de zona).
3. El mapa renderiza un pin interactivo por inmueble con popup descriptivo.
4. Los componentes no hacen `fetch` ni importan el JSON directamente: todo pasa por `inmuebles.service.ts` y `useInmuebles`.
5. Compilación estricta `npm run build` en `/frontend` sin errores de TypeScript, sin `any` ni `@ts-ignore`.
6. Sin `console.log` de depuración, código comentado ni archivos `.env` en el PR (checklist de `CONTRIBUTING.md`).

---

### 8. Riesgos y Coordinación
- **Conflictos con Luis:** `CARD-MAP-10` (filtros) y `CARD-GEO-08` (capas Leaflet) tocan `Sidebar.tsx` y `MapView.tsx`. Conviene avisarle antes de abrir el PR y mergear esta tarjeta primero.
- **Evolución a la API real:** al existir `GET /api/inmuebles`, solo cambia el cuerpo de `fetchInmuebles()`; los componentes no se modifican.
- **Clustering:** HU-MAP-09 menciona agrupar pines en zonas densas. Con 25 pines no hace falta; si se incorpora, se justificará la librería en una tarjeta aparte.

---

### 9. Flujo Git
- **Rama:** `feat/listado-inmuebles-mock-sidebar`, creada desde `dev` (regla de `CONTRIBUTING.md`; `main` está protegida). El plan es su primer commit.
- **Cambios ajenos en el working tree:** `docs/CONTRIBUTING.md` modificado y `.env.example` borrado no pertenecen a esta tarjeta. No se incluyen en sus commits: se agregan siempre archivos específicos, nunca `git add .`.
- **Commits previstos** (español, minúsculas, Conventional Commits; cada uno compila por separado):
  1. `chore(frontend): agregar zod para validar contratos de datos`
  2. `feat(frontend): definir esquema de inmueble y mock de 25 propiedades`
  3. `feat(frontend): agregar servicio, hook, constantes y utilidades de inmuebles`
  4. `feat(frontend): crear tarjeta de inmueble, badge de zona y panel de filtros`
  5. `feat(frontend): renderizar listado en sidebar y pines con popup en el mapa`
- **Regla estricta:** no se realizan commits ni pushes remotos hasta que el plan sea aprobado y el código esté probado. El PR apunta a `dev`.
