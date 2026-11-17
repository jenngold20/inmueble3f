# Plan de Implementación: Parser Cheerio de Avisos Argenprop sobre Fixtures
## Tarjeta: [CARD-ING-01A] | Estimación: 3 SP | Rama: feat/scraper-argenprop-parser
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación
Siguiendo las directivas de `AGENTS.md` y `ADR-006` (*"Extracción de Scrapers Offline mediante Fixtures HTML"*), el scraper no debe desarrollarse haciendo peticiones en loop contra los sitios en vivo (para evitar bloqueos anti-bot por Cloudflare/DataDome o caídas por rate-limit).

El objetivo de esta tarea es construir el motor de extracción (**Parser**) específico para **Argenprop**, probándolo 100% offline contra archivos HTML estáticos almacenados en `/data/html-fixtures/`.

---

### 2. Archivos a Crear y Modificar

```
scraper/
├── src/
│   ├── parsers/
│   │   └── argenprop.parser.ts        # NUEVO: Lógica de extracción de Argenprop (JSON + CSS fallback)
│   ├── schemas/
│   │   └── aviso-crudo.schema.ts      # NUEVO: Contrato Zod AvisoCrudoSchema
│   └── index.ts                       # MODIFICAR: Runner de prueba offline sobre fixtures
├── package.json                       # Scripts y dependencias existentes (cheerio, zod)
└── tsconfig.json                      # Configuración estricta TypeScript

data/
└── html-fixtures/
    ├── argenprop-listado-caseros.html # NUEVO: Fixture de listado con múltiples tarjetas
    ├── argenprop-ficha-galpon.html    # NUEVO: Fixture de ficha detallada con __NEXT_DATA__
    └── argenprop-ficha-fallback.html  # NUEVO: Fixture sin JSON embebido (prueba selectores CSS)

docs/
└── planes/
    └── sprint-1/
        └── 04-plan-parser-argenprop-fixtures.md # Este plan
```

---

### 3. Estrategia de Extracción del Parser (`argenprop.parser.ts`)

Argenprop, al igual que los portales inmobiliarios modernos basados en Next.js / React:
1. **Estrategia Primaria (JSON Embebido - Ultra Resiliente):**
   - Busca la etiqueta `<script id="__NEXT_DATA__" type="application/json">` o scripts Schema.org `<script type="application/ld+json">`.
   - Si existe, parsea el JSON directamente. Esto evita depender de clases CSS que cambian con cada rediseño o build de frontend.
   - Extrae datos limpios: `idExterno`, `titulo`, `precio`, `moneda`, `direccion`, `superficieTotalM2`, `superficieCubiertaM2`, `lat`, `lng`, `fotos`.
2. **Estrategia Secundaria (Fallback con Selectores CSS en Cheerio):**
   - Si la página no inyecta `__NEXT_DATA__` (o viene en formato SSR clásico):
     - Título: `.title`, `h1.property-title`, `.section-title`, `h1.title`
     - Precio y Moneda: `.price`, `.property-price`, `.card__price`
     - Dirección y Localidad: `.location`, `.property-location`, `address`, `.card__address`
     - Superficie: `.features`, `li:contains("m²")`, `.property-features`
     - Galería: `img.gallery-image`, `img[data-src]`, carruseles.
3. **Normalización de Dominio:**
   - Mapeo automático de tipologías a los enums del proyecto:
     - `"galpón" | "depósito" | "nave industrial" | "inmueble industrial"` $\rightarrow$ `'galpon'`
     - `"local" | "local comercial"` $\rightarrow$ `'local'`
     - `"oficina"` $\rightarrow$ `'oficina'`
     - `"terreno" | "lote" | "fracción"` $\rightarrow$ `'terreno'`
   - Mapeo de operación:
     - `"alquiler"` $\rightarrow$ `'alquiler'`
     - `"venta"` $\rightarrow$ `'venta'`

---

### 4. Protocolo de Validación Humana y Calidad (Lado a Lado)

Para comprobar que el scraper extrae con 100% de fidelidad y no comete errores de interpretación contra la web real de Argenprop:

1. **Procedimiento de Validación con Avisos Reales:**
   - Entrar en el navegador a cualquier aviso real de Argenprop (ej: `https://www.argenprop.com/galpones/alquiler/tres-de-febrero`).
   - Guardar la página con **Click Derecho $\rightarrow$ "Guardar como..."** (Página Web, solo HTML) en la carpeta `/data/html-fixtures/`.
   - Correr `cd scraper && npm run scrape:test`.
   - Comparar lado a lado lo que se ve en la pestaña del navegador con el objeto JSON impreso en la terminal.

2. **Manejo Defensivo de Trampas Típicas:**
   - **Precios sucios:** Limpieza de strings (`"U$S 1.500"`, `"USD 1.500 + IVA"`, `"$ 850.000"`) mediante expresiones regulares para aislar moneda (`USD` / `ARS`) y convertir el valor a número exacto (`1500`).
   - **Superficies múltiples:** Detección de superficie cubierta vs total (`"450 m² cub. / 600 m² tot."`) asignando `superficieCubiertaM2` y `superficieTotalM2`.
   - **Direcciones aproximadas:** Si el aviso no contiene número exacto (`"A metros de Av. Márquez"`), se preserva el texto crudo para que el servicio geográfico y Georef intenten su aproximación.

3. **Doble Red de Seguridad con Zod:**
   - Todo objeto extraído debe cumplir `AvisoCrudoSchema.parse()`.
   - Si falta un campo requerido o un tipo es erróneo, el aviso se descarta y se emite un warning detallado en consola, impidiendo que entre basura a la base de datos municipal.

---

### 5. Criterios de Aceptación (DoD)

1. Existen 3 fixtures HTML en `/data/html-fixtures/` (listado con múltiples propiedades, ficha con `__NEXT_DATA__` y ficha de fallback CSS).
2. El parser extrae exitosamente tanto listados como fichas unitarias.
3. El comando `npm run scrape:test` en `/scraper` procesa todos los fixtures y emite un reporte en consola con los avisos validados por Zod.
4. Compilación estricta `npm run build` en `/scraper` con cero errores de TypeScript.
