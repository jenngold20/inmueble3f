import React from 'react';
import type { Aviso } from '../schemas/inmueble.schema';
import { formatearPrecio } from '../utils/format';

interface ContactoAvisoProps {
  aviso: Aviso;
  esPrincipal: boolean;
}

const FUENTE_LABEL: Record<Aviso['fuente'], string> = {
  argenprop: 'Argenprop',
  zonaprop: 'Zonaprop',
  properati: 'Properati',
  manual_municipal: 'Carga municipal',
  planilla_externa: 'Planilla externa',
  baja_comercial: 'Baja comercial',
};

const ENLACE =
  'inline-flex min-h-11 items-center font-semibold text-municipal-700 underline underline-offset-2 hover:text-municipal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500 focus-visible:ring-offset-2';

/** Datos de comercialización de un aviso: quién lo publica, cómo contactarlo y el link original. */
export const ContactoAviso: React.FC<ContactoAvisoProps> = ({ aviso, esPrincipal }) => {
  const telefonoMarcable = aviso.contactoTelefono?.replace(/[^\d+]/g, '') ?? '';

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{FUENTE_LABEL[aviso.fuente]}</span>
        {esPrincipal && (
          <span className="rounded bg-municipal-50 px-1.5 py-0.5 text-xs font-semibold text-municipal-800">Principal</span>
        )}
      </div>

      <p className="text-base font-bold text-slate-900">{formatearPrecio(aviso.precio, aviso.moneda)}</p>

      <p className="text-sm text-slate-800">{aviso.comercializadora ?? 'Comercializadora no informada'}</p>

      {aviso.contactoTelefono && telefonoMarcable.length > 0 ? (
        <a href={`tel:${telefonoMarcable}`} className={ENLACE}>
          {aviso.contactoTelefono}
        </a>
      ) : (
        <p className="text-sm text-slate-600">Teléfono no informado</p>
      )}

      <div>
        <a href={aviso.url} target="_blank" rel="noopener noreferrer" className={ENLACE}>
          Ver aviso original
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      </div>
    </div>
  );
};
