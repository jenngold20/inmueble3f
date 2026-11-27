import React, { useEffect, useRef } from 'react';
import { OPERACION_LABEL, TIPO_LABEL } from '../constants/inmuebles';
import { ZONA_INFO } from '../constants/zonas';
import type { Inmueble } from '../schemas/inmueble.schema';
import { formatearM2, formatearPrecio } from '../utils/format';
import { obtenerAvisoPrincipal } from '../utils/inmueble';
import { ContactoAviso } from './ContactoAviso';
import { GaleriaFotos } from './GaleriaFotos';
import { ZonaBadge } from './ZonaBadge';

interface InmuebleDrawerProps {
  inmueble: Inmueble;
  onCerrar: () => void;
}

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ficha detallada del inmueble.
 * - Escritorio (md+): panel lateral derecho sobre el mapa.
 * - Móvil: hoja inferior con scroll propio.
 * Diálogo accesible: Escape cierra, Tab no sale del panel mientras está abierto, y al cerrar
 * el foco vuelve al elemento que lo tenía antes de abrirse (tarjeta o pin).
 * Se monta con key={inmueble.id}: cambiar de inmueble reinicia la galería.
 */
export const InmuebleDrawer: React.FC<InmuebleDrawerProps> = ({ inmueble, onCerrar }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const botonCerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botonCerrarRef.current?.focus();

    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrar();
        return;
      }

      if (evento.key !== 'Tab' || !panelRef.current) return;

      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE));
      if (focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      const activo = document.activeElement;

      if (evento.shiftKey && (activo === primero || !panelRef.current.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !panelRef.current.contains(activo))) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTeclado);

    return () => {
      document.removeEventListener('keydown', manejarTeclado);
      elementoPrevio?.focus();
    };
  }, [onCerrar]);

  const aviso = obtenerAvisoPrincipal(inmueble);
  const avisosActivos = inmueble.avisos.filter((a) => a.estado === 'activo');
  const avisosMostrados = avisosActivos.length > 0 ? avisosActivos : [aviso];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ficha-titulo"
      className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[85%] flex-col overflow-hidden rounded-t-xl border-t border-slate-200 bg-white shadow-2xl md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {TIPO_LABEL[inmueble.tipo]} · {OPERACION_LABEL[aviso.operacion]}
          </p>
          <h2 id="ficha-titulo" className="text-lg font-bold leading-snug text-slate-900">
            {inmueble.direccion}
          </h2>
          <p className="text-sm text-slate-600">{inmueble.localidad}</p>
        </div>
        <button
          ref={botonCerrarRef}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar ficha"
          className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <GaleriaFotos key={inmueble.id} fotos={aviso.fotos} tipo={inmueble.tipo} descripcion={inmueble.direccion} />

        <div className="space-y-6 p-4">
          <section aria-labelledby="ficha-precio">
            <h3 id="ficha-precio" className="sr-only">
              Precio
            </h3>
            <p className="text-2xl font-bold text-slate-900">{formatearPrecio(aviso.precio, aviso.moneda)}</p>
          </section>

          <section aria-labelledby="ficha-superficie" className="space-y-2">
            <h3 id="ficha-superficie" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Superficie
            </h3>
            {inmueble.superficieCubiertaM2 === null && inmueble.superficieTotalM2 === null ? (
              <p className="text-sm text-slate-700">Superficie sin informar</p>
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {inmueble.superficieCubiertaM2 !== null && (
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-xs text-slate-600">Cubierta</dt>
                    <dd className="font-semibold text-slate-900">{formatearM2(inmueble.superficieCubiertaM2)}</dd>
                  </div>
                )}
                {inmueble.superficieTotalM2 !== null && (
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-xs text-slate-600">Total</dt>
                    <dd className="font-semibold text-slate-900">{formatearM2(inmueble.superficieTotalM2)}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section aria-labelledby="ficha-zona" className="space-y-2">
            <h3 id="ficha-zona" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Zonificación municipal
            </h3>
            <ZonaBadge zona={inmueble.zonaCodigo} />
            <p className="text-sm text-slate-700">
              {inmueble.zonaCodigo
                ? ZONA_INFO[inmueble.zonaCodigo].descripcion
                : 'Sin zona asignada en el cruce espacial.'}
            </p>
          </section>

          <section aria-labelledby="ficha-avisos" className="space-y-2">
            <h3 id="ficha-avisos" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Avisos activos ({avisosActivos.length})
            </h3>
            <ul className="space-y-2">
              {avisosMostrados.map((a) => (
                <li key={a.id}>
                  <ContactoAviso aviso={a} esPrincipal={a.id === aviso.id} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
