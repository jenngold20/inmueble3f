# Arquitectura y Estándares de Código

## 1. Backend (`/backend`) - Arquitectura en Capas Estricta
El flujo de una petición DEBE respetar este orden unidireccional:
`Request` -> `Route` -> `Zod Validation Middleware` -> `Controller` -> `Service` -> `Sequelize Model` -> `Database`

### Reglas por capa:
- **Routes (`/src/routes`):** Solo definen el verbo HTTP, el path y encadenan middlewares con el método del controlador. Cero lógica.
- **Middlewares (`/src/middlewares`):** Incluyen el validador genérico de Zod (`validateSchema`) y el manejador centralizado de errores (`errorHandler`).
- **Controllers (`/src/controllers`):** Extraen datos ya validados de `req.body`, `req.query` o `req.params`, llaman al `Service` correspondiente y devuelven la respuesta HTTP estandarizada. **PROHIBIDO** importar modelos de Sequelize o hacer cálculos de negocio en un controlador.
- **Services (`/src/services`):** Contienen toda la lógica de negocio (deduplicación de inmuebles, cruce espacial con Turf.js, geocodificación con API Georef, estadísticas de consultas).
- **Models (`/src/models`):** Definición de tablas y relaciones en Sequelize.

## 2. Scraper (`/scraper`) - Reglas de Extracción Resiliente
- **Desarrollo Offline-First:** Ningún parser se desarrolla pegándole en loop al sitio real. Primero se descarga el HTML en `/data/html-fixtures/` y se programa el extractor contra el archivo estático.
- **Prioridad de Hidratación:** Antes de parsear nodos DOM con selectores CSS frágiles, verificar siempre si el portal inyecta un JSON de estado (ej. `<script id="__NEXT_DATA__">` o `<script type="application/ld+json">`).
- **Salida Estandarizada:** Todo scraper DEBE devolver un array validado por el esquema Zod `AvisoCrudoSchema` antes de enviarlo al servicio de ingesta.
- **Trazabilidad:** Cada ejecución debe registrar un log en la tabla `CorridasScraper` (fecha, fuente, avisos leídos, nuevos, actualizados, estado y error si falló).

## 3. Frontend (`/frontend`) - Reglas de UI y Estado
- **Sincronización con URL:** Todos los filtros del mapa (tipo, operación, m2, precio, localidad, rubro) DEBEN reflejarse en los `searchParams` de la URL para permitir compartir búsquedas por link.
- **Separación UI / Datos:** Los componentes visuales no hacen `fetch` directo. Las llamadas a la API viven en `/src/services` o custom hooks tipados.
- **Rendimiento en Mapa (Leaflet):** Las capas GeoJSON de zonificación se cargan una sola vez y se memorizan.