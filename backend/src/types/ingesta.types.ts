import { z } from 'zod';
import {
  AvisoCrudoIngestaSchema,
  FalloIngestaSchema,
  IngestaLoteSchema,
  MensajeErrorIngestaSchema,
  MotivoFalloIngestaEnum,
  ResultadoAvisoActualizadoSchema,
  ResultadoAvisoFallidoSchema,
  ResultadoAvisoNuevoSchema,
  ResultadoAvisoSchema,
  ResultadoIngestaSchema,
} from '../schemas/ingesta.schema.js';

/* ==========================================================================
   TIPOS INFERIDOS DESDE ZOD (ADR-001)
   ========================================================================== */

export type AvisoCrudoIngesta = z.infer<typeof AvisoCrudoIngestaSchema>;
export type IngestaLote = z.infer<typeof IngestaLoteSchema>;

export type MotivoFalloIngesta = z.infer<typeof MotivoFalloIngestaEnum>;
export type FalloIngesta = z.infer<typeof FalloIngestaSchema>;
export type MensajeErrorIngesta = z.infer<typeof MensajeErrorIngestaSchema>;

export type ResultadoAvisoNuevo = z.infer<typeof ResultadoAvisoNuevoSchema>;
export type ResultadoAvisoActualizado = z.infer<typeof ResultadoAvisoActualizadoSchema>;
export type ResultadoAvisoFallido = z.infer<typeof ResultadoAvisoFallidoSchema>;
export type ResultadoAviso = z.infer<typeof ResultadoAvisoSchema>;

export type ResultadoIngesta = z.infer<typeof ResultadoIngestaSchema>;

/* ==========================================================================
   MAPA DE MOTIVOS → MENSAJE LEGIBLE (satisfies para exhaustividad)
   ========================================================================== */

export const MOTIVO_FALLO_MENSAJES = {
  ZOD_INVALIDO: 'El registro no cumple el contrato AvisoCrudo',
  TIPO_NO_APTO: 'La tipología del aviso no es apta para la ingesta',
  SIN_COORDENADAS: 'El aviso no informa latitud/longitud',
  INMUEBLE_NO_RESOLUBLE: 'No se pudo resolver ni crear el Inmueble asociado',
  CONFLICTO_UNICIDAD: 'Conflicto de unicidad irresoluble para (fuente, idExterno)',
  ERROR_BD: 'Error de base de datos al persistir el aviso',
  ERROR_DESCONOCIDO: 'Error inesperado al persistir el aviso',
} satisfies Record<MotivoFalloIngesta, string>;

/* ==========================================================================
   GUARDS DE NARROWING PARA LAS MÉTRICAS
   ========================================================================== */

export const esResultadoFallido = (
  resultado: ResultadoAviso
): resultado is ResultadoAvisoFallido => resultado.estado === 'fallido';
