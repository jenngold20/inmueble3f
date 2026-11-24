import distance from '@turf/distance';
import {
  Op,
  type InferAttributes,
  type Transaction,
  type WhereOptions,
} from 'sequelize';
import type { TipoInmueble } from '../types/dominio.types.js';
import { InmuebleModel } from '../models/Inmueble.model.js';

/* ==========================================================================
   CONSTANTES Y REGLAS DE NEGOCIO (ADR-007)
   ========================================================================== */

/** Distancia geodésica máxima permitida para considerar coincidencia (en metros) */
export const DISTANCIA_GEODESICA_MAXIMA_METROS = 80;

/** Margen de tolerancia de superficie relativa (5% = 0.05) */
export const TOLERANCIA_SUPERFICIE_MAXIMA = 0.05;

/**
 * Factor de seguridad del bounding box (CARD-PERF-01).
 * Garantiza que la caja SQL contenga el círculo real de 80 m con holgura,
 * aunque el umbral de distancia cambie en el futuro.
 */
export const FACTOR_SEGURIDAD_BBOX = 1.15;

/** Metros por grado de latitud sobre la esfera media. */
const METROS_POR_GRADO_LATITUD = 111_320;

/** Cota inferior de cos(lat) para que el margen no explote cerca de los polos. */
const COS_LATITUD_MINIMO = 0.01;

/* ==========================================================================
   INTERFACES Y TIPOS DE ENTRADA / SALIDA
   ========================================================================== */

export interface AvisoParaDeduplicar {
  tipo: TipoInmueble;
  localidad: string;
  lat: number;
  lng: number;
  superficieCubiertaM2?: number | null;
  superficieTotalM2?: number | null;
  direccion?: string | null;
}

export interface InmuebleCandidato {
  id: string;
  tipo: TipoInmueble;
  localidad: string;
  lat: number;
  lng: number;
  superficieCubiertaM2?: number | null;
  superficieTotalM2?: number | null;
  direccion?: string | null;
  [key: string]: unknown;
}

export type MotivoDescarteDeduplicacion =
  | 'TIPO_DISTINTO'
  | 'LOCALIDAD_DISTINTA'
  | 'DISTANCIA_EXCEDIDA'
  | 'SUPERFICIE_FUERA_TOLERANCIA'
  | 'DATOS_INSUFICIENTES';

export interface EvaluacionCandidato {
  candidato: InmuebleCandidato;
  coincide: boolean;
  distanciaMetros: number;
  diferenciaSuperficiePorcentaje: number | null;
  motivoDescarte?: MotivoDescarteDeduplicacion;
  detalle?: string;
}

export interface ResultadoDeduplicacion {
  coincide: boolean;
  inmuebleCoincidente: InmuebleCandidato | null;
  distanciaMetros: number | null;
  diferenciaSuperficiePorcentaje: number | null;
  candidatosEvaluados: number;
  evaluaciones: EvaluacionCandidato[];
}

/* ==========================================================================
   HELPERS MATEMÁTICOS Y ESPACIALES (FUNCIONES PURAS)
   ========================================================================== */

/**
 * Normaliza nombres de localidades para comparación determinista
 * (remueve espacios redundantes, minúsculas y tildes).
 */
export function normalizarTextoLocalidad(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula la distancia geodésica en metros entre dos puntos (lat, lng)
 * utilizando el gran círculo con Turf.js.
 *
 * NOTA CRUCIAL: GeoJSON y Turf requieren coordenadas en orden [longitud, latitud] (X, Y).
 */
export function calcularDistanciaMetros(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const fromCoord: [number, number] = [coord1.lng, coord1.lat];
  const toCoord: [number, number] = [coord2.lng, coord2.lat];

  const dist = distance(fromCoord, toCoord, { units: 'meters' });
  return Math.round(dist * 100) / 100;
}

/* ==========================================================================
   PRE-FILTRO ESPACIAL SQL (CARD-PERF-01)
   ========================================================================== */

/**
 * El SQL es un pre-filtro superconjunto: sólo descarta lo que geométricamente
 * no puede coincidir. Las 4 reglas de negocio siguen decidiéndose en JS
 * (tipo, localidad normalizada, distancia geodésica y superficie), por lo que
 * la precisión del algoritmo no cambia.
 *
 * Referencias: CARD-PERF-01 (bounding box) y CARD-PERF-02 (índice compuesto).
 */

export interface MargenBoundingBox {
  latDelta: number;
  lngDelta: number;
}

/**
 * Deriva el margen del bbox en grados a partir del umbral geodésico y de un
 * factor de seguridad. No se hardcodea ±0.001°: si el umbral cambia, la caja
 * se recalcula y sigue conteniendo al círculo de distancia máxima.
 */
export function margenBoundingBoxGrados(lat: number): MargenBoundingBox {
  const latDelta =
    (DISTANCIA_GEODESICA_MAXIMA_METROS / METROS_POR_GRADO_LATITUD) *
    FACTOR_SEGURIDAD_BBOX;

  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), COS_LATITUD_MINIMO);

  const lngDelta =
    (DISTANCIA_GEODESICA_MAXIMA_METROS / (METROS_POR_GRADO_LATITUD * cosLat)) *
    FACTOR_SEGURIDAD_BBOX;

  return { latDelta, lngDelta };
}

/**
 * Construye el `where` de candidatos: tipo + bounding box geográfico.
 *
 * Decisión D2 (CARD-PERF-01): la localidad NO se filtra en SQL. Cada portal
 * escribe casing/tildes/abreviaturas propias y un `localidad = ?` exacto sería
 * más estricto que la regla normalizada de JS, generando falsos negativos y
 * duplicados. La localidad se sigue evaluando en `compararAvisoConInmueble()`.
 */
export function construirFiltroCandidatos(
  aviso: AvisoParaDeduplicar
): WhereOptions<InferAttributes<InmuebleModel>> {
  const { latDelta, lngDelta } = margenBoundingBoxGrados(aviso.lat);

  return {
    tipo: aviso.tipo,
    lat: { [Op.between]: [aviso.lat - latDelta, aviso.lat + latDelta] },
    lng: { [Op.between]: [aviso.lng - lngDelta, aviso.lng + lngDelta] },
  };
}

/**
 * Evalúa si la diferencia relativa de superficie entre aviso y candidato
 * se encuentra dentro de la tolerancia de ±5% (0.05).
 */
export function evaluarToleranciaSuperficie(
  aviso: { cubierta?: number | null; total?: number | null },
  candidato: { cubierta?: number | null; total?: number | null }
): {
  enTolerancia: boolean;
  diferenciaPorcentaje: number | null;
  motivo?: string;
} {
  // 1. Prioridad: Comparar superficie cubierta si ambos la informan
  if (
    typeof aviso.cubierta === 'number' &&
    aviso.cubierta > 0 &&
    typeof candidato.cubierta === 'number' &&
    candidato.cubierta > 0
  ) {
    const dif = Math.abs(aviso.cubierta - candidato.cubierta) / candidato.cubierta;
    const porcentaje = Math.round(dif * 10000) / 100; // e.g. 4.85%
    return {
      enTolerancia: dif <= TOLERANCIA_SUPERFICIE_MAXIMA,
      diferenciaPorcentaje: porcentaje,
      motivo:
        dif <= TOLERANCIA_SUPERFICIE_MAXIMA
          ? `Superficie cubierta válida (${aviso.cubierta}m² vs ${candidato.cubierta}m², dif: ${porcentaje}%)`
          : `Superficie cubierta fuera de tolerancia: ${porcentaje}% > ${TOLERANCIA_SUPERFICIE_MAXIMA * 100}%`,
    };
  }

  // 2. Segunda opción: Comparar superficie total si ambos la informan
  if (
    typeof aviso.total === 'number' &&
    aviso.total > 0 &&
    typeof candidato.total === 'number' &&
    candidato.total > 0
  ) {
    const dif = Math.abs(aviso.total - candidato.total) / candidato.total;
    const porcentaje = Math.round(dif * 10000) / 100;
    return {
      enTolerancia: dif <= TOLERANCIA_SUPERFICIE_MAXIMA,
      diferenciaPorcentaje: porcentaje,
      motivo:
        dif <= TOLERANCIA_SUPERFICIE_MAXIMA
          ? `Superficie total válida (${aviso.total}m² vs ${candidato.total}m², dif: ${porcentaje}%)`
          : `Superficie total fuera de tolerancia: ${porcentaje}% > ${TOLERANCIA_SUPERFICIE_MAXIMA * 100}%`,
    };
  }

  // 3. Fallback cruzado: Uno informa solo cubierta y el otro solo total
  const supAviso = (aviso.cubierta && aviso.cubierta > 0) ? aviso.cubierta : aviso.total;
  const supCandidato = (candidato.cubierta && candidato.cubierta > 0) ? candidato.cubierta : candidato.total;

  if (typeof supAviso === 'number' && supAviso > 0 && typeof supCandidato === 'number' && supCandidato > 0) {
    const dif = Math.abs(supAviso - supCandidato) / supCandidato;
    const porcentaje = Math.round(dif * 10000) / 100;
    return {
      enTolerancia: dif <= TOLERANCIA_SUPERFICIE_MAXIMA,
      diferenciaPorcentaje: porcentaje,
      motivo:
        dif <= TOLERANCIA_SUPERFICIE_MAXIMA
          ? `Superficie cruzada válida (${supAviso}m² vs ${supCandidato}m², dif: ${porcentaje}%)`
          : `Superficie cruzada fuera de tolerancia: ${porcentaje}% > ${TOLERANCIA_SUPERFICIE_MAXIMA * 100}%`,
    };
  }

  // 4. Si ninguno informa superficie válida:
  // Se acepta la coincidencia bajo advertencia de que la comparación de m² es neutra
  return {
    enTolerancia: true,
    diferenciaPorcentaje: null,
    motivo: 'Sin datos suficientes de m² para comparar; verificación sujeta a radio espacial estricto',
  };
}

/* ==========================================================================
   EVALUACIÓN DE CANDIDATOS INDIVIDUALES Y COLECCIÓN
   ========================================================================== */

/**
 * Compara un aviso entrante contra un inmueble candidato existente
 * aplicando las 4 reglas del MVP de forma secuencial y determinista.
 */
export function compararAvisoConInmueble(
  aviso: AvisoParaDeduplicar,
  candidato: InmuebleCandidato
): EvaluacionCandidato {
  // Regla 1: Tipología idéntica
  if (aviso.tipo !== candidato.tipo) {
    return {
      candidato,
      coincide: false,
      distanciaMetros: calcularDistanciaMetros(aviso, candidato),
      diferenciaSuperficiePorcentaje: null,
      motivoDescarte: 'TIPO_DISTINTO',
      detalle: `Tipo de aviso '${aviso.tipo}' no coincide con inmueble '${candidato.tipo}'`,
    };
  }

  // Regla 2: Misma localidad normalizada
  const locAviso = normalizarTextoLocalidad(aviso.localidad);
  const locCandidato = normalizarTextoLocalidad(candidato.localidad);
  if (locAviso !== locCandidato) {
    return {
      candidato,
      coincide: false,
      distanciaMetros: calcularDistanciaMetros(aviso, candidato),
      diferenciaSuperficiePorcentaje: null,
      motivoDescarte: 'LOCALIDAD_DISTINTA',
      detalle: `Localidad '${aviso.localidad}' no coincide con '${candidato.localidad}'`,
    };
  }

  // Regla 4: Distancia geodésica <= 80 metros
  const distanciaMetros = calcularDistanciaMetros(aviso, candidato);
  if (distanciaMetros > DISTANCIA_GEODESICA_MAXIMA_METROS) {
    return {
      candidato,
      coincide: false,
      distanciaMetros,
      diferenciaSuperficiePorcentaje: null,
      motivoDescarte: 'DISTANCIA_EXCEDIDA',
      detalle: `Distancia geodésica ${distanciaMetros}m excede el límite de ${DISTANCIA_GEODESICA_MAXIMA_METROS}m`,
    };
  }

  // Regla 3: Tolerancia de superficie <= 5%
  const evaluacionSup = evaluarToleranciaSuperficie(
    { cubierta: aviso.superficieCubiertaM2, total: aviso.superficieTotalM2 },
    { cubierta: candidato.superficieCubiertaM2, total: candidato.superficieTotalM2 }
  );

  if (!evaluacionSup.enTolerancia) {
    return {
      candidato,
      coincide: false,
      distanciaMetros,
      diferenciaSuperficiePorcentaje: evaluacionSup.diferenciaPorcentaje,
      motivoDescarte: 'SUPERFICIE_FUERA_TOLERANCIA',
      detalle: evaluacionSup.motivo,
    };
  }

  // ¡Coincidencia exitosa en las 4 reglas!
  return {
    candidato,
    coincide: true,
    distanciaMetros,
    diferenciaSuperficiePorcentaje: evaluacionSup.diferenciaPorcentaje,
    detalle: `Coincidencia positiva: distancia ${distanciaMetros}m <= ${DISTANCIA_GEODESICA_MAXIMA_METROS}m, ${evaluacionSup.motivo}`,
  };
}

/**
 * Evalúa un aviso contra un conjunto de inmuebles candidatos en memoria.
 * Si varios candidatos coinciden, desempata seleccionando el de menor distancia geodésica.
 */
export function evaluarCoincidenciaInmueble(
  aviso: AvisoParaDeduplicar,
  candidatos: InmuebleCandidato[]
): ResultadoDeduplicacion {
  if (!candidatos || candidatos.length === 0) {
    return {
      coincide: false,
      inmuebleCoincidente: null,
      distanciaMetros: null,
      diferenciaSuperficiePorcentaje: null,
      candidatosEvaluados: 0,
      evaluaciones: [],
    };
  }

  const evaluaciones: EvaluacionCandidato[] = [];
  const coincidentes: EvaluacionCandidato[] = [];

  for (const cand of candidatos) {
    const res = compararAvisoConInmueble(aviso, cand);
    evaluaciones.push(res);
    if (res.coincide) {
      coincidentes.push(res);
    }
  }

  if (coincidentes.length === 0) {
    return {
      coincide: false,
      inmuebleCoincidente: null,
      distanciaMetros: null,
      diferenciaSuperficiePorcentaje: null,
      candidatosEvaluados: candidatos.length,
      evaluaciones,
    };
  }

  // Desempate: seleccionar el candidato con menor distancia geodésica
  coincidentes.sort((a, b) => {
    if (a.distanciaMetros !== b.distanciaMetros) {
      return a.distanciaMetros - b.distanciaMetros;
    }
    // Segundo criterio de desempate: menor diferencia de superficie
    const difA = a.diferenciaSuperficiePorcentaje ?? 999;
    const difB = b.diferenciaSuperficiePorcentaje ?? 999;
    return difA - difB;
  });

  const mejorMatch = coincidentes[0];

  return {
    coincide: true,
    inmuebleCoincidente: mejorMatch.candidato,
    distanciaMetros: mejorMatch.distanciaMetros,
    diferenciaSuperficiePorcentaje: mejorMatch.diferenciaSuperficiePorcentaje,
    candidatosEvaluados: candidatos.length,
    evaluaciones,
  };
}

/* ==========================================================================
   INTEGRACIÓN CON BASE DE DATOS (SEQUELIZE)
   ========================================================================== */

/**
 * Consulta candidatos en PostgreSQL acotados por tipo + bounding box
 * (CARD-PERF-01) y evalúa la coincidencia con el aviso entrante en memoria.
 *
 * Antes se traían todos los inmuebles del tipo en el partido por cada aviso
 * (N+1). El bbox reduce las filas sin tocar las 4 reglas de negocio.
 *
 * `transaction` es opcional para que la ingesta pueda resolver el Inmueble
 * dentro de la misma transacción corta del aviso (CARD-ING-01B).
 */
export async function buscarInmuebleCoincidenteEnBD(
  aviso: AvisoParaDeduplicar,
  transaction?: Transaction
): Promise<ResultadoDeduplicacion> {
  const candidatosBD = await InmuebleModel.findAll({
    where: construirFiltroCandidatos(aviso),
    attributes: [
      'id',
      'tipo',
      'localidad',
      'lat',
      'lng',
      'superficieTotalM2',
      'superficieCubiertaM2',
      'direccion',
    ],
    transaction,
  });

  // Mapear instancias de Sequelize a la interfaz InmuebleCandidato
  const candidatos: InmuebleCandidato[] = candidatosBD.map((i) => ({
    id: i.id,
    tipo: i.tipo,
    localidad: i.localidad,
    lat: i.lat,
    lng: i.lng,
    superficieTotalM2: i.superficieTotalM2,
    superficieCubiertaM2: i.superficieCubiertaM2,
    direccion: i.direccion,
  }));

  return evaluarCoincidenciaInmueble(aviso, candidatos);
}
