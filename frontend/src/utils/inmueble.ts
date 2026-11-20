import type { Aviso, Inmueble } from '../schemas/inmueble.schema';

/**
 * Aviso principal de un inmueble: el aviso activo visto más recientemente.
 * Si no hay ninguno activo, el primero de la lista (el esquema garantiza al menos uno).
 */
export const obtenerAvisoPrincipal = (inmueble: Inmueble): Aviso => {
  const activos = inmueble.avisos.filter((aviso) => aviso.estado === 'activo');
  const candidatos = activos.length > 0 ? activos : inmueble.avisos;

  return candidatos.reduce((principal, actual) =>
    Date.parse(actual.fechaVistoUltimaVez) > Date.parse(principal.fechaVistoUltimaVez) ? actual : principal,
  );
};

/** Cantidad de avisos activos adicionales al principal (para el indicador "+N avisos"). */
export const contarAvisosActivosAdicionales = (inmueble: Inmueble): number => {
  const activos = inmueble.avisos.filter((aviso) => aviso.estado === 'activo').length;
  return Math.max(activos - 1, 0);
};

export interface SuperficieDestacada {
  valor: number;
  tipo: 'cubierta' | 'total';
}

/** Superficie a destacar: cubierta si se informa, total en su defecto; null si no hay datos. */
export const obtenerSuperficieDestacada = (inmueble: Inmueble): SuperficieDestacada | null => {
  if (inmueble.superficieCubiertaM2 !== null) {
    return { valor: inmueble.superficieCubiertaM2, tipo: 'cubierta' };
  }
  if (inmueble.superficieTotalM2 !== null) {
    return { valor: inmueble.superficieTotalM2, tipo: 'total' };
  }
  return null;
};
