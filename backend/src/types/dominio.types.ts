import { z } from 'zod';
import {
  InmuebleSchema,
  CreateInmuebleSchema,
  AvisoSchema,
  CreateAvisoSchema,
  FotoSchema,
  CreateFotoSchema,
  CorridaScraperSchema,
  CreateCorridaScraperSchema,
  AvisoCrudoSchema,
} from '../schemas/dominio.schema.js';

export type {
  TipoInmueble,
  TipoOperacion,
  Moneda,
  FuenteDatos,
  ZonaCodigo,
  Macrozona,
  EstadoAviso,
  EstadoCorrida,
} from '../schemas/dominio.schema.js';

/* ==========================================================================
   TIPOS DE ENTIDAD INFERIDOS DESDE ZOD (Strict Mode)
   ========================================================================== */

export type Inmueble = z.infer<typeof InmuebleSchema>;
export type CreateInmuebleInput = z.infer<typeof CreateInmuebleSchema>;

export type Aviso = z.infer<typeof AvisoSchema>;
export type CreateAvisoInput = z.infer<typeof CreateAvisoSchema>;

export type Foto = z.infer<typeof FotoSchema>;
export type CreateFotoInput = z.infer<typeof CreateFotoSchema>;

export type CorridaScraper = z.infer<typeof CorridaScraperSchema>;
export type CreateCorridaScraperInput = z.infer<typeof CreateCorridaScraperSchema>;

export type AvisoCrudo = z.infer<typeof AvisoCrudoSchema>;

/**
 * Inmueble con sus avisos y fotos asociadas para respuestas de la API
 */
export interface InmuebleConAvisos extends Inmueble {
  avisos?: Array<Aviso & { fotos?: Foto[] }>;
}
