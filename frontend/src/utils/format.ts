import type { Moneda } from '../schemas/inmueble.schema';

const FORMATO_MONEDA: Record<Moneda, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
};

const FORMATO_NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Precio con símbolo de moneda; "Consultar" cuando el aviso no informa precio. */
export const formatearPrecio = (precio: number | null, moneda: Moneda): string =>
  precio === null ? 'Consultar' : FORMATO_MONEDA[moneda].format(precio);

/** Superficie en m² con separador de miles es-AR (ej. "1.200 m²"). */
export const formatearM2 = (valor: number): string => `${FORMATO_NUMERO.format(valor)} m²`;
