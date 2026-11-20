import { z } from 'zod';
import {
  EstadoCorridaEnum,
  FuenteDatosEnum,
  MonedaEnum,
  TipoOperacionEnum,
} from './dominio.schema.js';
import { env } from '../config/env.js';

/* ==========================================================================
   CONTRATO DE INGESTA (TOLERANTE AL PARSER, ESTRICTO EN EL DOMINIO)
   ========================================================================== */

/**
 * Espejo exacto de lo que emite el parser de Argenprop (CARD-ING-01A).
 * Incluye campos que todavía no tienen columna en el dominio
 * (`expensas`, `caracteristicasExtra`) y el tipo residencial `otro`.
 * La normalización se encarga de descartarlos antes de tocar PostgreSQL.
 */
export const AvisoCrudoIngestaSchema = z.object({
  idExterno: z.string().min(1, 'idExterno es requerido'),
  fuente: FuenteDatosEnum.default('argenprop'),
  url: z.string().url('URL inválida'),
  titulo: z.string().min(1, 'titulo es requerido'),
  descripcion: z.string().optional().nullable(),
  tipo: z.enum(['local', 'galpon', 'oficina', 'terreno', 'otro']),
  operacion: TipoOperacionEnum,
  precio: z.number().nonnegative().optional().nullable(),
  expensas: z.number().nonnegative().optional().nullable(),
  moneda: MonedaEnum.default('USD'),
  direccion: z.string().min(1, 'direccion es requerida'),
  localidad: z.string().min(1, 'localidad es requerida'),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  superficieTotalM2: z.number().positive().optional().nullable(),
  superficieCubiertaM2: z.number().positive().optional().nullable(),
  caracteristicasExtra: z.array(z.string()).default([]),
  anunciante: z.string().optional().nullable(),
  comercializadora: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable(),
  fotos: z.array(z.string().url()).default([]),
});

/**
 * Sobre del lote. El middleware sólo valida la envoltura (fuente, arreglo y
 * techo de tamaño); cada registro se valida dentro del servicio con
 * `AvisoCrudoIngestaSchema.safeParse()` + `AvisoCrudoSchema.safeParse()`.
 *
 * Motivo (D2): un aviso inválido debe incrementar `fallidos`, no devolver
 * 400 y descartar todo el lote.
 */
export const IngestaLoteSchema = z
  .object({
    fuente: FuenteDatosEnum,
    avisos: z
      .array(z.unknown())
      .min(1, 'El lote debe contener al menos un aviso')
      .max(
        env.INGESTA_MAX_AVISOS_LOTE,
        `El lote no puede superar ${env.INGESTA_MAX_AVISOS_LOTE} avisos`
      ),
  })
  .strict();

/* ==========================================================================
   MOTIVOS DE FALLO Y RESULTADO POR AVISO
   ========================================================================== */

export const MotivoFalloIngestaEnum = z.enum([
  'ZOD_INVALIDO',
  'TIPO_NO_APTO',
  'SIN_COORDENADAS',
  'INMUEBLE_NO_RESOLUBLE',
  'CONFLICTO_UNICIDAD',
  'ERROR_BD',
  'ERROR_DESCONOCIDO',
]);

export const FalloIngestaSchema = z.object({
  indice: z.number().int().nonnegative(),
  idExterno: z.string().nullable(),
  motivo: MotivoFalloIngestaEnum,
  detalle: z.string(),
});

export const ResultadoAvisoNuevoSchema = z.object({
  estado: z.literal('nuevo'),
  indice: z.number().int().nonnegative(),
  idExterno: z.string(),
  avisoId: z.string().uuid(),
  inmuebleId: z.string().uuid(),
});

export const ResultadoAvisoActualizadoSchema = z.object({
  estado: z.literal('actualizado'),
  indice: z.number().int().nonnegative(),
  idExterno: z.string(),
  avisoId: z.string().uuid(),
  inmuebleId: z.string().uuid(),
});

export const ResultadoAvisoFallidoSchema = z.object({
  estado: z.literal('fallido'),
  indice: z.number().int().nonnegative(),
  idExterno: z.string().nullable(),
  motivo: MotivoFalloIngestaEnum,
  detalle: z.string(),
});

export const ResultadoAvisoSchema = z.discriminatedUnion('estado', [
  ResultadoAvisoNuevoSchema,
  ResultadoAvisoActualizadoSchema,
  ResultadoAvisoFallidoSchema,
]);

export const ResultadoIngestaSchema = z.object({
  corridaId: z.string().uuid(),
  estadoCorrida: EstadoCorridaEnum,
  totalLeidos: z.number().int().nonnegative(),
  nuevos: z.number().int().nonnegative(),
  actualizados: z.number().int().nonnegative(),
  fallidos: z.number().int().nonnegative(),
  detalleFallidos: z.array(FalloIngestaSchema),
});

/**
 * Contenido serializado en `CorridasScraper.mensajeError`.
 * `error` se usa sólo cuando la corrida termina en FALLO.
 */
export const MensajeErrorIngestaSchema = z.object({
  fallidos: z.array(FalloIngestaSchema),
  error: z.string().optional(),
  truncado: z.boolean().optional(),
});
