import L from 'leaflet';
import { TIPO_COLOR_PIN } from './inmuebles';
import type { TipoInmueble } from '../schemas/inmueble.schema';

/** Coordenadas oficiales del centro cívico de Tres de Febrero (Av. San Martín y Urquiza, Caseros) */
export const TRES_DE_FEBRERO_CENTER: [number, number] = [-34.6037, -58.5626];

/** Niveles de zoom calibrados para navegación del partido */
export const INITIAL_ZOOM = 13;
export const MIN_ZOOM = 12;
export const MAX_ZOOM = 18;

/**
 * Bounding Box estricto del Municipio de Tres de Febrero (CARD-MAP-10).
 * Cubre el perímetro oficial y los accesos limítrofes clave (General Paz, San Martín, Morón, Hurlingham).
 * [Sur-Oeste, Norte-Este]
 */
export const BOUNDS_TRES_DE_FEBRERO: L.LatLngBoundsLiteral = [
  [-34.665, -58.65],
  [-34.53, -58.49],
];

export const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Generador de pin SVG/CSS personalizado para Leaflet.
 * Se crea una sola vez por tipo para evitar fugas de memoria o recreaciones en render.
 */
export const crearIconoPin = (color: string): L.DivIcon =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

/** Diccionario de iconos memoizados por tipología de inmueble */
export const ICONOS_POR_TIPO: Record<TipoInmueble, L.DivIcon> = {
  galpon: crearIconoPin(TIPO_COLOR_PIN.galpon),
  local: crearIconoPin(TIPO_COLOR_PIN.local),
  oficina: crearIconoPin(TIPO_COLOR_PIN.oficina),
  terreno: crearIconoPin(TIPO_COLOR_PIN.terreno),
};
