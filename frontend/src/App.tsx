import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { Footer } from './components/Footer';
import { InmuebleDrawer } from './components/InmuebleDrawer';
import { fetchHealthCheck, HealthResponse } from './services/health.service';
import { useInmuebles } from './hooks/useInmuebles';

export const App: React.FC = () => {
  const { inmuebles, loading: cargandoInmuebles, error: errorInmuebles, reintentar } = useInmuebles();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const seleccionado = useMemo(
    () => inmuebles.find((inmueble) => inmueble.id === seleccionadoId) ?? null,
    [inmuebles, seleccionadoId],
  );
  const seleccionar = useCallback((id: string) => setSeleccionadoId(id), []);
  const cerrarFicha = useCallback(() => setSeleccionadoId(null), []);

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
        <Sidebar
          inmuebles={inmuebles}
          loading={cargandoInmuebles}
          error={errorInmuebles}
          onRetry={reintentar}
          seleccionadoId={seleccionadoId}
          onSeleccionar={seleccionar}
        />
        <MapView inmuebles={inmuebles} seleccionadoId={seleccionadoId} onSeleccionar={seleccionar} />
        {seleccionado && <InmuebleDrawer key={seleccionado.id} inmueble={seleccionado} onCerrar={cerrarFicha} />}
      </main>
      <Footer />
    </div>
  );
};

export default App;
