import { env } from '../config/env.js';

/* ==========================================================================
   TIPOS Y CONTRATOS
   ========================================================================== */

export interface MetricasScraperTelegram {
  totalLeidos: number;
  nuevos: number;
  actualizados: number;
  fallidos: number;
}

export interface NotificacionCorridaScraper {
  corridaId?: string;
  fuente: string;
  estado: 'OK' | 'FALLO';
  metricas: MetricasScraperTelegram;
  duracionMs?: number;
  mensajeError?: string | null;
}

export interface NotificacionErrorCritico {
  ruta: string;
  metodo: string;
  error: unknown;
  statusCode?: number;
  ip?: string;
}

/* ==========================================================================
   HELPERS INTERNOS
   ========================================================================== */

/** Escapa caracteres HTML para que Telegram parse_mode='HTML' no falle */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatearFecha(date: Date = new Date()): string {
  return date.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function extraerMensajeYStack(error: unknown): { mensaje: string; stackResumido?: string } {
  if (error instanceof Error) {
    const lines = (error.stack ?? '').split('\n').slice(0, 4).join('\n');
    return {
      mensaje: error.message,
      stackResumido: lines.length > 0 ? lines : undefined,
    };
  }
  return { mensaje: String(error) };
}

/* ==========================================================================
   SERVICIO TELEGRAM
   ========================================================================== */

/**
 * Indica si las credenciales de Telegram están disponibles en el entorno.
 */
export function esTelegramConfigurado(): boolean {
  return Boolean(
    env.TELEGRAM_BOT_TOKEN &&
    env.TELEGRAM_BOT_TOKEN.trim() !== '' &&
    env.TELEGRAM_CHAT_ID &&
    env.TELEGRAM_CHAT_ID.trim() !== ''
  );
}

/**
 * Envía un mensaje con formato HTML al grupo de Telegram configurado.
 * Implementa timeout de 5s y degradación elegante si no hay credenciales.
 */
export async function enviarMensajeTelegram(html: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    if (env.NODE_ENV !== 'test') {
      console.info('[Telegram] Notificaciones deshabilitadas: falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID');
    }
    return false;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Telegram] Error al enviar mensaje (${response.status}): ${errText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      '[Telegram] Falla de conexión al enviar notificación:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Notifica el estado de una corrida de scraper al grupo de Telegram.
 */
export async function notificarCorridaScraper(datos: NotificacionCorridaScraper): Promise<boolean> {
  const { fuente, estado, metricas, duracionMs, mensajeError } = datos;

  let icono = '🟢';
  let titulo = 'SCRAPER COMPLETADO';

  if (estado === 'FALLO') {
    icono = '🔴';
    titulo = 'SCRAPER FALLIDO';
  } else if (metricas.fallidos > 0) {
    icono = '🟡';
    titulo = 'SCRAPER CON ADVERTENCIAS';
  }

  const duracionTexto =
    duracionMs !== undefined
      ? duracionMs >= 1000
        ? `${(duracionMs / 1000).toFixed(1)}s`
        : `${duracionMs}ms`
      : 'N/D';

  const lineas: string[] = [
    `${icono} <b>${titulo}:</b>`,
    `🏢 <b>Portal:</b> ${escapeHtml(fuente.toUpperCase())}`,
    `⏱️ <b>Duración:</b> ${duracionTexto}`,
    `📊 <b>Métricas de Ingesta:</b>`,
    `   • Total Leídos: <b>${metricas.totalLeidos}</b>`,
    `   • Nuevos: <b>${metricas.nuevos}</b>`,
    `   • Actualizados: <b>${metricas.actualizados}</b>`,
    `   • Fallidos/Descartados: <b>${metricas.fallidos}</b>`,
  ];

  if (mensajeError && mensajeError.trim() !== '') {
    const errorRecortado = mensajeError.length > 500 ? `${mensajeError.substring(0, 500)}...` : mensajeError;
    lineas.push(`⚠️ <b>Error/Motivo:</b> <code>${escapeHtml(errorRecortado)}</code>`);
  }

  lineas.push(`🕒 <i>${formatearFecha()}</i>`);

  return enviarMensajeTelegram(lineas.join('\n'));
}

/**
 * Notifica un error crítico no controlado (500) del backend al grupo.
 */
export async function notificarErrorCritico(datos: NotificacionErrorCritico): Promise<boolean> {
  const { ruta, metodo, error, statusCode = 500, ip } = datos;
  const { mensaje, stackResumido } = extraerMensajeYStack(error);

  const lineas: string[] = [
    `🚨 <b>ALERTA BACKEND - ERROR ${statusCode}:</b>`,
    `🌐 <b>Endpoint:</b> <code>${escapeHtml(metodo)} ${escapeHtml(ruta)}</code>`,
    `💥 <b>Mensaje:</b> <code>${escapeHtml(mensaje)}</code>`,
    `🌍 <b>Entorno:</b> <code>${env.NODE_ENV}</code>`,
  ];

  if (ip) {
    lineas.push(`👤 <b>IP Origen:</b> <code>${escapeHtml(ip)}</code>`);
  }

  if (stackResumido) {
    lineas.push(`📝 <b>Stack:</b>\n<pre>${escapeHtml(stackResumido)}</pre>`);
  }

  lineas.push(`🕒 <i>${formatearFecha()}</i>`);

  return enviarMensajeTelegram(lineas.join('\n'));
}
