import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { ConnectionError, Op, QueryTypes } from 'sequelize';
import { createApp } from '../app.js';
import {
  AvisoModel,
  CorridaScraperModel,
  InmuebleModel,
  sequelize,
} from '../models/index.js';
import { AvisoCrudoIngestaSchema } from '../schemas/ingesta.schema.js';
import { procesarLoteAvisos } from '../services/ingesta.service.js';
import { AppError } from '../types/errors.js';
import type {
  AvisoCrudoIngesta,
  IngestaLote,
  ResultadoIngesta,
} from '../types/ingesta.types.js';

/* ==========================================================================
   SUITE DE INTEGRACIÓN DE INGESTA (CARD-ING-01B)
   ========================================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREFIJO = 'test-ingesta-';
const COORD = { lat: -34.6037, lng: -58.5626 };
const TEST_START = new Date();
const corridaIds = new Set<string>();
const resultados: ResultadoIngesta[] = [];
const fechasPrimeraVez = new Map<string, number>();

let corridaFallo: CorridaScraperModel | null = null;
let baseUrl = '';

/* ==========================================================================
   HELPERS DE ASSERT, FIXTURE Y HTTP
   ========================================================================== */

function verificar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) {
    throw new Error(mensaje);
  }
}

function resolverFixture(): string {
  const candidatos = [
    path.resolve(__dirname, '../../../data/fixtures/avisos-argenprop.json'),
    path.resolve(process.cwd(), '../data/fixtures/avisos-argenprop.json'),
    path.resolve(process.cwd(), 'data/fixtures/avisos-argenprop.json'),
  ];

  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) return candidato;
  }

  throw new Error(`No se encontró el fixture en: ${candidatos.join(', ')}`);
}

function cargarFixture(): AvisoCrudoIngesta[] {
  const contenido: unknown = JSON.parse(fs.readFileSync(resolverFixture(), 'utf-8'));
  const parseado = AvisoCrudoIngestaSchema.array().safeParse(contenido);

  if (!parseado.success) {
    throw new Error(`El fixture no respeta el contrato de ingesta: ${parseado.error.message}`);
  }

  if (parseado.data.length === 0) {
    throw new Error('El fixture de avisos está vacío');
  }

  return parseado.data;
}

const fixture = cargarFixture();
const baseFixture = fixture.find((aviso) => aviso.tipo === 'galpon') ?? fixture[0];

/**
 * Coordenada propia de CARD-PERF-01, separada de la base de CARD-ING-01B
 * para que los escenarios de bbox no interfieran con los existentes.
 */
const PERF_COORD = { lat: -34.5802, lng: -58.5401 };

function crearAviso(
  sufijo: string,
  overrides: Partial<AvisoCrudoIngesta> = {}
): AvisoCrudoIngesta {
  return {
    ...baseFixture,
    idExterno: `${PREFIJO}${sufijo}`,
    url: `https://www.argenprop.com/test-ingesta/${sufijo}`,
    titulo: `Aviso de prueba ${sufijo}`,
    descripcion: 'Aviso sintético derivado del fixture real de Argenprop',
    tipo: 'galpon',
    operacion: 'alquiler',
    precio: 1_000,
    moneda: 'USD',
    direccion: 'Av. San Martín 2450',
    localidad: 'Caseros',
    lat: COORD.lat,
    lng: COORD.lng,
    superficieTotalM2: 600,
    superficieCubiertaM2: 500,
    ...overrides,
  };
}

/** Aviso sintético de los escenarios PERF, siempre dentro de PERF_COORD. */
function crearAvisoPerf(
  sufijo: string,
  overrides: Partial<AvisoCrudoIngesta> = {}
): AvisoCrudoIngesta {
  return crearAviso(`perf-${sufijo}`, {
    localidad: 'Caseros',
    lat: PERF_COORD.lat,
    lng: PERF_COORD.lng,
    superficieTotalM2: 600,
    superficieCubiertaM2: 500,
    ...overrides,
  });
}

async function obtenerAviso(idExterno: string): Promise<AvisoModel> {
  const aviso = await AvisoModel.findOne({ where: { idExterno } });

  if (!aviso) {
    throw new Error(`No se encontró el aviso ${idExterno}`);
  }

  return aviso;
}

/** Cuenta sólo los inmuebles creados por esta ejecución de la suite. */
function contarInmueblesDeLaCorrida(): Promise<number> {
  return InmuebleModel.count({ where: { createdAt: { [Op.gte]: TEST_START } } });
}

async function verificarMetricasPersistidas(resultado: ResultadoIngesta): Promise<void> {
  const corrida = await CorridaScraperModel.findByPk(resultado.corridaId);

  verificar(corrida !== null, 'La corrida persistida debe existir');
  verificar(
    corrida.totalLeidos === resultado.totalLeidos &&
      corrida.nuevos === resultado.nuevos &&
      corrida.actualizados === resultado.actualizados &&
      corrida.fallidos === resultado.fallidos,
    `Métricas persistidas distintas de las devueltas en ${resultado.corridaId}`
  );
}

async function limpiarDatosDePrueba(): Promise<void> {
  const avisosDePrueba = await AvisoModel.findAll({
    where: { idExterno: { [Op.like]: `${PREFIJO}%` } },
    attributes: ['inmuebleId'],
  });

  const inmuebleIds = [...new Set(avisosDePrueba.map((aviso) => aviso.inmuebleId))];

  await AvisoModel.destroy({ where: { idExterno: { [Op.like]: `${PREFIJO}%` } } });

  if (inmuebleIds.length > 0) {
    const restantes = await AvisoModel.findAll({
      where: { inmuebleId: { [Op.in]: inmuebleIds } },
      attributes: ['inmuebleId'],
    });
    const enUso = new Set(restantes.map((aviso) => aviso.inmuebleId));
    const eliminables = inmuebleIds.filter((id) => !enUso.has(id));

    if (eliminables.length > 0) {
      await InmuebleModel.destroy({
        where: {
          id: { [Op.in]: eliminables },
          createdAt: { [Op.gte]: TEST_START },
        },
      });
    }
  }

  if (corridaIds.size > 0) {
    await CorridaScraperModel.destroy({ where: { id: { [Op.in]: [...corridaIds] } } });
  }
}

interface RespuestaHttp {
  status: number;
  body: Record<string, unknown>;
}

async function postIngesta(baseUrl: string, cuerpo: unknown): Promise<RespuestaHttp> {
  const respuesta = await fetch(`${baseUrl}/api/ingesta/avisos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  const body = (await respuesta.json()) as Record<string, unknown>;

  return { status: respuesta.status, body };
}

function datosDeRespuesta(body: Record<string, unknown>): ResultadoIngesta {
  const data = body.data;

  if (typeof data !== 'object' || data === null) {
    throw new Error('La respuesta HTTP no contiene el sobre data esperado');
  }

  return data as ResultadoIngesta;
}

async function ejecutarLote(avisos: unknown[]): Promise<ResultadoIngesta> {
  const lote: IngestaLote = { fuente: 'argenprop', avisos };
  const resultado = await procesarLoteAvisos(lote);
  corridaIds.add(resultado.corridaId);
  resultados.push(resultado);
  return resultado;
}

/* ==========================================================================
   ESCENARIOS
   ========================================================================== */

const escenarios: Array<{ nombre: string; ejecutar: () => Promise<void> }> = [
  {
    nombre: 'Lote con 2 avisos nuevos del mismo inmueble físico',
    ejecutar: async () => {
      const resultado = await ejecutarLote([crearAviso('nuevo-1'), crearAviso('nuevo-2')]);

      verificar(resultado.nuevos === 2, `Se esperaban 2 nuevos y llegaron ${resultado.nuevos}`);
      verificar(resultado.actualizados === 0, 'No debía haber actualizados');
      verificar(resultado.fallidos === 0, 'No debía haber fallidos');

      const avisos = await AvisoModel.findAll({
        where: { idExterno: { [Op.in]: [`${PREFIJO}nuevo-1`, `${PREFIJO}nuevo-2`] } },
        order: [['idExterno', 'ASC']],
      });

      verificar(avisos.length === 2, `Se esperaban 2 avisos persistidos y hay ${avisos.length}`);
      verificar(
        avisos[0].inmuebleId === avisos[1].inmuebleId,
        'Los dos avisos debían compartir el mismo Inmueble físico'
      );

      for (const aviso of avisos) {
        verificar(
          aviso.fechaVistoPrimeraVez.getTime() === aviso.fechaVistoUltimaVez.getTime(),
          'En la creación ambas fechas deben coincidir con el inicio de la corrida'
        );
        fechasPrimeraVez.set(aviso.idExterno, aviso.fechaVistoPrimeraVez.getTime());
      }
    },
  },
  {
    nombre: 'Re-ejecución del mismo lote: actualiza sin duplicar',
    ejecutar: async () => {
      const antes = await AvisoModel.findAll({
        where: { idExterno: { [Op.like]: `${PREFIJO}nuevo-%` } },
        order: [['idExterno', 'ASC']],
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      const resultado = await ejecutarLote([crearAviso('nuevo-1'), crearAviso('nuevo-2')]);

      verificar(resultado.nuevos === 0, `Se esperaban 0 nuevos y llegaron ${resultado.nuevos}`);
      verificar(resultado.actualizados === 2, `Se esperaban 2 actualizados y llegaron ${resultado.actualizados}`);
      verificar(resultado.fallidos === 0, 'No debía haber fallidos');

      const despues = await AvisoModel.findAll({
        where: { idExterno: { [Op.like]: `${PREFIJO}nuevo-%` } },
        order: [['idExterno', 'ASC']],
      });

      verificar(antes.length === despues.length, 'El conteo de avisos no debe cambiar');
      verificar(
        despues[0].inmuebleId === antes[0].inmuebleId,
        'El Inmueble del aviso no debe reasignarse en la actualización'
      );

      for (const aviso of despues) {
        const primeraOriginal = fechasPrimeraVez.get(aviso.idExterno);

        verificar(
          primeraOriginal !== undefined && aviso.fechaVistoPrimeraVez.getTime() === primeraOriginal,
          `fechaVistoPrimeraVez se alteró para ${aviso.idExterno}`
        );
        verificar(
          aviso.fechaVistoUltimaVez.getTime() >= aviso.fechaVistoPrimeraVez.getTime(),
          'fechaVistoUltimaVez debe ser igual o posterior a la primera vista'
        );

        const anterior = antes.find((item) => item.idExterno === aviso.idExterno);
        verificar(
          anterior !== undefined &&
            aviso.fechaVistoUltimaVez.getTime() > anterior.fechaVistoUltimaVez.getTime(),
          'fechaVistoUltimaVez debía refrescarse en la segunda corrida'
        );
      }
    },
  },
  {
    nombre: 'Tercera corrida con precio modificado',
    ejecutar: async () => {
      const resultado = await ejecutarLote([crearAviso('nuevo-1', { precio: 7_777 })]);

      verificar(resultado.actualizados === 1, 'El aviso existente debía actualizarse');

      const aviso = await AvisoModel.findOne({
        where: { fuente: 'argenprop', idExterno: `${PREFIJO}nuevo-1` },
      });

      verificar(aviso !== null, 'El aviso actualizado debe existir');
      verificar(aviso.precio === 7_777, `El precio no se actualizó: ${String(aviso.precio)}`);
    },
  },
  {
    nombre: 'Aviso con tipo "otro" se descarta y cuenta como fallido',
    ejecutar: async () => {
      const resultado = await ejecutarLote([crearAviso('otro', { tipo: 'otro' })]);

      verificar(resultado.fallidos === 1, 'El aviso residencial debía contar como fallido');
      verificar(
        resultado.detalleFallidos[0]?.motivo === 'TIPO_NO_APTO',
        `Motivo inesperado: ${String(resultado.detalleFallidos[0]?.motivo)}`
      );

      const cantidad = await AvisoModel.count({
        where: { idExterno: `${PREFIJO}otro` },
      });

      verificar(cantidad === 0, 'No debía persistirse ningún aviso con tipo "otro"');
    },
  },
  {
    nombre: 'Aviso sin lat/lng se descarta sin crear Inmueble huérfano',
    ejecutar: async () => {
      const inmueblesAntes = await InmuebleModel.count();

      const resultado = await ejecutarLote([
        crearAviso('sin-coords', { lat: null, lng: null }),
      ]);

      verificar(resultado.fallidos === 1, 'El aviso sin coordenadas debía contar como fallido');
      verificar(
        resultado.detalleFallidos[0]?.motivo === 'SIN_COORDENADAS',
        `Motivo inesperado: ${String(resultado.detalleFallidos[0]?.motivo)}`
      );

      const inmueblesDespues = await InmuebleModel.count();
      const cantidad = await AvisoModel.count({
        where: { idExterno: `${PREFIJO}sin-coords` },
      });

      verificar(inmueblesDespues === inmueblesAntes, 'No debía crearse un Inmueble huérfano');
      verificar(cantidad === 0, 'No debía persistirse el aviso sin coordenadas');
    },
  },
  {
    nombre: 'Aviso con URL inválida falla por Zod sin abortar la corrida',
    ejecutar: async () => {
      const resultado = await ejecutarLote([
        crearAviso('url-invalida', { url: 'esto-no-es-una-url' }),
      ]);

      verificar(resultado.fallidos === 1, 'El aviso inválido debía contar como fallido');
      verificar(
        resultado.detalleFallidos[0]?.motivo === 'ZOD_INVALIDO',
        `Motivo inesperado: ${String(resultado.detalleFallidos[0]?.motivo)}`
      );
      verificar(resultado.estadoCorrida === 'OK', 'La corrida debía terminar OK');

      const corrida = await CorridaScraperModel.findByPk(resultado.corridaId);
      verificar(corrida !== null, 'La corrida persistida debe existir');
      verificar(corrida.estado === 'OK', 'La corrida persistida debía estar en estado OK');
      verificar(corrida.mensajeError !== null, 'El fallo debía quedar auditado en mensajeError');
    },
  },
  {
    nombre: 'Lote vacío devuelve HTTP 400 y no crea corrida',
    ejecutar: async () => {
      const corridasAntes = await CorridaScraperModel.count();
      const respuesta = await postIngesta(baseUrl, { fuente: 'argenprop', avisos: [] });

      verificar(respuesta.status === 400, `Se esperaba 400 y llegó ${respuesta.status}`);

      const corridasDespues = await CorridaScraperModel.count();
      verificar(
        corridasDespues === corridasAntes,
        'Un lote inválido no debe dejar registro en CorridasScraper'
      );
    },
  },
  {
    nombre: 'Fallo fatal de BD en el aviso 3: corrida FALLO y avisos 1-2 persisten',
    ejecutar: async () => {
      const lote: IngestaLote = {
        fuente: 'argenprop',
        avisos: [crearAviso('bd-1'), crearAviso('bd-2'), crearAviso('bd-3')],
      };

      const transaccionOriginal = sequelize.transaction;
      let llamadas = 0;

      const transaccionConFallo = ((...args: unknown[]) => {
        llamadas += 1;

        if (llamadas === 3) {
          return Promise.reject(
            new ConnectionError(new Error('Fallo de conexión simulado en el aviso 3'))
          );
        }

        return (transaccionOriginal as unknown as (...params: unknown[]) => Promise<unknown>).apply(
          sequelize,
          args
        );
      }) as unknown as typeof sequelize.transaction;

      sequelize.transaction = transaccionConFallo;

      let errorFatal: unknown;

      try {
        await procesarLoteAvisos(lote);
      } catch (error) {
        errorFatal = error;
      } finally {
        sequelize.transaction = transaccionOriginal;
      }

      verificar(
        errorFatal instanceof AppError && errorFatal.statusCode === 503,
        'El fallo fatal debía propagarse como AppError 503'
      );

      const corridaDetectada = await CorridaScraperModel.findOne({
        where: {
          fuente: 'argenprop',
          fechaInicio: { [Op.gte]: TEST_START },
        },
        order: [['fechaInicio', 'DESC']],
      });

      verificar(corridaDetectada !== null, 'La corrida fallida debía quedar registrada');
      corridaFallo = corridaDetectada;
      corridaIds.add(corridaDetectada.id);

      verificar(corridaDetectada.estado === 'FALLO', 'La corrida debía quedar en estado FALLO');
      verificar(
        corridaDetectada.mensajeError !== null,
        'La corrida FALLO debía guardar mensajeError'
      );

      const persistidos = await AvisoModel.count({
        where: { idExterno: { [Op.in]: [`${PREFIJO}bd-1`, `${PREFIJO}bd-2`] } },
      });
      const abortado = await AvisoModel.count({
        where: { idExterno: `${PREFIJO}bd-3` },
      });

      verificar(persistidos === 2, `Los avisos 1-2 debían persistir; hay ${persistidos}`);
      verificar(abortado === 0, 'El aviso 3 no debía dejar filas');
      verificar(
        corridaDetectada.nuevos === 2 && corridaDetectada.fallidos === 1,
        `Métricas parciales inesperadas: nuevos=${corridaDetectada.nuevos}, fallidos=${corridaDetectada.fallidos}`
      );
    },
  },
  {
    nombre: 'PERF-1: inmueble misma localidad a ~50 m reutiliza inmuebleId',
    ejecutar: async () => {
      const resultadoA = await ejecutarLote([crearAvisoPerf('1-a')]);

      verificar(resultadoA.nuevos === 1, `Se esperaba 1 nuevo y llegaron ${resultadoA.nuevos}`);
      verificar(resultadoA.fallidos === 0, 'El aviso base de PERF-1 no debía fallar');

      const avisoA = await obtenerAviso(`${PREFIJO}perf-1-a`);
      const inmueblesAntes = await contarInmueblesDeLaCorrida();

      const resultadoB = await ejecutarLote([
        crearAvisoPerf('1-b', { lat: PERF_COORD.lat + 0.00045 }), // ~50 m
      ]);

      verificar(resultadoB.nuevos === 1, `Se esperaba 1 nuevo y llegaron ${resultadoB.nuevos}`);
      verificar(resultadoB.fallidos === 0, 'El aviso a 50 m no debía fallar');

      const avisoB = await obtenerAviso(`${PREFIJO}perf-1-b`);
      const inmueblesDespues = await contarInmueblesDeLaCorrida();

      verificar(
        avisoB.inmuebleId === avisoA.inmuebleId,
        'El aviso a ~50 m debía reutilizar el Inmueble existente'
      );
      verificar(
        inmueblesDespues === inmueblesAntes,
        'No debía crearse un Inmueble nuevo para el aviso a ~50 m'
      );
    },
  },
  {
    nombre: 'PERF-2: inmueble misma localidad a ~500 m queda fuera del bbox',
    ejecutar: async () => {
      const avisoBase = await obtenerAviso(`${PREFIJO}perf-1-a`);
      const inmueblesAntes = await contarInmueblesDeLaCorrida();

      const resultado = await ejecutarLote([
        crearAvisoPerf('2', { lat: PERF_COORD.lat + 0.0045 }), // ~500 m
      ]);

      verificar(resultado.nuevos === 1, `Se esperaba 1 nuevo y llegaron ${resultado.nuevos}`);
      verificar(resultado.fallidos === 0, 'El aviso a 500 m no debía fallar');

      const aviso = await obtenerAviso(`${PREFIJO}perf-2`);
      const inmueblesDespues = await contarInmueblesDeLaCorrida();

      verificar(
        aviso.inmuebleId !== avisoBase.inmuebleId,
        'El aviso a ~500 m debía crear un Inmueble distinto'
      );
      verificar(
        inmueblesDespues === inmueblesAntes + 1,
        `Se esperaba 1 Inmueble nuevo y hubo ${inmueblesDespues - inmueblesAntes}`
      );
    },
  },
  {
    nombre: 'PERF-3: coordenadas idénticas, Caseros vs Santos Lugares ⇒ alta nueva',
    ejecutar: async () => {
      const avisoCaseros = await obtenerAviso(`${PREFIJO}perf-1-a`);
      const inmueblesAntes = await contarInmueblesDeLaCorrida();

      const resultado = await ejecutarLote([
        crearAvisoPerf('3', { localidad: 'Santos Lugares' }),
      ]);

      verificar(resultado.nuevos === 1, `Se esperaba 1 nuevo y llegaron ${resultado.nuevos}`);
      verificar(resultado.fallidos === 0, 'El aviso con otra localidad no debía fallar');

      const aviso = await obtenerAviso(`${PREFIJO}perf-3`);
      const inmueblesDespues = await contarInmueblesDeLaCorrida();

      verificar(
        aviso.inmuebleId !== avisoCaseros.inmuebleId,
        'El bbox trae el candidato, pero la regla JS de localidad debía descartarlo'
      );
      verificar(
        inmueblesDespues === inmueblesAntes + 1,
        `Se esperaba 1 Inmueble nuevo y hubo ${inmueblesDespues - inmueblesAntes}`
      );
    },
  },
  {
    nombre: 'PERF-4: localidad "CASEROS" a ~30 m reutiliza por normalización JS',
    ejecutar: async () => {
      const avisoBase = await obtenerAviso(`${PREFIJO}perf-1-a`);
      const inmueblesAntes = await contarInmueblesDeLaCorrida();

      const resultado = await ejecutarLote([
        crearAvisoPerf('4', {
          localidad: 'CASEROS',
          lat: PERF_COORD.lat + 0.00027, // ~30 m
        }),
      ]);

      verificar(resultado.nuevos === 1, `Se esperaba 1 nuevo y llegaron ${resultado.nuevos}`);
      verificar(resultado.fallidos === 0, 'El aviso con localidad en mayúsculas no debía fallar');

      const aviso = await obtenerAviso(`${PREFIJO}perf-4`);
      const inmueblesDespues = await contarInmueblesDeLaCorrida();

      verificar(
        aviso.inmuebleId === avisoBase.inmuebleId,
        'La normalización JS debía hacer coincidir "CASEROS" con "Caseros"'
      );
      verificar(
        inmueblesDespues === inmueblesAntes,
        'No debía crearse un Inmueble nuevo para el aviso a ~30 m'
      );
    },
  },
  {
    nombre: 'PERF-5: escenario original de CARD-ING-01B conserva sus métricas',
    ejecutar: async () => {
      const primera = await ejecutarLote([crearAvisoPerf('5-a'), crearAvisoPerf('5-b')]);

      verificar(primera.nuevos === 2, `Se esperaban 2 nuevos y llegaron ${primera.nuevos}`);
      verificar(primera.actualizados === 0, 'No debía haber actualizados en la primera corrida');
      verificar(primera.fallidos === 0, 'No debía haber fallidos en la primera corrida');
      await verificarMetricasPersistidas(primera);

      const avisoA = await obtenerAviso(`${PREFIJO}perf-5-a`);
      const avisoB = await obtenerAviso(`${PREFIJO}perf-5-b`);

      verificar(
        avisoA.inmuebleId === avisoB.inmuebleId,
        'Los dos avisos del lote debían compartir el mismo Inmueble'
      );

      const segunda = await ejecutarLote([crearAvisoPerf('5-a'), crearAvisoPerf('5-b')]);

      verificar(segunda.nuevos === 0, `Se esperaban 0 nuevos y llegaron ${segunda.nuevos}`);
      verificar(
        segunda.actualizados === 2,
        `Se esperaban 2 actualizados y llegaron ${segunda.actualizados}`
      );
      verificar(segunda.fallidos === 0, 'No debía haber fallidos en la segunda corrida');
      await verificarMetricasPersistidas(segunda);
    },
  },
  {
    nombre: 'Invariante totalLeidos === nuevos + actualizados + fallidos',
    ejecutar: async () => {
      verificar(resultados.length >= 6, `Se esperaban al menos 6 corridas OK y hay ${resultados.length}`);

      for (const resultado of resultados) {
        verificar(
          resultado.totalLeidos ===
            resultado.nuevos + resultado.actualizados + resultado.fallidos,
          `Invariante rota en ${resultado.corridaId}: ` +
            `${resultado.totalLeidos} !== ${resultado.nuevos}+${resultado.actualizados}+${resultado.fallidos}`
        );
        verificar(
          resultado.detalleFallidos.length === resultado.fallidos,
          `detalleFallidos no coincide con fallidos en ${resultado.corridaId}`
        );
      }

      const fallo = corridaFallo;
      verificar(fallo !== null, 'Falta la corrida FALLO del escenario 8');
      verificar(
        fallo.totalLeidos === fallo.nuevos + fallo.actualizados + fallo.fallidos,
        'La invariante también debe cumplirse en la corrida FALLO'
      );
    },
  },
  {
    nombre: 'Integridad referencial: cero avisos huérfanos',
    ejecutar: async () => {
      const filas = await sequelize.query<{ huerfanos: string }>(
        'SELECT count(*)::text AS huerfanos FROM avisos a ' +
          'LEFT JOIN inmuebles i ON i.id = a."inmuebleId" WHERE i.id IS NULL',
        { type: QueryTypes.SELECT }
      );

      verificar(
        Number(filas[0].huerfanos) === 0,
        `Hay ${filas[0].huerfanos} avisos sin Inmueble asociado`
      );
    },
  },
  {
    nombre: 'Smoke HTTP: primer POST 201 y segundo POST idéntico 200',
    ejecutar: async () => {
      const lote: IngestaLote = {
        fuente: 'argenprop',
        avisos: [crearAviso('http-1')],
      };

      const primero = await postIngesta(baseUrl, lote);
      verificar(primero.status === 201, `Se esperaba 201 y llegó ${primero.status}`);

      const datosPrimero = datosDeRespuesta(primero.body);
      corridaIds.add(datosPrimero.corridaId);
      resultados.push(datosPrimero);
      verificar(datosPrimero.nuevos === 1, 'El primer POST debía insertar el aviso');

      const segundo = await postIngesta(baseUrl, lote);
      verificar(segundo.status === 200, `Se esperaba 200 y llegó ${segundo.status}`);

      const datosSegundo = datosDeRespuesta(segundo.body);
      corridaIds.add(datosSegundo.corridaId);
      resultados.push(datosSegundo);
      verificar(datosSegundo.nuevos === 0, 'El segundo POST no debía insertar de nuevo');
      verificar(datosSegundo.actualizados === 1, 'El segundo POST debía actualizar el aviso');
    },
  },
];

/* ==========================================================================
   RUNNER
   ========================================================================== */

async function main(): Promise<void> {
  console.log('🧪 ========================================================');
  console.log('   SUITE DE INTEGRACIÓN DE INGESTA (CARD-ING-01B)');
  console.log('   Plataforma Inmobiliaria Tres de Febrero');
  console.log('========================================================\n');

  let server: Server | null = null;
  let aprobados = 0;

  try {
    // El logger SQL de desarrollo (NODE_ENV=development) no aporta al reporte.
    // `options` existe en runtime pero no está expuesto en los tipos de Sequelize 6.
    (sequelize as unknown as { options: { logging: boolean } }).options.logging = false;

    await sequelize.authenticate();
    await sequelize.sync();
    await limpiarDatosDePrueba();

    const app = createApp();
    server = app.listen(0);

    await new Promise<void>((resolve, reject) => {
      server?.once('listening', resolve);
      server?.once('error', reject);
    });

    const direccion = server.address();

    if (!direccion || typeof direccion === 'string') {
      throw new Error('No se pudo obtener el puerto efímero del servidor HTTP');
    }

    baseUrl = `http://127.0.0.1:${direccion.port}`;

    for (const [indice, escenario] of escenarios.entries()) {
      try {
        await escenario.ejecutar();
        aprobados += 1;
        console.log(`✅ [${indice + 1}/${escenarios.length}] ${escenario.nombre}`);
      } catch (error) {
        console.error(
          `❌ [${indice + 1}/${escenarios.length}] ${escenario.nombre}: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    }

    await limpiarDatosDePrueba();

    console.log('\n========================================================');
    console.log('🎉 RESUMEN DE EJECUCIÓN:');
    console.log(`   - Escenarios ejecutados: ${escenarios.length}`);
    console.log(`   - Escenarios exitosos:   ${aprobados}/${escenarios.length}`);
    console.log('========================================================\n');

    if (aprobados !== escenarios.length) {
      process.exitCode = 1;
    }
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }

    try {
      await sequelize.close();
    } catch {
      // La conexión ya podría estar cerrada por un fallo fatal.
    }
  }
}

main().catch((error: unknown) => {
  console.error('❌ Error fatal en la suite de ingesta:', error);
  process.exit(1);
});
