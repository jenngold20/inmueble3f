# Plan de Implementación: Cruce Espacial con Turf.js y Fallback Georef
## Tarjeta: [CARD-GEO-06] | Estimación: 3 SP | Rama: feat/cruce-espacial-turf
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación
La plataforma inmobiliaria de Tres de Febrero tiene dos desafíos geoespaciales críticos:
1. **Determinación Normativa Automática:** Asignar a cada inmueble su código de zonificación municipal (`C1`..`C3`, `RMI1`..`RMI3`, etc.) y verificar si califica en el polo logístico del Plan Buen Ayre 2024 (`RC1`..`RC3`, apto gran logística). Siguiendo las directivas estrictas de `AGENTS.md` y `ADR-003`, esto se resuelve **100% en memoria en la capa de aplicación con Turf.js**, sin recurrir a PostGIS.
2. **Direcciones sin Coordenadas:** Muchos avisos inmobiliarios (en particular de Argenprop, Zonaprop o cargas manuales) contienen solo calle y altura (`"Av. San Martín 2100, Caseros"`). Se requiere un cliente HTTP resiliente contra la API pública del Estado Nacional **Georef Argentina** (`https://apis.datos.gob.ar/georef/api/direcciones`) filtrando por `provincia: "Buenos Aires"` y `departamento: "Tres de Febrero"`.

---

### 2. Archivos a Crear y Modificar

```
backend/
├── src/
│   ├── services/
│   │   └── geo.service.ts          # NUEVO: Servicio singleton de cruce espacial y cliente Georef
│   └── scripts/
│       └── test-geo-service.ts     # NUEVO: Script de prueba automatizada y benchmark
├── package.json                    # MODIFICAR: Agregar script "geo:service-test"
└── docs/
    └── planes/
        └── sprint-1/
            └── 03-plan-cruce-espacial-turf-georef.md # Este plan
```

---

### 3. Diseño Arquitectónico de `geo.service.ts`

El servicio se estructurará bajo el patrón Singleton / Módulo Funcional de Node.js, cargando las capas GeoJSON una sola vez en memoria (`cachedLayers`) al primer uso:

#### A. Carga de Capas en Memoria:
- `data/geojson/limite-partido-3f.geojson`
- `data/geojson/zonificacion-2020.geojson`
- `data/geojson/buen-ayre-uf12.geojson`

#### B. Métodos Públicos del Servicio:

1. **`estaEnTresDeFebrero(lat: number, lng: number): boolean`**
   - Utiliza `@turf/boolean-point-in-polygon` contra el polígono de `limite-partido-3f.geojson`.
   - Si da `false`, clasifica el aviso como fuera de ejido municipal.

2. **`determinarZonaMunicipal(lat: number, lng: number): ResultadoCruceEspacial`**
   - Retorna:
     ```typescript
     export interface ResultadoCruceEspacial {
       dentroPartido: boolean;
       zona: ZonaCodigo | null;
       nombreZona?: string;
       categoriaZona?: 'comercial' | 'industrial' | 'residencial';
       macrozona?: Macrozona | null;
       sectorBuenAyre?: 'RC1' | 'RC2' | 'RC3' | null;
       aptoLogistica: boolean;
     }
     ```
   - Cruza primero contra los 3 sectores de `buen-ayre-uf12.geojson`. Si coincide con `RC1`, `RC2` o `RC3`, marca `aptoLogistica: true`.
   - Cruza contra los polígonos de `zonificacion-2020.geojson` para asignar el código oficial (`C1`, `RMI2`, etc.).

3. **`geocodificarDireccion(direccion: string, localidad?: string): Promise<ResultadoGeocodificacion | null>`**
   - Consume `https://apis.datos.gob.ar/georef/api/direcciones` vía `fetch` nativo de Node.js (cero dependencias extra).
   - Parámetros: `direccion`, `departamento=Tres de Febrero`, `provincia=Buenos Aires`, `max=1`.
   - Resiliencia: Timeout defensivo de 3.5 segundos con `AbortSignal.timeout(3500)`.
   - Cache LRU / Map en memoria: Si una dirección ya fue consultada, responde en 0 ms.
   - Manejo de errores: Si la API de Georef no responde o da 404/500, captura el error, registra advertencia y retorna `null` limpiamente sin tumbar la aplicación.

4. **`normalizarUbicacionInmueble(input: { lat?: number | null, lng?: number | null, direccion: string, localidad?: string }): Promise<UbicacionNormalizada>`**
   - Función orquestadora:
     - Si ya trae `lat` y `lng`, las usa directo.
     - Si faltan coordenadas o son inválidas, invoca `geocodificarDireccion`.
     - Ejecuta el cruce espacial (`determinarZonaMunicipal`).
     - Devuelve un objeto completo listo para persistir en `InmuebleModel` o validar con `InmuebleSchema`.

---

### 4. Pruebas y Validación Automatizada (`test-geo-service.ts`)

Se implementará un script de prueba que validará:
1. **Cruce Espacial en Memoria:**
   - Caseros Centro $\rightarrow$ `dentroPartido: true`, `zona: "C1"`.
   - Villa Bosch $\rightarrow$ `dentroPartido: true`, `zona: "RMI2"`.
   - Loma Hermosa $\rightarrow$ `dentroPartido: true`, `zona: "RMI3"`.
   - Buen Ayre $\rightarrow$ `sectorBuenAyre: "RC1"`, `aptoLogistica: true`.
   - Ramos Mejía $\rightarrow$ `dentroPartido: false`.
2. **Geocodificación con Georef:**
   - Prueba con dirección real de Tres de Febrero: `"Av. San Martín 1500, Caseros"`.
   - Verificación de cache: la segunda llamada a la misma dirección debe tardar 0 ms.
   - Manejo de dirección inválida sin caída del servicio.
3. **Benchmark:**
   - Cruce espacial en memoria: $< 1$ ms por coordenada.
   - Compilación estricta TypeScript: `npm run build` sin errores.
