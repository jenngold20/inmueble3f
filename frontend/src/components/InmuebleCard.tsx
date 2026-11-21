import React from 'react';
import { OPERACION_LABEL, TIPO_LABEL } from '../constants/inmuebles';
import type { Inmueble } from '../schemas/inmueble.schema';
import { formatearM2, formatearPrecio } from '../utils/format';
import {
  contarAvisosActivosAdicionales,
  obtenerAvisoPrincipal,
  obtenerSuperficieDestacada,
} from '../utils/inmueble';
import { InmuebleIcono } from './InmuebleIcono';
import { ZonaBadge } from './ZonaBadge';

interface InmuebleCardProps {
  inmueble: Inmueble;
}

/** Miniatura de tamaño fijo para reservar el espacio y evitar saltos de layout. */
const TAMANO_MINIATURA = 88;

export const InmuebleCard: React.FC<InmuebleCardProps> = React.memo(({ inmueble }) => {
  const aviso = obtenerAvisoPrincipal(inmueble);
  const adicionales = contarAvisosActivosAdicionales(inmueble);
  const superficie = obtenerSuperficieDestacada(inmueble);
  const foto = aviso.fotos[0];

  return (
    <article className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-500"
        style={{ width: TAMANO_MINIATURA, height: TAMANO_MINIATURA }}
      >
        {foto ? (
          <img
            src={foto.url}
            alt={`${TIPO_LABEL[inmueble.tipo]} en ${inmueble.direccion}`}
            width={TAMANO_MINIATURA}
            height={TAMANO_MINIATURA}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <InmuebleIcono tipo={inmueble.tipo} className="h-9 w-9" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-base font-bold leading-tight text-slate-900">
            {formatearPrecio(aviso.precio, aviso.moneda)}
          </p>
          <span className="shrink-0 rounded bg-municipal-50 px-1.5 py-0.5 text-xs font-semibold text-municipal-800">
            {OPERACION_LABEL[aviso.operacion]}
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">{inmueble.direccion}</h3>

        <p className="text-xs text-slate-600">
          {TIPO_LABEL[inmueble.tipo]} · {inmueble.localidad}
        </p>

        <p className="text-xs text-slate-600">
          {superficie
            ? `${formatearM2(superficie.valor)} ${superficie.tipo === 'cubierta' ? 'cubiertos' : 'totales'}`
            : 'Superficie sin informar'}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <ZonaBadge zona={inmueble.zonaCodigo} />
          {adicionales > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              +{adicionales} {adicionales === 1 ? 'aviso' : 'avisos'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});

InmuebleCard.displayName = 'InmuebleCard';

/** Placeholder de carga con las mismas dimensiones que la tarjeta real (sin saltos de layout). */
export const InmuebleCardSkeleton: React.FC = () => (
  <div
    className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm motion-safe:animate-pulse"
    aria-hidden="true"
  >
    <div className="shrink-0 rounded-md bg-slate-200" style={{ width: TAMANO_MINIATURA, height: TAMANO_MINIATURA }} />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-1/2 rounded bg-slate-200" />
      <div className="h-3.5 w-5/6 rounded bg-slate-200" />
      <div className="h-3 w-2/3 rounded bg-slate-200" />
      <div className="h-3 w-1/3 rounded bg-slate-200" />
    </div>
  </div>
);
