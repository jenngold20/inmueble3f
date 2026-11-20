# Plan de Implementación: Ingesta con Zod y Trazabilidad en CorridasScraper

**Tarjeta:** CARD-ING-01B | **Estimación:** 2 SP | **Rama:** `feat/ingesta-zod-corridas`
**Responsable:** Luis M (@luism100) | **Etiqueta:** Backend · **Historia:** HU-ING-01

---

## 0. Verificación de Dependencias (pre-flight)

| Dependencia | Artefacto verificado | Estado |
| --- | --- | --- |
| CARD-BD-01 | `backend/src/models/{Inmueble,Aviso,Foto,CorridaScraper}.model.ts` + `models/index.ts` con asociaciones | ✅ Presente |
| CARD-BD-01 | `backend/src/schemas/dominio.schema.ts` (`AvisoCrudoSchema`, enums, `CreateAvisoSchema`) | ✅ Presente |
| CARD-ING-01A | `scraper/src/parsers/argenprop.parser.ts` + `scraper/src/schemas/aviso-crudo.schema.ts` | ✅ Presente |
| CARD-ING-03A | `backend/src/services/deduplicacion.service.ts` (`buscarInmuebleCoincidenteEnBD`) | ✅ Presente (se reutiliza) |
| Infra | `docker-compose.yml` (PostgreSQL 16 + Adminer) y `.env.example` | ✅ Presente |

**Brecha de contrato detectada:** el parser agrega `expensas`, `caracteristicasExtra` y admite `tipo: 'otro'`; el contrato de dominio no. Además `AvisoModel.inmuebleId` es `NOT NULL`. Ambas se resuelven en D1 y D4.

> Nota de rama: `main` local estaba por detrás de las tarjetas bloqueantes; la rama se creó desde `dev`, que contiene CARD-BD-01, CARD-ING-01A y CARD-ING-03A.

---

## 1. Contexto y Justificación

[CARD-ING-01A] produce un `AvisoCrudo[]` validado offline contra fixtures y [CARD-ING-03A] expone el motor de coincidencia geodésica. Falta el eslabón que persiste ese array en PostgreSQL sin corromper datos y dejando auditoría de la corrida.

```
POST /api/ingesta/avisos
      │
      ▼
Route ─► validateSchema(Zod, 'body') ─► Controller ─► Service ─► Sequelize ─► PostgreSQL
                                                        │
                                                        ├─► CorridasScraper (auditoría)
                                                        ├─► Inmueble  (resolución mínima vía ING-03A)
                                                        └─► Aviso     (upsert por fuente + idExterno)
```

Invariantes de HU-ING-01:

1. Toda corrida deja registro, incluso si falla (`estado FALLO` + `mensajeError`).
2. Un aviso inválido no aborta el lote: se cuenta en `fallidos` y se sigue.
3. Nunca se crea un `Aviso` huérfano ni se pierde `fechaVistoPrimeraVez` en una actualización.

---

## 2. Alcance y Frontera

### ✅ Entra

- Esquema Zod del lote y tipado inferido.
- Servicio de trazabilidad de corridas (apertura, cierre OK, cierre FALLO).
- Servicio de ingesta: normalización → validación por registro → resolución mínima de `Inmueble` → upsert de `Aviso`.
- Endpoint `POST /api/ingesta/avisos` con sus cuatro capas.
- Fixture real derivado del parser y suite de integración contra PostgreSQL.
- Variable de entorno opcional de tuning.

### ❌ No entra

| Tema | Tarjeta responsable |
| --- | --- |
| Transacción atómica Inmueble ↔ Aviso, `fechaVistoUltimaVez` a nivel Inmueble, reasignación de avisos | CARD-ING-03B |
| Geocodificación con Georef para avisos sin lat/lng | CARD-ING-02 |
| Cruce con zonificación (`zonaCodigo`, `macrozona`) | CARD-GEO-06 |
| Persistencia de `Foto` | Backlog |
| `GET /api/scrapers/status` y badge del Navbar | CARD-MTR-16 |
| Cliente HTTP del scraper para empujar avisos | Backlog post-Sprint 1 |
| Autenticación del endpoint | Tarjeta de despliegue |

---

## 3. Decisiones de Arquitectura

### D1 — Contrato de entrada tolerante al parser, dominio estricto adentro

`AvisoCrudoIngestaSchema` es un superconjunto del contrato real del parser: incluye `expensas`, `caracteristicasExtra`, `tipo: 'otro'` y `fuente` con default. `AvisoCrudoSchema` de dominio no se modifica. Los campos sin columna y los avisos residenciales se descartan en la normalización.

### D2 — El middleware valida el sobre; el servicio valida el registro

`IngestaLoteSchema` valida únicamente:

- `fuente` autoritativa de la corrida,
- `avisos` como array de elementos desconocidos, con mínimo 1 y techo `INGESTA_MAX_AVISOS_LOTE`,
- `.strict()` en el sobre para detectar payloads mal armados.

La validación por registro ocurre dentro del servicio con `AvisoCrudoIngestaSchema.safeParse()` + `AvisoCrudoSchema.safeParse()`. Un registro inválido incrementa `fallidos`; no devuelve 400 ni descarta el lote.

> **Ajuste de implementación:** el plan original tipaba `avisos` como `AvisoCrudoIngesta[]` en el middleware. Eso habría devuelto 400 ante una URL inválida y roto el escenario 6. Se implementó como `unknown[]` para respetar literalmente D2 y la matriz de errores.

### D3 — Upsert explícito, no `Model.upsert()`

Patrón implementado dentro de una transacción corta por aviso:

```
findOne({ fuente, idExterno })
  ├─ existe   → update(whitelist de campos mutables) ⇒ "actualizado"
  └─ no existe→ resolver Inmueble → create(...)      ⇒ "nuevo"
```

`SequelizeUniqueConstraintError` se captura, se relee el aviso en una transacción nueva y se reclasifica como `actualizado`. El índice único `(fuente, idExterno)` es la red de seguridad ante carreras.

**Mejora sobre el orden del plan:** se busca primero el aviso y sólo se resuelve/crea el `Inmueble` cuando el aviso no existe. Resolver el `Inmueble` antes de buscar el aviso podía crear inmuebles huérfanos cuando cambiaban los m² y el aviso ya existía. El resultado funcional es el mismo y se elimina esa basura.

Campos mutables (whitelist): `url`, `titulo`, `descripcion`, `precio`, `moneda`, `operacion`, `anunciante`, `comercializadora`, `contactoTelefono`, `fechaVistoUltimaVez`, `estado: 'activo'`.

Intocables: `idExterno`, `fuente`, `fechaVistoPrimeraVez`, `inmuebleId`.

### D4 — Resolución mínima de Inmueble como seam desmontable

- `buscarInmuebleCoincidenteEnBD(aviso, transaction)` (CARD-ING-03A) → si hay match, se usa ese `id`.
- Si no hay match → `InmuebleModel.create()` con `direccionNormalizada: null`, `zonaCodigo: null`, `macrozona: null`.

CARD-ING-03B reemplaza este resolver por la transacción completa.

### D5 — Transacción por aviso, no por lote

Cada aviso abre su propia transacción corta (`Inmueble` + `Aviso`). Un fallo puntual no pierde los avisos ya persistidos. La corrida se actualiza en una sentencia aparte, fuera de las transacciones de aviso.

Los errores de conexión (`ConnectionError`) no se degradan a `fallido`: abortan el lote, dejan la corrida en `FALLO` y devuelven 503.

### D6 — Semántica cerrada de las 4 métricas

`totalLeidos === nuevos + actualizados + fallidos` en toda corrida, incluida la corrida `FALLO` (los avisos no procesados por el aborto se cuentan como fallidos con `ERROR_BD`/`ERROR_DESCONOCIDO`).

| Métrica | Definición |
| --- | --- |
| `totalLeidos` | Elementos recibidos en `avisos[]` |
| `nuevos` | Avisos insertados |
| `actualizados` | Avisos refrescados por `(fuente, idExterno)` |
| `fallidos` | Todo registro no persistido (motivo + detalle en `mensajeError`) |

`mensajeError` es un JSON `{ fallidos: [...], error?, truncado? }` acotado a 8.000 caracteres. Sin fallos queda `null`.

### D7 — Fechas deterministas

`fechaInicio` se toma una sola vez al abrir la corrida y se usa como `fechaVistoPrimeraVez` y `fechaVistoUltimaVez` de todos los avisos procesados en esa corrida.

---

## 4. Archivos Creados y Modificados

```
backend/
├── src/
│   ├── schemas/ingesta.schema.ts            # NUEVO
│   ├── types/ingesta.types.ts               # NUEVO
│   ├── services/corrida-scraper.service.ts  # NUEVO
│   ├── services/ingesta.service.ts          # NUEVO
│   ├── services/deduplicacion.service.ts    # MODIFICADO: transaction opcional
│   ├── controllers/ingesta.controller.ts    # NUEVO
│   ├── routes/ingesta.routes.ts             # NUEVO
│   ├── routes/index.ts                      # MODIFICADO: /ingesta
│   ├── config/env.ts                        # MODIFICADO: INGESTA_MAX_AVISOS_LOTE
│   ├── scripts/test-ingesta.ts              # NUEVO
│   ├── app.ts                               # MODIFICADO: express.json({ limit: '2mb' })
│   └── package.json                         # MODIFICADO: ingesta:test
scraper/
├── src/scripts/export-avisos-json.ts        # NUEVO
└── package.json                             # MODIFICADO: scrape:json
data/fixtures/avisos-argenprop.json          # NUEVO: 25 avisos reales
.env.example                                 # MODIFICADO
docs/planes/sprint-1/06-plan-ingesta-zod-corridas.md
```

Sin dependencias nuevas.

---

## 5. Contrato HTTP

### Request

```json
{
  "fuente": "argenprop",
  "avisos": [
    {
      "idExterno": "20634567",
      "url": "https://www.argenprop.com/aviso/20634567",
      "titulo": "Galpón en alquiler",
      "tipo": "galpon",
      "operacion": "alquiler",
      "moneda": "USD",
      "precio": 2500,
      "direccion": "Av. San Martín 2450",
      "localidad": "Caseros",
      "lat": -34.6037,
      "lng": -58.5626,
      "superficieCubiertaM2": 500,
      "superficieTotalM2": 600
    }
  ]
}
```

### Response 201 (si `nuevos > 0`) o 200 (si `nuevos === 0`)

```json
{
  "success": true,
  "data": {
    "corridaId": "uuid",
    "estadoCorrida": "OK",
    "totalLeidos": 12,
    "nuevos": 9,
    "actualizados": 2,
    "fallidos": 1,
    "detalleFallidos": [
      {
        "indice": 7,
        "idExterno": "arg-77",
        "motivo": "SIN_COORDENADAS",
        "detalle": "..."
      }
    ]
  }
}
```

### Códigos

- `201`: lote procesado y al menos un aviso nuevo.
- `200`: lote procesado sin avisos nuevos.
- `400`: payload inválido (sobre, lote vacío o exceso de tamaño). No crea corrida.
- `503`: base de datos no disponible (`AppError` con `code: DB_UNAVAILABLE`).
- `500`: error inesperado.

Ejemplo mínimo:

```bash
curl -X POST http://localhost:3001/api/ingesta/avisos \
  -H "Content-Type: application/json" \
  -d '{"fuente":"argenprop","avisos":[{"idExterno":"demo-1","url":"https://www.argenprop.com/aviso/demo-1","titulo":"Galpon demo","tipo":"galpon","operacion":"alquiler","moneda":"USD","precio":2500,"direccion":"Av. San Martin 2450","localidad":"Caseros","lat":-34.6037,"lng":-58.5626,"superficieCubiertaM2":500,"superficieTotalM2":600}]}'
```

Para reenviar el fixture completo hay que envolverlo en el sobre `{ "fuente": "argenprop", "avisos": [...] }`, porque el archivo es un array plano.

---

## 6. Matriz de Errores y Métricas

| Caso | Capa | Acción | Métrica | HTTP |
| --- | --- | --- | --- | --- |
| Body no cumple `IngestaLoteSchema` | Middleware | `next(ZodError)` | — | 400 |
| `avisos` vacío o > techo | Middleware | `next(ZodError)` | — | 400 |
| `tipo: 'otro'` | Servicio (normalización) | descarta | `fallidos++` (`TIPO_NO_APTO`) | — |
| Sin lat/lng | Servicio (normalización) | descarta | `fallidos++` (`SIN_COORDENADAS`) | — |
| URL inválida / contrato roto | Servicio (`safeParse`) | descarta | `fallidos++` (`ZOD_INVALIDO`) | — |
| Aviso nuevo | Servicio | `create` en tx | `nuevos++` | — |
| Aviso existente | Servicio | `update` en tx | `actualizados++` | — |
| Carrera de unicidad | Servicio | relectura → `update` | `actualizados++` | — |
| Error de BD no fatal | Servicio | rollback de esa tx | `fallidos++` (`ERROR_BD`) | — |
| Error fatal de conexión | Servicio | corrida → `FALLO` | métricas parciales | 503 |
| Falla de `iniciarCorrida` | Servicio | `AppError` | — | 503 |

---

## 7. Variables de Entorno

| Variable | Tipo | Default | Obligatoria |
| --- | --- | --- | --- |
| `INGESTA_MAX_AVISOS_LOTE` | entero positivo ≤ 5000 | 500 | No |

`express.json({ limit: '2mb' })`: el default de 100 kB no alcanza para lotes con `descripcion` y `fotos[]`.

---

## 8. Testing y Verificación

### Fixture real

`scraper/src/scripts/export-avisos-json.ts` corre el parser sobre `/data/html-fixtures/*.html`, deduplica por `(fuente, idExterno)` y escribe `data/fixtures/avisos-argenprop.json`. Resultado actual: **25 avisos válidos** (5 galpones, 1 oficina y 19 residenciales `otro`, que la ingesta cuenta como `TIPO_NO_APTO`).

```bash
cd scraper && npm run scrape:json
```

### Suite de integración (11 escenarios)

`backend/src/scripts/test-ingesta.ts` corre contra PostgreSQL real, usa `sequelize.sync()` sin `alter` y limpia sólo filas con prefijo `test-ingesta-` (más las corridas e inmuebles que creó).

| # | Escenario | Resultado |
| --- | --- | --- |
| 1 | 2 avisos nuevos del mismo inmueble físico | ✅ `nuevos=2`, 1 Inmueble compartido |
| 2 | Re-ejecución del mismo lote | ✅ `nuevos=0`, `actualizados=2`, fechas preservadas/refrescadas |
| 3 | Tercera corrida con precio modificado | ✅ Precio actualizado en BD |
| 4 | `tipo: 'otro'` | ✅ `TIPO_NO_APTO`, sin filas |
| 5 | Sin lat/lng | ✅ `SIN_COORDENADAS`, sin Inmueble huérfano |
| 6 | URL inválida | ✅ `ZOD_INVALIDO`, corrida `OK` |
| 7 | Lote vacío | ✅ HTTP 400, sin corrida |
| 8 | Fallo fatal de BD en el aviso 3 | ✅ Corrida `FALLO`, avisos 1–2 persisten |
| 9 | Invariante de métricas | ✅ Verificada en corridas OK y FALLO |
| 10 | Integridad referencial | ✅ 0 avisos huérfanos |
| 11 | Smoke HTTP | ✅ Primer POST 201 / segundo POST 200 |

**Resultado de la última ejecución: 11/11 escenarios OK.**

### Comandos

```bash
docker compose up -d
cd backend && npm run db:sync
cd backend && npm run ingesta:test
cd backend && npm run build
cd backend && npm run dev
cd scraper && npm run scrape:json
cd scraper && npm run build
```

---

## 9. Riesgos y Deuda Técnica

| Riesgo | Mitigación |
| --- | --- |
| `buscarInmuebleCoincidenteEnBD` trae todos los inmuebles del tipo (N+1) | Aceptable en Sprint 1; cachear candidatos por tipo si el padrón crece |
| Avisos sin coordenadas quedan en `fallidos` | Motivo `SIN_COORDENADAS` auditable; reintento con CARD-ING-02 |
| `EN_PROCESO` colgado si muere el proceso | CARD-MTR-16 debe tratar `EN_PROCESO` con más de 1 h como rojo |
| Endpoint sin autenticación | Red interna en Sprint 1; token en la tarjeta de despliegue |
| Dos procesos concurrentes podrían duplicar Inmuebles | CARD-ING-03B cierra la ventana con la transacción completa |
| `otro` y campos sin columna se descartan | Contado en `fallidos` con motivo + detalle |

---

## 10. Definición de Terminado (DoD)

- [x] Validación con `AvisoCrudoSchema.safeParse()` por registro, sin abortar el lote.
- [x] Servicio transaccional que persiste avisos válidos en `Avisos`.
- [x] Registro de inicio y cierre en `CorridasScraper` (`EN_PROCESO` → `OK`/`FALLO`).
- [x] Test de integración con fixture real y 11 escenarios, incluido 201/200.
- [x] `npm run build` limpio en backend y scraper.
- [x] Cero `any`, cero `@ts-ignore`, cero `console.log` de depuración en código de producción.
- [x] `totalLeidos === nuevos + actualizados + fallidos` verificado.
- [x] Cero avisos huérfanos y `fechaVistoPrimeraVez` preservada.
- [x] Ninguna dependencia nueva.
- [x] AGENTS.md, ARCHITECTURE.md y ADR-001/002/007 respetados.
