import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Coordenadas oficiales Tres de Febrero
const TRES_DE_FEBRERO_CENTER: [number, number] = [-34.6037, -58.5626];
const INITIAL_ZOOM = 13;

// Marcador SVG personalizado para evitar problemas de assets estáticos en Leaflet
const customIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `
    <div style="
      background-color: #175588;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
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

export const MapView: React.FC = () => {
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
        <Marker position={TRES_DE_FEBRERO_CENTER} icon={customIcon}>
          <Popup>
            <div className="text-xs p-1">
              <strong className="block text-municipal-800 text-sm mb-1">Tres de Febrero</strong>
              <p className="text-slate-600">Centro geográfico del Municipio.</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-municipal-50 text-municipal-700 font-medium text-[10px]">
                Lat: -34.6037, Lng: -58.5626
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Info Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-lg shadow-sm text-xs text-slate-700">
        <span className="font-semibold text-slate-900">Plataforma Inmobiliaria 3F</span>
        <div className="text-[11px] text-slate-500">Zonificación & Radicación Productiva</div>
      </div>
    </div>
  );
};
