import { z } from 'zod';

/* ==========================================================================
   ENUMS DE DOMINIO DEL SCRAPER (Espejo de backend/src/schemas/dominio.schema.ts)
   ========================================================================== */

export const TipoInmuebleEnum = z.enum(['local', 'galpon', 'oficina', 'terreno']);
export type TipoInmueble = z.infer<typeof TipoInmuebleEnum>;

export const TipoOperacionEnum = z.enum(['venta', 'alquiler']);
export type TipoOperacion = z.infer<typeof TipoOperacionEnum>;

export const MonedaEnum = z.enum(['USD', 'ARS']);
export type Moneda = z.infer<typeof MonedaEnum>;

export const FuenteDatosEnum = z.enum([
  'argenprop',
  'zonaprop',
  'properati',
  'manual_municipal',
  'planilla_externa',
  'baja_comercial',
]);
export type FuenteDatos = z.infer<typeof FuenteDatosEnum>;

/* ==========================================================================
   CONTRATO DE SALIDA DEL SCRAPER (AvisoCrudo)
   ========================================================================== */

export const AvisoCrudoSchema = z.object({
  idExterno: z.string().min(1, 'idExterno es requerido'),
  fuente: FuenteDatosEnum.default('argenprop'),
  url: z.string().url('URL inválida'),
  titulo: z.string().min(1, 'titulo es requerido'),
  descripcion: z.string().optional().nullable(),
  tipo: TipoInmuebleEnum,
  operacion: TipoOperacionEnum,
  precio: z.number().nonnegative().optional().nullable(),
  moneda: MonedaEnum.default('USD'),
  direccion: z.string().min(1, 'direccion es requerida'),
  localidad: z.string().min(1, 'localidad es requerida'),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  superficieTotalM2: z.number().positive().optional().nullable(),
  superficieCubiertaM2: z.number().positive().optional().nullable(),
  anunciante: z.string().optional().nullable(),
  comercializadora: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable(),
  fotos: z.array(z.string().url()).default([]),
});

export type AvisoCrudo = z.infer<typeof AvisoCrudoSchema>;
