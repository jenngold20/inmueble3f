import { z } from 'zod';
import { FuenteDatosEnum } from './inmueble.schema';

export const SemaforoSaludEnum = z.enum(['VERDE', 'AMARILLO', 'ROJO']);
export type SemaforoSalud = z.infer<typeof SemaforoSaludEnum>;

export const MetricasCorridaStatusSchema = z.object({
  totalLeidos: z.number().int().nonnegative(),
  nuevos: z.number().int().nonnegative(),
  actualizados: z.number().int().nonnegative(),
  fallidos: z.number().int().nonnegative(),
});

export const ScraperFuenteStatusSchema = z.object({
  fuente: FuenteDatosEnum,
  nombreDisplay: z.string().min(1),
  estadoSalud: SemaforoSaludEnum,
  estadoUltimaCorrida: z.enum(['OK', 'FALLO', 'EN_PROCESO']).nullable(),
  ultimaCorridaAt: z.string().datetime().nullable(),
  fechaFin: z.string().datetime().nullable(),
  horasDesdeUltimaCorrida: z.number().nullable(),
  metricasUltimaCorrida: MetricasCorridaStatusSchema.nullable(),
  mensajeError: z.string().nullable(),
  detalleAlerta: z.string().nullable(),
});
export type ScraperFuenteStatus = z.infer<typeof ScraperFuenteStatusSchema>;

export const ScrapersStatusResponseSchema = z.object({
  estadoGlobal: SemaforoSaludEnum,
  timestamp: z.string().datetime(),
  fuentes: z.array(ScraperFuenteStatusSchema),
});
export type ScrapersStatusResponse = z.infer<typeof ScrapersStatusResponseSchema>;
