import { z } from 'zod';
import {
  MonedaEnum,
  TipoInmuebleEnum,
  TipoOperacionEnum,
} from './inmueble.schema';

/* ==========================================================================
   CONTRATO DE FILTROS MULTICRITERIO (CARD-MAP-10)
   Preparado para sincronización bidireccional con URLSearchParams (CARD-MAP-13).
   ========================================================================== */

export const ZonaGrupoEnum = z.enum(['RMI', 'RC', 'C']);
export type ZonaGrupo = z.infer<typeof ZonaGrupoEnum>;

const numeroOpcionalNoNegativo = z
  .number()
  .finite('Debe ser un número válido')
  .nonnegative('El valor no puede ser negativo')
  .nullable();

export const FiltrosInmueblesSchema = z.object({
  tipos: z.array(TipoInmuebleEnum),
  operacion: TipoOperacionEnum.nullable(),
  localidad: z.string().min(1).nullable(),
  minM2: numeroOpcionalNoNegativo,
  maxM2: numeroOpcionalNoNegativo,
  minPrecio: numeroOpcionalNoNegativo,
  maxPrecio: numeroOpcionalNoNegativo,
  moneda: MonedaEnum.nullable(),
  zonaGrupos: z.array(ZonaGrupoEnum),
});

export type FiltrosInmuebles = z.infer<typeof FiltrosInmueblesSchema>;

export const FILTROS_INICIALES: FiltrosInmuebles = {
  tipos: [],
  operacion: null,
  localidad: null,
  minM2: null,
  maxM2: null,
  minPrecio: null,
  maxPrecio: null,
  moneda: null,
  zonaGrupos: [],
};

export interface ErroresRangoFiltros {
  superficie: string | null;
  precio: string | null;
}

export type ResultadoParseoNumero =
  | { estado: 'vacio'; valor: null }
  | { estado: 'incompleto' }
  | { estado: 'invalido'; mensaje: string }
  | { estado: 'valido'; valor: number };

const PATRON_MILES_PUNTOS = /^-?\d{1,3}(\.\d{3})+$/;
const PATRON_DECIMAL_SIMPLE = /^-?\d+([.,]\d+)?$/;

/**
 * Parsea texto numérico tolerando separadores de miles argentinos ("1.000", "1.500.000")
 * y escritura parcial ("100.", "-") sin borrar el borrador del input.
 */
export const parsearNumeroFiltro = (raw: string): ResultadoParseoNumero => {
  const limpio = raw.trim();
  if (limpio === '') {
    return { estado: 'vacio', valor: null };
  }

  if (limpio === '-' || limpio.endsWith('.') || limpio.endsWith(',')) {
    return { estado: 'incompleto' };
  }

  let normalizado: string;
  if (PATRON_MILES_PUNTOS.test(limpio)) {
    normalizado = limpio.replace(/\./g, '');
  } else if (PATRON_DECIMAL_SIMPLE.test(limpio)) {
    normalizado = limpio.replace(',', '.');
  } else {
    return { estado: 'invalido', mensaje: 'Ingresá un valor numérico válido.' };
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    return { estado: 'invalido', mensaje: 'Ingresá un valor numérico válido.' };
  }

  return { estado: 'valido', valor: numero };
};

/** Normaliza texto para comparaciones insensibles a mayúsculas, tildes y espacios. */
export const normalizarTextoFiltro = (texto: string): string =>
  texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function validarParNumerico(
  min: number | null,
  max: number | null,
  etiqueta: string,
): string | null {
  if (min !== null && (!Number.isFinite(min) || min < 0)) {
    return `${etiqueta} mínima no puede ser negativa.`;
  }
  if (max !== null && (!Number.isFinite(max) || max < 0)) {
    return `${etiqueta} máxima no puede ser negativa.`;
  }
  if (min !== null && max !== null && min > max) {
    return 'El valor mínimo no puede superar al máximo.';
  }
  return null;
}

/** Valida rangos numéricos para mostrar errores contextuales inline (#b91c1c). */
export const validarRangosFiltros = (filtros: FiltrosInmuebles): ErroresRangoFiltros => ({
  superficie: validarParNumerico(filtros.minM2, filtros.maxM2, 'La superficie'),
  precio: validarParNumerico(filtros.minPrecio, filtros.maxPrecio, 'El precio'),
});

/** Cuenta cuántos criterios distintos están activos (para indicador en el panel). */
export const contarFiltrosActivos = (filtros: FiltrosInmuebles): number => {
  let total = 0;
  if (filtros.tipos.length > 0) total += 1;
  if (filtros.operacion !== null) total += 1;
  if (filtros.localidad !== null) total += 1;
  if (filtros.minM2 !== null || filtros.maxM2 !== null) total += 1;
  if (filtros.minPrecio !== null || filtros.maxPrecio !== null) total += 1;
  if (filtros.moneda !== null) total += 1;
  if (filtros.zonaGrupos.length > 0) total += 1;
  return total;
};
