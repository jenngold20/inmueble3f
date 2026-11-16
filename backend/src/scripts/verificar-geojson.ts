import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Helper para resolver rutas relativas en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GEOJSON_DIR = path.resolve(__dirname, '../../../data/geojson');

interface GeoJSONFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONFeatureCollection {
  type: string;
  name?: string;
  features: GeoJSONFeature[];
}

function cargarYValidarGeoJSON(nombreArchivo: string): GeoJSONFeatureCollection {
  const rutaCompleta = path.join(GEOJSON_DIR, nombreArchivo);
  if (!fs.existsSync(rutaCompleta)) {
    throw new Error(`Archivo GeoJSON no encontrado: ${rutaCompleta}`);
  }

  const raw = fs.readFileSync(rutaCompleta, 'utf-8');
  const data: GeoJSONFeatureCollection = JSON.parse(raw);

  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`El archivo ${nombreArchivo} no es un FeatureCollection válido.`);
  }

  // Validar cierre de polígonos
  for (const [index, feature] of data.features.entries()) {
    if (feature.geometry.type === 'Polygon') {
      const ring = feature.geometry.coordinates[0];
      const primero = ring[0];
      const ultimo = ring[ring.length - 1];
      if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
        throw new Error(
          `Polígono abierto detectado en ${nombreArchivo} (Feature #${index}): primer punto (${primero}) !== último punto (${ultimo})`
        );
      }
    }
  }

  return data;
}

async function main() {
  console.log('🌍 Iniciando Verificación de Capas GeoJSON de Tres de Febrero...\n');

  // 1. Cargar y verificar integridad estructural de los 3 archivos
  console.log('1️⃣ Cargando y validando archivos en /data/geojson:');
  const limitePartido = cargarYValidarGeoJSON('limite-partido-3f.geojson');
  console.log(`   ✅ limite-partido-3f.geojson cargado (${limitePartido.features.length} features, polígono cerrado).`);

  const zonificacion = cargarYValidarGeoJSON('zonificacion-2020.geojson');
  console.log(`   ✅ zonificacion-2020.geojson cargado (${zonificacion.features.length} zonas oficiales validadas).`);

  const buenAyre = cargarYValidarGeoJSON('buen-ayre-uf12.geojson');
  console.log(`   ✅ buen-ayre-uf12.geojson cargado (${buenAyre.features.length} sectores del Plan U.F. 12 validados).`);

  // 2. Coordenadas de prueba representativas
  const casosDePrueba = [
    {
      nombre: 'Caseros Centro (Plaza de la Unidad Nacional / Av. San Martín)',
      coord: [-58.5645, -34.6061], // [lng, lat]
      esperaEnPartido: true,
      zonaEsperada: 'C1',
    },
    {
      nombre: 'Villa Bosch / Polo Productivo Caseros Sur',
      coord: [-58.5830, -34.5880],
      esperaEnPartido: true,
      zonaEsperada: 'RMI2',
    },
    {
      nombre: 'Loma Hermosa (Zona Industrial Intensiva)',
      coord: [-58.5980, -34.5620],
      esperaEnPartido: true,
      zonaEsperada: 'RMI3',
    },
    {
      nombre: 'Sector Camino del Buen Ayre & Arroyo Morón (Logística Pesada)',
      coord: [-58.6210, -34.5730],
      esperaEnPartido: true,
      sectorBuenAyreEsperado: 'RC1',
    },
    {
      nombre: 'Ramos Mejía (Partido de La Matanza - Exterior Sur)',
      coord: [-58.5650, -34.6550],
      esperaEnPartido: false,
    },
    {
      nombre: 'Villa Devoto (Ciudad Autónoma de Buenos Aires - Exterior Este)',
      coord: [-58.5050, -34.5950],
      esperaEnPartido: false,
    },
  ];

  console.log('\n2️⃣ Ejecutando Pruebas de Intersección Espacial con Turf.js:');

  const inicioTotal = performance.now();
  let casosExitosos = 0;

  for (const caso of casosDePrueba) {
    const pt = point(caso.coord);

    // Evaluar si cae dentro del partido
    const poligonoPartido = limitePartido.features[0];
    const estaEnPartido = booleanPointInPolygon(pt, poligonoPartido as any);

    if (estaEnPartido !== caso.esperaEnPartido) {
      throw new Error(
        `Fallo en límite de partido para "${caso.nombre}": se esperaba ${caso.esperaEnPartido} pero se obtuvo ${estaEnPartido}.`
      );
    }

    if (estaEnPartido) {
      // Buscar zona en zonificacion-2020
      let zonaDetectada: string | null = null;
      for (const feature of zonificacion.features) {
        if (booleanPointInPolygon(pt, feature as any)) {
          zonaDetectada = feature.properties.codigo as string;
          break;
        }
      }

      // Buscar si cae en Buen Ayre
      let sectorBuenAyre: string | null = null;
      for (const feature of buenAyre.features) {
        if (booleanPointInPolygon(pt, feature as any)) {
          sectorBuenAyre = feature.properties.codigo as string;
          break;
        }
      }

      if (caso.zonaEsperada && zonaDetectada !== caso.zonaEsperada) {
        throw new Error(
          `Fallo en zona de "${caso.nombre}": esperada ${caso.zonaEsperada}, detectada ${zonaDetectada}`
        );
      }

      if (caso.sectorBuenAyreEsperado && sectorBuenAyre !== caso.sectorBuenAyreEsperado) {
        throw new Error(
          `Fallo en sector Buen Ayre de "${caso.nombre}": esperado ${caso.sectorBuenAyreEsperado}, detectado ${sectorBuenAyre}`
        );
      }

      console.log(
        `   ✅ [DENTRO 3F] ${caso.nombre} -> Zona: ${zonaDetectada ?? 'Sin zona'} | Buen Ayre: ${
          sectorBuenAyre ?? 'No aplica'
        }`
      );
    } else {
      console.log(`   ✅ [FUERA DE EJIDO] ${caso.nombre} -> Excluido correctamente de Tres de Febrero.`);
    }

    casosExitosos++;
  }

  const finTotal = performance.now();
  const duracionMs = (finTotal - inicioTotal).toFixed(2);

  console.log(`\n3️⃣ Rendimiento y Benchmark de Rendimiento:`);
  console.log(`   - Casos evaluados: ${casosExitosos}/${casosDePrueba.length}`);
  console.log(`   - Tiempo total de evaluación: ${duracionMs} ms (${(parseFloat(duracionMs) / casosDePrueba.length).toFixed(3)} ms por coordenada)`);
  console.log(`   - Algoritmo: @turf/boolean-point-in-polygon (Memoria nativa Node.js, CERO latencia DB).`);

  console.log('\n🎉 ¡TODAS LAS CAPAS GEOJSON Y CRUCES ESPACIALES FUERON VALIDADOS EXITOSAMENTE!');
}

main().catch((err) => {
  console.error('❌ Error en verificación GeoJSON:', err);
  process.exit(1);
});

