# Plan de Implementación: Panel de Filtros Multicriterio en React
## Tarjeta: [CARD-MAP-10] | Estimación: 3 SP | Rama: feat/filtros-multicriterio
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación
La historia **HU-MAP-10** (*Filtrado Dinámico Multicriterio de la Oferta*) requiere filtrar instantáneamente los inmuebles en mapa y listado lateral por tipo, operación, localidad, superficie (m²), precio/moneda y grupo de zonificación, mostrando estado vacío con botón de restablecimiento cuando no haya coincidencias.

Tras `CARD-MAP-09` (listado mock), `CARD-UI-01` (tokens de marca) y `CARD-MAP-12` (drawer de detalle), `FiltersPanel.tsx` tenía los controles maquetados pero deshabilitados. Esta tarjeta habilita el filtrado en memoria con Zod y deja el estado centralizado para que `CARD-MAP-13` sincronice los filtros en la URL.

**Fuera de alcance:**
- Sincronización bidireccional con `URLSearchParams` (`CARD-MAP-13`).
- Filtro inteligente de aptitud por rubro empresarial (`HU-MAP-11`, Sprint 2).
- Consulta paginada/filtrada contra backend `GET /api/inmuebles` (se mantiene el servicio actual sobre el listado validado con Zod).

---

### 2. Archivos Creados y Modificados

```text
frontend/src/
├── schemas/
│   └── filtros.schema.ts          # NUEVO: FiltrosInmueblesSchema (Zod), normalizador y validación de rangos
├── hooks/
│   ├── useDebouncedValue.ts       # NUEVO: debounce nativo (250 ms) con flush inmediato en null
│   └── useInmueblesFiltrados.ts   # NUEVO: función pura filtrarInmuebles + hook memoizado
├── components/
│   ├── FiltersPanel.tsx           # MODIFICAR: controles habilitados, validación inline y reset
│   └── Sidebar.tsx                # MODIFICAR: badge de filtros activos, contador X de Y y estado vacío
└── App.tsx                        # MODIFICAR: estado de filtros, sincronía con selección y MapView

docs/planes/sprint-1/
└── 09-plan-filtro-multicriterio.md # Este plan
```

---

### 3. Reglas de Filtrado y Casos Borde Contemplados
1. **Validación Zod + Inputs tolerantes:** `FiltrosInmueblesSchema` tipa y valida los filtros; `parsearNumeroFiltro` tolera separadores de miles argentinos (`"1.000"`, `"1.500.000"`) y escritura parcial (`"100."`, `"-"`) sin borrar el borrador en curso; `validarRangosFiltros` detecta negativos o `min > max` mostrando error inline (`text-red-700`, `#b91c1c`) y diferenciando en `Sidebar` `"Rango de filtros inválido"` de `"No se encontraron inmuebles con estos criterios"`.
2. **Evaluación consistente por aviso:** `operacion`, `moneda` y `minPrecio`/`maxPrecio` se evalúan conjuntamente sobre el mismo aviso activo (o el principal si no hubiera activos), evitando falsos positivos al cruzar datos de dos avisos distintos del mismo inmueble.
3. **Precios nulos ("Consultar"):** si hay filtro de precio numérico activo (`minPrecio` / `maxPrecio`), los avisos sin precio se excluyen.
4. **Superficie:** evalúa contra `obtenerSuperficieDestacada(inmueble)` (cubierta si existe, total en su defecto) para mantener consistencia exacta con lo mostrado en `InmuebleCard`.
5. **Localidades normalizadas:** compara en minúsculas sin tildes ni espacios redundantes y puebla el `<select>` dinámicamente desde los inmuebles cargados.
6. **Reset inmediato y Drawer sincronizado:** `"Restablecer filtros"` limpia todos los controles y borradores al instante (sin esperar 250 ms) y, si un filtro oculta el inmueble abierto en `InmuebleDrawer`, limpia `seleccionadoId`.

---

### 4. Criterios de Aceptación (DoD)
1. Todos los filtros (`tipo`, `operacion`, `localidad`, `superficie`, `precio`/`moneda`, `zona`) actualizan `Sidebar` y `MapView` simultáneamente.
2. Estado vacío con filtro activo muestra `"No se encontraron inmuebles con estos criterios"` y botón `"Restablecer filtros"`.
3. Compilación estricta TypeScript + Vite (`npm run build` en `/frontend`) sin errores, sin `any` ni `@ts-ignore`, sin dependencias nuevas.
