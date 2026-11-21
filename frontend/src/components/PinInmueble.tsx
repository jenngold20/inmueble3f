import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { OPERACION_LABEL, TIPO_LABEL } from '../constants/inmuebles';
import { ICONOS_POR_TIPO } from '../constants/mapa';
import type { Inmueble } from '../schemas/inmueble.schema';
import { formatearM2, formatearPrecio } from '../utils/format';
import {
  contarAvisosActivosAdicionales,
  obtenerAvisoPrincipal,
  obtenerSuperficieDestacada,
} from '../utils/inmueble';
import { ZonaBadge } from './ZonaBadge';

export interface PinInmuebleProps {
  inmueble: Inmueble;
}

export const PinInmueble: React.FC<PinInmuebleProps> = React.memo(({ inmueble }) => {
  const aviso = obtenerAvisoPrincipal(inmueble);
  const adicionales = contarAvisosActivosAdicionales(inmueble);
  const superficie = obtenerSuperficieDestacada(inmueble);
  const etiquetaTipo = TIPO_LABEL[inmueble.tipo];

  return (
    <Marker
      position={[inmueble.lat, inmueble.lng]}
      icon={ICONOS_POR_TIPO[inmueble.tipo]}
      title={`${etiquetaTipo} en ${inmueble.direccion}`}
      riseOnHover
    >
      <Popup>
        <div className="min-w-[210px] space-y-1.5 text-xs text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-600">{etiquetaTipo}</span>
            <span className="rounded bg-municipal-50 px-1.5 py-0.5 font-semibold text-municipal-800">
              {OPERACION_LABEL[aviso.operacion]}
            </span>
          </div>
          <div className="text-sm font-bold leading-snug text-slate-900">{inmueble.direccion}</div>
          <div>{inmueble.localidad}</div>
          <div className="text-base font-bold text-slate-900">{formatearPrecio(aviso.precio, aviso.moneda)}</div>
          <div>
            {superficie
              ? `${formatearM2(superficie.valor)} ${superficie.tipo === 'cubierta' ? 'cubiertos' : 'totales'}`
              : 'Superficie sin informar'}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <ZonaBadge zona={inmueble.zonaCodigo} />
            {adicionales > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                +{adicionales} {adicionales === 1 ? 'aviso' : 'avisos'}
              </span>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

PinInmueble.displayName = 'PinInmueble';
