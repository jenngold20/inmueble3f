import React from 'react';
import { Marker } from 'react-leaflet';
import { TIPO_LABEL } from '../constants/inmuebles';
import { ICONOS_POR_TIPO } from '../constants/mapa';
import type { Inmueble } from '../schemas/inmueble.schema';

export interface PinInmuebleProps {
  inmueble: Inmueble;
  seleccionado: boolean;
  onSeleccionar: (id: string) => void;
}

/**
 * Un pin por inmueble. El clic abre la ficha (drawer), sin popup.
 * Leaflet 1.9 no convierte Enter en clic en los marcadores (solo lo hacen los popups),
 * así que Enter y Espacio con foco de teclado se resuelven acá.
 */
export const PinInmueble: React.FC<PinInmuebleProps> = React.memo(({ inmueble, seleccionado, onSeleccionar }) => {
  const etiqueta = `${TIPO_LABEL[inmueble.tipo]} en ${inmueble.direccion}`;

  return (
    <Marker
      position={[inmueble.lat, inmueble.lng]}
      icon={ICONOS_POR_TIPO[inmueble.tipo][seleccionado ? 'seleccionado' : 'normal']}
      title={etiqueta}
      alt={etiqueta}
      riseOnHover
      eventHandlers={{
        click: () => onSeleccionar(inmueble.id),
        keydown: (evento) => {
          if (evento.originalEvent.key === 'Enter' || evento.originalEvent.key === ' ') {
            evento.originalEvent.preventDefault();
            onSeleccionar(inmueble.id);
          }
        },
      }}
    />
  );
});

PinInmueble.displayName = 'PinInmueble';
