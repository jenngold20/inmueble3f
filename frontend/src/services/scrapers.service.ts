import {
  ScrapersStatusResponseSchema,
  type ScrapersStatusResponse,
} from '../schemas/scrapers.schema';

export const fetchScrapersStatus = async (
  signal?: AbortSignal
): Promise<ScrapersStatusResponse> => {
  const response = await fetch('/api/scrapers/status', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error HTTP al consultar salud de scrapers: ${response.status}`);
  }

  const json: unknown = await response.json();

  if (typeof json !== 'object' || json === null || !('data' in json)) {
    throw new Error('Estructura de respuesta inválida desde el backend');
  }

  const rawData = (json as Record<string, unknown>).data;
  const parseado = ScrapersStatusResponseSchema.safeParse(rawData);

  if (!parseado.success) {
    throw new Error(`Fallo de validación Zod en status de scrapers: ${parseado.error.message}`);
  }

  return parseado.data;
};
