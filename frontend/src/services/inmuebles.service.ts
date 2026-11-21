import { ZodError } from 'zod';
import mockInmuebles from '../mocks/mock-inmuebles.json';
import { InmueblesSchema, type Inmueble } from '../schemas/inmueble.schema';

/**
 * Obtiene el listado de inmuebles.
 *
 * Hoy devuelve el mock local; cuando exista GET /api/inmuebles solo cambia el
 * origen de `datos` (fetch), la validación Zod y los consumidores quedan igual.
 */
export const fetchInmuebles = async (): Promise<Inmueble[]> => {
  const datos: unknown = mockInmuebles;

  try {
    return InmueblesSchema.parse(datos);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error('Los datos de inmuebles no cumplen el formato esperado');
    }
    throw error;
  }
};
