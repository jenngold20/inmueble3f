import React, { useState, useRef, useEffect } from 'react';
import type { ScrapersStatusResponse, ScraperFuenteStatus, SemaforoSalud } from '../schemas/scrapers.schema';

interface ScraperHealthBadgeProps {
  statusData: ScrapersStatusResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const COLOR_CONFIG: Record<
  SemaforoSalud,
  {
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    dotColor: string;
    label: string;
  }
> = {
  VERDE: {
    bgBadge: 'bg-emerald-950/70',
    textBadge: 'text-emerald-300',
    borderBadge: 'border-emerald-800',
    dotColor: 'bg-emerald-400',
    label: 'Scrapers al día',
  },
  AMARILLO: {
    bgBadge: 'bg-amber-950/70',
    textBadge: 'text-amber-300',
    borderBadge: 'border-amber-800',
    dotColor: 'bg-amber-400',
    label: 'Atención: Datos > 24h',
  },
  ROJO: {
    bgBadge: 'bg-rose-950/70',
    textBadge: 'text-rose-300',
    borderBadge: 'border-rose-800',
    dotColor: 'bg-rose-400',
    label: 'Alerta: Scrapers detenidos',
  },
};

function formatFechaRelativa(isoString: string | null): string {
  if (!isoString) return 'Sin corridas';
  const fecha = new Date(isoString);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ScraperHealthBadge: React.FC<ScraperHealthBadgeProps> = ({
  statusData,
  loading,
  error,
  onRefresh,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al clickear afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const estado = statusData?.estadoGlobal ?? 'AMARILLO';
  const config = COLOR_CONFIG[estado];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 cursor-pointer ${
          config.bgBadge
        } ${config.textBadge} ${config.borderBadge}`}
        title="Ver estado de ingesta de portales inmobiliarios"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span
          className={`w-2 h-2 mr-2 rounded-full ${config.dotColor} ${
            loading ? 'animate-pulse' : estado === 'ROJO' ? 'animate-ping' : ''
          }`}
        />
        <span>{loading ? 'Verificando fuentes...' : config.label}</span>
        <svg
          className={`ml-1.5 w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover desplegable con detalle de portales */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 text-slate-800 p-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Salud de Fuentes Inmobiliarias
            </h3>
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>

          {error && (
            <div className="p-2 mb-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
              No se pudo obtener el estado: {error}
            </div>
          )}

          {statusData?.fuentes && statusData.fuentes.length > 0 ? (
            <ul className="space-y-2.5">
              {statusData.fuentes.map((f: ScraperFuenteStatus) => {
                return (
                  <li
                    key={f.fuente}
                    className="p-2.5 rounded-md bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{f.nombreDisplay}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          f.estadoSalud === 'VERDE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.estadoSalud === 'AMARILLO'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {f.estadoSalud === 'VERDE'
                          ? 'Operativo'
                          : f.estadoSalud === 'AMARILLO'
                          ? 'Atención'
                          : 'Alerta'}
                      </span>
                    </div>

                    <div className="mt-1.5 text-[11px] text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Última ingesta:</span>
                        <span className="font-medium text-slate-800">
                          {formatFechaRelativa(f.ultimaCorridaAt)}
                        </span>
                      </div>

                      {f.horasDesdeUltimaCorrida !== null && (
                        <div className="flex justify-between text-slate-500">
                          <span>Antigüedad:</span>
                          <span>hace {Math.round(f.horasDesdeUltimaCorrida)} hs</span>
                        </div>
                      )}

                      {f.metricasUltimaCorrida && (
                        <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                          <span>Avisos procesados:</span>
                          <span className="font-medium text-slate-700">
                            {f.metricasUltimaCorrida.totalLeidos} ({f.metricasUltimaCorrida.nuevos} nuevos, {f.metricasUltimaCorrida.actualizados} act)
                          </span>
                        </div>
                      )}

                      {f.detalleAlerta && (
                        <p className="mt-1 text-[10px] text-amber-800 bg-amber-50/80 p-1 rounded font-medium">
                          ⚠️ {f.detalleAlerta}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic py-2 text-center">
              No hay fuentes de scraping registradas todavía.
            </p>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
            <span>SLA: 24h fresco / 48h crítico</span>
            <span className="font-semibold text-slate-600">Anti Silent-Fail</span>
          </div>
        </div>
      )}
    </div>
  );
};
