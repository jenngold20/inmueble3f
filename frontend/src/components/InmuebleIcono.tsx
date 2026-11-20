import React from 'react';
import type { TipoInmueble } from '../schemas/inmueble.schema';

interface InmuebleIconoProps {
  tipo: TipoInmueble;
  className?: string;
}

/** Trazos SVG por tipo (misma grilla 24x24 y mismo grosor de línea para mantener coherencia visual). */
const TRAZOS: Record<TipoInmueble, string[]> = {
  galpon: ['M3 10l9-6 9 6', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  local: ['M4 9l1-5h14l1 5', 'M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0', 'M5 11.5V20h14v-8.5', 'M10 20v-5h4v5'],
  oficina: ['M6 21V4h12v17', 'M3 21h18', 'M10 8h1', 'M13 8h1', 'M10 12h1', 'M13 12h1', 'M11 21v-4h2v4'],
  terreno: ['M4 18l4-9h8l4 9z', 'M8 14h8'],
};

/** Ícono decorativo: el tipo siempre se comunica también como texto junto al ícono. */
export const InmuebleIcono: React.FC<InmuebleIconoProps> = ({ tipo, className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {TRAZOS[tipo].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);
