import {
  evaluarSaludCorrida,
  calcularEstadoGlobal,
  UMBRALES_DEFAULT,
  type UmbralesSaludScraper,
} from '../services/scrapers.service.js';
import { ScrapersStatusResponseSchema } from '../schemas/scrapers.schema.js';
import type { CorridaScraperModel } from '../models/CorridaScraper.model.js';
import { assert } from './test-helpers.js';

/* ==========================================================================
   SUITE DE PRUEBAS DE SALUD Y SEMÁFORO DE SCRAPERS (CARD-MTR-16)
   ========================================================================== */

function mockCorrida(data: Partial<CorridaScraperModel>): CorridaScraperModel {
  return data as unknown as CorridaScraperModel;
}

console.log('🧪 Iniciando verificación de reglas semafóricas (CARD-MTR-16)...\n');

const ahora = new Date('2026-11-21T18:00:00.000Z');

// 1. Corrida reciente (< 24h) y exitosa sin fallos -> VERDE
const corridaVerde = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T14:00:00.000Z'), // 4 horas antes
  estado: 'OK',
  totalLeidos: 100,
  nuevos: 5,
  actualizados: 95,
  fallidos: 0,
});
const saludVerde = evaluarSaludCorrida(corridaVerde, ahora);
assert(saludVerde.estadoSalud === 'VERDE', 'Corrida exitosa de hace 4 horas debe ser VERDE');
assert(saludVerde.horasDesdeUltimaCorrida === 4, 'Horas transcurridas debe ser exactamente 4');

// 2. Corrida reciente (< 24h) pero con avisos descartados -> AMARILLO
const corridaAmarilloFallidos = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T15:00:00.000Z'), // 3 horas antes
  estado: 'OK',
  totalLeidos: 100,
  nuevos: 5,
  actualizados: 90,
  fallidos: 5,
});
const saludAmarilloFallidos = evaluarSaludCorrida(corridaAmarilloFallidos, ahora);
assert(saludAmarilloFallidos.estadoSalud === 'AMARILLO', 'Corrida con fallidos > 0 debe ser AMARILLO');

// 3. Corrida entre 24h y 48h -> AMARILLO
const corridaAmarilloTiempo = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-20T10:00:00.000Z'), // 32 horas antes
  estado: 'OK',
  totalLeidos: 50,
  nuevos: 2,
  actualizados: 48,
  fallidos: 0,
});
const saludAmarilloTiempo = evaluarSaludCorrida(corridaAmarilloTiempo, ahora);
assert(saludAmarilloTiempo.estadoSalud === 'AMARILLO', 'Corrida de hace 32 horas debe ser AMARILLO');

// 4. Corrida con más de 48h -> ROJO (Desactualizado)
const corridaRojaTiempo = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-19T10:00:00.000Z'), // 56 horas antes
  estado: 'OK',
  totalLeidos: 50,
  nuevos: 2,
  actualizados: 48,
  fallidos: 0,
});
const saludRojaTiempo = evaluarSaludCorrida(corridaRojaTiempo, ahora);
assert(saludRojaTiempo.estadoSalud === 'ROJO', 'Corrida de hace más de 48 horas debe ser ROJO');

// 5. Corrida con estado FALLO -> ROJO inmediato
const corridaRojaFallo = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T17:00:00.000Z'), // 1 hora antes
  estado: 'FALLO',
  mensajeError: 'Portal cambió selectores DOM',
  totalLeidos: 0,
  nuevos: 0,
  actualizados: 0,
  fallidos: 1,
});
const saludRojaFallo = evaluarSaludCorrida(corridaRojaFallo, ahora);
assert(saludRojaFallo.estadoSalud === 'ROJO', 'Corrida con estado FALLO debe ser ROJO');

// 6. Corrida colgada en EN_PROCESO (> 2h) -> ROJO
const corridaColgada = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T15:00:00.000Z'), // 3 horas antes
  estado: 'EN_PROCESO',
  totalLeidos: 0,
  nuevos: 0,
  actualizados: 0,
  fallidos: 0,
});
const saludColgada = evaluarSaludCorrida(corridaColgada, ahora);
assert(saludColgada.estadoSalud === 'ROJO', 'Corrida colgada en ejecución por más de 2h debe ser ROJO');

// 7. Umbrales configurables personalizados vs valores por defecto
const umbralesCustom: UmbralesSaludScraper = {
  timeoutColgadoHoras: 1,
  slaFrescoHoras: 12,
  slaCriticoHoras: 24,
};

// Corrida de hace 14 horas: con SLA fresco de 12h es AMARILLO, con default (24h) es VERDE
const corridaCustom14h = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T04:00:00.000Z'), // 14 horas antes
  estado: 'OK',
  totalLeidos: 10,
  nuevos: 0,
  actualizados: 10,
  fallidos: 0,
});
const saludCustom14h = evaluarSaludCorrida(corridaCustom14h, ahora, umbralesCustom);
assert(saludCustom14h.estadoSalud === 'AMARILLO', 'Con SLA fresco de 12h, corrida de hace 14h pasa a AMARILLO');

const saludDefault14h = evaluarSaludCorrida(corridaCustom14h, ahora, UMBRALES_DEFAULT);
assert(saludDefault14h.estadoSalud === 'VERDE', 'Con SLA fresco por defecto (24h), corrida de 14h se mantiene VERDE');

// Corrida en proceso de hace 1.5 horas: con timeout custom de 1h es ROJO (colgado), con default (2h) es AMARILLO
const corridaCustomColgada = mockCorrida({
  fuente: 'argenprop',
  fechaInicio: new Date('2026-11-21T16:30:00.000Z'), // 1.5 horas antes
  estado: 'EN_PROCESO',
  totalLeidos: 0,
  nuevos: 0,
  actualizados: 0,
  fallidos: 0,
});
const saludCustomColgada = evaluarSaludCorrida(corridaCustomColgada, ahora, umbralesCustom);
assert(saludCustomColgada.estadoSalud === 'ROJO', 'Con timeout custom de 1h, proceso de 1.5h pasa a ROJO');

const saludDefaultColgada = evaluarSaludCorrida(corridaCustomColgada, ahora, UMBRALES_DEFAULT);
assert(saludDefaultColgada.estadoSalud === 'AMARILLO', 'Con timeout default (2h), proceso de 1.5h sigue en AMARILLO');

// 8. Cálculo del estado global
assert(calcularEstadoGlobal(['VERDE', 'VERDE']) === 'VERDE', 'Todas verdes -> Global VERDE');
assert(calcularEstadoGlobal(['VERDE', 'AMARILLO']) === 'AMARILLO', 'Una amarilla -> Global AMARILLO');
assert(calcularEstadoGlobal(['VERDE', 'AMARILLO', 'ROJO']) === 'ROJO', 'Una roja -> Global ROJO');

// 8. Validación de contrato Zod del response
const respuestaPrueba = {
  estadoGlobal: 'VERDE',
  timestamp: ahora.toISOString(),
  fuentes: [
    {
      fuente: 'argenprop',
      nombreDisplay: 'Argenprop',
      estadoSalud: 'VERDE',
      estadoUltimaCorrida: 'OK',
      ultimaCorridaAt: corridaVerde.fechaInicio.toISOString(),
      fechaFin: new Date('2026-11-21T14:05:00.000Z').toISOString(),
      horasDesdeUltimaCorrida: 4,
      metricasUltimaCorrida: {
        totalLeidos: 100,
        nuevos: 5,
        actualizados: 95,
        fallidos: 0,
      },
      mensajeError: null,
      detalleAlerta: null,
    },
  ],
};

const parseoZod = ScrapersStatusResponseSchema.safeParse(respuestaPrueba);
assert(parseoZod.success, 'El payload de respuesta debe satisfacer estrictamente el esquema Zod');

console.log('\n🎉 ¡Todas las pruebas de lógica de salud y validación de contrato pasaron con éxito!');
