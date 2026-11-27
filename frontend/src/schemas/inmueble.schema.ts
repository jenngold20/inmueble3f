import { z } from 'zod';

/* ==========================================================================
   ENUMS DE DOMINIO
   Fuente de verdad: docs/DOMINIOS_Y_DATOS.md (espejo de backend/src/schemas/dominio.schema.ts)
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

export const ZonaCodigoEnum = z.enum([
  'C1',
  'C2',
  'C3',
  'R1a',
  'R1b',
  'R2a',
  'R2b',
  'RMI1',
  'RMI2',
  'RMI3',
  'RC1',
  'RC2',
  'RC3',
]);
export type ZonaCodigo = z.infer<typeof ZonaCodigoEnum>;

export const MacrozonaEnum = z.enum([
  'DESARROLLO_PRIORITARIO',
  'PROMOCION_HABITAT',
  'PROTECCION_PATRIMONIAL',
]);
export type Macrozona = z.infer<typeof MacrozonaEnum>;

export const EstadoAvisoEnum = z.enum(['activo', 'baja', 'pausado']);
export type EstadoAviso = z.infer<typeof EstadoAvisoEnum>;

/* ==========================================================================
   ENTIDADES (forma JSON de la API: las fechas viajan como string ISO 8601)
   ========================================================================== */

/**
 * Foto del aviso. Acepta URL absoluta (CDN de un portal) o ruta absoluta del sitio
 * (fotos de prueba en /public/mock/...). z.string().url() solo acepta lo primero.
 */
export const FotoSchema = z.object({
  id: z.string().uuid(),
  url: z.union([z.string().url(), z.string().regex(/^\/[^/\\].*/, 'Ruta de foto inválida')]),
  orden: z.number().int().nonnegative(),
});
export type Foto = z.infer<typeof FotoSchema>;

export const AvisoSchema = z.object({
  id: z.string().uuid(),
  fuente: FuenteDatosEnum,
  url: z.string().url(),
  titulo: z.string().min(1),
  precio: z.number().nonnegative().nullable(),
  moneda: MonedaEnum,
  operacion: TipoOperacionEnum,
  comercializadora: z.string().nullable(),
  contactoTelefono: z.string().nullable(),
  fechaVistoUltimaVez: z.string().datetime(),
  estado: EstadoAvisoEnum,
  fotos: z.array(FotoSchema),
});
export type Aviso = z.infer<typeof AvisoSchema>;

export const InmuebleSchema = z.object({
  id: z.string().uuid(),
  direccion: z.string().min(1),
  localidad: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  superficieTotalM2: z.number().positive().nullable(),
  superficieCubiertaM2: z.number().positive().nullable(),
  tipo: TipoInmuebleEnum,
  zonaCodigo: ZonaCodigoEnum.nullable(),
  macrozona: MacrozonaEnum.nullable(),
  avisos: z.array(AvisoSchema).min(1),
});
export type Inmueble = z.infer<typeof InmuebleSchema>;

export const InmueblesSchema = z.array(InmuebleSchema);
