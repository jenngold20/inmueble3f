import {
  ConnectionError,
  DatabaseError,
  UniqueConstraintError,
  type Transaction,
} from 'sequelize';
import type { ZodError } from 'zod';
import { AvisoModel, InmuebleModel, sequelize } from '../models/index.js';
import { AvisoCrudoSchema } from '../schemas/dominio.schema.js';
import type { AvisoCrudo, FuenteDatos } from '../types/dominio.types.js';
import { AvisoCrudoIngestaSchema } from '../schemas/ingesta.schema.js';
import type {
  AvisoCrudoIngesta,
  FalloIngesta,
  IngestaLote,
  MotivoFalloIngesta,
  ResultadoAviso,
  ResultadoAvisoFallido,
  ResultadoIngesta,
} from '../types/ingesta.types.js';
import { esResultadoFallido } from '../types/ingesta.types.js';
import { AppError } from '../types/errors.js';
import { buscarInmuebleCoincidenteEnBD } from './deduplicacion.service.js';
import { determinarZonaMunicipal } from './geo.service.js';
import {
  finalizarCorrida,
  iniciarCorrida,
  marcarCorridaFallida,
  type MetricasCorrida,
} from './corrida-scraper.service.js';

/* ==========================================================================
   INGESTA DE AVISOS (CARD-ING-01B)
   ========================================================================== */

/** Aviso de dominio ya normalizado: las coordenadas son obligatorias. */
type AvisoValidado = AvisoCrudo & { lat: number; lng: number };

type ResultadoNormalizacion =
  | { ok: true; aviso: AvisoValidado }
  | { ok: false; motivo: MotivoFalloIngesta; detalle: string };

const LIMITE_MENSAJE_ERROR = 8_000;

/* ==========================================================================
   HELPERS DE NORMALIZACIÓN Y ERRORES
   ========================================================================== */

function formatearIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('; ');
}

function extraerIdExterno(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || !('idExterno' in raw)) {
    return null;
  }

  const valor = (raw as Record<string, unknown>).idExterno;
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

function describirError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clasificarError(error: unknown): MotivoFalloIngesta {
  return error instanceof DatabaseError ? 'ERROR_BD' : 'ERROR_DESCONOCIDO';
}

function crearFallo(
  indice: number,
  idExterno: string | null,
  motivo: MotivoFalloIngesta,
  detalle: string
): ResultadoAvisoFallido {
  return { estado: 'fallido', indice, idExterno, motivo, detalle };
}

/**
 * Convierte un elemento crudo del lote en un AvisoCrudo de dominio.
 * Descarta los campos que todavía no tienen columna (expensas,
 * caracteristicasExtra y fotos) y aplica las dos reglas de aptitud:
 * tipo comercial y coordenadas presentes.
 */
function normalizarAvisoCrudo(raw: unknown, fuente: FuenteDatos): ResultadoNormalizacion {
  const parseoContrato = AvisoCrudoIngestaSchema.safeParse(raw);

  if (!parseoContrato.success) {
    return {
      ok: false,
      motivo: 'ZOD_INVALIDO',
      detalle: formatearIssues(parseoContrato.error),
    };
  }

  const aviso: AvisoCrudoIngesta = parseoContrato.data;

  if (aviso.tipo === 'otro') {
    return {
      ok: false,
      motivo: 'TIPO_NO_APTO',
      detalle: 'La tipología "otro" corresponde a una publicación residencial o no comercial',
    };
  }

  if (typeof aviso.lat !== 'number' || typeof aviso.lng !== 'number') {
    return {
      ok: false,
      motivo: 'SIN_COORDENADAS',
      detalle: 'El aviso no informa latitud/longitud; queda pendiente de CARD-ING-02 (Georef)',
    };
  }

  const lat = aviso.lat;
  const lng = aviso.lng;

  const candidatoDominio = {
    idExterno: aviso.idExterno,
    fuente,
    url: aviso.url,
    titulo: aviso.titulo,
    descripcion: aviso.descripcion ?? null,
    tipo: aviso.tipo,
    operacion: aviso.operacion,
    precio: aviso.precio ?? null,
    moneda: aviso.moneda,
    direccion: aviso.direccion,
    localidad: aviso.localidad,
    lat,
    lng,
    superficieTotalM2: aviso.superficieTotalM2 ?? null,
    superficieCubiertaM2: aviso.superficieCubiertaM2 ?? null,
    anunciante: aviso.anunciante ?? null,
    comercializadora: aviso.comercializadora ?? null,
    contactoTelefono: aviso.contactoTelefono ?? null,
    // Las fotos se persisten en una tarjeta posterior (fuera de alcance).
    fotos: [],
  };

  const parseoDominio = AvisoCrudoSchema.safeParse(candidatoDominio);

  if (!parseoDominio.success) {
    return {
      ok: false,
      motivo: 'ZOD_INVALIDO',
      detalle: formatearIssues(parseoDominio.error),
    };
  }

  return {
    ok: true,
    aviso: { ...parseoDominio.data, lat, lng },
  };
}

/* ==========================================================================
   RESOLUCIÓN MÍNIMA DEL INMUEBLE (SEAM DE CARD-ING-03B)
   ========================================================================== */

async function resolverInmuebleId(
  aviso: AvisoValidado,
  transaction: Transaction
): Promise<string> {
  const deduplicacion = await buscarInmuebleCoincidenteEnBD(
    {
      tipo: aviso.tipo,
      localidad: aviso.localidad,
      lat: aviso.lat,
      lng: aviso.lng,
      superficieCubiertaM2: aviso.superficieCubiertaM2,
      superficieTotalM2: aviso.superficieTotalM2,
      direccion: aviso.direccion,
    },
    transaction
  );

  if (deduplicacion.coincide && deduplicacion.inmuebleCoincidente) {
    return deduplicacion.inmuebleCoincidente.id;
  }

  // Cruce espacial inmediato con capas GeoJSON mediante Turf.js (GEO-06)
  const cruce = determinarZonaMunicipal(aviso.lat, aviso.lng);

  const inmueble = await InmuebleModel.create(
    {
      direccion: aviso.direccion,
      direccionNormalizada: null,
      localidad: aviso.localidad,
      lat: aviso.lat,
      lng: aviso.lng,
      superficieTotalM2: aviso.superficieTotalM2 ?? null,
      superficieCubiertaM2: aviso.superficieCubiertaM2 ?? null,
      tipo: aviso.tipo,
      zonaCodigo: cruce.zona ?? null,
      macrozona: cruce.macrozona ?? null,
    },
    { transaction }
  );

  return inmueble.id;
}

/* ==========================================================================
   UPSERT EXPLÍCITO (D3)
   ========================================================================== */

/** Campos refrescables de un aviso existente. La whitelist es explícita. */
function camposMutables(aviso: AvisoValidado, fechaCorrida: Date) {
  return {
    url: aviso.url,
    titulo: aviso.titulo,
    descripcion: aviso.descripcion ?? null,
    precio: aviso.precio ?? null,
    moneda: aviso.moneda,
    operacion: aviso.operacion,
    anunciante: aviso.anunciante ?? null,
    comercializadora: aviso.comercializadora ?? null,
    contactoTelefono: aviso.contactoTelefono ?? null,
    fechaVistoUltimaVez: fechaCorrida,
    estado: 'activo' as const,
  };
}

async function resolverConflictoUnicidad(
  aviso: AvisoValidado,
  indice: number,
  fechaCorrida: Date
): Promise<ResultadoAviso> {
  try {
    return await sequelize.transaction(async (transaction): Promise<ResultadoAviso> => {
      const existente = await AvisoModel.findOne({
        where: { fuente: aviso.fuente, idExterno: aviso.idExterno },
        transaction,
      });

      if (!existente) {
        return crearFallo(
          indice,
          aviso.idExterno,
          'CONFLICTO_UNICIDAD',
          'El índice único reportó un conflicto pero el aviso no pudo releerse'
        );
      }

      await existente.update(camposMutables(aviso, fechaCorrida), { transaction });

      return {
        estado: 'actualizado',
        indice,
        idExterno: aviso.idExterno,
        avisoId: existente.id,
        inmuebleId: existente.inmuebleId,
      };
    });
  } catch (error) {
    if (error instanceof ConnectionError) {
      throw error;
    }

    return crearFallo(indice, aviso.idExterno, clasificarError(error), describirError(error));
  }
}

/**
 * Una transacción corta por aviso (D5): Inmueble + Aviso se confirman o
 * revierten juntos. Una carrera de unicidad se reclasifica como actualización.
 */
async function procesarAvisoPersistencia(
  aviso: AvisoValidado,
  indice: number,
  fechaCorrida: Date
): Promise<ResultadoAviso> {
  try {
    return await sequelize.transaction(async (transaction): Promise<ResultadoAviso> => {
      // Se busca primero el aviso: si ya existe, sólo se refresca. Resolver el
      // Inmueble antes crearía inmuebles huérfanos cuando cambian los m².
      const existente = await AvisoModel.findOne({
        where: { fuente: aviso.fuente, idExterno: aviso.idExterno },
        transaction,
      });

      if (existente) {
        await existente.update(camposMutables(aviso, fechaCorrida), { transaction });

        return {
          estado: 'actualizado',
          indice,
          idExterno: aviso.idExterno,
          avisoId: existente.id,
          inmuebleId: existente.inmuebleId,
        };
      }

      const inmuebleId = await resolverInmuebleId(aviso, transaction);

      const creado = await AvisoModel.create(
        {
          inmuebleId,
          idExterno: aviso.idExterno,
          fuente: aviso.fuente,
          url: aviso.url,
          titulo: aviso.titulo,
          descripcion: aviso.descripcion ?? null,
          precio: aviso.precio ?? null,
          moneda: aviso.moneda,
          operacion: aviso.operacion,
          anunciante: aviso.anunciante ?? null,
          comercializadora: aviso.comercializadora ?? null,
          contactoTelefono: aviso.contactoTelefono ?? null,
          fechaVistoPrimeraVez: fechaCorrida,
          fechaVistoUltimaVez: fechaCorrida,
          estado: 'activo',
        },
        { transaction }
      );

      return {
        estado: 'nuevo',
        indice,
        idExterno: aviso.idExterno,
        avisoId: creado.id,
        inmuebleId: creado.inmuebleId,
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return resolverConflictoUnicidad(aviso, indice, fechaCorrida);
    }

    // Un error de conexión no es un aviso fallido: tumba la corrida completa.
    if (error instanceof ConnectionError) {
      throw error;
    }

    return crearFallo(indice, aviso.idExterno, clasificarError(error), describirError(error));
  }
}

async function procesarRegistro(
  raw: unknown,
  indice: number,
  fuente: FuenteDatos,
  fechaCorrida: Date
): Promise<ResultadoAviso> {
  const normalizado = normalizarAvisoCrudo(raw, fuente);

  if (!normalizado.ok) {
    return crearFallo(
      indice,
      extraerIdExterno(raw),
      normalizado.motivo,
      normalizado.detalle
    );
  }

  return procesarAvisoPersistencia(normalizado.aviso, indice, fechaCorrida);
}

/* ==========================================================================
   MÉTRICAS Y AUDITORÍA
   ========================================================================== */

function calcularMetricas(
  resultados: ResultadoAviso[],
  totalLeidos: number
): MetricasCorrida {
  return {
    totalLeidos,
    nuevos: resultados.filter((resultado) => resultado.estado === 'nuevo').length,
    actualizados: resultados.filter((resultado) => resultado.estado === 'actualizado').length,
    fallidos: resultados.filter(esResultadoFallido).length,
  };
}

function aFalloIngesta(resultado: ResultadoAvisoFallido): FalloIngesta {
  return {
    indice: resultado.indice,
    idExterno: resultado.idExterno,
    motivo: resultado.motivo,
    detalle: resultado.detalle,
  };
}

/**
 * Serializa los fallos al TEXT de `CorridasScraper.mensajeError`.
 * Si supera 8.000 caracteres se recortan fallos desde el final y se marca
 * `truncado: true` para no guardar un JSON inválido.
 */
function serializarMensajeError(
  fallidos: FalloIngesta[],
  errorFatal?: string
): string | null {
  if (fallidos.length === 0 && !errorFatal) {
    return null;
  }

  const construir = (lista: FalloIngesta[], truncado: boolean): string =>
    JSON.stringify({
      fallidos: lista,
      ...(errorFatal ? { error: errorFatal } : {}),
      ...(truncado ? { truncado: true } : {}),
    });

  let json = construir(fallidos, false);

  if (json.length <= LIMITE_MENSAJE_ERROR) {
    return json;
  }

  const recortados = [...fallidos];

  while (recortados.length > 0) {
    recortados.pop();
    json = construir(recortados, true);

    if (json.length <= LIMITE_MENSAJE_ERROR) {
      return json;
    }
  }

  return json.slice(0, LIMITE_MENSAJE_ERROR);
}

/* ==========================================================================
   PUNTO DE ENTRADA DEL SERVICIO
   ========================================================================== */

export async function procesarLoteAvisos(lote: IngestaLote): Promise<ResultadoIngesta> {
  let corrida;

  try {
    corrida = await iniciarCorrida(lote.fuente);
  } catch (error) {
    throw new AppError(
      'No se pudo iniciar la corrida de ingesta en la base de datos',
      503,
      'DB_UNAVAILABLE',
      { detalle: describirError(error) }
    );
  }

  const fechaCorrida = corrida.fechaInicio;
  const resultados: ResultadoAviso[] = [];

  try {
    for (const [indice, aviso] of lote.avisos.entries()) {
      resultados.push(await procesarRegistro(aviso, indice, lote.fuente, fechaCorrida));
    }

    const metricas = calcularMetricas(resultados, lote.avisos.length);
    const detalleFallidos = resultados.filter(esResultadoFallido).map(aFalloIngesta);
    const mensajeError = serializarMensajeError(detalleFallidos);

    await finalizarCorrida(corrida.id, metricas, mensajeError);

    return {
      corridaId: corrida.id,
      estadoCorrida: 'OK',
      ...metricas,
      detalleFallidos,
    };
  } catch (error) {
    // Un error fatal aborta el lote: todo aviso no procesado cuenta como
    // fallido para que la invariante de métricas siga siendo verificable.
    const motivoFatal: MotivoFalloIngesta =
      error instanceof ConnectionError ? 'ERROR_BD' : 'ERROR_DESCONOCIDO';

    const resultadosCompletos: ResultadoAviso[] = [...resultados];

    for (let indice = resultados.length; indice < lote.avisos.length; indice++) {
      resultadosCompletos.push(
        crearFallo(
          indice,
          extraerIdExterno(lote.avisos[indice]),
          motivoFatal,
          'La corrida se abortó antes de persistir este aviso'
        )
      );
    }

    const metricas = calcularMetricas(resultadosCompletos, lote.avisos.length);
    const detalleFallidos = resultadosCompletos.filter(esResultadoFallido).map(aFalloIngesta);
    const mensajeError =
      serializarMensajeError(detalleFallidos, describirError(error)) ?? 'Corrida fallida';

    try {
      await marcarCorridaFallida(corrida.id, mensajeError, metricas);
    } catch {
      // La base no está disponible: no hay más auditoría posible.
    }

    const esFalloBD = error instanceof ConnectionError;

    throw new AppError(
      'La corrida de ingesta falló y quedó registrada como FALLO',
      esFalloBD ? 503 : 500,
      esFalloBD ? 'DB_UNAVAILABLE' : 'INTERNAL_SERVER_ERROR',
      { corridaId: corrida.id }
    );
  }
}
