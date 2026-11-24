import { randomUUID } from 'node:crypto';
import {
  Op,
  QueryTypes,
  type CreationAttributes,
  type Transaction,
} from 'sequelize';
import {
  AvisoModel,
  CorridaScraperModel,
  InmuebleModel,
  sequelize,
} from '../models/index.js';
import {
  buscarInmuebleCoincidenteEnBD,
  margenBoundingBoxGrados,
  type AvisoParaDeduplicar,
} from '../services/deduplicacion.service.js';
import type { TipoInmueble } from '../types/dominio.types.js';

/* ==========================================================================
   BENCHMARK DE DEDUPLICACIÓN (CARD-PERF-01)
   Mide la reducción de filas del bbox y el plan de ejecución de PostgreSQL.
   ========================================================================== */

const PREFIJO_BENCH = 'PERF-';
const TOTAL_INMUEBLES = 2_000;
const CENTRO = { lat: -34.6037, lng: -58.5626 };
const DISPERSION_GRADOS = 0.15;
const DOD_REDUCCION_MINIMA = 0.9;

const TIPOS: TipoInmueble[] = ['local', 'galpon', 'oficina', 'terreno'];

const LOCALIDADES = [
  'Caseros',
  'Ciudadela',
  'Villa Bosch',
  'Martín Coronado',
  'Santos Lugares',
  'Loma Hermosa',
  'El Palomar',
  'Villa Lynch',
  'Sáenz Peña',
  'Ciudad Jardín',
  'Pablo Podestá',
  'José Ingenieros',
  'Remedios de Escalada',
  'Villa Raffo',
  'Barrio Norte',
];

const AVISO: AvisoParaDeduplicar = {
  tipo: 'galpon',
  localidad: 'Caseros',
  lat: CENTRO.lat,
  lng: CENTRO.lng,
  superficieCubiertaM2: 500,
  superficieTotalM2: 600,
  direccion: `${PREFIJO_BENCH}AVISO-PROBE`,
};

/** El bench no crea corridas; queda listo por si se extiende a la ingesta real. */
const corridasCreadas: string[] = [];

/* ==========================================================================
   TIPOS DE SOPORTE PARA EXPLAIN
   ========================================================================== */

interface PlanNode {
  'Node Type': string;
  'Index Name'?: string;
  'Relation Name'?: string;
  'Actual Rows'?: number;
  Plans?: PlanNode[];
}

interface ExplicacionPlan {
  Plan: PlanNode;
  'Execution Time'?: number;
}

interface ResultadoExplain {
  nodos: PlanNode[];
  usaIndice: boolean;
  tiempoEjecucionMs: number | null;
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/** Generador pseudoaleatorio determinista para que el bench sea reproducible. */
function crearGenerador(semilla: number): () => number {
  let estado = semilla >>> 0;

  return () => {
    estado = (Math.imul(estado, 1_664_525) + 1_013_904_223) >>> 0;
    return estado / 0x1_0000_0000;
  };
}

function aplanarPlan(nodo: PlanNode): PlanNode[] {
  return [nodo, ...(nodo.Plans ?? []).flatMap(aplanarPlan)];
}

function describirNodo(nodo: PlanNode): string {
  const indice = nodo['Index Name'] ? ` (${nodo['Index Name']})` : '';
  const filas =
    typeof nodo['Actual Rows'] === 'number' ? ` → ${nodo['Actual Rows']} filas` : '';

  return `${nodo['Node Type']}${indice}${filas}`;
}

function usarIndice(nodos: PlanNode[]): boolean {
  return nodos.some(
    (nodo) =>
      nodo['Node Type'].includes('Index Scan') || nodo['Node Type'] === 'Index Only Scan'
  );
}

async function ejecutarExplain(transaction?: Transaction): Promise<ResultadoExplain> {
  const { latDelta, lngDelta } = margenBoundingBoxGrados(AVISO.lat);

  const filas = await sequelize.query<{ 'QUERY PLAN': ExplicacionPlan[] }>(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
     SELECT "id", "tipo", "localidad", "lat", "lng",
            "superficieTotalM2", "superficieCubiertaM2", "direccion"
     FROM "inmuebles"
     WHERE "tipo" = :tipo
       AND "lat" BETWEEN :latMin AND :latMax
       AND "lng" BETWEEN :lngMin AND :lngMax`,
    {
      replacements: {
        tipo: AVISO.tipo,
        latMin: AVISO.lat - latDelta,
        latMax: AVISO.lat + latDelta,
        lngMin: AVISO.lng - lngDelta,
        lngMax: AVISO.lng + lngDelta,
      },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  const explicacion = filas[0]?.['QUERY PLAN']?.[0];

  if (!explicacion) {
    throw new Error('PostgreSQL no devolvió un plan para el EXPLAIN');
  }

  const nodos = aplanarPlan(explicacion.Plan);

  return {
    nodos,
    usaIndice: usarIndice(nodos),
    tiempoEjecucionMs: explicacion['Execution Time'] ?? null,
  };
}

async function sembrarPadronSintetico(): Promise<string> {
  const aleatorio = crearGenerador(3_141_592);
  const filas: CreationAttributes<InmuebleModel>[] = [];

  for (let indice = 0; indice < TOTAL_INMUEBLES - 1; indice++) {
    const tipo = TIPOS[Math.floor(aleatorio() * TIPOS.length)] ?? 'local';
    const localidad =
      LOCALIDADES[Math.floor(aleatorio() * LOCALIDADES.length)] ?? LOCALIDADES[0];

    filas.push({
      id: randomUUID(),
      direccion: `${PREFIJO_BENCH}inmueble-${indice}`,
      direccionNormalizada: null,
      localidad,
      lat: CENTRO.lat + (aleatorio() - 0.5) * DISPERSION_GRADOS,
      lng: CENTRO.lng + (aleatorio() - 0.5) * DISPERSION_GRADOS,
      superficieTotalM2: 200 + aleatorio() * 1_800,
      superficieCubiertaM2: 200 + aleatorio() * 1_800,
      tipo,
      zonaCodigo: null,
      macrozona: null,
    });
  }

  // Vecino determinista a ~45 m: garantiza que el bbox encuentre un match real.
  const vecinoId = randomUUID();
  filas.push({
    id: vecinoId,
    direccion: `${PREFIJO_BENCH}vecino-45m`,
    direccionNormalizada: null,
    localidad: 'Caseros',
    lat: CENTRO.lat + 0.0004,
    lng: CENTRO.lng,
    superficieTotalM2: 600,
    superficieCubiertaM2: 500,
    tipo: 'galpon',
    zonaCodigo: null,
    macrozona: null,
  });

  const TAMANO_LOTE = 500;

  for (let inicio = 0; inicio < filas.length; inicio += TAMANO_LOTE) {
    await InmuebleModel.bulkCreate(filas.slice(inicio, inicio + TAMANO_LOTE));
  }

  return vecinoId;
}

async function limpiarPadronSintetico(): Promise<void> {
  const sobrantes = await InmuebleModel.findAll({
    where: { direccion: { [Op.like]: `${PREFIJO_BENCH}%` } },
    attributes: ['id'],
  });

  const ids = sobrantes.map((inmueble) => inmueble.id);

  if (ids.length > 0) {
    await AvisoModel.destroy({ where: { inmuebleId: { [Op.in]: ids } } });
    await InmuebleModel.destroy({ where: { id: { [Op.in]: ids } } });
  }

  // El bench no crea corridas hoy. Si se extiende para usar procesarLoteAvisos,
  // sus IDs deben registrarse acá para no dejar auditoría huérfana.
  for (const corridaId of corridasCreadas) {
    await CorridaScraperModel.destroy({ where: { id: corridaId } });
  }
}

/* ==========================================================================
   RUNNER
   ========================================================================== */

async function main(): Promise<void> {
  console.log('📊 ========================================================');
  console.log('   BENCHMARK DE DEDUPLICACIÓN ESPACIAL [CARD-PERF-01]');
  console.log('   Bounding box vs. padrón completo por tipo');
  console.log('========================================================\n');

  let exitCode = 0;

  try {
    // El logger SQL de desarrollo no aporta al benchmark y ensucia la salida.
    // `options` existe en runtime pero no está expuesto en los tipos de Sequelize 6.
    (sequelize as unknown as { options: { logging: boolean } }).options.logging = false;

    await sequelize.authenticate();
    await limpiarPadronSintetico();

    console.log(`🌱 Sembrando padrón sintético (${TOTAL_INMUEBLES} inmuebles ${PREFIJO_BENCH}*)...`);
    const vecinoId = await sembrarPadronSintetico();

    await sequelize.query('ANALYZE "inmuebles"');
    console.log('✅ Padrón sembrado y estadísticas actualizadas.\n');

    const baseline = await InmuebleModel.count({ where: { tipo: AVISO.tipo } });
    const resultado = await buscarInmuebleCoincidenteEnBD(AVISO);
    const devueltas = resultado.candidatosEvaluados;
    const reduccion = baseline > 0 ? 1 - devueltas / baseline : 0;
    const reduccionPct = Math.round(reduccion * 10_000) / 100;

    console.log('📈 RESULTADO DE LA CONSULTA:');
    console.log(`   - Baseline (filas del tipo '${AVISO.tipo}'): ${baseline}`);
    console.log(`   - Filas devueltas por el bbox:               ${devueltas}`);
    console.log(`   - Reducción:                                 ${reduccionPct}%`);
    console.log(
      `   - Match contra el vecino a ~45 m:            ${
        resultado.coincide && resultado.inmuebleCoincidente?.id === vecinoId
          ? 'OK'
          : 'FALLÓ'
      }`
    );
    console.log(
      `   - Distancia del match:                       ${
        resultado.distanciaMetros ?? 'n/a'
      } m\n`
    );

    if (reduccion < DOD_REDUCCION_MINIMA) {
      console.error(
        `❌ DoD incumplida: la reducción ${reduccionPct}% es menor a ${DOD_REDUCCION_MINIMA * 100}%`
      );
      exitCode = 1;
    } else {
      console.log(`✅ DoD cumplida: reducción ${reduccionPct}% >= 90%.\n`);
    }

    if (!resultado.coincide || resultado.inmuebleCoincidente?.id !== vecinoId) {
      console.error('❌ El match del vecino sintético falló: la precisión cambió.');
      exitCode = 1;
    }

    console.log('🔎 EXPLAIN (ANALYZE, BUFFERS) con el plan elegido por el planner:');
    const planNormal = await ejecutarExplain();
    console.log(`   - Nodos: ${planNormal.nodos.map(describirNodo).join(' → ')}`);
    console.log(`   - Usa índice: ${planNormal.usaIndice ? 'SÍ' : 'NO (Seq Scan)'}`);
    console.log(
      `   - Tiempo de ejecución: ${
        planNormal.tiempoEjecucionMs !== null
          ? `${planNormal.tiempoEjecucionMs.toFixed(3)} ms`
          : 'n/a'
      }\n`
    );

    if (!planNormal.usaIndice) {
      console.log('🧪 Reintentando con enable_seqscan = off para validar disponibilidad de índices:');
      const planForzado = await sequelize.transaction(async (transaction) => {
        await sequelize.query('SET LOCAL enable_seqscan = off', { transaction });
        return ejecutarExplain(transaction);
      });

      console.log(`   - Nodos: ${planForzado.nodos.map(describirNodo).join(' → ')}`);
      console.log(`   - Usa índice: ${planForzado.usaIndice ? 'SÍ' : 'NO'}`);
      console.log(
        `   - Tiempo de ejecución: ${
          planForzado.tiempoEjecucionMs !== null
            ? `${planForzado.tiempoEjecucionMs.toFixed(3)} ms`
            : 'n/a'
        }\n`
      );
    }
  } finally {
    try {
      await limpiarPadronSintetico();
      console.log(`🧹 Padrón sintético ${PREFIJO_BENCH}* eliminado.`);
    } catch (error) {
      console.error('❌ Falló la limpieza del padrón sintético:', error);
      exitCode = 1;
    }

    try {
      await sequelize.close();
    } catch {
      // La conexión ya podría estar cerrada por un fallo previo.
    }
  }

  console.log('\n========================================================');
  console.log(`   RESULTADO DEL BENCHMARK: ${exitCode === 0 ? 'OK' : 'FALLO'}`);
  console.log('========================================================\n');

  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error('❌ Error fatal en el benchmark de deduplicación:', error);
  process.exit(1);
});
