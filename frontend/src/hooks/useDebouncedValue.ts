import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de cambios rápidos (por ejemplo, escritura en inputs numéricos)
 * para evitar recomputaciones innecesarias en cada tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (value === null) {
      setDebounced((prev) => (prev === null ? prev : value));
      return;
    }

    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
