# Directivas de Diseño y UX Frontend: Plataforma Inmobiliaria 3F

Este documento establece los estándares de calidad de experiencia de usuario (UX), accesibilidad (a11y) y arquitectura de componentes para el frontend de la plataforma, complementando la guía de [IDENTIDAD_VISUAL.md](./IDENTIDAD_VISUAL.md).

Todo componente nuevo o refactorización desarrollada por el equipo (Jenni, Luis, Leonardo) **debe** apegarse a estas reglas.

---

## 1. Experiencia de Usuario y Públicos Objetivo

La plataforma **no es una herramienta técnica interna para desarrolladores**, sino una aplicación de consulta ejecutiva y territorial destinada a:
- **Empresarios e inversores** que evalúan radicación comercial o industrial en Tres de Febrero.
- **Funcionarios de la Dirección de Inversiones y Producción** del Municipio.
- **Inmobiliarias y desarrolladores urbanos**.

Por ende:
- **Cero tecnicismos expuestos al usuario final:** Mensajes como "Capa Geoespacial Turf.js", IDs de bases de datos crudos o endpoints no deben aparecer en la interfaz visible.
- **Footer Institucional:** Debe reflejar el perfil municipal y corporativo con enlaces de contacto oficial y la leyenda de autoría requerida: **"Desarrollado por Tecno 3F"**.

---

## 2. Reglas de Interacción, Diálogos y Modales

### 2.1 Prohibición de Modales Nativos del Navegador
> [!CAUTION]
> Queda **estrictamente prohibido** el uso de diálogos nativos del navegador (`window.alert()`, `window.confirm()`, `window.prompt()`).

**Motivos:**
1. Bloquean el hilo de ejecución principal de JavaScript.
2. No son personalizables, no respetan la identidad visual ni el modo de contraste institucional.
3. Son inconsistentes entre navegadores y sistemas operativos móviles.

### 2.2 Patrón de Modales y Diálogos Reutilizables
Todo modal o diálogo interactivo debe implementarse con un componente React reutilizable (`Modal.tsx` o `ConfirmDialog.tsx`) que cumpla:
1. **Bloqueo de scroll de fondo (Scroll Lock):** Al abrirse el modal, se debe fijar `document.body.style.overflow = 'hidden'`; al desmontarse, restaurar el scroll previo.
2. **Backdrop difuminado:** Fondo oscuro semitransparente con desenfoque (`bg-slate-900/50 backdrop-blur-sm`).
3. **Confirmación en acciones críticas:** Toda acción destructiva (ej. descartar filtros aplicados, eliminar una carga manual, forzar una re-ingesta) debe solicitar confirmación previa mediante un diálogo con botón explícito de acción (color destructivo o primario) y botón neutro de cancelación.
4. **Accesibilidad (a11y):** Cierre accesible mediante tecla `Escape`, clic sobre el backdrop exterior y foco accesible (`aria-modal="true"`, `role="dialog"`).

---

## 3. Estados de Carga: Skeletons vs. Spinners

| Tipo de Carga | Elemento a Utilizar | Justificación |
| :--- | :--- | :--- |
| **Carga de página o listados** (Sidebar, cards de inmuebles, popovers) | **Skeletons (`animate-pulse`)** | Mantiene la estructura visual, evita saltos de contenido (CLS < 0.1) y reduce la ansiedad de espera. |
| **Micro-acciones puntuales** (Botón "Recargar", guardar formulario) | **Spinners (`animate-spin`)** dentro del botón | Indica procesamiento inmediato sin alterar el layout existente. |

*Ejemplo:* Durante la carga inicial de inmuebles en el Sidebar, se renderizan 3 a 5 tarjetas `InmuebleCardSkeleton` con bloques grises pulsantes en lugar de un spinner giratorio centrado.

---

## 4. Formularios y Manejo de Errores

1. **Validación Contextual:** Todo formulario debe validarse con esquemas de **Zod**.
2. **Errores Inline:** Los mensajes de validación deben aparecer inmediatamente debajo del campo involucrado (en color rojo accesible `#b91c1c` con icono), **nunca** exclusivamente en un toast o alert general al tope de la página.
3. **No deshabilitar inputs silenciosamente:** Si un botón de submit está deshabilitado, debe explicarse la razón mediante tooltip o texto de ayuda (Helper text).

---

## 5. Delimitación y Navegación en el Mapa (React-Leaflet)

1. **Límites Geográficos Estrictos (Bounding Box 3F):**
   - El mapa de OpenStreetMap debe estar acotado a Tres de Febrero y sus inmediaciones (`maxBounds`).
   - Usar `maxBoundsViscosity={1.0}` para evitar que el usuario arrastre la vista hacia otras provincias o el exterior.
   - Fijar un zoom mínimo razonable (`minZoom={12}`) para prohibir la vista internacional o continental.
2. **Iconografía de Pines por Tipología:**
   - Los marcadores del mapa no deben depender únicamente de colores.
   - Deben incluir iconografía vectorial que represente la tipología del inmueble:
     - 🏭 **Galpón / Depósito:** Nave industrial.
     - 🏪 **Local Comercial:** Tienda / Vitrina comercial.
     - 🏢 **Oficina:** Edificio corporativo.
     - 📐 **Terreno / Lote:** Parcela / Loteo.

---

## 6. Micro-interacciones y Animaciones Fluidas

1. **Duración:** Las transiciones de interfaz deben ser rápidas y naturales (entre `150ms` y `250ms`, función de aceleración `cubic-bezier(0.4, 0, 0.2, 1)` / `ease-in-out`).
2. **Propiedades animables:** Solo animar `transform` (escala, traslación) y `opacity`. Evitar animar `width`, `height`, `top` o `left` para evitar repintados (Layout Thrashing).
3. **Respeto a la accesibilidad motriz:** Usar la directiva `motion-reduce:transition-none` de Tailwind para usuarios con `prefers-reduced-motion` activado en su sistema operativo.

---

## 7. Arquitectura y Modularización de Componentes

1. **Principio de Responsabilidad Única:** Ningún archivo de componente debe albergar subcomponentes complejos o múltiples bloques con ciclo de vida independiente.
2. **Separación de Vistas y Marcadores del Mapa:**
   - `MapView.tsx`: Encargado únicamente de orquestar el `MapContainer`, capas base y límites.
   - `PinInmueble.tsx`: Componente aislado y memoizado responsable del marcador, icono y popup individual.
   - `constants/mapa.ts`: Coordenadas oficiales, zooms y bounding box de Tres de Febrero.
