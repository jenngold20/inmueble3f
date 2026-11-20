import React from 'react';
import { ZONA_INFO } from '../constants/zonas';
import type { ZonaCodigo } from '../schemas/inmueble.schema';

interface ZonaBadgeProps {
  zona: ZonaCodigo | null;
}

/**
 * Badge de zonificación. El color de la capa es solo decorativo (punto);
 * la información viaja siempre como texto (código + nombre oficial para lectores de pantalla).
 */
export const ZonaBadge: React.FC<ZonaBadgeProps> = ({ zona }) => {
  if (zona === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
        Sin zona asignada
      </span>
    );
  }

  const info = ZONA_INFO[zona];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800"
      title={info.etiqueta}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: info.color }}
        aria-hidden="true"
      />
      <span className="sr-only">Zona </span>
      {zona}
      <span className="sr-only">, {info.etiqueta}</span>
    </span>
  );
};
