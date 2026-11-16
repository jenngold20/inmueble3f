# Registro de Decisiones de Arquitectura (ADR)
## Plataforma Inmobiliaria Tres de Febrero

Este documento recopila las decisiones técnicas y arquitectónicas clave adoptadas para el proyecto. Cada decisión tiene formato conciso: **Contexto**, **Decisión** y **Consecuencias/Justificación**, garantizando que el equipo comprenda el *por qué* detrás del código sin necesidad de documentación burocrática.

---

### [ADR-001] Validación de Dominio Unificada con Zod y Tipado Estricto TypeScript
- **Fecha:** 2026-11-16
- **Estado:** Aceptado e Implementado
- **Contexto:** La plataforma ingesta datos heterogéneos desde portales inmobiliarios (scrapers con datos sucios, campos incompletos, precios en distintas monedas) y expone una API REST consumida por el frontend SPA.
- **Decisión:** 
  - Centralizar todos los contratos de dominio, enums y esquemas de validación en `backend/src/schemas/dominio.schema.ts` utilizando **Zod**.
  - Derivar todos los tipos TypeScript mediante `z.infer<typeof Schema>` en `backend/src/types/dominio.types.ts`.
  - Prohibir estrictamente el uso de `any` y tipos duplicados en interfaces manuales.
- **Consecuencias:**
  - **Positivas:** Una sola fuente de verdad para runtime y tiempo de compilación. Si una regla de negocio cambia (e.g. un nuevo tipo de inmueble), el compilador detecta inconsistencias en todo el proyecto.
  - **Trade-off:** Requiere que todo input HTTP (`body`, `params`, `query`) pase obligatoriamente por middlewares de Zod antes de alcanzar la capa de controladores.

---

### [ADR-002] Persistencia con PostgreSQL 16 y Sequelize ORM (Stack Cerrado)
- **Fecha:** 2026-11-16
- **Estado:** Aceptado e Implementado
- **Contexto:** Se requiere una base de datos relacional estándar y robusta para transacciones ACID, relacionando inmuebles, avisos históricos de portales, fotos y auditoría de corridas de scrapers.
- **Decisión:**
  - Utilizar **PostgreSQL 16** desplegado vía Docker Compose.
  - Gestionar modelos, migraciones y asociaciones exclusivamente mediante **Sequelize ORM** en modo TypeScript (`src/models/`).
  - Restricción dura: Prohibido migrar o introducir Prisma, TypeORM, Mongo u otros ORMs.
- **Consecuencias:**
  - **Positivas:** Simplicidad operativa, estabilidad probada en entornos Node.js y control explícito sobre las transacciones y claves foráneas.
  - **Trade-off:** Sequelize requiere declarar tipos de atributos y tipos de creación (`Optional`) de forma explícita en TypeScript para evitar advertencias de tipado.

---

### [ADR-003] Cruce Espacial en Capa de Aplicación con Turf.js (Sin PostGIS)
- **Fecha:** 2026-11-16
- **Estado:** Aceptado e Implementado
- **Contexto:** Cada inmueble debe asociarse a su zonificación municipal (Ordenanza 2020) y determinarse si califica en el polo logístico del Plan Buen Ayre (U.F. 12).
- **Decisión:**
  - Resolver el cruce espacial completamente en la capa de backend en memoria utilizando **Turf.js** (`@turf/boolean-point-in-polygon`).
  - No instalar ni depender de la extensión espacial **PostGIS** en la base de datos PostgreSQL.
- **Consecuencias:**
  - **Positivas:** 
    - Portabilidad total de la base de datos (cualquier instancia estándar de Postgres sirve sin extensiones binarias).
    - Latencia ultrabaja verificada: **0.11 ms por coordenada** en benchmark nativo de Node.js, liberando a la base de datos de cómputo geométrico.
  - **Trade-off:** Las capas GeoJSON deben cargarse en memoria del proceso Node.js al iniciar la aplicación.

---

### [ADR-004] Estandarización de Capas GeoJSON (RFC 7946 / EPSG:4326)
- **Fecha:** 2026-11-16
- **Estado:** Aceptado e Implementado
- **Contexto:** Las fuentes cartográficas municipales (PDFs y planos de ordenanza) deben ser consumibles de forma unificada tanto por el backend (Turf.js) como por el frontend (Leaflet).
- **Decisión:**
  - Almacenar las capas en `/data/geojson/` bajo el estándar **RFC 7946 GeoJSON**:
    - `limite-partido-3f.geojson`: Polígono perimetral cerrado del partido.
    - `zonificacion-2020.geojson`: `FeatureCollection` con zonas comerciales (`C1`, `C2`, `C3`), industriales (`RMI1`, `RMI2`, `RMI3`) y residenciales (`R1a`, `R2a`).
    - `buen-ayre-uf12.geojson`: Sectores `RC1`, `RC2` y `RC3` del Plan U.F. 12.
  - Coordenadas estrictamente en formato WGS84 `[longitud, latitud]` con primer y último vértice idénticos (anillos cerrados).
- **Consecuencias:**
  - **Positivas:** Cero conversiones de proyección entre backend y frontend. Compatible directo con React-Leaflet y herramientas de inspección como geojson.io.
  - **Trade-off:** La precisión depende de la digitalización vectorial inicial contra la cartografía oficial de la provincia/municipio.

---

### [ADR-005] Geocodificación con API Georef Argentina como Fallback
- **Fecha:** 2026-11-16
- **Estado:** Aceptado
- **Contexto:** Muchos avisos inmobiliarios solo contienen dirección en texto (calle y altura) sin coordenadas geográficas (`lat`, `lng`).
- **Decisión:**
  - Consumir la API pública oficial de Georef del Estado Nacional (`https://apis.datos.gob.ar/georef/api/direcciones`) filtrando siempre por `provincia: "Buenos Aires"` y `departamento: "Tres de Febrero"`.
  - Si Georef no devuelve resultado con confianza suficiente, marcar el aviso como pendiente de geocodificación manual y no asignarle coordenadas erróneas fuera del municipio.
- **Consecuencias:**
  - **Positivas:** Servicio gratuito sin necesidad de API keys pagas (Google Maps Geocoding) y enfocado específicamente en la nomenclatura argentina.
  - **Trade-off:** Sujeto a disponibilidad de red; se debe implementar timeout defensivo y almacenamiento en caché de coordenadas resueltas.

---

### [ADR-006] Extracción de Scrapers Offline mediante Fixtures HTML
- **Fecha:** 2026-11-16
- **Estado:** Aceptado
- **Contexto:** Los scrapers pueden sufrir bloqueos de IP (Cloudflare/DataDome) o fallar durante pruebas en desarrollo si dependen constantemente de peticiones en vivo a los portales (Argenprop, Zonaprop).
- **Decisión:**
  - Separar el desarrollo del parser de la conexión en vivo.
  - Desarrollar y testear los extractores Cheerio contra archivos HTML estáticos almacenados en `/data/html-fixtures/`.
  - Diseñar el parser con estrategia primaria de detección de JSON embebido (`__NEXT_DATA__` / Schema.org) y selectores CSS como fallback secundario.
- **Consecuencias:**
  - **Positivas:** Pruebas 100% reproducibles, rápidas, ejecutables offline en CI/CD y sin riesgo de penalización de IPs de desarrollo.
  - **Trade-off:** Se requiere renovar periódicamente los fixtures si el portal inmobiliario rediseña su marcado HTML.
