import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contarFiltrosActivos,
  FILTROS_INICIALES,
  parsearNumeroFiltro,
  validarRangosFiltros,
  type FiltrosInmuebles,
} from '../schemas/filtros.schema.js';
import { InmueblesSchema, type Inmueble } from '../schemas/inmueble.schema.js';
import { filtrarInmuebles } from '../hooks/useInmueblesFiltrados.js';
import { obtenerSuperficieDestacada } from '../utils/inmueble.js';

/* ==========================================================================
   SUITE DE PRUEBAS DE FILTROS MULTICRITERIO (CARD-MAP-10)
   Ejecuta validaciones deterministas sobre el mock oficial de 25 inmuebles.
   ========================================================================== */

console.log('🧪 ========================================================');
console.log('   SUITE DE PRUEBAS: FILTROS MULTICRITERIO (CARD-MAP-10)');
console.log('   Plataforma Inmobiliaria Tres de Febrero');
console.log('========================================================\n');

let totalTests = 0;
let testsPasados = 0;

function assert(condicion: boolean, nombre: string, detalle?: string) {
  totalTests++;
  if (condicion) {
    testsPasados++;
    console.log(`  ✅ [PASS] ${nombre}`);
    if (detalle) console.log(`     └─ ${detalle}`);
  } else {
    console.error(`  ❌ [FAIL] ${nombre}`);
    if (detalle) console.error(`     └─ DETALLE: ${detalle}`);
    process.exitCode = 1;
  }
}

// Cargar y validar mock oficial
const __dirname = dirname(fileURLToPath(import.meta.url));
const mockPath = resolve(__dirname, '../mocks/mock-inmuebles.json');
const rawMock = JSON.parse(readFileSync(mockPath, 'utf-8'));
const inmuebles: Inmueble[] = InmueblesSchema.parse(rawMock);

console.log(`📦 Padrón cargado: ${inmuebles.length} inmuebles del mock.\n`);

/* ==========================================================================
   CASOS DE PRUEBA
   ========================================================================== */

console.log('--- TEST 1: Sin filtros aplicados ---');
const res1 = filtrarInmuebles(inmuebles, FILTROS_INICIALES);
assert(
  res1.length === 25,
  'Caso 1: Retorna la totalidad del catálogo (25 inmuebles)',
  `Inmuebles devueltos: ${res1.length}/25`
);

console.log('\n--- TEST 2: Filtrado por Tipo (Galpón) ---');
const filtrosTipo: FiltrosInmuebles = { ...FILTROS_INICIALES, tipos: ['galpon'] };
const res2 = filtrarInmuebles(inmuebles, filtrosTipo);
const todosGalpones = res2.every((i) => i.tipo === 'galpon');
assert(
  res2.length > 0 && todosGalpones,
  'Caso 2: Filtra exclusivamente galpones',
  `Galpones encontrados: ${res2.length}`
);

console.log('\n--- TEST 3: Filtrado por Tipos Múltiples (Local + Oficina) ---');
const filtrosTiposMult: FiltrosInmuebles = { ...FILTROS_INICIALES, tipos: ['local', 'oficina'] };
const res3 = filtrarInmuebles(inmuebles, filtrosTiposMult);
const todosLocalesUOficinas = res3.every((i) => i.tipo === 'local' || i.tipo === 'oficina');
assert(
  res3.length > 0 && todosLocalesUOficinas,
  'Caso 3: Admite unión de múltiples tipologías',
  `Locales y oficinas: ${res3.length}`
);

console.log('\n--- TEST 4: Filtrado por Operación (Alquiler) ---');
const filtrosOperacion: FiltrosInmuebles = { ...FILTROS_INICIALES, operacion: 'alquiler' };
const res4 = filtrarInmuebles(inmuebles, filtrosOperacion);
const todosConAlquiler = res4.every((i) =>
  i.avisos.some((a) => a.operacion === 'alquiler')
);
assert(
  res4.length > 0 && todosConAlquiler,
  'Caso 4: Cada inmueble posee aviso de alquiler',
  `Inmuebles en alquiler: ${res4.length}`
);

console.log('\n--- TEST 5: Filtrado por Moneda (USD) ---');
const filtrosMoneda: FiltrosInmuebles = { ...FILTROS_INICIALES, moneda: 'USD' };
const res5 = filtrarInmuebles(inmuebles, filtrosMoneda);
const todosConUSD = res5.every((i) => i.avisos.some((a) => a.moneda === 'USD'));
assert(
  res5.length > 0 && todosConUSD,
  'Caso 5: Cada inmueble posee aviso cotizado en USD',
  `Inmuebles en USD: ${res5.length}`
);

console.log('\n--- TEST 6: Rango de Superficie (entre 300 m² y 1.000 m²) ---');
const filtrosSup: FiltrosInmuebles = {
  ...FILTROS_INICIALES,
  minM2: 300,
  maxM2: 1000,
};
const res6 = filtrarInmuebles(inmuebles, filtrosSup);
const todosEnRangoSup = res6.every((i) => {
  const sup = obtenerSuperficieDestacada(i);
  return sup !== null && sup.valor >= 300 && sup.valor <= 1000;
});
assert(
  res6.length > 0 && todosEnRangoSup,
  'Caso 6: Cumple cota mínima y máxima de m²',
  `Inmuebles en rango 300-1000 m²: ${res6.length}`
);

console.log('\n--- TEST 7: Rango de Precio en USD (50.000 a 250.000) ---');
const filtrosPrecio: FiltrosInmuebles = {
  ...FILTROS_INICIALES,
  moneda: 'USD',
  minPrecio: 50000,
  maxPrecio: 250000,
};
const res7 = filtrarInmuebles(inmuebles, filtrosPrecio);
const todosEnRangoPrecio = res7.every((i) =>
  i.avisos.some(
    (a) => a.moneda === 'USD' && a.precio !== null && a.precio >= 50000 && a.precio <= 250000
  )
);
assert(
  res7.length > 0 && todosEnRangoPrecio,
  'Caso 7: Evalúa precio y moneda en el mismo aviso',
  `Inmuebles encontrados: ${res7.length}`
);

console.log('\n--- TEST 8: Localidad insensibles a mayúsculas y tildes ("caseros" vs "Caseros") ---');
const res8a = filtrarInmuebles(inmuebles, { ...FILTROS_INICIALES, localidad: 'caseros' });
const res8b = filtrarInmuebles(inmuebles, { ...FILTROS_INICIALES, localidad: 'CASEROS' });
const res8c = filtrarInmuebles(inmuebles, { ...FILTROS_INICIALES, localidad: 'Caseros' });
assert(
  res8a.length > 0 && res8a.length === res8b.length && res8b.length === res8c.length,
  'Caso 8: Normalización robusta de localidad (casing/tildes)',
  `Caseros devueltos: ${res8a.length} (idéntico en caseros/CASEROS/Caseros)`
);

console.log('\n--- TEST 9: Grupos de Zonificación (RMI - Mixto Industrial) ---');
const filtrosZona: FiltrosInmuebles = { ...FILTROS_INICIALES, zonaGrupos: ['RMI'] };
const res9 = filtrarInmuebles(inmuebles, filtrosZona);
const todosRMI = res9.every(
  (i) => i.zonaCodigo !== null && i.zonaCodigo.startsWith('RMI')
);
assert(
  res9.length > 0 && todosRMI,
  'Caso 9: Agrupa zonas prefijadas por RMI (RMI1, RMI2, RMI3)',
  `Inmuebles RMI: ${res9.length}`
);

console.log('\n--- TEST 10: Intersección Multicriterio Compleja ---');
const filtrosComplejos: FiltrosInmuebles = {
  tipos: ['galpon'],
  operacion: 'alquiler',
  localidad: 'Caseros',
  minM2: 200,
  maxM2: null,
  minPrecio: null,
  maxPrecio: null,
  moneda: null,
  zonaGrupos: ['RMI'],
};
const res10 = filtrarInmuebles(inmuebles, filtrosComplejos);
const validaComplejo = res10.every((i) => {
  const sup = obtenerSuperficieDestacada(i);
  return (
    i.tipo === 'galpon' &&
    i.localidad.toLowerCase() === 'caseros' &&
    i.zonaCodigo?.startsWith('RMI') &&
    sup !== null &&
    sup.valor >= 200 &&
    i.avisos.some((a) => a.operacion === 'alquiler')
  );
});
assert(
  res10.length > 0 && validaComplejo,
  'Caso 10: Intersección lógica simultánea de 5 criterios',
  `Galpones en alquiler en Caseros RMI >= 200m²: ${res10.length}`
);

console.log('\n--- TEST 11: Parseador Numérico Tolerante (Puntos, Comas, Incompletos) ---');
const p1 = parsearNumeroFiltro('1.500');
const p2 = parsearNumeroFiltro('2.000.000');
const p3 = parsearNumeroFiltro('120,5');
const p4 = parsearNumeroFiltro('');
const p5 = parsearNumeroFiltro('-');
const p6 = parsearNumeroFiltro('abc');

assert(
  p1.estado === 'valido' && p1.valor === 1500 &&
  p2.estado === 'valido' && p2.valor === 2000000 &&
  p3.estado === 'valido' && p3.valor === 120.5 &&
  p4.estado === 'vacio' && p4.valor === null &&
  p5.estado === 'incompleto' &&
  p6.estado === 'invalido',
  'Caso 11: Tolera formato argentino con puntos de miles y comas decimales'
);

console.log('\n--- TEST 12: Rango Numérico Inválido (min > max) produce resultado vacío ---');
const filtrosInvertidos: FiltrosInmuebles = {
  ...FILTROS_INICIALES,
  minM2: 1000,
  maxM2: 200,
};
const errores = validarRangosFiltros(filtrosInvertidos);
const res12 = filtrarInmuebles(inmuebles, filtrosInvertidos);

assert(
  errores.superficie !== null && res12.length === 0,
  'Caso 12: Si min > max, bloquea y devuelve 0 inmuebles con mensaje de error',
  `Error: "${errores.superficie}"`
);

console.log('\n--- TEST 13: Contador de Criterios Activos ---');
const cantInicial = contarFiltrosActivos(FILTROS_INICIALES);
const cantTres = contarFiltrosActivos({
  ...FILTROS_INICIALES,
  tipos: ['local'],
  operacion: 'venta',
  localidad: 'Ciudadela',
});
assert(
  cantInicial === 0 && cantTres === 3,
  'Caso 13: Contador de filtros activos suma y resta con precisión',
  `Inicial: ${cantInicial} | Con 3 filtros: ${cantTres}`
);

console.log('\n--- TEST 14: Filtro Extremo sin Coincidencias ---');
const res14 = filtrarInmuebles(inmuebles, {
  ...FILTROS_INICIALES,
  tipos: ['terreno'],
  minM2: 50000, // Ningún terreno del mock tiene 50.000 m²
});
assert(
  res14.length === 0,
  'Caso 14: Búsqueda sin coincidencias retorna array vacío limpiamente sin lanzar error',
  `Resultados: ${res14.length}`
);

console.log('\n========================================================');
console.log(`🎉 RESUMEN DE PRUEBAS DE FILTROS: ${testsPasados}/${totalTests} EXITOSAS`);
console.log('========================================================\n');

if (testsPasados !== totalTests) {
  process.exit(1);
}
