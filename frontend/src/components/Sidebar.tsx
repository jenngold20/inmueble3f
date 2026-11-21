import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10 flex-shrink-0 overflow-y-auto">
      {/* Header del Sidebar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-display text-sm font-black text-slate-800 uppercase tracking-wider flex items-center">
          <svg className="w-4 h-4 mr-2 text-municipal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros de Radicación
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Búsqueda de inmuebles comerciales e industriales según zonificación
        </p>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Aviso de Fase 0 */}
        <div className="p-3 bg-municipal-50 border border-municipal-100 rounded-lg text-xs text-municipal-900 leading-relaxed">
          <span className="font-semibold block text-municipal-900 mb-1">🚀 Walking Skeleton (Fase 0)</span>
          Los filtros interactivos se conectarán en la siguiente fase cuando se implementen los modelos de dominio y el cruce espacial con Turf.js.
        </div>

        {/* Tipo de Inmueble */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Tipo de Inmueble
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['Galpón / Depósito', 'Local Comercial', 'Oficina', 'Terreno'].map((tipo) => (
              <button
                key={tipo}
                type="button"
                disabled
                className="px-3 py-2 text-xs font-medium rounded-md border border-slate-200 text-slate-600 bg-slate-50 cursor-not-allowed opacity-80"
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo de Operación */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Operación
          </label>
          <div className="flex space-x-2">
            {['Alquiler', 'Venta'].map((op) => (
              <button
                key={op}
                type="button"
                disabled
                className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 text-slate-600 bg-slate-50 cursor-not-allowed opacity-80 text-center"
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Superficie */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Superficie Total (m²)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              disabled
              placeholder="Mínimo"
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 cursor-not-allowed text-slate-500"
            />
            <span className="text-slate-500 text-xs">-</span>
            <input
              type="number"
              disabled
              placeholder="Máximo"
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 cursor-not-allowed text-slate-500"
            />
          </div>
        </div>

        {/* Códigos de Zonificación */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Zonificación Municipal
          </label>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50/70 text-slate-600">
              <span className="font-medium text-slate-700">RMI (Mixto Industrial)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Prioritario</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50/70 text-slate-600">
              <span className="font-medium text-slate-700">RC (Camino Buen Ayre)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-municipal-100 text-municipal-800 font-semibold">Logístico</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50/70 text-slate-600">
              <span className="font-medium text-slate-700">C1 / C2 / C3 (Comercial)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Centralidad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Capa Geoespacial: Turf.js</span>
        <span className="font-semibold text-slate-600">Versión 0.1.0</span>
      </div>
    </aside>
  );
};
