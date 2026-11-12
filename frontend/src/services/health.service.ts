export interface HealthResponse {
  success: boolean;
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected';
  timestamp: string;
}

export const fetchHealthCheck = async (signal?: AbortSignal): Promise<HealthResponse> => {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: unknown = await response.json();

  if (typeof data !== 'object' || data === null) {
    throw new Error('Respuesta inválida del servidor');
  }

  const res = data as Record<string, unknown>;

  // Acepta formato envuelto o directo
  const isSuccess = res.success === true || res.status === 'ok';
  const dbStatus = res.db === 'connected' ? 'connected' : 'disconnected';
  const status = res.status === 'ok' ? 'ok' : 'error';
  const timestamp = typeof res.timestamp === 'string' ? res.timestamp : new Date().toISOString();

  return {
    success: isSuccess,
    status,
    db: dbStatus,
    timestamp,
  };
};
