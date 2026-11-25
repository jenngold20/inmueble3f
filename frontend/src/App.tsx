import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { Footer } from './components/Footer';
import { InmuebleDrawer } from './components/InmuebleDrawer';
import { fetchHealthCheck, HealthResponse } from './services/health.service';
import { useInmuebles } from './hooks/useInmuebles';
import { useInmueblesFiltrados } from './hooks/useInmueblesFiltrados';
import { FILTROS_INICIALES, type FiltrosInmuebles } from './schemas/filtros.schema';

export const App: React.FC = () => {
  const { inmuebles, loading: cargandoInmuebles, error: errorInmuebles, reintentar } = useInmuebles();
  const [filtros, setFiltros] = useState<FiltrosInmuebles>(FILTROS_INICIALES);
  const [resetVersion, setResetVersion] = useState<number>(0);
  const {
    inmueblesFiltrados,
    localidadesDisponibles,
    cantidadFiltrosActivos,
    hayFiltrosActivos,
    erroresRango,
  } = useInmueblesFiltrados(inmuebles, filtros);

  const actualizarFiltros = useCallback((parcial: Partial<FiltrosInmuebles>) => {
    setFiltros((prev) => ({ ...prev, ...parcial }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
    setResetVersion((v) => v + 1);
  }, []);

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const seleccionado = useMemo(
    () => inmueblesFiltrados.find((inmueble) => inmueble.id === seleccionadoId) ?? null,
    [inmueblesFiltrados, seleccionadoId],
  );

  // Si un filtro oculta el inmueble abierto, limpiamos la selección para no reabrirlo luego al limpiar filtros.
  useEffect(() => {
    if (!cargandoInmuebles && seleccionadoId !== null && seleccionado === null) {
      setSeleccionadoId(null);
    }
  }, [cargandoInmuebles, seleccionadoId, seleccionado]);

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
          inmuebles={inmueblesFiltrados}
          totalInmuebles={inmuebles.length}
          loading={cargandoInmuebles}
          error={errorInmuebles}
          onRetry={reintentar}
          seleccionadoId={seleccionadoId}
          onSeleccionar={seleccionar}
          filtros={filtros}
          resetVersion={resetVersion}
          localidadesDisponibles={localidadesDisponibles}
          cantidadFiltrosActivos={cantidadFiltrosActivos}
          hayFiltrosActivos={hayFiltrosActivos}
          erroresRango={erroresRango}
          onActualizarFiltros={actualizarFiltros}
          onLimpiarFiltros={limpiarFiltros}
        />
        <MapView inmuebles={inmueblesFiltrados} seleccionadoId={seleccionadoId} onSeleccionar={seleccionar} />
        {seleccionado && <InmuebleDrawer key={seleccionado.id} inmueble={seleccionado} onCerrar={cerrarFicha} />}
      </main>
      <Footer />
    </div>
  );
};

export default App;
