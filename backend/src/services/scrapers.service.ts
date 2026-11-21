import { CorridaScraperModel } from '../models/CorridaScraper.model.js';
import type { FuenteDatos } from '../types/dominio.types.js';
import type {
  ScraperFuenteStatus,
  ScrapersStatusResponse,
  SemaforoSalud,
} from '../types/scrapers.types.js';

/* ==========================================================================
   SERVICIO DE SALUD Y AUDITORÍA DE SCRAPERS (CARD-MTR-16)
   ========================================================================== */

const FUENTES_MONITOREADAS: Array<{ fuente: FuenteDatos; display: string }> = [
  { fuente: 'argenprop', display: 'Argenprop' },
  { fuente: 'zonaprop', display: 'Zonaprop' },
  { fuente: 'properati', display: 'Properati' },
  { fuente: 'manual_municipal', display: 'Carga Municipal' },
  { fuente: 'planilla_externa', display: 'Planillas Externas' },
];

/**
 * Evalúa las reglas semafóricas para una corrida específica:
 * - VERDE: OK hace menos de 24 horas y sin fallos.
 * - AMARILLO: OK hace 24-48 horas, o OK con fallidos > 0, o EN_PROCESO reciente (< 2h).
 * - ROJO: FALLO, o más de 48 horas sin corridas, o proceso colgado (> 2h).
 */
export function evaluarSaludCorrida(
  corrida: CorridaScraperModel | null,
  ahora: Date = new Date()
): {
  estadoSalud: SemaforoSalud;
  horasDesdeUltimaCorrida: number | null;
  detalleAlerta: string | null;
} {
  if (!corrida) {
    return {
      estadoSalud: 'AMARILLO',
      horasDesdeUltimaCorrida: null,
      detalleAlerta: 'Sin corridas registradas en la base de datos',
    };
  }

  const horas = (ahora.getTime() - new Date(corrida.fechaInicio).getTime()) / (1000 * 60 * 60);
  const horasRedondeadas = Math.round(horas * 10) / 10;

  // 1. Estado explícito de FALLO
  if (corrida.estado === 'FALLO') {
    return {
      estadoSalud: 'ROJO',
      horasDesdeUltimaCorrida: horasRedondeadas,
      detalleAlerta: corrida.mensajeError ?? 'La última corrida finalizó con estado FALLO',
    };
  }

  // 2. Corrida en curso / colgada
  if (corrida.estado === 'EN_PROCESO') {
    if (horas > 2) {
      return {
        estadoSalud: 'ROJO',
        horasDesdeUltimaCorrida: horasRedondeadas,
        detalleAlerta: `Proceso potencialmente colgado: en ejecución hace más de ${Math.round(horas)} hs`,
      };
    }
    return {
      estadoSalud: 'AMARILLO',
      horasDesdeUltimaCorrida: horasRedondeadas,
      detalleAlerta: 'Corrida de ingesta actualmente en ejecución',
    };
  }

  // 3. Corrida OK
  if (horas < 24) {
    if (corrida.fallidos > 0) {
      return {
        estadoSalud: 'AMARILLO',
        horasDesdeUltimaCorrida: horasRedondeadas,
        detalleAlerta: `Completada con éxito pero se detectaron ${corrida.fallidos} aviso(s) descartado(s)`,
      };
    }
    return {
      estadoSalud: 'VERDE',
      horasDesdeUltimaCorrida: horasRedondeadas,
      detalleAlerta: null,
    };
  }

  if (horas < 48) {
    return {
      estadoSalud: 'AMARILLO',
      horasDesdeUltimaCorrida: horasRedondeadas,
      detalleAlerta: `Datos con más de 24 hs de antigüedad (${Math.round(horas)} hs transcurridas)`,
    };
  }

  return {
    estadoSalud: 'ROJO',
    horasDesdeUltimaCorrida: horasRedondeadas,
    detalleAlerta: `Alerta de desactualización: pasaron ${Math.round(horas)} hs sin ingesta nueva`,
  };
}

/**
 * Calcula el estado consolidado de la plataforma:
 * El estado más grave determina el semáforo general.
 */
export function calcularEstadoGlobal(estados: SemaforoSalud[]): SemaforoSalud {
  if (estados.includes('ROJO')) return 'ROJO';
  if (estados.includes('AMARILLO')) return 'AMARILLO';
  return 'VERDE';
}

/**
 * Consulta la última corrida de cada fuente y retorna el estado completo.
 */
export async function obtenerEstadoScrapers(): Promise<ScrapersStatusResponse> {
  const ahora = new Date();

  // Consulta ordenada por fecha descendente
  const corridas = await CorridaScraperModel.findAll({
    order: [['fechaInicio', 'DESC']],
    limit: 200,
  });

  // Agrupar la más reciente por fuente
  const ultimasPorFuente = new Map<string, CorridaScraperModel>();
  for (const corrida of corridas) {
    if (!ultimasPorFuente.has(corrida.fuente)) {
      ultimasPorFuente.set(corrida.fuente, corrida);
    }
  }

  // Solo consideramos fuentes que tengan al menos 1 corrida o las fuentes principales como Argenprop
  const fuentesAProcesar = FUENTES_MONITOREADAS.filter(
    (f) => f.fuente === 'argenprop' || ultimasPorFuente.has(f.fuente)
  );

  const fuentesStatus: ScraperFuenteStatus[] = fuentesAProcesar.map(({ fuente, display }) => {
    const corrida = ultimasPorFuente.get(fuente) ?? null;
    const { estadoSalud, horasDesdeUltimaCorrida, detalleAlerta } = evaluarSaludCorrida(corrida, ahora);

    return {
      fuente,
      nombreDisplay: display,
      estadoSalud,
      estadoUltimaCorrida: corrida ? corrida.estado : null,
      ultimaCorridaAt: corrida ? corrida.fechaInicio.toISOString() : null,
      fechaFin: corrida && corrida.fechaFin ? corrida.fechaFin.toISOString() : null,
      horasDesdeUltimaCorrida,
      metricasUltimaCorrida: corrida
        ? {
            totalLeidos: corrida.totalLeidos,
            nuevos: corrida.nuevos,
            actualizados: corrida.actualizados,
            fallidos: corrida.fallidos,
          }
        : null,
      mensajeError: corrida?.mensajeError ?? null,
      detalleAlerta,
    };
  });

  const estadoGlobal = calcularEstadoGlobal(fuentesStatus.map((f) => f.estadoSalud));

  return {
    estadoGlobal,
    timestamp: ahora.toISOString(),
    fuentes: fuentesStatus,
  };
}
