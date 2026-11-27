# Plan de Implementación: Notificaciones de Scraper y Alertas de Errores por Telegram
## Tarjetas: [CARD-NOTIF-01] y [DEVOPS-01] | Estimación: 2 SP | Rama: feat/notificaciones-telegram
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación

La plataforma inmobiliaria de Tres de Febrero requiere observabilidad técnica proactiva durante el desarrollo y en producción:
1. **Monitoreo de Scrapers e Ingesta:** Saber de inmediato si la corrida de extracción (Argenprop) finalizó exitosamente, cuántos avisos leyó, cuántos son nuevos/actualizados, o si falló por cambios en el DOM o caídas de red.
2. **Alertas de Errores Críticos (500):** Notificar al instante cualquier excepción no controlada en la API Express antes de que un usuario o funcionario municipal reporte la indisponibilidad del servicio.

Para evitar dispersión y mantener al equipo de 3 desarrolladores sincronizado, se unifican ambos canales en un **único grupo privado de Telegram**, diferenciando las alertas mediante cabeceras, códigos de color y formato estructurado.

---

### 2. Decisiones Arquitectónicas (ADR)

1. **Cero Dependencias Fantasma (Zero Ghost Dependencies):**
   - Siguiendo `AGENTS.md`, no se instalan librerías de Telegram (`telegraf`, `node-telegram-bot-api`).
   - Se utiliza el cliente HTTP nativo de Node.js (`fetch`) contra la API oficial de Telegram (`https://api.telegram.org/bot<TOKEN>/sendMessage`).
2. **Modo de Parseo HTML:**
   - Se utiliza `parse_mode: 'HTML'` en lugar de `MarkdownV2` debido a la fragilidad de escape de caracteres de este último en URLs, rutas y stack traces.
   - Se implementa `escapeHtml()` para garantizar que `<pre>` y `<code>` no rompan la carga del mensaje.
3. **Resiliencia y No-Bloqueo (Fire & Forget):**
   - Timeout de red estricto de 5 segundos con `AbortSignal.timeout(5000)`.
   - Si las credenciales no están presentes en `.env` o la red falla, el servicio registra un log informativo y **nunca** propaga la excepción hacia el hilo de ejecución principal ni interrumpe la ingesta o las respuestas HTTP.
4. **Soporte Flexible de Variables de Entorno:**
   - En `src/config/env.ts` se validan mediante Zod transformando tanto `TELEGRAM_BOT_TOKEN` / `BOT_TOKEN` como `TELEGRAM_CHAT_ID` / `CHAT_ID`.
5. **Autodescubrimiento del Chat ID:**
   - Se provee una herramienta CLI (`npm run telegram:chat-id`) que consulta `getUpdates` y resuelve automáticamente el ID numérico del grupo (evitando que el desarrollador tenga que deducirlo manualmente).

---

### 3. Archivos Involucrados

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts                      # MODIFICAR: Validar BOT_TOKEN / TELEGRAM_BOT_TOKEN y CHAT_ID con Zod
│   ├── middlewares/
│   │   └── errorHandler.ts             # MODIFICAR: Enganchar alerta crítica 500 por Telegram
│   ├── services/
│   │   ├── corrida-scraper.service.ts  # MODIFICAR: Notificar al finalizar o fallar corrida de ingesta
│   │   └── telegram.service.ts         # NUEVO: Servicio singleton de envío y formateo HTML de Telegram
│   └── scripts/
│       ├── get-telegram-chat-id.ts     # NUEVO: Detector interactivo de Chat ID del grupo
│       └── test-telegram.ts            # NUEVO: Script de prueba de alertas (OK, Warning, 500)
├── package.json                        # MODIFICAR: Scripts telegram:chat-id y telegram:test
.env.example                            # MODIFICAR: Variables de entorno documentadas
docs/
└── planes/
    └── sprint-1/
        └── 07-plan-notificaciones-telegram.md # Este plan
```

---

### 4. Especificación Técnica de Mensajes

#### A. Notificación de Corrida de Scraper
* **Iconos y Estados:**
  * 🟢 **`[SCRAPER COMPLETADO]`**: `estado === 'OK'` y `fallidos === 0`.
  * 🟡 **`[SCRAPER CON ADVERTENCIAS]`**: `estado === 'OK'` y `fallidos > 0`.
  * 🔴 **`[SCRAPER FALLIDO]`**: `estado === 'FALLO'`.
* **Cuerpo:**
  * Portal (`ARGENPROP`).
  * Duración de la corrida (calculada entre `fechaInicio` y `fechaFin`).
  * Métricas: Total leídos, nuevos, actualizados y fallidos/descartados.
  * Detalle de error o advertencia en bloque `<code>`.
  * Timestamp oficial en zona horaria `America/Argentina/Buenos_Aires`.

#### B. Alerta Crítica del Backend (500)
* **Icono:** 🚨 **`[ALERTA BACKEND - ERROR 500]`**.
* **Cuerpo:**
  * Endpoint y Verbo HTTP (`GET /api/inmuebles`).
  * Mensaje de error (`error.message`).
  * Entorno (`NODE_ENV`).
  * IP origen.
  * Stack trace recortado a los 4 primeros renglones en bloque `<pre>`.
  * Timestamp oficial.

---

### 5. Pruebas y Validación

1. **Compilación TypeScript:**
   - `cd backend && npm run build` finaliza con código 0 sin uso de `any`.
2. **Detección de Chat ID:**
   - `npm run telegram:chat-id` conecta con `@inmuebles_3f_bot` e identifica los grupos activos.
3. **Envío de Prueba:**
   - `npm run telegram:test` valida la entrega exitosa de los 3 casos en el grupo de Telegram.
4. **No Regresión:**
   - Suites unitarias y geoespaciales (`npm run dedup:test`, `npm run geo:service-test`) pasan al 100%.
