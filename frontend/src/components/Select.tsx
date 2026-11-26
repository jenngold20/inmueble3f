import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T> {
  id?: string;
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string | null;
}

/**
 * Componente Select universal accesible y estilizado con la identidad visual
 * de la Municipalidad de Tres de Febrero.
 *
 * Soporta:
 * - Menú flotante con apertura/cierre fluido
 * - Checkmark de opción activa y estilos de foco
 * - Buscador integrado con filtrado insensible a mayúsculas y acentos
 * - Cierre por click exterior y tecla Escape
 */
export function Select<T extends string | number | null = string | null>({
  id: customId,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar opción...',
  searchable = false,
  searchPlaceholder = 'Buscar opción...',
  disabled = false,
  className = '',
  error = null,
}: SelectProps<T>): React.ReactElement {
  const generatedId = useId();
  const selectId = customId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Opción actualmente seleccionada
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Normalizador para búsqueda insensible a acentos y mayúsculas
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Filtrado de opciones si la búsqueda está habilitada
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    const query = normalize(searchQuery);
    return options.filter((opt) => normalize(opt.label).includes(query));
  }, [options, searchable, searchQuery]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Foco automático en el buscador al abrir
  useEffect(() => {
    if (isOpen && searchable) {
      // Pequeño timeout para esperar que el popover esté renderizado en DOM
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  // Manejo de teclado (Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
      )}

      {/* Botón Trigger del Select */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        className={`flex min-h-11 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-xs font-medium transition-all ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
            : isOpen
            ? 'border-municipal-500 ring-2 ring-municipal-100 text-slate-900 shadow-sm'
            : 'border-slate-300 text-slate-800 hover:border-municipal-400 hover:bg-slate-50/50 shadow-sm'
        } ${error ? 'border-red-500 ring-red-100' : ''}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Chevron Icon */}
        <span
          className={`ml-2 flex shrink-0 items-center text-municipal-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Error inline si existe */}
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}

      {/* Menú Desplegable */}
      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={selectId}
          className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Barra de Búsqueda Integrada */}
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="relative flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-municipal-500 focus-within:ring-1 focus-within:ring-municipal-500">
                <svg
                  className="mr-2 h-3.5 w-3.5 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="ml-1 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de Opciones */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-500">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={`${option.label}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                      option.disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : isSelected
                        ? 'bg-municipal-50 font-semibold text-municipal-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-municipal-600'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>

                    {/* Checkmark para la opción activa */}
                    {isSelected && (
                      <svg
                        className="ml-2 h-4 w-4 shrink-0 text-municipal-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
