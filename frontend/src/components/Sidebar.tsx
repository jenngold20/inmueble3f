import React from 'react';
import type { Inmueble } from '../schemas/inmueble.schema';
import { FiltersPanel } from './FiltersPanel';
import { InmuebleCard, InmuebleCardSkeleton } from './InmuebleCard';

interface SidebarProps {
  inmuebles: Inmueble[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CANTIDAD_SKELETONS = 4;
const SKELETON_IDS = Array.from({ length: CANTIDAD_SKELETONS }, (_, i) => `skeleton-${i}`);

const BOTON_REINTENTAR =
  'mt-3 min-h-11 cursor-pointer rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2';

export const Sidebar: React.FC<SidebarProps> = ({ inmuebles, loading, error, onRetry }) => {
  const hayResultados = !loading && !error && inmuebles.length > 0;
  const sinResultados = !loading && !error && inmuebles.length === 0;

  return (
    <aside className="z-10 flex h-full w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm md:w-96">
      {/* Filtros (colapsados por defecto: hoy están deshabilitados y el listado es la prioridad) */}
      <details className="group shrink-0 border-b border-slate-200 bg-slate-50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-municipal-500 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center">
            <svg
              className="mr-2 h-4 w-4 text-municipal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filtros de Radicación
          </span>
          <svg
            className="h-4 w-4 text-slate-500 motion-safe:transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="max-h-[55vh] overflow-y-auto bg-white">
          <FiltersPanel />
        </div>
      </details>

      {/* Listado de inmuebles */}
      <section aria-labelledby="listado-titulo" className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-baseline justify-between">
            <h2 id="listado-titulo" className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Inmuebles disponibles
            </h2>
            <p className="text-xs font-medium text-slate-600" aria-live="polite">
              {loading ? 'Cargando…' : error ? '' : `${inmuebles.length} ${inmuebles.length === 1 ? 'inmueble' : 'inmuebles'}`}
            </p>
          </div>
          <p className="flex items-start rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900">
            <svg
              className="mr-1.5 mt-0.5 h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              <strong className="font-semibold">Datos de prueba:</strong> estas propiedades son ficticias y se
              reemplazarán por la oferta real.
            </span>
          </p>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-municipal-500"
          tabIndex={0}
          aria-label="Listado de inmuebles"
          aria-busy={loading}
        >
          {loading && (
            <div role="status">
              <span className="sr-only">Cargando inmuebles…</span>
              <div className="space-y-3">
                {SKELETON_IDS.map((id) => (
                  <InmuebleCardSkeleton key={id} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <p className="text-sm font-semibold">No se pudo cargar el listado</p>
              <p className="mt-1 text-xs">{error}</p>
              <button type="button" onClick={onRetry} className={BOTON_REINTENTAR}>
                Reintentar
              </button>
            </div>
          )}

          {sinResultados && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-slate-700">
              <p className="text-sm font-semibold">No se encontraron inmuebles con estos criterios</p>
              <p className="mt-1 text-xs text-slate-600">Probá volver a cargar el listado.</p>
              <button type="button" onClick={onRetry} className={BOTON_REINTENTAR}>
                Volver a cargar
              </button>
            </div>
          )}

          {hayResultados && (
            <ul className="space-y-3">
              {inmuebles.map((inmueble) => (
                <li key={inmueble.id}>
                  <InmuebleCard inmueble={inmueble} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Footer del Sidebar */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <span>Capa Geoespacial: Turf.js</span>
        <span className="font-semibold text-slate-700">Versión 0.1.0</span>
      </div>
    </aside>
  );
};
