import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { OPERACION_LABEL, TIPO_COLOR_PIN, TIPO_LABEL } from '../constants/inmuebles';
import type { Inmueble, TipoInmueble } from '../schemas/inmueble.schema';
import { formatearM2, formatearPrecio } from '../utils/format';
import {
  contarAvisosActivosAdicionales,
  obtenerAvisoPrincipal,
  obtenerSuperficieDestacada,
} from '../utils/inmueble';
import { ZonaBadge } from './ZonaBadge';

// Coordenadas oficiales Tres de Febrero
const TRES_DE_FEBRERO_CENTER: [number, number] = [-34.6037, -58.5626];
const INITIAL_ZOOM = 13;

// Pin SVG/CSS (evita los assets estáticos de Leaflet). Se crea una sola vez por tipo, nunca en el render.
const crearIcono = (color: string): L.DivIcon =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const ICONOS_POR_TIPO: Record<TipoInmueble, L.DivIcon> = {
  galpon: crearIcono(TIPO_COLOR_PIN.galpon),
  local: crearIcono(TIPO_COLOR_PIN.local),
  oficina: crearIcono(TIPO_COLOR_PIN.oficina),
  terreno: crearIcono(TIPO_COLOR_PIN.terreno),
};

interface PinInmuebleProps {
  inmueble: Inmueble;
}

const PinInmueble: React.FC<PinInmuebleProps> = React.memo(({ inmueble }) => {
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

interface MapViewProps {
  inmuebles: Inmueble[];
}

export const MapView: React.FC<MapViewProps> = ({ inmuebles }) => {
  return (
    <div className="relative w-full h-full flex-1 bg-slate-100">
      <MapContainer
        center={TRES_DE_FEBRERO_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {inmuebles.map((inmueble) => (
          <PinInmueble key={inmueble.id} inmueble={inmueble} />
        ))}
      </MapContainer>

      {/* Floating Info Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-lg shadow-sm text-xs text-slate-700">
        <span className="font-semibold text-slate-900">Plataforma Inmobiliaria 3F</span>
        <div className="text-xs text-slate-600">Zonificación & Radicación Productiva</div>
      </div>
    </div>
  );
};
