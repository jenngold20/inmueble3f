import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import turfDistance from '@turf/distance';
import { point } from '@turf/helpers';
import type { ZonaCodigo, Macrozona } from '../types/dominio.types.js';

/* ==========================================================================
   TIPOS Y CONTRATOS DEL SERVICIO GEOESPACIAL
   ========================================================================== */

export interface ResultadoCruceEspacial {
  dentroPartido: boolean;
  zona: ZonaCodigo | null;
  nombreZona?: string;
  categoriaZona?: 'comercial' | 'industrial' | 'residencial';
  macrozona?: Macrozona | null;
  sectorBuenAyre?: 'RC1' | 'RC2' | 'RC3' | null;
  aptoLogistica: boolean;
}

export interface ResultadoGeocodificacion {
  lat: number;
  lng: number;
  direccionNormalizada: string;
  calle?: string;
  altura?: number;
  localidad?: string;
  departamento: string;
  provincia: string;
  fuente: 'georef_argentina';
}

export interface NormalizarUbicacionInput {
  lat?: number | null;
  lng?: number | null;
  direccion: string;
  localidad?: string;
}

export interface UbicacionNormalizada {
  lat: number;
  lng: number;
  direccionNormalizada: string;
  localidad: string;
  dentroPartido: boolean;
  zona: ZonaCodigo | null;
  nombreZona?: string;
  categoriaZona?: 'comercial' | 'industrial' | 'residencial';
  macrozona?: Macrozona | null;
  sectorBuenAyre?: 'RC1' | 'RC2' | 'RC3' | null;
  aptoLogistica: boolean;
  geocodificado: boolean;
}

type GeoJSONGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

interface GeoJSONFeature {
  type: string;
  properties: {
    codigo?: string;
    nombre?: string;
    categoria?: 'comercial' | 'industrial' | 'residencial';
    macrozona?: Macrozona;
    aptoLogistica?: boolean;
    partido?: string;
    [key: string]: unknown;
  };
  geometry: GeoJSONGeometry;
}

interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

interface CapasGeoJSONCargadas {
  limitePartido: GeoJSONFeatureCollection;
  zonificacion: GeoJSONFeatureCollection;
  buenAyre: GeoJSONFeatureCollection;
}

/* ==========================================================================
   SINGLETON & CACHÉ EN MEMORIA
   ========================================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let capasEnMemoria: CapasGeoJSONCargadas | null = null;
const cacheGeoref = new Map<string, ResultadoGeocodificacion | null>();
const MAX_CACHE_SIZE = 1000;

/**
 * Localiza de forma robusta la carpeta de GeoJSON tanto en desarrollo como en ejecución compilada.
 */
function resolverDirectorioGeoJSON(): string {
  const posiblesRutas = [
    path.resolve(__dirname, '../../../data/geojson'),
    path.resolve(process.cwd(), 'data/geojson'),
    path.resolve(process.cwd(), '../data/geojson'),
  ];

  for (const ruta of posiblesRutas) {
    if (fs.existsSync(path.join(ruta, 'limite-partido-3f.geojson'))) {
      return ruta;
    }
  }

  throw new Error(
    `No se encontró el directorio de capas GeoJSON. Rutas verificadas: ${posiblesRutas.join(', ')}`
  );
}

/**
 * Carga y cachea en memoria los archivos GeoJSON para evaluación instantánea (< 1 ms).
 */
export function obtenerCapasGeo(): CapasGeoJSONCargadas {
  if (capasEnMemoria) {
    return capasEnMemoria;
  }

  const geoDir = resolverDirectorioGeoJSON();

  const cargarArchivo = (nombre: string): GeoJSONFeatureCollection => {
    const ruta = path.join(geoDir, nombre);
    if (!fs.existsSync(ruta)) {
      throw new Error(`Archivo GeoJSON no encontrado: ${ruta}`);
    }
    const raw = fs.readFileSync(ruta, 'utf-8');
    return JSON.parse(raw) as GeoJSONFeatureCollection;
  };

  capasEnMemoria = {
    limitePartido: cargarArchivo('limite-partido-3f.geojson'),
    zonificacion: cargarArchivo('zonificacion-2020.geojson'),
    buenAyre: cargarArchivo('buen-ayre-uf12.geojson'),
  };

  return capasEnMemoria;
}

/* ==========================================================================
   SERVICIOS ESPACIALES (TURF.JS)
   ========================================================================== */

/**
 * Evalúa si un par de coordenadas (lat, lng) cae dentro del Partido de Tres de Febrero.
 * @param lat Latitud (ej: -34.6061)
 * @param lng Longitud (ej: -58.5645)
 */
export function estaEnTresDeFebrero(lat: number, lng: number): boolean {
  const capas = obtenerCapasGeo();
  const pt = point([lng, lat]);

  for (const feature of capas.limitePartido.features) {
    if (booleanPointInPolygon(pt, feature.geometry)) {
      return true;
    }
  }

  return false;
}

/**
 * Clasifica una coordenada según la Ordenanza de Zonificación 2020 y el Plan Buen Ayre (U.F. 12).
 * @param lat Latitud
 * @param lng Longitud
 */
export function determinarZonaMunicipal(lat: number, lng: number): ResultadoCruceEspacial {
  const dentroPartido = estaEnTresDeFebrero(lat, lng);
  if (!dentroPartido) {
    return {
      dentroPartido: false,
      zona: null,
      aptoLogistica: false,
    };
  }

  const capas = obtenerCapasGeo();
  const pt = point([lng, lat]);

  // 1. Verificar primero si pertenece a los sectores logísticos del Plan Buen Ayre (RC1, RC2, RC3)
  let sectorBuenAyre: 'RC1' | 'RC2' | 'RC3' | null = null;
  let aptoLogistica = false;

  for (const feature of capas.buenAyre.features) {
    if (booleanPointInPolygon(pt, feature.geometry)) {
      const codigo = feature.properties.codigo;
      if (codigo === 'RC1' || codigo === 'RC2' || codigo === 'RC3') {
        sectorBuenAyre = codigo;
        aptoLogistica = true;
        break;
      }
    }
  }

  // 2. Verificar zonificación general 2020 (C1..C3, RMI1..RMI3, R1..R2)
  let zona: ZonaCodigo | null = sectorBuenAyre ?? null;
  let nombreZona: string | undefined = sectorBuenAyre ? `Sector Buen Ayre ${sectorBuenAyre}` : undefined;
  let categoriaZona: 'comercial' | 'industrial' | 'residencial' | undefined = sectorBuenAyre ? 'industrial' : undefined;
  let macrozona: Macrozona | null = null;

  for (const feature of capas.zonificacion.features) {
    if (booleanPointInPolygon(pt, feature.geometry)) {
      const codigo = feature.properties.codigo as ZonaCodigo;
      zona = codigo;
      nombreZona = feature.properties.nombre;
      categoriaZona = feature.properties.categoria;
      macrozona = feature.properties.macrozona ?? null;
      if (codigo === 'RMI1' || codigo === 'RMI2' || codigo === 'RMI3' || sectorBuenAyre) {
        aptoLogistica = true;
      }
      break;
    }
  }

  return {
    dentroPartido: true,
    zona,
    nombreZona,
    categoriaZona,
    macrozona,
    sectorBuenAyre,
    aptoLogistica,
  };
}

/**
 * Calcula la distancia geodésica en metros entre dos coordenadas geográficas.
 * Utilizado por la heurística de deduplicación (tolerancia <= 80 metros).
 */
export function calcularDistanciaMetros(coord1: [number, number], coord2: [number, number]): number {
  const p1 = point([coord1[1], coord1[0]]); // [lng, lat]
  const p2 = point([coord2[1], coord2[0]]); // [lng, lat]
  return turfDistance(p1, p2, { units: 'meters' });
}

/* ==========================================================================
   CLIENTE RESILIENTE DE GEOCODIFICACIÓN (API GEOREF ARGENTINA)
   ========================================================================== */

interface GeorefApiRespuesta {
  cantidad: number;
  total: number;
  direcciones: Array<{
    altura?: { valor?: number | null } | null;
    calle?: { nombre?: string | null } | null;
    departamento?: { nombre?: string | null } | null;
    provincia?: { nombre?: string | null } | null;
    nomenclatura?: string | null;
    ubicacion?: {
      lat?: number | null;
      lon?: number | null;
    } | null;
  }>;
}

/**
 * Geocodifica una dirección física contra la API oficial de Georef Argentina
 * con filtro estricto por departamento 'Tres de Febrero' y provincia 'Buenos Aires'.
 * Incluye timeout defensivo de 3.5 segundos y caché en memoria.
 */
export async function geocodificarDireccion(
  direccion: string,
  localidad?: string
): Promise<ResultadoGeocodificacion | null> {
  const direccionLimpia = direccion.trim();
  if (!direccionLimpia) {
    return null;
  }

  const cacheKey = `${direccionLimpia.toLowerCase()}__${(localidad || '').trim().toLowerCase()}`;
  if (cacheGeoref.has(cacheKey)) {
    return cacheGeoref.get(cacheKey) ?? null;
  }

  // Limpiar caché si supera el tamaño máximo
  if (cacheGeoref.size >= MAX_CACHE_SIZE) {
    cacheGeoref.clear();
  }

  try {
    const url = new URL('https://apis.datos.gob.ar/georef/api/direcciones');
    url.searchParams.set('direccion', direccionLimpia);
    url.searchParams.set('departamento', 'Tres de Febrero');
    url.searchParams.set('provincia', 'Buenos Aires');
    url.searchParams.set('max', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Inmuebles3F-Backend/1.0',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[GeoService] Georef devolvió estado HTTP ${res.status} para: ${direccionLimpia}`);
      cacheGeoref.set(cacheKey, null);
      return null;
    }

    const data = (await res.json()) as GeorefApiRespuesta;

    if (!data.direcciones || data.direcciones.length === 0) {
      cacheGeoref.set(cacheKey, null);
      return null;
    }

    const primera = data.direcciones[0];
    const lat = primera.ubicacion?.lat;
    const lng = primera.ubicacion?.lon;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      cacheGeoref.set(cacheKey, null);
      return null;
    }

    const resultado: ResultadoGeocodificacion = {
      lat,
      lng,
      direccionNormalizada: primera.nomenclatura || direccionLimpia,
      calle: primera.calle?.nombre || undefined,
      altura: primera.altura?.valor || undefined,
      localidad: localidad || 'Caseros',
      departamento: primera.departamento?.nombre || 'Tres de Febrero',
      provincia: primera.provincia?.nombre || 'Buenos Aires',
      fuente: 'georef_argentina',
    };

    cacheGeoref.set(cacheKey, resultado);
    return resultado;
  } catch (error) {
    console.warn(
      `[GeoService] Error al geocodificar con Georef (${direccionLimpia}):`,
      error instanceof Error ? error.message : error
    );
    cacheGeoref.set(cacheKey, null);
    return null;
  }
}

/* ==========================================================================
   ORQUESTADOR DE NORMALIZACIÓN DE UBICACIÓN
   ========================================================================== */

/**
 * Normaliza la ubicación completa de un aviso o inmueble:
 * 1. Resuelve coordenadas vía Georef si faltan o son inválidas.
 * 2. Cruza con las capas oficiales de zonificación y Buen Ayre.
 * 3. Retorna la estructura estandarizada lista para persistencia.
 */
export async function normalizarUbicacionInmueble(
  input: NormalizarUbicacionInput
): Promise<UbicacionNormalizada | null> {
  let lat = input.lat;
  let lng = input.lng;
  let direccionNormalizada = input.direccion.trim();
  let geocodificado = false;

  // Rango geográfico razonable para Tres de Febrero / AMBA
  const coordenadasValidas =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -34.8 &&
    lat <= -34.4 &&
    lng >= -58.8 &&
    lng <= -58.4;

  if (!coordenadasValidas) {
    const geo = await geocodificarDireccion(input.direccion, input.localidad);
    if (!geo) {
      return null;
    }
    lat = geo.lat;
    lng = geo.lng;
    direccionNormalizada = geo.direccionNormalizada;
    geocodificado = true;
  }

  // Garantizar valores no nulos
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const cruce = determinarZonaMunicipal(lat, lng);

  return {
    lat,
    lng,
    direccionNormalizada,
    localidad: input.localidad || 'Caseros',
    dentroPartido: cruce.dentroPartido,
    zona: cruce.zona,
    nombreZona: cruce.nombreZona,
    categoriaZona: cruce.categoriaZona,
    macrozona: cruce.macrozona,
    sectorBuenAyre: cruce.sectorBuenAyre,
    aptoLogistica: cruce.aptoLogistica,
    geocodificado,
  };
}
