import type { z } from 'zod';
import type {
  MetricasCorridaStatusSchema,
  ScraperFuenteStatusSchema,
  ScrapersStatusResponseSchema,
  SemaforoSaludEnum,
} from '../schemas/scrapers.schema.js';

export type SemaforoSalud = z.infer<typeof SemaforoSaludEnum>;
export type MetricasCorridaStatus = z.infer<typeof MetricasCorridaStatusSchema>;
export type ScraperFuenteStatus = z.infer<typeof ScraperFuenteStatusSchema>;
export type ScrapersStatusResponse = z.infer<typeof ScrapersStatusResponseSchema>;
