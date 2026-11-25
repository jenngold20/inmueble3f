import { useMemo } from 'react';
import {
  contarFiltrosActivos,
  normalizarTextoFiltro,
  validarRangosFiltros,
  type ErroresRangoFiltros,
  type FiltrosInmuebles,
  type ZonaGrupo,
} from '../schemas/filtros.schema';
import type { Aviso, Inmueble, ZonaCodigo } from '../schemas/inmueble.schema';
import { obtenerAvisoPrincipal, obtenerSuperficieDestacada } from '../utils/inmueble';
import { useDebouncedValue } from './useDebouncedValue';

const DEBOUNCE_NUMERICO_MS = 250;

function coincideGrupoZona(zonaCodigo: ZonaCodigo | null, grupos: ZonaGrupo[]): boolean {
  if (grupos.length === 0) return true;
  if (zonaCodigo === null) return false;

  return grupos.some((grupo) => {
    if (grupo === 'C') return zonaCodigo.startsWith('C');
    if (grupo === 'RC') return zonaCodigo.startsWith('RC');
    return zonaCodigo.startsWith('RMI');
  });
}

function avisoCoincide(aviso: Aviso, filtros: FiltrosInmuebles): boolean {
  if (filtros.operacion !== null && aviso.operacion !== filtros.operacion) {
    return false;
  }

  if (filtros.moneda !== null && aviso.moneda !== filtros.moneda) {
    return false;
  }

  const hayFiltroPrecio = filtros.minPrecio !== null || filtros.maxPrecio !== null;
  if (hayFiltroPrecio) {
    if (aviso.precio === null) {
      return false;
    }
    if (filtros.minPrecio !== null && filtros.minPrecio >= 0 && aviso.precio < filtros.minPrecio) {
      return false;
    }
    if (filtros.maxPrecio !== null && filtros.maxPrecio >= 0 && aviso.precio > filtros.maxPrecio) {
      return false;
    }
  }

  return true;
}

/**
 * Función pura de filtrado multicriterio en memoria.
 * Evalúa operación, moneda y precio sobre el mismo aviso activo (o el principal
 * si ninguno está activo) para no mezclar condiciones de publicaciones incompatibles.
 */
export function filtrarInmuebles(
  inmuebles: Inmueble[],
  filtros: FiltrosInmuebles,
): Inmueble[] {
  const errores = validarRangosFiltros(filtros);
  // Si el rango tiene mínimo > máximo, la intersección lógica es vacía.
  if (errores.superficie !== null || errores.precio !== null) {
    return [];
  }

  const localidadObjetivo =
    filtros.localidad !== null ? normalizarTextoFiltro(filtros.localidad) : null;
  const hayFiltroSuperficie = filtros.minM2 !== null || filtros.maxM2 !== null;
  const hayFiltroComercial =
    filtros.operacion !== null ||
    filtros.moneda !== null ||
    filtros.minPrecio !== null ||
    filtros.maxPrecio !== null;

  return inmuebles.filter((inmueble) => {
    if (filtros.tipos.length > 0 && !filtros.tipos.includes(inmueble.tipo)) {
      return false;
    }

    if (
      localidadObjetivo !== null &&
      normalizarTextoFiltro(inmueble.localidad) !== localidadObjetivo
    ) {
      return false;
    }

    if (!coincideGrupoZona(inmueble.zonaCodigo, filtros.zonaGrupos)) {
      return false;
    }

    if (hayFiltroSuperficie) {
      const superficie = obtenerSuperficieDestacada(inmueble);
      if (superficie === null) {
        return false;
      }
      if (filtros.minM2 !== null && superficie.valor < filtros.minM2) {
        return false;
      }
      if (filtros.maxM2 !== null && superficie.valor > filtros.maxM2) {
        return false;
      }
    }

    if (hayFiltroComercial) {
      const activos = inmueble.avisos.filter((aviso) => aviso.estado === 'activo');
      const candidatos = activos.length > 0 ? activos : [obtenerAvisoPrincipal(inmueble)];
      if (!candidatos.some((aviso) => avisoCoincide(aviso, filtros))) {
        return false;
      }
    }

    return true;
  });
}

export interface UseInmueblesFiltradosResult {
  inmueblesFiltrados: Inmueble[];
  localidadesDisponibles: string[];
  cantidadFiltrosActivos: number;
  hayFiltrosActivos: boolean;
  erroresRango: ErroresRangoFiltros;
}

export function useInmueblesFiltrados(
  inmuebles: Inmueble[],
  filtros: FiltrosInmuebles,
): UseInmueblesFiltradosResult {
  const minM2Debounced = useDebouncedValue(filtros.minM2, DEBOUNCE_NUMERICO_MS);
  const maxM2Debounced = useDebouncedValue(filtros.maxM2, DEBOUNCE_NUMERICO_MS);
  const minPrecioDebounced = useDebouncedValue(filtros.minPrecio, DEBOUNCE_NUMERICO_MS);
  const maxPrecioDebounced = useDebouncedValue(filtros.maxPrecio, DEBOUNCE_NUMERICO_MS);

  const cantidadFiltrosActivos = useMemo(() => contarFiltrosActivos(filtros), [filtros]);
  const hayFiltrosActivos = cantidadFiltrosActivos > 0;

  // Los errores inline de rango se informan sin espera para dar feedback inmediato al escribir.
  const erroresRango = useMemo(() => validarRangosFiltros(filtros), [filtros]);

  const localidadesDisponibles = useMemo(() => {
    const porClave = new Map<string, string>();
    for (const inmueble of inmuebles) {
      const clave = normalizarTextoFiltro(inmueble.localidad);
      if (clave && !porClave.has(clave)) {
        porClave.set(clave, inmueble.localidad.trim());
      }
    }
    return Array.from(porClave.values()).sort((a, b) => a.localeCompare(b, 'es-AR'));
  }, [inmuebles]);

  const filtrosAplicados = useMemo<FiltrosInmuebles>(
    () =>
      // Si se restablecen todos los filtros, aplicamos inmediato sin esperar el debounce.
      hayFiltrosActivos
        ? {
            ...filtros,
            minM2: minM2Debounced,
            maxM2: maxM2Debounced,
            minPrecio: minPrecioDebounced,
            maxPrecio: maxPrecioDebounced,
          }
        : filtros,
    [
      filtros,
      hayFiltrosActivos,
      minM2Debounced,
      maxM2Debounced,
      minPrecioDebounced,
      maxPrecioDebounced,
    ],
  );

  const inmueblesFiltrados = useMemo(
    () => (hayFiltrosActivos ? filtrarInmuebles(inmuebles, filtrosAplicados) : inmuebles),
    [inmuebles, filtrosAplicados, hayFiltrosActivos],
  );

  return {
    inmueblesFiltrados,
    localidadesDisponibles,
    cantidadFiltrosActivos,
    hayFiltrosActivos,
    erroresRango,
  };
}
