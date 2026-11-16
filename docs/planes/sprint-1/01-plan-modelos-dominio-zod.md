Ran check git status
Ran list branches
Ran check git log
Ran create feature branch
Used MCP tool: trello_trello/trelloWriteCard
Analyzing DOMINIO_Y_DATOS.md:L1-100
Ran list docs directory
Analyzed DOMINIOS_Y_DATOS.md:L1-47
Analyzed ARCHITECTURE.md:L1-23
Ran list backend/src files
Analyzed database.ts:L1-20
Analyzed package.json:L1-31
Analyzed tsconfig.json:L1-27
Analyzed index.ts:L1-9

He seleccionado la tarea más prioritaria y estratégica de tu lista, creé la rama local de trabajo y preparé el plan de ejecución:

---

### 1. ¿Por qué elegimos esta tarea como el inicio indiscutible?
👉 **`[CARD-BD-01] Modelos Sequelize y Contratos Zod de Dominio [3 SP]`**

- **Es el cimiento bloqueante #1 del proyecto:** Sin la definición del modelo de datos (`Inmueble`, `Aviso`, `Foto`, `CorridaScraper`) y los contratos Zod, ni Luis puede avanzar con la ingesta y deduplicación relacional, ni Jenni puede conectar los tipos de datos en el mapa y la ficha lateral, ni vos podés persistir los resultados del scraper ni el cruce de Turf.js.
- **Mapea el negocio a código:** Traduce todo el diccionario de `docs/DOMINIOS_Y_DATOS.md` (tipos de propiedad, códigos de zona C1..C3, RMI, Buen Ayre, tolerancia de m², operaciones y monedas) a tipos estrictos de TypeScript sin `any`.
- **Estado en Trello:** Ya moví la tarjeta a la columna **`👨‍💻 En Progreso`** en `Inmuebles 3F [DEVS]`.

---

### 2. Rama Local Creada
Siguiendo la convención del proyecto (`feat/nombre-corto`):
* **Rama:** `feat/modelos-dominio-zod`
* **Regla respetada:** **NO se realizó ningún push al remoto** (100% local en tu máquina).

---

### 3. Plan de Implementación Arquitectónica (`CARD-BD-01`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DE DOMINIO Y DATOS                      │
└────────────────────────────────────────────────────────────────────────┘
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     ▼                                                       ▼
[schemas/dominio.schema.ts]                             [types/dominio.types.ts]
 (Enums & Validadores Zod)                               (Tipos TS inferidos)
     │                                                       │
     └───────────────────────────┬───────────────────────────┘
                                 ▼
                     [models/*.model.ts]
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
  `Inmueble`               `Aviso` / `Foto`        `CorridaScraper`
(Propiedad física)       (Publicación comercial)     (Trazabilidad)
  - Coordenadas Lat/Lng    - Precio / Moneda         - Fuente / Estado
  - Superficie Total/Cub   - Comercializadora / URL  - Avisos leídos
  - Zona Oficial 3F        - Relación 1:N Inmueble   - Duración / Error
                                 │
                                 ▼
                [scripts/sync-db.ts] (Verificación)
              (Sincronización DDL en Docker Postgres 16)
```

#### Paso 1: Enums y Esquemas de Validación Zod (`backend/src/schemas/dominio.schema.ts`)
Definiremos los esquemas canónicos estrictos según `docs/DOMINIOS_Y_DATOS.md`:
* **`TipoInmuebleEnum`:** `'local' | 'galpon' | 'oficina' | 'terreno'` *(depósitos y naves industriales mapean a `'galpon'`)*.
* **`TipoOperacionEnum`:** `'venta' | 'alquiler'`.
* **`MonedaEnum`:** `'USD' | 'ARS'`.
* **`FuenteDatosEnum`:** `'argenprop' | 'zonaprop' | 'properati' | 'manual_municipal' | 'planilla_externa' | 'baja_comercial'`.
* **`ZonaCodigoEnum`:** 
  - Comerciales: `C1`, `C2`, `C3`
  - Residenciales: `R1a`, `R1b`, `R2a`, `R2b`
  - Mixto Industrial: `RMI1`, `RMI2`, `RMI3`
  - Corredor Buen Ayre: `RC1`, `RC2`, `RC3`
* **`AvisoCrudoSchema`:** Contrato de entrada estricto que debe cumplir cualquier scraper antes de tocar la base de datos.

#### Paso 2: Tipos TypeScript Compartidos (`backend/src/types/dominio.types.ts`)
* Inferencia automática directa de Zod (`z.infer<typeof ...>`) para asegurar que el tipado de TypeScript coincida 1:1 con la validación en runtime (cero redundancia y modo estricto).

#### Paso 3: Modelos Sequelize con Tipado Fuerte (`backend/src/models/`)
* **`Inmueble.model.ts`:**
  - `id` (UUID v4, PK).
  - `direccion`, `direccionNormalizada`, `localidad`.
  - `lat`, `lng` (Float con índices para acelerar búsquedas geográficas).
  - `superficieTotalM2`, `superficieCubiertaM2`.
  - `tipo` (ENUM `TipoInmueble`).
  - `zonaCodigo` (ENUM `ZonaCodigo`).
  - `macrozona` (String opcional).
* **`Aviso.model.ts`:**
  - `id` (UUID v4, PK), `inmuebleId` (FK referenciando a `Inmueble.id`).
  - `idExterno`, `fuente` (con índice compuesto único `fuente` + `idExterno`).
  - `url`, `titulo`, `descripcion`.
  - `precio`, `moneda`, `operacion`.
  - `anunciante`, `comercializadora`, `contactoTelefono`.
  - `fechaVistoPrimeraVez`, `fechaVistoUltimaVez`.
  - `estado` (`activo` | `baja` | `pausado`).
* **`Foto.model.ts`:**
  - `id` (UUID v4, PK), `avisoId` (FK referenciando a `Aviso.id`), `url`, `orden`.
* **`CorridaScraper.model.ts`:**
  - `id` (UUID v4, PK), `fuente`, `fechaInicio`, `fechaFin`, `estado` (`OK` | `FALLO`), métricas de avisos (leídos, nuevos, actualizados, fallidos).
* **`models/index.ts`:**
  - Configuración explícita de relaciones relacionales:
    - `Inmueble.hasMany(Aviso, { foreignKey: 'inmuebleId', as: 'avisos' })`
    - `Aviso.belongsTo(Inmueble, { foreignKey: 'inmuebleId', as: 'inmueble' })`
    - `Aviso.hasMany(Foto, { foreignKey: 'avisoId', as: 'fotos' })`
    - `Foto.belongsTo(Aviso, { foreignKey: 'avisoId', as: 'aviso' })`

#### Paso 4: Script de Verificación y Sincronización Real (`backend/src/scripts/sync-db.ts`)
* Script ejecutable con `npx tsx src/scripts/sync-db.ts` que:
  1. Conecta con el contenedor PostgreSQL 16 de Docker (`plataforma_3f_postgres` en puerto 5432).
  2. Ejecuta `sequelize.sync({ alter: true })` creando tablas, claves foráneas e índices.
  3. Inserta un inmueble de prueba con su aviso en Caseros validado con Zod y lo recupera para confirmar integridad de punta a punta.
  4. Valida que `tsc --noEmit` compile sin ningún error en todo `/backend`.

---