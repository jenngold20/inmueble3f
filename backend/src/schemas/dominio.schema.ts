import { z } from 'zod';

/* ==========================================================================
   ENUMS DE DOMINIO (Según docs/DOMINIOS_Y_DATOS.md)
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
  // Comerciales / Centralidad
  'C1',
  'C2',
  'C3',
  // Residenciales
  'R1a',
  'R1b',
  'R2a',
  'R2b',
  // Mixto Industrial
  'RMI1',
  'RMI2',
  'RMI3',
  // Sectores Camino del Buen Ayre (U.F. 12)
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

export const EstadoCorridaEnum = z.enum(['OK', 'FALLO', 'EN_PROCESO']);
export type EstadoCorrida = z.infer<typeof EstadoCorridaEnum>;

/* ==========================================================================
   ESQUEMAS DE ENTIDADES RELACIONALES
   ========================================================================== */

/**
 * Esquema representativo de la entidad Inmueble (Parcela física única)
 */
export const InmuebleSchema = z.object({
  id: z.string().uuid(),
  direccion: z.string().min(1, 'La dirección es obligatoria'),
  direccionNormalizada: z.string().min(1).optional().nullable(),
  localidad: z.string().min(1, 'La localidad es obligatoria'),
  lat: z.number().min(-90).max(90, 'Latitud inválida'),
  lng: z.number().min(-180).max(180, 'Longitud inválida'),
  superficieTotalM2: z.number().positive().optional().nullable(),
  superficieCubiertaM2: z.number().positive().optional().nullable(),
  tipo: TipoInmuebleEnum,
  zonaCodigo: ZonaCodigoEnum.optional().nullable(),
  macrozona: MacrozonaEnum.optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Esquema para inserción de un nuevo Inmueble
 */
export const CreateInmuebleSchema = InmuebleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

/**
 * Esquema representativo de la entidad Aviso (Publicación en portal / planilla)
 */
export const AvisoSchema = z.object({
  id: z.string().uuid(),
  inmuebleId: z.string().uuid(),
  idExterno: z.string().min(1, 'El ID externo de la publicación es obligatorio'),
  fuente: FuenteDatosEnum,
  url: z.string().url('URL de publicación inválida'),
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().optional().nullable(),
  precio: z.number().nonnegative('El precio no puede ser negativo').optional().nullable(),
  moneda: MonedaEnum.default('USD'),
  operacion: TipoOperacionEnum,
  anunciante: z.string().optional().nullable(),
  comercializadora: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable(),
  fechaVistoPrimeraVez: z.date(),
  fechaVistoUltimaVez: z.date(),
  estado: EstadoAvisoEnum.default('activo'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateAvisoSchema = AvisoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

/**
 * Esquema de Foto asociada a un Aviso
 */
export const FotoSchema = z.object({
  id: z.string().uuid(),
  avisoId: z.string().uuid(),
  url: z.string().url('URL de fotografía inválida'),
  orden: z.number().int().nonnegative().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateFotoSchema = FotoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

/**
 * Esquema de Trazabilidad de Scrapers (Corridas)
 */
export const CorridaScraperSchema = z.object({
  id: z.string().uuid(),
  fuente: FuenteDatosEnum,
  fechaInicio: z.date(),
  fechaFin: z.date().optional().nullable(),
  estado: EstadoCorridaEnum.default('EN_PROCESO'),
  totalLeidos: z.number().int().nonnegative().default(0),
  nuevos: z.number().int().nonnegative().default(0),
  actualizados: z.number().int().nonnegative().default(0),
  fallidos: z.number().int().nonnegative().default(0),
  mensajeError: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateCorridaScraperSchema = CorridaScraperSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

/* ==========================================================================
   CONTRATO DE ENTRADA DE SCRAPERS (AvisoCrudo)
   ========================================================================== */

/**
 * Esquema validado que debe emitir cualquier extractor (Cheerio/Playwright)
 * antes de ser procesado por el servicio de deduplicación e ingesta.
 */
export const AvisoCrudoSchema = z.object({
  idExterno: z.string().min(1, 'idExterno es requerido'),
  fuente: FuenteDatosEnum,
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
