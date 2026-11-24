import {
  estaEnTresDeFebrero,
  determinarZonaMunicipal,
  calcularDistanciaMetros,
  geocodificarDireccion,
  normalizarUbicacionInmueble,
} from '../services/geo.service.js';
import { TestRunner } from './test-helpers.js';

async function main() {
  console.log('🧪 ========================================================');
  console.log('   SUITE DE PRUEBAS DEL SERVICIO GEOESPACIAL (CARD-GEO-06)');
  console.log('   Plataforma Inmobiliaria Tres de Febrero');
  console.log('========================================================\n');

  const runner = new TestRunner('Servicio Geoespacial');
  const assert = (cond: boolean, mensaje: string) => runner.assert(cond, mensaje);

  // --------------------------------------------------------------------------
  // TEST 1: Delimitación de Partido (estaEnTresDeFebrero)
  // --------------------------------------------------------------------------
  console.log('1️⃣ Verificando delimitación perimetral (estaEnTresDeFebrero):');
  const enCaseros = estaEnTresDeFebrero(-34.6061, -58.5645);
  assert(enCaseros === true, 'Caseros Centro (-34.6061, -58.5645) está DENTRO de 3F');

  const enBuenAyre = estaEnTresDeFebrero(-34.575, -58.618);
  assert(enBuenAyre === true, 'Camino del Buen Ayre (-34.5750, -58.6180) está DENTRO de 3F');

  const enRamosMejia = estaEnTresDeFebrero(-34.65, -58.565);
  assert(enRamosMejia === false, 'Ramos Mejía (-34.6500, -58.5650) está FUERA de 3F');

  const enDevoto = estaEnTresDeFebrero(-34.595, -58.51);
  assert(enDevoto === false, 'Villa Devoto CABA (-34.5950, -58.5100) está FUERA de 3F');

  // --------------------------------------------------------------------------
  // TEST 2: Asignación de Zonificación Municipal y Buen Ayre
  // --------------------------------------------------------------------------
  console.log('\n2️⃣ Verificando clasificación normativa (determinarZonaMunicipal):');
  const zonaCaseros = determinarZonaMunicipal(-34.6061, -58.5645);
  assert(zonaCaseros.zona === 'C1', `Caseros clasifica como C1 (obtenido: ${zonaCaseros.zona})`);
  assert(zonaCaseros.categoriaZona === 'comercial', `Caseros categoría comercial (obtenido: ${zonaCaseros.categoriaZona})`);

  const zonaBosch = determinarZonaMunicipal(-34.588, -58.583);
  assert(zonaBosch.zona === 'RMI2', `Villa Bosch clasifica como RMI2 (obtenido: ${zonaBosch.zona})`);
  assert(zonaBosch.aptoLogistica === true, 'Villa Bosch RMI2 califica como apto logística/productiva');

  const zonaHermosa = determinarZonaMunicipal(-34.568, -58.595);
  assert(zonaHermosa.zona === 'RMI3', `Loma Hermosa clasifica como RMI3 (obtenido: ${zonaHermosa.zona})`);

  const zonaRC1 = determinarZonaMunicipal(-34.575, -58.618);
  assert(zonaRC1.sectorBuenAyre === 'RC1', `Buen Ayre clasifica como sector RC1 (obtenido: ${zonaRC1.sectorBuenAyre})`);
  assert(zonaRC1.aptoLogistica === true, 'Buen Ayre califica como apto logística');

  // --------------------------------------------------------------------------
  // TEST 3: Cálculo Geodésico de Deduplicación
  // --------------------------------------------------------------------------
  console.log('\n3️⃣ Verificando cálculo geodésico para deduplicación:');
  const d50m = calcularDistanciaMetros([-34.6061, -58.5645], [-34.6064, -58.5648]);
  assert(d50m > 30 && d50m < 60, `Distancia calculada: ${d50m.toFixed(1)}m (esperado ~45-55m)`);
  assert(d50m <= 80, `Cumple tolerancia municipal de deduplicación (<= 80m)`);

  // --------------------------------------------------------------------------
  // TEST 4: Geocodificación con API Georef Argentina & Caché
  // --------------------------------------------------------------------------
  console.log('\n4️⃣ Verificando geocodificación con API Georef y memoria caché:');
  const tInicioGeo = performance.now();
  const resGeo = await geocodificarDireccion('Av. San Martin 1500', 'Caseros');
  const tFinGeo = performance.now();

  assert(resGeo !== null, 'Georef resolvió la dirección "Av. San Martin 1500"');
  if (resGeo) {
    assert(typeof resGeo.lat === 'number' && typeof resGeo.lng === 'number', 'Devuelve coordenadas numéricas válidas');
    assert(resGeo.departamento === 'Tres de Febrero', 'Pertenece al departamento Tres de Febrero');
    console.log(`      📍 Coordenadas resueltas: [${resGeo.lat}, ${resGeo.lng}] en ${(tFinGeo - tInicioGeo).toFixed(1)} ms`);
    console.log(`      📍 Nomenclatura oficial: "${resGeo.direccionNormalizada}"`);
  }

  // Prueba de caché (segunda llamada inmediata)
  const tInicioCache = performance.now();
  const resGeoCache = await geocodificarDireccion('Av. San Martin 1500', 'Caseros');
  const tFinCache = performance.now();
  const duracionCache = tFinCache - tInicioCache;
  assert(resGeoCache !== null, 'Segunda consulta recupera resultado de caché');
  assert(duracionCache < 2, `Caché respondió instantáneamente en ${duracionCache.toFixed(3)} ms (< 2 ms)`);

  // Prueba de dirección inexistente (manejo seguro sin caída)
  const resInexistente = await geocodificarDireccion('CalleInexistenteFalsa1234XYZ999', 'Caseros');
  assert(resInexistente === null, 'Dirección no encontrada retorna null de forma segura y sin error no controlado');

  // --------------------------------------------------------------------------
  // TEST 5: Pipeline Completo normalizarUbicacionInmueble
  // --------------------------------------------------------------------------
  console.log('\n5️⃣ Verificando pipeline completo de normalización de inmueble:');
  const normalizado = await normalizarUbicacionInmueble({
    direccion: 'Av. San Martin 1500',
    localidad: 'Caseros',
  });

  assert(normalizado !== null, 'Normalización completa ejecutada con éxito');
  if (normalizado) {
    assert(normalizado.dentroPartido === true, 'Inmueble ubicado dentro de Tres de Febrero');
    assert(normalizado.geocodificado === true, 'Flag geocodificado = true por venir solo con dirección en texto');
    assert(normalizado.zona !== null, `Zona asignada automáticamente: ${normalizado.zona}`);
    console.log(`      🏢 Inmueble normalizado: Zona ${normalizado.zona} (${normalizado.nombreZona || 'Sin nombre'}), Apto Logística: ${normalizado.aptoLogistica}`);
  }

  // --------------------------------------------------------------------------
  // BENCHMARK DE RENDIMIENTO TURF.JS EN MEMORIA
  // --------------------------------------------------------------------------
  console.log('\n⚡ Benchmark de Rendimiento Espacial en Memoria:');
  const ITERACIONES = 1000;
  const tInicioBench = performance.now();
  for (let i = 0; i < ITERACIONES; i++) {
    determinarZonaMunicipal(-34.6061, -58.5645);
  }
  const tFinBench = performance.now();
  const promedioPorPuntoMs = (tFinBench - tInicioBench) / ITERACIONES;
  assert(promedioPorPuntoMs < 0.5, `Promedio por evaluación: ${promedioPorPuntoMs.toFixed(3)} ms (< 0.5 ms por punto)`);

  runner.imprimirResumen();
}

main().catch((err) => {
  console.error('❌ Error fatal en pruebas geoespaciales:', err);
  process.exit(1);
});
