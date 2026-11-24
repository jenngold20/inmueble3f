# Plan de Implementación: Semáforo de Salud de Scrapers y Auditoría de Corridas (Anti Silent-Fail)

**Tarjeta:** CARD-MTR-16 | **Estimación:** 2 SP | **Rama:** `feat/semaforo-salud-scrapers`  
**Responsable:** Leonardo Murano (@leonardomurano) | **Etiqueta:** Backend / Monitoreo · **Historia:** HU-MTR-16

---

## 0. Verificación de Dependencias (Pre-flight)

| Dependencia | Artefacto verificado | Estado |
|---|---|---|
| CARD-BD-01 | Modelo `CorridaScraperModel` en `backend/src/models/CorridaScraper.model.ts` | ✅ Presente |
| CARD-ING-01B | Registro de corridas operativas (`iniciarCorrida`, `finalizarCorrida`, `marcarCorridaFallida`) | ✅ Presente en `dev` (PR #8) |
| CARD-MAP-09 | Navbar y layout base en `frontend/src/components/Navbar.tsx` | ✅ Presente en `dev` (PR #7) |
| Dominio | Enum `FuenteDatosEnum` en `backend/src/schemas/dominio.schema.ts` | ✅ Presente |

---

## 1. Contexto y Justificación del Negocio

En plataformas inmobiliarias alimentadas por web scrapers externos, el fallo más peligroso **no es el error ruidoso (crash), sino la falla silenciosa (silent fail)**:
- Un portal rediseña su HTML, cambia las clases CSS o modifica la inyección JSON (`__NEXT_DATA__`).
- El robot scraper deja de extraer avisos o falla de forma intermitente sin alertar a nadie.
- Los agentes de la Dirección de Inversiones continúan atendiendo a empresas e inversores con datos que creen vigentes, pero que en realidad llevan semanas o meses desactualizados.

### Objetivo Técnico
Exponer un endpoint de diagnóstico `GET /api/scrapers/status` que evalúe la frescura de los datos por cada fuente inmobiliaria registrada en `CorridasScraper`, calcule un estado semafórico transparente y lo refleje en tiempo real en la barra de navegación (`Navbar.tsx`) de la plataforma web.

```
Frontend (Navbar) ──► GET /api/scrapers/status ──► Route ──► Controller ──► ScraperService
                                                                                   │
                                                                                   ▼
                                                                        CorridasScraper (PostgreSQL)
                                                                    (Última corrida por fuente)
```

---

## 2. Alcance y Frontera

### ✅ Entra en esta tarjeta:
1. **Contratos Zod:** Esquemas de respuesta para el estado de los scrapers (`ScraperFuenteStatusSchema` y `ScraperStatusResponseSchema`).
2. **Servicio Backend (`scrapers.service.ts`):** 
   - Consulta eficiente de la última corrida de cada fuente (`SELECT DISTINCT ON (fuente)...` o subquery agrupada por `fechaInicio`).
   - Cálculo del indicador semafórico (`VERDE`, `AMARILLO`, `ROJO`) en función del tiempo transcurrido y la tasa de error.
3. **Controlador y Rutas:**
   - `GET /api/scrapers/status` montado en `backend/src/routes/scrapers.routes.ts`.
4. **Componente Frontend:**
   - Integración del semáforo visual en `Navbar.tsx` con popover desplegable que informa:
     - Nombre del portal (`Argenprop`, etc.).
     - Estado de salud (`Operativo`, `Atención`, `Desactualizado`).
     - Fecha y hora de la última corrida exitosa.
     - Avisos procesados y tasa de fallos.
5. **Cruce Espacial Integrado:**
   - Verificación de que los avisos procesados en ingesta ya incorporen `zonaCodigo` y `macrozona` mediante Turf.js.
6. **Tests:** Suite de pruebas unitarias y de integración para el cálculo de estados y tiempos transcurridos.

### ❌ Fuera de alcance (Tarjetas posteriores / Backlog):
- Disparo manual de scrapers desde la interfaz web (se mantiene vía CLI/Cron en backend).
- Sistema de alertas por email o webhooks a Slack/Telegram (Backlog post-Sprint 1).

---

## 3. Criterios de Salud Semafórica (SLA de Ingesta)

Para cada fuente registrada (`argenprop`, `zonaprop`, etc.), el estado se calcula evaluando la última corrida registrada:

| Estado | Color | Condición Técnica | Significado para el Municipio |
|:---:|:---:|---|---|
| **VERDE** | 🟢 | Última corrida con `estado === 'OK'` ejecutada hace **menos de 24 horas**. | Datos frescos y confiables para consulta y radicación. |
| **AMARILLO** | 🟡 | Última corrida exitosa hace **entre 24 y 48 horas**, O la última corrida tuvo avisos fallidos $> 0$. | Advertencia preventiva: los datos siguen siendo útiles pero requieren seguimiento. |
| **ROJO** | 🔴 | Última corrida terminó en `estado === 'FALLO'`, O transcurrieron **más de 48 horas** sin corridas exitosas, O la corrida quedó en `EN_PROCESO` por más de 2 horas (proceso colgado). | Datos desactualizados. Posible cambio de diseño en el portal o falla de red. |

**Estado Global de la Plataforma:**
- Si **alguna** fuente crítica está en `ROJO` $\to$ El semáforo global en el Navbar es `ROJO`.
- Si no hay rojos pero hay al menos una en `AMARILLO` $\to$ El semáforo global es `AMARILLO`.
- Si todas están dentro de las 24 hs exitosas $\to$ El semáforo global es `VERDE`.

---

## 4. Contratos de Datos y Esquemas Zod

### Archivo: `backend/src/schemas/scrapers.schema.ts`

```ts
import { z } from 'zod';
import { FuenteDatosEnum } from './dominio.schema.js';

export const SemaforoSaludEnum = z.enum(['VERDE', 'AMARILLO', 'ROJO']);
export type SemaforoSalud = z.infer<typeof SemaforoSaludEnum>;

export const ScraperFuenteStatusSchema = z.object({
  fuente: FuenteDatosEnum,
  estadoSalud: SemaforoSaludEnum,
  estadoUltimaCorrida: z.enum(['OK', 'FALLO', 'EN_PROCESO']),
  ultimaCorridaAt: z.string().datetime().nullable(),
  horasDesdeUltimaCorrida: z.number().nullable(),
  metricasUltimaCorrida: z.object({
    totalLeidos: z.number().int().nonnegative(),
    nuevos: z.number().int().nonnegative(),
    actualizados: z.number().int().nonnegative(),
    fallidos: z.number().int().nonnegative(),
  }).nullable(),
  mensajeError: z.string().nullable(),
});

export const ScrapersStatusResponseSchema = z.object({
  estadoGlobal: SemaforoSaludEnum,
  timestamp: z.string().datetime(),
  fuentes: z.array(ScraperFuenteStatusSchema),
});
```

---

## 5. Arquitectura del Backend

### 5.1 Servicio (`backend/src/services/scrapers.service.ts`)
- Utiliza Sequelize para buscar la corrida más reciente de cada fuente.
- En PostgreSQL nativo:
  ```sql
  SELECT DISTINCT ON (fuente) *
  FROM corridas_scrapers
  ORDER BY fuente, "fechaInicio" DESC;
  ```
- Calcula la diferencia horaria en milisegundos contra `new Date()` y evalúa las 3 reglas del semáforo.

### 5.2 Controlador y Ruta
- Ruta: `backend/src/routes/scrapers.routes.ts`
  ```ts
  scrapersRouter.get('/status', getScrapersStatus);
  ```
- Montado en `backend/src/routes/index.ts` bajo `/api/scrapers`.

---

## 6. Arquitectura del Frontend (`Navbar.tsx`)

1. **Servicio (`frontend/src/services/scrapers.service.ts`):**
   - Función `fetchScrapersStatus(): Promise<ScrapersStatusResponse>`.
2. **Hook (`useScraperHealth.ts`):**
   - Polling suave cada 5 minutos o refetch al hacer clic en el botón de recarga del Navbar.
3. **Componente (`ScraperHealthBadge.tsx`):**
   - Renderiza un pill semafórico en el Navbar:
     - 🟢 `Datos al día`
     - 🟡 `Atención: +24h`
     - 🔴 `Alerta: Scrapers detenidos`
   - Al hacer clic o hover, abre un menú flotante accesible (Popover) detallando cada fuente con su última fecha de ejecución y porcentaje de éxito.

---

## 7. Plan de Pruebas

1. **Test Unitario de Reglas Horarias (`test-semaforo.ts`):**
   - Corrida de hace 2 horas exitosa $\to$ `VERDE`.
   - Corrida de hace 30 horas exitosa $\to$ `AMARILLO`.
   - Corrida de hace 50 horas exitosa $\to$ `ROJO`.
   - Corrida reciente pero con estado `FALLO` $\to$ `ROJO`.
   - Corrida en `EN_PROCESO` desde hace más de 2 horas $\to$ `ROJO`.
2. **Test de Integración de API:**
   - Petición `GET /api/scrapers/status` devuelve status 200 con payload validado por Zod.

---

## 8. Definición de Terminado (DoD)

- [ ] Contratos Zod creados en backend y frontend.
- [ ] Endpoint `GET /api/scrapers/status` documentado y respondiendo en menos de 20 ms.
- [ ] Indicador visual integrado en `Navbar.tsx` respetando los colores institucionales de [IDENTIDAD_VISUAL.md](file:///c:/Users/Admin/mi-desarrollo/inmuebles-3f/docs/IDENTIDAD_VISUAL.md).
- [ ] Suite de pruebas automatizadas aprobada sin advertencias de TypeScript en modo estricto.
- [ ] Tarjeta `[CARD-MTR-16]` movida a *Code Review / PR* con rama `feat/semaforo-salud-scrapers`.
