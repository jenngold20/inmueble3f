import React, { useState } from 'react';
import { TIPO_LABEL } from '../constants/inmuebles';
import type { Foto, TipoInmueble } from '../schemas/inmueble.schema';
import { InmuebleIcono } from './InmuebleIcono';

interface GaleriaFotosProps {
  fotos: Foto[];
  tipo: TipoInmueble;
  /** Dirección del inmueble, usada para describir cada foto. */
  descripcion: string;
}

const BOTON_NAV =
  'min-h-11 min-w-11 cursor-pointer rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500 focus-visible:ring-offset-2';

/**
 * Galería de la ficha: foto activa, navegación anterior/siguiente y miniaturas.
 * Sin fotos muestra un estado vacío con el ícono del tipo de inmueble.
 * El componente se monta con key={inmueble.id} desde el padre, así el índice se reinicia al cambiar de inmueble.
 */
export const GaleriaFotos: React.FC<GaleriaFotosProps> = ({ fotos, tipo, descripcion }) => {
  const [indice, setIndice] = useState<number>(0);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
        <InmuebleIcono tipo={tipo} className="h-12 w-12" />
        <p className="text-sm font-medium">Sin fotos de prueba</p>
        <span className="sr-only">{TIPO_LABEL[tipo]}: {descripcion}</span>
      </div>
    );
  }

  const total = fotos.length;
  const actual = Math.min(indice, total - 1);
  const foto = fotos[actual];

  return (
    <section aria-label="Galería de fotos" className="bg-slate-900">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
        <img
          src={foto.url}
          alt={`Foto ${actual + 1} de ${total}: ${TIPO_LABEL[tipo]} en ${descripcion}`}
          className="h-full w-full object-cover"
          loading="eager"
        />
        <p className="absolute right-2 top-2 rounded bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white" aria-hidden="true">
          {actual + 1} / {total}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 bg-white p-2">
        <button
          type="button"
          className={BOTON_NAV}
          onClick={() => setIndice(Math.max(actual - 1, 0))}
          disabled={actual === 0}
          aria-label="Foto anterior"
        >
          ‹ Anterior
        </button>

        <ul className="flex min-w-0 flex-1 justify-center gap-1.5 overflow-x-auto" aria-label="Miniaturas">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === actual ? 'true' : undefined}
                className={`flex h-11 w-11 overflow-hidden rounded border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500 ${
                  i === actual ? 'border-municipal-600' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={BOTON_NAV}
          onClick={() => setIndice(Math.min(actual + 1, total - 1))}
          disabled={actual === total - 1}
          aria-label="Foto siguiente"
        >
          Siguiente ›
        </button>
      </div>
    </section>
  );
};
