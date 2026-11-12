# AGENTS.md - Directivas del Proyecto: Plataforma Inmobiliaria 3F

## 1. Contexto del Sistema
Plataforma web de uso interno para la Dirección de Inversiones de la Municipalidad de Tres de Febrero. Unifica la oferta comercial e industrial (locales, galpones, oficinas, terrenos) mediante scraping diario, carga manual/planillas y cruce geoespacial con la zonificación municipal para filtrar propiedades aptas según el rubro de cada empresa.

## 2. Mapa del Repositorio
- `/backend`: API REST (Node.js + Express + TypeScript + Sequelize + Zod + Turf.js).
- `/frontend`: SPA (React + Vite + TypeScript + Tailwind CSS + React-Leaflet).
- `/scraper`: Motores de extracción (TypeScript + Cheerio/Playwright) ejecutables por CLI/Cron.
- `/data/geojson`: Capas geográficas estáticas del municipio (Zonificación, Macrozonas, Buen Ayre).
- `/data/html-fixtures`: Capturas HTML crudas de portales para testear parsers offline.
- `/docs`: Documentación técnica y de dominio (`ARQUITECTURA.md`, `DOMINIO_Y_DATOS.md`).

## 3. Stack Tecnológico Cerrado (RESTRICCIONES DURAS)
- **PROHIBIDO** sugerir, instalar o migrar a Next.js, Prisma, TypeORM, PostGIS o Mapbox.
- **Base de Datos:** PostgreSQL 16 (vía Docker) gestionado exclusivamente con **Sequelize**.
- **Cruce Espacial:** Se resuelve en capa de aplicación (Backend) usando **Turf.js** (`@turf/boolean-point-in-polygon`) contra los archivos de `/data/geojson`. NO usar extensiones espaciales de base de datos.
- **Validación:** Todo contrato de entrada/salida (API, Scraper, Variables de Entorno) DEBE validarse con **Zod**.
- **Tipado:** TypeScript en modo estricto (`"strict": true`). Queda **PROHIBIDO** el uso de `any` o `@ts-ignore`.

## 4. Comandos Frecuentes
- Infraestructura DB: `docker compose up -d`
- Backend dev: `cd backend && npm run dev`
- Frontend dev: `cd frontend && npm run dev`
- Ejecutar Scraper (fixture local): `cd scraper && npm run scrape:test`

## 5. Reglas de Comportamiento del Agente (Rol Mentor / Par Técnico)
1. **No escupir código a ciegas:** Antes de generar o modificar múltiples archivos, explicá brevemente el plan arquitectónico y qué archivos vas a tocar. Si el usuario pide entender cómo resolver algo, guiá con la lógica paso a paso sin entregar la resolución completa servida, salvo que se te pida explícitamente generar el código o el scaffolding.
2. **Cero dependencias fantasma:** No agregues librerías nuevas al `package.json` sin justificar por qué no se puede resolver con Node/TS nativo o el stack actual.
3. **Lectura obligatoria por contexto:**
   - Antes de tocar rutas, controladores o modelos: leé `/docs/ARCHITECTURE.md`.
   - Antes de tocar esquemas de datos, zonas o scrapers: leé `/docs/DOMINIO_Y_DATOS.md`.
   - Antes de hacer commits o ramas: respetá `/CONTRIBUTING.md`.