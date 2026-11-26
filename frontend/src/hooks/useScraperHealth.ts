import { useState, useEffect, useCallback } from 'react';
import { fetchScrapersStatus } from '../services/scrapers.service';
import type { ScrapersStatusResponse } from '../schemas/scrapers.schema';

export function useScraperHealth() {
  const [data, setData] = useState<ScrapersStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal | unknown) => {
    const validSignal = signal instanceof AbortSignal ? signal : undefined;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchScrapersStatus(validSignal);
      setData(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(
        err instanceof Error
          ? err.message.includes('Failed to execute')
            ? 'Error al consultar el servicio de salud'
            : err.message
          : 'No se pudo conectar con el servicio de monitoreo'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refetch(controller.signal);

    // Polling suave cada 5 minutos
    const intervalId = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
