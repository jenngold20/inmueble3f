import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import {
  BOUNDS_TRES_DE_FEBRERO,
  INITIAL_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_LAYER_ATTRIBUTION,
  TILE_LAYER_URL,
  TRES_DE_FEBRERO_CENTER,
} from '../constants/mapa';
import type { Inmueble } from '../schemas/inmueble.schema';
import { PinInmueble } from './PinInmueble';

interface MapViewProps {
  inmuebles: Inmueble[];
}

export const MapView: React.FC<MapViewProps> = ({ inmuebles }) => {
  return (
    <div className="relative w-full h-full flex-1 bg-slate-100">
      <MapContainer
        center={TRES_DE_FEBRERO_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={BOUNDS_TRES_DE_FEBRERO}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution={TILE_LAYER_ATTRIBUTION}
          url={TILE_LAYER_URL}
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
