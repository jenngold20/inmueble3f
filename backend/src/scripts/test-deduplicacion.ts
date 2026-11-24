import { Op } from 'sequelize';
import {
  evaluarCoincidenciaInmueble,
  compararAvisoConInmueble,
  calcularDistanciaMetros,
  construirFiltroCandidatos,
  margenBoundingBoxGrados,
  type AvisoParaDeduplicar,
  type InmuebleCandidato,
  DISTANCIA_GEODESICA_MAXIMA_METROS,
  TOLERANCIA_SUPERFICIE_MAXIMA,
} from '../services/deduplicacion.service.js';
import { TestRunner } from './test-helpers.js';

console.log('🧪 ========================================================');
console.log('   SUITE DE PRUEBAS DE DEDUPLICACIÓN ESPACIAL TURF.JS');
console.log('   [CARD-ING-03A] + PRE-FILTRO BBOX [CARD-PERF-01]');
console.log('   Plataforma Inmobiliaria Tres de Febrero');
console.log('========================================================\n');

const runner = new TestRunner('Deduplicación Espacial');
const assert = (condition: boolean, testName: string, details?: string) =>
  runner.assert(condition, testName, details);

const METROS_POR_GRADO_LATITUD_TEST = 111_320;
const RADIANES_POR_GRADO = Math.PI / 180;

function leerRango(valor: unknown): [number, number] | null {
  if (!Array.isArray(valor) || valor.length !== 2) return null;

  const [minimo, maximo] = valor;
  return typeof minimo === 'number' && typeof maximo === 'number'
    ? [minimo, maximo]
    : null;
}

function esRangoSimetrico(rango: [number, number], centro: number): boolean {
  return Math.abs(centro - rango[0] - (rango[1] - centro)) < 1e-12;
}

// Coordenadas base de prueba: Centro de Caseros (Tres de Febrero)
// Av. San Martín y Urquiza: lat: -34.6037, lng: -58.5626
const COORD_BASE = { lat: -34.6037, lng: -58.5626 };

// Cálculo de offset aproximado para 80m en latitud:
// 1 grado latitud ≈ 111.000 metros -> 1 metro ≈ 0.000009 grados
// 79 metros ≈ 0.00071 grados
// 82 metros ≈ 0.00074 grados
const COORD_79M = { lat: COORD_BASE.lat + 0.00071, lng: COORD_BASE.lng };
const COORD_82M = { lat: COORD_BASE.lat + 0.00074, lng: COORD_BASE.lng };

console.log(`📏 [VERIFICACIÓN GEODÉSICA DE PUNTOS]:`);
const dist79 = calcularDistanciaMetros(COORD_BASE, COORD_79M);
const dist82 = calcularDistanciaMetros(COORD_BASE, COORD_82M);
console.log(`   - Punto 1 (79m aprox): ${dist79} metros (esperado <= 80m)`);
console.log(`   - Punto 2 (82m aprox): ${dist82} metros (esperado > 80m)\n`);

/* ==========================================================================
   CASO 1: MATCH EXACTO
   ========================================================================== */
console.log('--- TEST 1: Match Exacto (Misma Parcela, Mismo Galpón) ---');
const aviso1: AvisoParaDeduplicar = {
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: COORD_BASE.lat,
  lng: COORD_BASE.lng,
  superficieCubiertaM2: 800,
  superficieTotalM2: 1000,
  direccion: 'Av. San Martín 2500',
};

const candidato1: InmuebleCandidato = {
  id: 'inmueble-uuid-1',
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: COORD_BASE.lat,
  lng: COORD_BASE.lng,
  superficieCubiertaM2: 800,
  superficieTotalM2: 1000,
  direccion: 'Av. San Martín 2500',
};

const res1 = compararAvisoConInmueble(aviso1, candidato1);
assert(
  res1.coincide === true && res1.distanciaMetros === 0 && res1.diferenciaSuperficiePorcentaje === 0,
  'Caso 1: Detecta coincidencia perfecta idéntica',
  res1.detalle
);

/* ==========================================================================
   CASO 2: MATCH EN LÍMITE DE DISTANCIA (79m <= 80m)
   ========================================================================== */
console.log('\n--- TEST 2: Match Límite Geodésico (<= 80 metros) ---');
const aviso2: AvisoParaDeduplicar = {
  ...aviso1,
  lat: COORD_79M.lat,
  lng: COORD_79M.lng,
};

const res2 = compararAvisoConInmueble(aviso2, candidato1);
assert(
  res2.coincide === true && res2.distanciaMetros <= DISTANCIA_GEODESICA_MAXIMA_METROS,
  `Caso 2: Acepta aviso a distancia límite (${res2.distanciaMetros}m <= 80m)`,
  res2.detalle
);

/* ==========================================================================
   CASO 3: DESCARTE POR DISTANCIA EXCEDIDA (> 80m)
   ========================================================================== */
console.log('\n--- TEST 3: Descarte por Distancia Excedida (> 80 metros) ---');
const aviso3: AvisoParaDeduplicar = {
  ...aviso1,
  lat: COORD_82M.lat,
  lng: COORD_82M.lng,
};

const res3 = compararAvisoConInmueble(aviso3, candidato1);
assert(
  res3.coincide === false &&
    res3.motivoDescarte === 'DISTANCIA_EXCEDIDA' &&
    res3.distanciaMetros > DISTANCIA_GEODESICA_MAXIMA_METROS,
  `Caso 3: Rechaza aviso por distancia (${res3.distanciaMetros}m > 80m)`,
  res3.detalle
);

/* ==========================================================================
   CASO 4: MATCH EN LÍMITE DE SUPERFICIE (+4.8% <= 5%)
   ========================================================================== */
console.log('\n--- TEST 4: Match Límite de Tolerancia de Superficie (+4.8% <= 5%) ---');
// Candidato: 1000 m2. Aviso: 1048 m2 (+4.8%)
const aviso4: AvisoParaDeduplicar = {
  ...aviso1,
  superficieCubiertaM2: 1048,
  superficieTotalM2: null,
};
const candidato4: InmuebleCandidato = {
  ...candidato1,
  superficieCubiertaM2: 1000,
  superficieTotalM2: null,
};

const res4 = compararAvisoConInmueble(aviso4, candidato4);
assert(
  res4.coincide === true &&
    res4.diferenciaSuperficiePorcentaje !== null &&
    res4.diferenciaSuperficiePorcentaje <= TOLERANCIA_SUPERFICIE_MAXIMA * 100,
  `Caso 4: Acepta aviso con diferencia de superficie de ${res4.diferenciaSuperficiePorcentaje}% (<= 5%)`,
  res4.detalle
);

/* ==========================================================================
   CASO 5: DESCARTE POR SUPERFICIE FUERA DE TOLERANCIA (+5.5% > 5%)
   ========================================================================== */
console.log('\n--- TEST 5: Descarte por Superficie Fuera de Tolerancia (+5.5% > 5%) ---');
// Candidato: 1000 m2. Aviso: 1055 m2 (+5.5%)
const aviso5: AvisoParaDeduplicar = {
  ...aviso1,
  superficieCubiertaM2: 1055,
  superficieTotalM2: null,
};

const res5 = compararAvisoConInmueble(aviso5, candidato4);
assert(
  res5.coincide === false &&
    res5.motivoDescarte === 'SUPERFICIE_FUERA_TOLERANCIA' &&
    (res5.diferenciaSuperficiePorcentaje ?? 0) > 5,
  `Caso 5: Rechaza aviso por superar tolerancia (${res5.diferenciaSuperficiePorcentaje}% > 5%)`,
  res5.detalle
);

/* ==========================================================================
   CASO 6: DESCARTE POR TIPOLOGÍA DISTINTA (Local vs Galpón)
   ========================================================================== */
console.log('\n--- TEST 6: Descarte por Tipología Distinta (Local vs Galpón) ---');
const aviso6: AvisoParaDeduplicar = {
  ...aviso1,
  tipo: 'local', // Diferente tipología en la misma coordenada
};

const res6 = compararAvisoConInmueble(aviso6, candidato1);
assert(
  res6.coincide === false && res6.motivoDescarte === 'TIPO_DISTINTO',
  'Caso 6: Rechaza aviso por tipología distinta en misma coordenada',
  res6.detalle
);

/* ==========================================================================
   CASO 7: DESCARTE POR LOCALIDAD DISTINTA
   ========================================================================== */
console.log('\n--- TEST 7: Descarte por Localidad Distinta ---');
const aviso7: AvisoParaDeduplicar = {
  ...aviso1,
  localidad: 'Santos Lugares',
};

const res7 = compararAvisoConInmueble(aviso7, candidato1);
assert(
  res7.coincide === false && res7.motivoDescarte === 'LOCALIDAD_DISTINTA',
  'Caso 7: Rechaza aviso por localidad distinta (Caseros vs Santos Lugares)',
  res7.detalle
);

/* ==========================================================================
   CASO 8: DESEMPATE MULTI-CANDIDATO (Selección del más cercano)
   ========================================================================== */
console.log('\n--- TEST 8: Desempate Multi-Candidato Óptimo ---');
const candA: InmuebleCandidato = {
  id: 'cand-A-50m',
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: COORD_BASE.lat + 0.00045, // ~50 metros
  lng: COORD_BASE.lng,
  superficieCubiertaM2: 810,
};

const candB: InmuebleCandidato = {
  id: 'cand-B-12m',
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: COORD_BASE.lat + 0.00010, // ~11 metros
  lng: COORD_BASE.lng,
  superficieCubiertaM2: 805,
};

const resMulti = evaluarCoincidenciaInmueble(aviso1, [candA, candB]);
assert(
  resMulti.coincide === true &&
    resMulti.inmuebleCoincidente?.id === 'cand-B-12m' &&
    (resMulti.distanciaMetros ?? 999) < 20,
  `Caso 8: Desempate selecciona candidato B (más cercano: ${resMulti.distanciaMetros}m vs cand A)`,
  `Elegido: ${resMulti.inmuebleCoincidente?.id} (${resMulti.distanciaMetros}m)`
);

/* ==========================================================================
   CASO 9: TOLERANCIA DE NORMALIZACIÓN DE TEXTO (Tildes y Mayúsculas)
   ========================================================================== */
console.log('\n--- TEST 9: Normalización de Localidad (Tildes y Mayúsculas) ---');
const aviso9: AvisoParaDeduplicar = {
  ...aviso1,
  localidad: 'CASEROS',
};
const cand9: InmuebleCandidato = {
  ...candidato1,
  localidad: '  caseros  ',
};
const res9 = compararAvisoConInmueble(aviso9, cand9);
assert(
  res9.coincide === true,
  'Caso 9: Normalización de texto valida localidades con diferente casing y espacios'
);

/* ==========================================================================
   CASO 10: BENCHMARK DE RENDIMIENTO (1.000 Comparaciones en Memoria)
   ========================================================================== */
console.log('\n--- TEST 10: Benchmark de Rendimiento en Memoria ---');
const candidatosMock: InmuebleCandidato[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `mock-${i}`,
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: COORD_BASE.lat + (Math.random() - 0.5) * 0.01,
  lng: COORD_BASE.lng + (Math.random() - 0.5) * 0.01,
  superficieCubiertaM2: 780 + (i % 50),
}));

const t0 = performance.now();
const resBench = evaluarCoincidenciaInmueble(aviso1, candidatosMock);
const t1 = performance.now();
const tiempoTotalMs = Math.round((t1 - t0) * 100) / 100;
const tiempoPromedioPorItemMs = Math.round(((t1 - t0) / 1000) * 10000) / 10000;

assert(
  tiempoTotalMs < 25,
  `Caso 10: 1.000 comparaciones espaciales en ${tiempoTotalMs} ms (${tiempoPromedioPorItemMs} ms/evaluación)`,
  `Candidatos evaluados: ${resBench.candidatosEvaluados}`
);

/* ==========================================================================
   CARD-PERF-01: PRE-FILTRO SQL POR BOUNDING BOX
   ========================================================================== */

console.log('\n--- TEST 11: Margen del BBox derivado del umbral (Caseros) ---');
const margenCaseros = margenBoundingBoxGrados(COORD_BASE.lat);
const ladoLatMetros = margenCaseros.latDelta * METROS_POR_GRADO_LATITUD_TEST;
const ladoLngMetros =
  margenCaseros.lngDelta *
  METROS_POR_GRADO_LATITUD_TEST *
  Math.cos(COORD_BASE.lat * RADIANES_POR_GRADO);

assert(
  ladoLatMetros >= DISTANCIA_GEODESICA_MAXIMA_METROS &&
    ladoLatMetros <= 150 &&
    ladoLngMetros >= DISTANCIA_GEODESICA_MAXIMA_METROS &&
    ladoLngMetros <= 150,
  'Caso 11: El lado del bbox cae entre 80 m y 150 m en ambos ejes',
  `lat: ${ladoLatMetros.toFixed(2)} m | lng: ${ladoLngMetros.toFixed(2)} m`
);

console.log('\n--- TEST 12: Invariante de radio (8 puntos a 79 m) ---');
let puntosDentroDelBbox = 0;

for (let indice = 0; indice < 8; indice++) {
  const rumbo = (indice * Math.PI) / 4;
  const deltaLat = (79 * Math.cos(rumbo)) / METROS_POR_GRADO_LATITUD_TEST;
  const deltaLng =
    (79 * Math.sin(rumbo)) /
    (METROS_POR_GRADO_LATITUD_TEST * Math.cos(COORD_BASE.lat * RADIANES_POR_GRADO));

  if (
    Math.abs(deltaLat) <= margenCaseros.latDelta &&
    Math.abs(deltaLng) <= margenCaseros.lngDelta
  ) {
    puntosDentroDelBbox++;
  }
}

assert(
  puntosDentroDelBbox === 8,
  'Caso 12: Los 8 puntos a 79 m caen dentro del bbox',
  `Puntos contenidos: ${puntosDentroDelBbox}/8`
);

console.log('\n--- TEST 13: Contrato del filtro (tipo + límites simétricos) ---');
const filtroCandidatos = construirFiltroCandidatos(aviso1) as unknown as {
  tipo?: unknown;
  lat?: Record<symbol, unknown>;
  lng?: Record<symbol, unknown>;
};
const rangoLat = leerRango(filtroCandidatos.lat?.[Op.between]);
const rangoLng = leerRango(filtroCandidatos.lng?.[Op.between]);

assert(
  filtroCandidatos.tipo === aviso1.tipo &&
    rangoLat !== null &&
    rangoLng !== null &&
    esRangoSimetrico(rangoLat, aviso1.lat) &&
    esRangoSimetrico(rangoLng, aviso1.lng),
  'Caso 13: El where filtra por tipo y por límites simétricos de lat/lng',
  `tipo=${String(filtroCandidatos.tipo)} | lat=[${rangoLat?.join(', ') ?? 'n/a'}] | ` +
    `lng=[${rangoLng?.join(', ') ?? 'n/a'}]`
);

console.log('\n--- TEST 14: Contrato D2: la localidad no se filtra en SQL ---');
assert(
  !Object.prototype.hasOwnProperty.call(filtroCandidatos, 'localidad'),
  'Caso 14: El where no contiene localidad (decisión D2 de CARD-PERF-01)',
  'Reintroducirla exige pasar por CARD-PERF-02'
);

console.log('\n--- TEST 15: Guard de latitud alta (cos acotado) ---');
const margenPoloSur = margenBoundingBoxGrados(-89.999);
const margenPoloNorte = margenBoundingBoxGrados(90);

function margenPolarEsSano(margen: { latDelta: number; lngDelta: number }): boolean {
  return (
    Number.isFinite(margen.latDelta) &&
    Number.isFinite(margen.lngDelta) &&
    margen.latDelta > 0 &&
    margen.lngDelta > 0 &&
    margen.lngDelta <= 0.1 &&
    margen.lngDelta >= margen.latDelta
  );
}

assert(
  margenPolarEsSano(margenPoloSur) && margenPolarEsSano(margenPoloNorte),
  'Caso 15: El margen sigue siendo finito y acotado cerca de los polos',
  `sur: latDelta=${margenPoloSur.latDelta.toFixed(6)}, lngDelta=${margenPoloSur.lngDelta.toFixed(6)} | ` +
    `norte: latDelta=${margenPoloNorte.latDelta.toFixed(6)}, lngDelta=${margenPoloNorte.lngDelta.toFixed(6)}`
);

/* ==========================================================================
   RESUMEN FINAL DE LA SUITE
   ========================================================================== */
runner.imprimirResumen();
