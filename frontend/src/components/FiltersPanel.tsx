import React, { useEffect, useState } from 'react';
import { OPERACION_LABEL, TIPO_LABEL } from '../constants/inmuebles';
import {
  parsearNumeroFiltro,
  type ErroresRangoFiltros,
  type FiltrosInmuebles,
  type ZonaGrupo,
} from '../schemas/filtros.schema';
import type { Moneda, TipoInmueble, TipoOperacion } from '../schemas/inmueble.schema';

interface FiltersPanelProps {
  filtros: FiltrosInmuebles;
  resetVersion: number;
  localidadesDisponibles: string[];
  erroresRango: ErroresRangoFiltros;
  hayFiltrosActivos: boolean;
  onActualizarFiltros: (parcial: Partial<FiltrosInmuebles>) => void;
  onLimpiarFiltros: () => void;
}

type CampoNumerico = 'minM2' | 'maxM2' | 'minPrecio' | 'maxPrecio';
type BorradoresNumericos = Record<CampoNumerico, string>;
type ErroresFormatoNumerico = Record<CampoNumerico, string | null>;

const BORRADORES_VACIOS: BorradoresNumericos = {
  minM2: '',
  maxM2: '',
  minPrecio: '',
  maxPrecio: '',
};

const ERRORES_FORMATO_VACIOS: ErroresFormatoNumerico = {
  minM2: null,
  maxM2: null,
  minPrecio: null,
  maxPrecio: null,
};

const TIPOS_ORDEN: TipoInmueble[] = ['galpon', 'local', 'oficina', 'terreno'];
const OPERACIONES_ORDEN: TipoOperacion[] = ['alquiler', 'venta'];
const MONEDAS_OPCIONES: Array<{ valor: Moneda | null; etiqueta: string }> = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'USD', etiqueta: 'USD' },
  { valor: 'ARS', etiqueta: 'ARS' },
];

const ZONA_GRUPOS: Array<{
  codigo: ZonaGrupo;
  titulo: string;
  badge: string;
  badgeClase: string;
}> = [
  {
    codigo: 'RMI',
    titulo: 'RMI (Mixto Industrial)',
    badge: 'Prioritario',
    badgeClase: 'bg-amber-100 text-amber-900',
  },
  {
    codigo: 'RC',
    titulo: 'RC (Camino Buen Ayre)',
    badge: 'Logístico',
    badgeClase: 'bg-municipal-100 text-municipal-800',
  },
  {
    codigo: 'C',
    titulo: 'C1 / C2 / C3 (Comercial)',
    badge: 'Centralidad',
    badgeClase: 'bg-emerald-100 text-emerald-900',
  },
];

const BOTON_BASE =
  'min-h-11 cursor-pointer rounded-md border px-3 py-2 text-xs font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500 focus-visible:ring-offset-1';
const BOTON_INACTIVO =
  'border-slate-300 bg-white text-slate-700 hover:border-municipal-500 hover:bg-municipal-50/40';
const BOTON_ACTIVO =
  'border-municipal-600 bg-municipal-50 font-semibold text-municipal-800 ring-1 ring-municipal-600';
const INPUT_CLASE =
  'min-h-11 w-full rounded-md border bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500';

function AlertaErrorInline({ id, mensaje }: { id: string; mensaje: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700">
      <svg
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {mensaje}
    </p>
  );
}

function sincronizarCampoBorrador(borradorActual: string, valorExterno: number | null): string {
  const parseado = parsearNumeroFiltro(borradorActual);
  if (valorExterno === null) {
    return parseado.estado === 'vacio' ? borradorActual : '';
  }
  if (parseado.estado === 'valido' && parseado.valor === valorExterno) {
    return borradorActual;
  }
  return String(valorExterno);
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filtros,
  resetVersion,
  localidadesDisponibles,
  erroresRango,
  hayFiltrosActivos,
  onActualizarFiltros,
  onLimpiarFiltros,
}) => {
  const [borradores, setBorradores] = useState<BorradoresNumericos>(() => ({
    minM2: filtros.minM2 !== null ? String(filtros.minM2) : '',
    maxM2: filtros.maxM2 !== null ? String(filtros.maxM2) : '',
    minPrecio: filtros.minPrecio !== null ? String(filtros.minPrecio) : '',
    maxPrecio: filtros.maxPrecio !== null ? String(filtros.maxPrecio) : '',
  }));
  const [erroresFormato, setErroresFormato] =
    useState<ErroresFormatoNumerico>(ERRORES_FORMATO_VACIOS);

  // Limpia incluso borradores incompletos o inválidos cuando el reset viene desde Sidebar.
  useEffect(() => {
    if (resetVersion === 0) return;
    setBorradores(BORRADORES_VACIOS);
    setErroresFormato(ERRORES_FORMATO_VACIOS);
  }, [resetVersion]);

  // Sincroniza cambios externos (ej. "Restablecer filtros" desde Sidebar o URL) sin pisar escritura válida.
  useEffect(() => {
    setBorradores((prev) => {
      const siguiente: BorradoresNumericos = {
        minM2: sincronizarCampoBorrador(prev.minM2, filtros.minM2),
        maxM2: sincronizarCampoBorrador(prev.maxM2, filtros.maxM2),
        minPrecio: sincronizarCampoBorrador(prev.minPrecio, filtros.minPrecio),
        maxPrecio: sincronizarCampoBorrador(prev.maxPrecio, filtros.maxPrecio),
      };
      if (
        siguiente.minM2 === prev.minM2 &&
        siguiente.maxM2 === prev.maxM2 &&
        siguiente.minPrecio === prev.minPrecio &&
        siguiente.maxPrecio === prev.maxPrecio
      ) {
        return prev;
      }
      return siguiente;
    });

    if (
      filtros.minM2 === null &&
      filtros.maxM2 === null &&
      filtros.minPrecio === null &&
      filtros.maxPrecio === null
    ) {
      setErroresFormato(ERRORES_FORMATO_VACIOS);
    }
  }, [filtros.minM2, filtros.maxM2, filtros.minPrecio, filtros.maxPrecio]);

  const manejarCambioNumerico = (campo: CampoNumerico, raw: string) => {
    setBorradores((prev) => ({ ...prev, [campo]: raw }));
    const res = parsearNumeroFiltro(raw);

    if (res.estado === 'vacio') {
      setErroresFormato((prev) => ({ ...prev, [campo]: null }));
      onActualizarFiltros({ [campo]: null });
      return;
    }

    if (res.estado === 'incompleto') {
      setErroresFormato((prev) => ({ ...prev, [campo]: null }));
      return;
    }

    if (res.estado === 'invalido') {
      setErroresFormato((prev) => ({ ...prev, [campo]: res.mensaje }));
      return;
    }

    setErroresFormato((prev) => ({ ...prev, [campo]: null }));
    onActualizarFiltros({ [campo]: res.valor });
  };

  const alternarTipo = (tipo: TipoInmueble) => {
    const existe = filtros.tipos.includes(tipo);
    const tipos = existe
      ? filtros.tipos.filter((t) => t !== tipo)
      : [...filtros.tipos, tipo];
    onActualizarFiltros({ tipos });
  };

  const alternarOperacion = (op: TipoOperacion) => {
    onActualizarFiltros({ operacion: filtros.operacion === op ? null : op });
  };

  const alternarZonaGrupo = (codigo: ZonaGrupo) => {
    const existe = filtros.zonaGrupos.includes(codigo);
    const zonaGrupos = existe
      ? filtros.zonaGrupos.filter((z) => z !== codigo)
      : [...filtros.zonaGrupos, codigo];
    onActualizarFiltros({ zonaGrupos });
  };

  const manejarLimpiar = () => {
    setBorradores(BORRADORES_VACIOS);
    setErroresFormato(ERRORES_FORMATO_VACIOS);
    onLimpiarFiltros();
  };

  const errorSuperficie =
    erroresFormato.minM2 ?? erroresFormato.maxM2 ?? erroresRango.superficie;
  const errorPrecio =
    erroresFormato.minPrecio ?? erroresFormato.maxPrecio ?? erroresRango.precio;
  const hayRangoPrecioSinMoneda =
    (filtros.minPrecio !== null || filtros.maxPrecio !== null) && filtros.moneda === null;

  return (
    <div className="space-y-4 p-3.5">
      {/* Tipo de Inmueble */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Tipo de Inmueble
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_ORDEN.map((tipo) => {
            const activo = filtros.tipos.includes(tipo);
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarTipo(tipo)}
                className={`${BOTON_BASE} ${activo ? BOTON_ACTIVO : BOTON_INACTIVO}`}
              >
                {TIPO_LABEL[tipo]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Tipo de Operación */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Operación
        </legend>
        <div className="flex gap-2">
          {OPERACIONES_ORDEN.map((op) => {
            const activo = filtros.operacion === op;
            return (
              <button
                key={op}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarOperacion(op)}
                className={`flex-1 text-center ${BOTON_BASE} ${
                  activo ? BOTON_ACTIVO : BOTON_INACTIVO
                }`}
              >
                {OPERACION_LABEL[op]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Localidad */}
      <div>
        <label
          htmlFor="filtro-localidad"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Localidad
        </label>
        <select
          id="filtro-localidad"
          value={filtros.localidad ?? ''}
          onChange={(e) =>
            onActualizarFiltros({ localidad: e.target.value === '' ? null : e.target.value })
          }
          className="min-h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500"
        >
          <option value="">Todas las localidades</option>
          {localidadesDisponibles.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Superficie */}
      <fieldset>
        <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Superficie (m²)
        </legend>
        <p className="mb-2 text-xs text-slate-600">
          Evalúa superficie cubierta o total según disponibilidad.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="filtro-min-m2" className="sr-only">
              Superficie mínima en metros cuadrados
            </label>
            <input
              id="filtro-min-m2"
              type="text"
              inputMode="decimal"
              placeholder="Mínimo"
              value={borradores.minM2}
              aria-invalid={errorSuperficie !== null}
              aria-describedby={errorSuperficie ? 'error-superficie' : undefined}
              onChange={(e) => manejarCambioNumerico('minM2', e.target.value)}
              className={`${INPUT_CLASE} ${
                errorSuperficie ? 'border-red-700' : 'border-slate-300'
              }`}
            />
          </div>
          <span className="text-xs text-slate-500" aria-hidden="true">
            -
          </span>
          <div className="flex-1">
            <label htmlFor="filtro-max-m2" className="sr-only">
              Superficie máxima en metros cuadrados
            </label>
            <input
              id="filtro-max-m2"
              type="text"
              inputMode="decimal"
              placeholder="Máximo"
              value={borradores.maxM2}
              aria-invalid={errorSuperficie !== null}
              aria-describedby={errorSuperficie ? 'error-superficie' : undefined}
              onChange={(e) => manejarCambioNumerico('maxM2', e.target.value)}
              className={`${INPUT_CLASE} ${
                errorSuperficie ? 'border-red-700' : 'border-slate-300'
              }`}
            />
          </div>
        </div>
        {errorSuperficie && <AlertaErrorInline id="error-superficie" mensaje={errorSuperficie} />}
      </fieldset>

      {/* Precio y Moneda */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Precio y Moneda
        </legend>
        <div className="mb-2 flex gap-1.5" role="group" aria-label="Moneda">
          {MONEDAS_OPCIONES.map(({ valor, etiqueta }) => {
            const activo = filtros.moneda === valor;
            return (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={activo}
                onClick={() => onActualizarFiltros({ moneda: valor })}
                className={`flex-1 text-center ${BOTON_BASE} ${
                  activo ? BOTON_ACTIVO : BOTON_INACTIVO
                }`}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="filtro-min-precio" className="sr-only">
              Precio mínimo
            </label>
            <input
              id="filtro-min-precio"
              type="text"
              inputMode="decimal"
              placeholder="Desde"
              value={borradores.minPrecio}
              aria-invalid={errorPrecio !== null}
              aria-describedby={errorPrecio ? 'error-precio' : undefined}
              onChange={(e) => manejarCambioNumerico('minPrecio', e.target.value)}
              className={`${INPUT_CLASE} ${
                errorPrecio ? 'border-red-700' : 'border-slate-300'
              }`}
            />
          </div>
          <span className="text-xs text-slate-500" aria-hidden="true">
            -
          </span>
          <div className="flex-1">
            <label htmlFor="filtro-max-precio" className="sr-only">
              Precio máximo
            </label>
            <input
              id="filtro-max-precio"
              type="text"
              inputMode="decimal"
              placeholder="Hasta"
              value={borradores.maxPrecio}
              aria-invalid={errorPrecio !== null}
              aria-describedby={errorPrecio ? 'error-precio' : undefined}
              onChange={(e) => manejarCambioNumerico('maxPrecio', e.target.value)}
              className={`${INPUT_CLASE} ${
                errorPrecio ? 'border-red-700' : 'border-slate-300'
              }`}
            />
          </div>
        </div>
        {hayRangoPrecioSinMoneda && !errorPrecio && (
          <p className="mt-1.5 text-xs text-slate-600">
            Elegí USD o ARS para comparar montos en la misma moneda.
          </p>
        )}
        {errorPrecio && <AlertaErrorInline id="error-precio" mensaje={errorPrecio} />}
      </fieldset>

      {/* Códigos de Zonificación */}
      <fieldset>
        <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Zonificación Municipal
        </legend>
        <div className="space-y-1.5 text-xs">
          {ZONA_GRUPOS.map((grupo) => {
            const activo = filtros.zonaGrupos.includes(grupo.codigo);
            return (
              <button
                key={grupo.codigo}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarZonaGrupo(grupo.codigo)}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded border p-2 text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500 ${
                  activo
                    ? 'border-municipal-600 bg-municipal-50 ring-1 ring-municipal-600'
                    : 'border-slate-200 bg-white hover:border-municipal-500'
                }`}
              >
                <span className="font-medium text-slate-800">{grupo.titulo}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${grupo.badgeClase}`}>
                  {grupo.badge}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {hayFiltrosActivos && (
        <button
          type="button"
          onClick={manejarLimpiar}
          className="min-h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-500"
        >
          Restablecer filtros
        </button>
      )}
    </div>
  );
};
