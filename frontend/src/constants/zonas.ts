import type { ZonaCodigo } from '../schemas/inmueble.schema';

export interface ZonaInfo {
  /** Nombre oficial de la zona (docs/DOMINIOS_Y_DATOS.md). */
  etiqueta: string;
  /**
   * Descripción oficial (properties.descripcion de /data/geojson).
   * R1b y R2b no tienen feature en zonificacion-2020.geojson: se usa la etiqueta oficial.
   */
  descripcion: string;
  /** Color de la capa en el mapa (properties.color de /data/geojson). Solo decorativo: el código siempre se muestra como texto. */
  color: string;
}

export const ZONA_INFO: Record<ZonaCodigo, ZonaInfo> = {
  C1: {
    etiqueta: 'Área de Centralidad',
    descripcion: 'Centro cívico, comercial y bancario de Caseros (Av. San Martín, Urquiza y alrededores de la estación)',
    color: '#E65100',
  },
  C2: {
    etiqueta: 'Corredor Concentrador de Actividades',
    descripcion: 'Eje comercial de alta intensidad sobre Av. Rivadavia, Gaona y Marcelo T. de Alvear',
    color: '#FB8C00',
  },
  C3: {
    etiqueta: 'Centros Comerciales',
    descripcion: 'Centro comercial a cielo abierto de Ciudad Jardín Lomas del Palomar (Plaza del Avión / Boulevard San Martín)',
    color: '#FFA726',
  },
  R1a: {
    etiqueta: 'Residencial de Densidad Media y baja altura',
    descripcion: 'Áreas residenciales protegidas de baja altura (Sáenz Peña, Villa Raffo y Ciudad Jardín residencial)',
    color: '#78909C',
  },
  R1b: {
    etiqueta: 'Residencial de Baja Densidad',
    descripcion: 'Residencial de Baja Densidad',
    color: '#78909C',
  },
  R2a: {
    etiqueta: 'Residencial de Alta Densidad',
    descripcion: 'Zona residencial con edificios de vivienda colectiva y comercio barrial de cercanía en Caseros y Ciudadela',
    color: '#90A4AE',
  },
  R2b: {
    etiqueta: 'Residencial de Densidad Media Alta',
    descripcion: 'Residencial de Densidad Media Alta',
    color: '#90A4AE',
  },
  RMI1: {
    etiqueta: 'Residencial Mixto Industrial de Baja Densidad',
    descripcion: 'Zona con talleres livianos, depósitos pequeños y vivienda unifamiliar en Caseros Norte y Santos Lugares',
    color: '#5E35B1',
  },
  RMI2: {
    etiqueta: 'Residencial Mixto Industrial de Media Densidad',
    descripcion: 'Polo productivo medio en Villa Bosch, Martín Coronado y Caseros Sur apto para manufactura y logística media',
    color: '#7E57C2',
  },
  RMI3: {
    etiqueta: 'Residencial Mixto Industrial de Alta Densidad',
    descripcion: 'Zona industrial intensiva en Loma Hermosa, Churruca y El Libertador apta para fábricas y logística pesada',
    color: '#9575CD',
  },
  RC1: {
    etiqueta: 'Sector RC 1 - Camino del Buen Ayre',
    descripcion: 'Delimitado por Arroyo Morón, Las Flores (918), Miramar (979), Autopista Buen Ayre, Río Reconquista y Av. Pte. Perón',
    color: '#1E88E5',
  },
  RC2: {
    etiqueta: 'Sector RC 2 - Camino del Buen Ayre',
    descripcion: 'Delimitado por Juan Lavalle (900), Autopista Buen Ayre, Arroyo Morón y Río Reconquista',
    color: '#1565C0',
  },
  RC3: {
    etiqueta: 'Sector RC 3 - Camino del Buen Ayre',
    descripcion: 'Delimitado hacia Ruta Nacional N° 8 (Av. Eva Perón), Las Flores, Rosella y Entre Ríos',
    color: '#0D47A1',
  },
};
