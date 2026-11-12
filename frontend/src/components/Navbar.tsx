import React from 'react';
import { HealthResponse } from '../services/health.service';

interface NavbarProps {
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, loading, error, onRefresh }) => {
  const isConnected = !loading && !error && health?.status === 'ok' && health.db === 'connected';

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6 z-20 shadow-md">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-inner">
          3F
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight tracking-tight">
            Plataforma Inmobiliaria 3F
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Dirección de Inversiones • Municipalidad de Tres de Febrero
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Badge de Estado del Sistema */}
        <div className="flex items-center space-x-2 text-xs">
          {loading ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800">
              <span className="w-2 h-2 mr-2 rounded-full bg-amber-400 animate-pulse"></span>
              Verificando Backend & DB...
            </div>
          ) : isConnected ? (
            <div
              className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800 shadow-sm"
              title={`Último chequeo: ${new Date(health.timestamp).toLocaleTimeString()}`}
            >
              <span className="w-2 h-2 mr-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium">Backend & DB: Conectados</span>
            </div>
          ) : (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800">
              <span className="w-2 h-2 mr-2 rounded-full bg-rose-400 animate-ping"></span>
              <span className="font-medium">Backend / DB Desconectados</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reintentar verificación de conexión"
            aria-label="Reintentar verificación de conexión"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
