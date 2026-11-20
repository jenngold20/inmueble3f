import React from 'react';

/**
 * Bloque de filtros de radicación (extraído del Sidebar sin cambios de lógica).
 * Los controles siguen deshabilitados hasta CARD-MAP-10.
 */
export const FiltersPanel: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <p className="text-xs text-slate-600">
        Búsqueda de inmuebles comerciales e industriales según zonificación. Los filtros se activarán
        próximamente.
      </p>

      {/* Tipo de Inmueble */}
      <div>
        <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">Tipo de Inmueble</p>
        <div className="grid grid-cols-2 gap-2">
          {['Galpón / Depósito', 'Local Comercial', 'Oficina', 'Terreno'].map((tipo) => (
            <button
              key={tipo}
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 opacity-80"
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de Operación */}
      <div>
        <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">Operación</p>
        <div className="flex space-x-2">
          {['Alquiler', 'Venta'].map((op) => (
            <button
              key={op}
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600 opacity-80"
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* Superficie */}
      <div>
        <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Superficie Total (m²)
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            disabled
            aria-label="Superficie mínima en metros cuadrados"
            placeholder="Mínimo"
            className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500"
          />
          <span className="text-xs text-slate-400" aria-hidden="true">
            -
          </span>
          <input
            type="number"
            disabled
            aria-label="Superficie máxima en metros cuadrados"
            placeholder="Máximo"
            className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500"
          />
        </div>
      </div>

      {/* Códigos de Zonificación */}
      <div>
        <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Zonificación Municipal
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50/70 p-2 text-slate-600">
            <span className="font-medium text-slate-700">RMI (Mixto Industrial)</span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">Prioritario</span>
          </div>
          <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50/70 p-2 text-slate-600">
            <span className="font-medium text-slate-700">RC (Camino Buen Ayre)</span>
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-900">Logístico</span>
          </div>
          <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50/70 p-2 text-slate-600">
            <span className="font-medium text-slate-700">C1 / C2 / C3 (Comercial)</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-900">
              Centralidad
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
