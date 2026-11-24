import React from 'react';

/**
 * Footer institucional de la Plataforma Inmobiliaria 3F (CARD-UI-04).
 * Diseñado para empresarios, inversores y funcionarios municipales.
 * Exhibe la firma oficial 'Desarrollado por Tecno 3F' y vías de contacto institucional.
 */
export const Footer: React.FC = () => {
  const anioActual = new Date().getFullYear();

  return (
    <footer className="shrink-0 bg-slate-900 border-t border-slate-800 text-slate-300 px-4 md:px-6 py-2.5 z-20 text-xs shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Identidad institucional izquierda */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="font-semibold text-slate-100">
            Municipalidad de Tres de Febrero
          </span>
          <span className="hidden md:inline text-slate-600">•</span>
          <span className="hidden md:inline text-slate-400">
            Secretaría de Trabajo y Producción • Dirección de Inversiones
          </span>
        </div>

        {/* Contacto y enlaces institucionales centro */}
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="mailto:inversiones@tresdefebrero.gob.ar"
            className="inline-flex items-center gap-1.5 hover:text-sky-400 transition-colors"
            title="Contacto oficial para radicación de empresas e inversiones"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="hidden sm:inline">inversiones@tresdefebrero.gob.ar</span>
            <span className="sm:hidden">Contacto</span>
          </a>

          <span className="text-slate-700">|</span>

          <a
            href="https://tresdefebrero.gob.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-sky-400 transition-colors"
            title="Portal oficial de la Municipalidad de Tres de Febrero"
          >
            <span>tresdefebrero.gob.ar</span>
            <svg
              className="w-3 h-3 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Firma obligatoria de autoría y copyright derecha */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden lg:inline">
            © {anioActual} 3F
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 px-2.5 py-0.5 text-slate-200 border border-slate-700/80 font-medium tracking-tight shadow-sm"
            title="Área de Modernización y Tecnologías de Tres de Febrero"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            Desarrollado por Tecno 3F
          </span>
        </div>
      </div>
    </footer>
  );
};
