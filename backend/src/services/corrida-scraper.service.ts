import { CorridaScraperModel } from '../models/CorridaScraper.model.js';
import { AppError } from '../types/errors.js';
import type { CorridaScraper, FuenteDatos } from '../types/dominio.types.js';

/* ==========================================================================
   TRAZABILIDAD DE CORRIDAS (CARD-ING-01B)
   ========================================================================== */

export type MetricasCorrida = Pick<
  CorridaScraper,
  'totalLeidos' | 'nuevos' | 'actualizados' | 'fallidos'
>;

/**
 * Abre una corrida en estado EN_PROCESO. La `fechaInicio` se fija una sola
 * vez y se reutiliza como fechaVisto de todos los avisos de la corrida (D7).
 */
export async function iniciarCorrida(fuente: FuenteDatos): Promise<CorridaScraperModel> {
  return CorridaScraperModel.create({
    fuente,
    fechaInicio: new Date(),
    fechaFin: null,
    estado: 'EN_PROCESO',
    totalLeidos: 0,
    nuevos: 0,
    actualizados: 0,
    fallidos: 0,
    mensajeError: null,
  });
}

/**
 * Cierra la corrida en estado OK con las métricas finales.
 */
export async function finalizarCorrida(
  corridaId: string,
  metricas: MetricasCorrida,
  mensajeError: string | null
): Promise<void> {
  const [afectadas] = await CorridaScraperModel.update(
    {
      ...metricas,
      estado: 'OK',
      fechaFin: new Date(),
      mensajeError,
    },
    {
      where: { id: corridaId },
    }
  );

  if (afectadas === 0) {
    throw new AppError(
      'No se pudo cerrar la corrida de ingesta: el registro no existe',
      503,
      'DB_UNAVAILABLE',
      { corridaId }
    );
  }
}

/**
 * Marca la corrida como FALLO preservando las métricas parciales ya
 * calculadas. Se llama fuera de las transacciones de aviso (D5).
 */
export async function marcarCorridaFallida(
  corridaId: string,
  mensajeError: string,
  metricas?: MetricasCorrida
): Promise<void> {
  await CorridaScraperModel.update(
    {
      ...(metricas ?? {}),
      estado: 'FALLO',
      fechaFin: new Date(),
      mensajeError,
    },
    {
      where: { id: corridaId },
    }
  );
}
