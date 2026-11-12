import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { fetchHealthCheck, HealthResponse } from './services/health.service';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealthCheck();
      setHealth(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido de conexión';
      setError(msg);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const initialFetch = async () => {
      setLoading(true);
      try {
        const data = await fetchHealthCheck(controller.signal);
        setHealth(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Error al conectar con la API';
          setError(msg);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    initialFetch();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans">
      <Navbar
        health={health}
        loading={loading}
        error={error}
        onRefresh={checkStatus}
      />
      <main className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <MapView />
      </main>
    </div>
  );
};

export default App;
