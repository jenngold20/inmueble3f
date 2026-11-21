import type { TipoInmueble, TipoOperacion } from '../schemas/inmueble.schema';

export const TIPO_LABEL: Record<TipoInmueble, string> = {
  galpon: 'Galpón / Depósito',
  local: 'Local comercial',
  oficina: 'Oficina',
  terreno: 'Terreno',
};

export const OPERACION_LABEL: Record<TipoOperacion, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
};

/** Color del pin por tipo (todos con contraste suficiente contra el punto blanco interior). */
export const TIPO_COLOR_PIN: Record<TipoInmueble, string> = {
  galpon: '#0369a1',
  local: '#b45309',
  oficina: '#0f766e',
  terreno: '#4d7c0f',
};
