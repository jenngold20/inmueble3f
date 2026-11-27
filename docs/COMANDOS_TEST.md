# Guía Rápida de Comandos de Prueba (Testing Cheat Sheet)

Este documento centraliza todos los comandos de test, verificación y benchmarking disponibles en el proyecto, organizados por carpeta y clasificados según requieran o no infraestructura externa (Docker / PostgreSQL).

---

## ⚡ Tabla Resumen Rápida

| Módulo | Comando | Qué valida | Requiere DB | Duración estimada |
| :--- | :--- | :--- | :---: | :---: |
| **`frontend/`** | `npm test` *(o `npm run test:filtros`)* | 14 casos de filtrado multicriterio, rangos, tildes y zonificación | ❌ No | ~1 s |
| **`frontend/`** | `npm run build` | Compilación estricta TypeScript (`tsc -b`) y bundle Vite | ❌ No | ~3 s |
| **`backend/`** | `npm test` *(o `npm run test:fast`)* | Suite completa sin DB: GeoJSON, Turf.js, dedup y semáforos | ❌ No | ~3 s |
| **`backend/`** | `npm run geo:verify` | Integridad topológica de capas GeoJSON de 3F | ❌ No | < 1 s |
| **`backend/`** | `npm run geo:service-test` | Clasificación de zonas (C1, RMI, RC) y geocodificación | ❌ No | ~1 s |
| **`backend/`** | `npm run dedup:test` | Deduplicación geodésica (<=80m), superficie y BBox | ❌ No | < 1 s |
| **`backend/`** | `npm run scrapers:test` | Reglas semafóricas (VERDE, AMARILLO, ROJO) y contrato Zod | ❌ No | < 1 s |
| **`backend/`** | `npm run perf:dedup` | Benchmark de deduplicación con 500 inmuebles ($O(N \log N)$) | ❌ No | ~1 s |
| **`backend/`** | `npm run ingesta:test` | Pipeline completo de ingesta y persistencia Sequelize | ⚠️ **Sí** | ~2 s |
| **`backend/`** | `npm run db:sync` | Sincronización y validación de tablas Sequelize en Postgres | ⚠️ **Sí** | ~1 s |
| **`scraper/`** | `npm test` *(o `npm run scrape:test`)* | Extracción y validación Zod de fixtures HTML offline | ❌ No | ~1 s |
| **`scraper/`** | `npm run scrape:json` | Extracción y exportación de avisos en JSON para pruebas | ❌ No | < 1 s |
| **`scraper/`** | `npm run build` | Chequeo estricto de tipos TypeScript (`tsc`) | ❌ No | ~1 s |

---

## 1. Frontend (`/frontend`)

Ubicación: `cd frontend`

### `npm test` / `npm run test:filtros`
Ejecuta la suite automatizada de filtros multicriterio sobre el padrón oficial de 25 inmuebles:
* Unión de tipologías (`local`, `galpon`, `oficina`, `terreno`).
* Filtros por operación (`alquiler`, `venta`) y moneda (`USD`, `ARS`).
* Rangos de superficie y precio en aviso.
* Normalización insensible a mayúsculas y acentos (`"caseros"` vs `"Caseros"`).
* Agrupación normativa por código de zona (`RMI1`, `RMI2`, `RMI3`).
* Intersección lógica simultánea de 5 criterios.
* Manejo de rangos numéricos inválidos (`min > max`) y formateo argentino (`1.500`, `120,5`).

### `npm run build`
Verifica que no existan errores de tipos TypeScript (`"strict": true`, sin `any`) y genera el paquete optimizado de producción.

---

## 2. Backend (`/backend`)

Ubicación: `cd backend`

### Pruebas Rápidas en Memoria (Sin Base de Datos)
Para correr todas juntas de una sola vez:
```bash
npm test
```
O de manera individual:
* **`npm run geo:verify`**: Valida que los GeoJSON (`limite-partido-3f`, `zonificacion-2020`, `buen-ayre-uf12`) carguen correctamente y sus polígonos intersecten las coordenadas conocidas.
* **`npm run geo:service-test`**: Prueba unitaria de `GeoService` (cruce espacial con `@turf/boolean-point-in-polygon`, categorización de usos y caché de geocodificación Georef).
* **`npm run dedup:test`**: Prueba unitaria de `DeduplicacionService` (cálculo geodésico Haversine, tolerancia del 5% en m², umbral de 80 metros y pre-filtro SQL Bounding Box).
* **`npm run scrapers:test`**: Verifica el cálculo de estado de salud semafórico de scrapers y el cumplimiento del esquema Zod de respuesta.
* **`npm run perf:dedup`**: Simula una carga de 500 avisos para medir tiempos de deduplicación y asegurar que el pre-filtro BBox mantenga el orden $O(N \log N)$.

### Pruebas con Base de Datos (Requiere Docker)
Requiere tener la base de datos levantada con `docker compose up -d`:
* **`npm run db:sync`**: Verifica conexión con PostgreSQL y sincroniza modelos de Sequelize.
* **`npm run ingesta:test`**: Corre una corrida de ingesta end-to-end (lectura, deduplicación, asignación de zona y persistencia relacional de Inmuebles, Avisos y Fotos).

---

## 3. Scraper (`/scraper`)

Ubicación: `cd scraper`

### `npm test` / `npm run scrape:test`
Extrae avisos desde capturas HTML crudas guardadas en `data/html-fixtures/` (modo offline determinista). Valida selectores Cheerio y comprueba que cada aviso satisfaga al 100% el esquema de validación Zod.

### `npm run scrape:json`
Ejecuta la extracción sobre los fixtures y vuelca el resultado a un archivo JSON estructurado para alimentar pipelines de prueba locales.

---

## 4. Ejecución Rápida desde la Raíz del Repositorio

Si estás en la carpeta raíz del proyecto (`inmuebles-3f/`), podés correr cualquier test sin moverte de carpeta:

### Probar Todo lo Rápido (Frontend + Backend + Scraper):
```bash
# Frontend
cd frontend ; npm test ; cd ..

# Backend (en memoria, sin Docker)
cd backend ; npm test ; cd ..

# Scraper (fixtures offline)
cd scraper ; npm test ; cd ..
```

### Comandos de Infraestructura (Docker):
```bash
# Iniciar base de datos PostgreSQL
docker compose up -d

# Detener base de datos
docker compose down

# Ver logs de la base de datos
docker compose logs -f postgres
```
