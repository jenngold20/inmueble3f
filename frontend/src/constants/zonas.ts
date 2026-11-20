import type { ZonaCodigo } from '../schemas/inmueble.schema';

export interface ZonaInfo {
  /** Nombre oficial de la zona (docs/DOMINIOS_Y_DATOS.md). */
  etiqueta: string;
  /** Color de la capa en el mapa (properties.color de /data/geojson). Solo decorativo: el código siempre se muestra como texto. */
  color: string;
}

export const ZONA_INFO: Record<ZonaCodigo, ZonaInfo> = {
  C1: { etiqueta: 'Área de Centralidad', color: '#E65100' },
  C2: { etiqueta: 'Corredor Concentrador de Actividades', color: '#FB8C00' },
  C3: { etiqueta: 'Centros Comerciales', color: '#FFA726' },
  R1a: { etiqueta: 'Residencial de Densidad Media y baja altura', color: '#78909C' },
  R1b: { etiqueta: 'Residencial de Baja Densidad', color: '#78909C' },
  R2a: { etiqueta: 'Residencial de Alta Densidad', color: '#90A4AE' },
  R2b: { etiqueta: 'Residencial de Densidad Media Alta', color: '#90A4AE' },
  RMI1: { etiqueta: 'Residencial Mixto Industrial de Baja Densidad', color: '#5E35B1' },
  RMI2: { etiqueta: 'Residencial Mixto Industrial de Media Densidad', color: '#7E57C2' },
  RMI3: { etiqueta: 'Residencial Mixto Industrial de Alta Densidad', color: '#9575CD' },
  RC1: { etiqueta: 'Sector RC 1 - Camino del Buen Ayre', color: '#1E88E5' },
  RC2: { etiqueta: 'Sector RC 2 - Camino del Buen Ayre', color: '#1565C0' },
  RC3: { etiqueta: 'Sector RC 3 - Camino del Buen Ayre', color: '#0D47A1' },
};
