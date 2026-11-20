import { useCallback, useEffect, useState } from 'react';
import { fetchInmuebles } from '../services/inmuebles.service';
import type { Inmueble } from '../schemas/inmueble.schema';

interface UseInmueblesResult {
  inmuebles: Inmueble[];
  loading: boolean;
  error: string | null;
  reintentar: () => void;
}

export const useInmuebles = (): UseInmueblesResult => {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState<number>(0);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);

    fetchInmuebles()
      .then((datos) => {
        if (!cancelado) setInmuebles(datos);
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setInmuebles([]);
          setError(err instanceof Error ? err.message : 'No se pudo cargar el listado de inmuebles');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { inmuebles, loading, error, reintentar };
};
