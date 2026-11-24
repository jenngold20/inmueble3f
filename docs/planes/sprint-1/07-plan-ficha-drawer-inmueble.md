# Plan de Implementación: Ficha Detallada de Inmueble en Drawer
## Tarjeta: [CARD-MAP-12] | Estimación: 2 SP | Rama: feat/ficha-drawer-inmueble
### Responsable: Jennifer Goldfeld (@jennifergoldfeld)

---

### 1. Contexto y Justificación
La historia **HU-MAP-12** (*Ficha Técnica Detallada y Datos de Comercialización*) pide que el asesor, al seleccionar un inmueble, vea su ficha completa: galería, superficies, precio, zonificación oficial y datos de contacto de la comercializadora, para poder comunicárselos al inversor.

Hoy (después de `CARD-MAP-09`, PR #7) el sidebar lista 25 inmuebles y el mapa muestra sus pines con un popup resumido, pero no hay forma de ver la ficha completa. Esta tarjeta agrega un **drawer** que se abre al seleccionar un inmueble desde la tarjeta del sidebar o desde un pin del mapa.

**Fuera de alcance:**
- Sincronizar el inmueble seleccionado en la URL (`CARD-MAP-13`).
- Historial de precios o de avisos dados de baja (solo se muestran los datos del aviso principal y el resto de avisos activos).
- Fotos reales: los datos siguen siendo mock (ver sección 3.C).

---

### 2. Archivos a Crear y Modificar

```
frontend/src/
├── constants/
│   └── zonas.ts                       # MODIFICAR: agregar descripción oficial breve por zona (copiada de los properties de /data/geojson)
├── components/
│   ├── InmuebleDrawer.tsx             # NUEVO: panel de ficha (dialog accesible, cierre con Escape, foco gestionado)
│   ├── GaleriaFotos.tsx               # NUEVO: imagen principal + miniaturas, con estado vacío
│   ├── ContactoAviso.tsx              # NUEVO: comercializadora, teléfono y link al aviso original
│   ├── InmuebleCard.tsx               # MODIFICAR: la tarjeta pasa a ser un botón seleccionable
│   ├── Sidebar.tsx                    # MODIFICAR: recibe onSelect y el inmueble seleccionado
│   └── MapView.tsx                    # MODIFICAR: el clic en un pin abre el drawer; se quita el popup
├── mocks/
│   └── mock-inmuebles.json            # MODIFICAR: cada aviso apunta a sus fotos de prueba
└── App.tsx                            # MODIFICAR: estado del inmueble seleccionado y render del drawer

frontend/public/mock/inmuebles/
└── *.svg                              # NUEVO: 3 fotos de prueba por inmueble (75 archivos SVG, generados)

docs/
└── planes/
    └── sprint-1/
        └── 07-plan-ficha-drawer-inmueble.md   # Este plan
```

Ningún archivo nuevo de dependencias: todo se resuelve con React, Tailwind y Leaflet que ya están instalados.

---

### 3. Diseño

#### A. Estado de selección (`App.tsx`)
- `const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)`.
- Se pasa a `Sidebar` y `MapView` como `seleccionadoId` y `onSeleccionar(id)`.
- El inmueble seleccionado se busca en la lista ya cargada por `useInmuebles`. No se vuelve a pedir al servicio.
- Cerrar el drawer pone `seleccionadoId` en `null`.
- No se toca la URL en esta tarjeta.

#### B. `InmuebleDrawer.tsx`
- **Responsive:**
  - Escritorio (≥ 768 px): panel fijo a la derecha del mapa, de 400 px de ancho, de borde a borde en vertical.
  - Móvil (< 768 px): hoja inferior que ocupa como máximo el 85 % del alto de pantalla, con scroll propio.
- **Semántica:** `role="dialog"`, `aria-modal="true"` y `aria-labelledby` apuntando al título (la dirección).
- **Teclado:**
  - `Escape` cierra el drawer.
  - Al abrirse, el foco pasa al botón "Cerrar".
  - Tab queda dentro del drawer mientras está abierto.
  - Al cerrarse, el foco vuelve al elemento que lo abrió (la tarjeta o el pin).
- **Contenido, en orden:**
  1. Encabezado: tipo, operación, dirección y localidad; botón "Cerrar" con `aria-label`.
  2. `GaleriaFotos` del aviso principal.
  3. Precio destacado con moneda ("Consultar" si es nulo).
  4. Superficies: cubierta y total, las dos cuando estén informadas. Si no hay datos: "Superficie sin informar".
  5. Zonificación: `ZonaBadge` con el código y la descripción oficial de `ZONA_INFO`. Si no hay zona: "Fuera de zonificación municipal" o "Sin zona asignada", según el mock.
  6. Lista de avisos: un bloque por aviso activo (fuente, comercializadora, precio y estado). El aviso principal aparece primero y marcado como "Principal".
  7. `ContactoAviso` por cada aviso activo, para que el asesor tenga todos los contactos.

#### C. `GaleriaFotos.tsx`
- Muestra la foto activa a tamaño completo con `alt` descriptivo ("Foto 1 de 3 de [dirección]").
- Miniaturas en fila, con botón por cada una y `aria-current` en la activa.
- Botones "Anterior" y "Siguiente" con `aria-label`, deshabilitados en los extremos.
- **Estado vacío:** si el aviso no tiene fotos, muestra el mismo `InmuebleIcono` grande del placeholder de la tarjeta, con el texto "Sin fotos de prueba". No se muestran miniaturas.
- **Fotos de prueba:** cada inmueble del mock tiene 3 imágenes SVG locales en `frontend/public/mock/inmuebles/`. Cada una muestra el tipo del inmueble, un número de foto y un color derivado del tipo. Son archivos estáticos, sin servicios externos.
- **Estado vacío:** se mantiene para cualquier aviso sin fotos (por ejemplo, si el día de mañana un aviso real llega sin imágenes).
- **Generación:** las SVG y las rutas en `mock-inmuebles.json` salen del mismo script que generó el mock. El script no se versiona: el resultado sí.

#### D. `ContactoAviso.tsx`
- Muestra: fuente, comercializadora, teléfono y un enlace "Ver aviso original".
- El teléfono es un `<a href="tel:...">` con el número en formato legible.
- El enlace se abre en otra pestaña (`target="_blank"`, `rel="noopener noreferrer"`) y su texto accesible incluye "(se abre en otra pestaña)".
- Si `comercializadora` o `contactoTelefono` son nulos, se muestra "No informado" en lugar de dejar el bloque vacío.

#### E. Cambios en la tarjeta y en el mapa
- **`InmuebleCard`:** el contenedor pasa de `<article>` a `<button type="button">` con el mismo contenido visual. Así es seleccionable con teclado sin elementos interactivos anidados. Tiene `aria-pressed` cuando es el inmueble seleccionado y un anillo de foco visible.
- **`MapView`:** el `Marker` recibe `eventHandlers={{ click: () => onSeleccionar(inmueble.id) }}` y **se quita el `Popup`**: el clic en un pin abre solo el drawer. El pin conserva `title` con la dirección como tooltip al pasar el mouse. Leaflet dispara el evento `click` también con Enter cuando el pin tiene foco, así que el teclado funciona sin código extra.
- **Pin con foco visible:** el pin muestra un anillo de foco al recibir foco por teclado.
- **Pines seleccionados:** el pin seleccionado se resalta con un borde más grueso. Es un cambio de forma, no solo de color, para que se distinga sin depender del color.

#### F. Datos de zona (`constants/zonas.ts`)
- Se agrega un campo `descripcion` por zona, copiado del `descripcion` de cada feature de `/data/geojson` (`zonificacion-2020.geojson` y `buen-ayre-uf12.geojson`).
- Así la ficha muestra la descripción oficial sin consultar el GeoJSON en runtime, que es lo que pide el criterio "código de zonificación oficial con su descripción".
- **Hallazgo:** `zonificacion-2020.geojson` no tiene features para `R1b` ni `R2b` (solo `R1a` y `R2a`). Para esos dos códigos la descripción sale de `docs/DOMINIOS_Y_DATOS.md` (etiqueta oficial), y se deja anotado en el código. Si el mock nunca los usa, no afecta a la pantalla; si un inmueble real cae en esas zonas, la ficha igual muestra la etiqueta oficial.

---

### 4. Pruebas y Validación

El frontend no tiene framework de tests. La validación combina el build estricto, una prueba en navegador con Playwright y un script descartable fuera del repo, como en `CARD-MAP-09`.

| # | Escenario | Resultado esperado |
|---|-----------|--------------------|
| 1 | Build estricto (`npm run build` en `frontend/`) | Sin errores de TypeScript |
| 2 | Clic en una tarjeta del sidebar | Se abre el drawer con la dirección de esa tarjeta; la tarjeta queda con `aria-pressed="true"` |
| 3 | Clic en un pin del mapa | Se abre el drawer con el mismo inmueble que el pin |
| 4 | Pin con foco de teclado, Enter | Abre el drawer del mismo inmueble; el pin no muestra popup |
| 5 | Datos del drawer | Precio, superficies, zona y avisos coinciden con el mock del inmueble |
| 6 | Escape | Cierra el drawer y el foco vuelve a la tarjeta o pin de origen |
| 7 | Teclado | Tab no sale del drawer mientras está abierto |
| 8 | Teléfono | Es un enlace `tel:` con el número del aviso |
| 9 | Link al aviso | Abre en otra pestaña con `rel="noopener noreferrer"` |
| 10 | Precio nulo | Muestra "Consultar" |
| 11 | Inmueble con 2 avisos activos | Muestra ambos avisos, el principal marcado como "Principal" |
| 12 | Galería | Navega entre las 3 fotos con Anterior/Siguiente y miniaturas; los botones se deshabilitan en los extremos; sin fotos muestra el estado vacío |
| 13 | Móvil (< 768 px) | El drawer ocupa la parte inferior y se puede hacer scroll dentro |
| 14 | Consola | Sin errores de JS ni de React |

---

### 5. Criterios de Aceptación (DoD)

1. Al seleccionar un inmueble desde la tarjeta o el pin, se abre el drawer con galería, superficies, precio, zona con descripción oficial y datos de contacto de cada aviso activo.
2. El drawer es un diálogo accesible: se cierra con Escape, mantiene el foco dentro mientras está abierto y devuelve el foco a su origen.
3. El drawer funciona en escritorio (panel lateral) y en móvil (hoja inferior).
4. Los componentes no hacen `fetch` ni importan el JSON: el inmueble seleccionado sale de la lista que entrega `useInmuebles`.
5. `npm run build` pasa sin errores; sin `any`, `@ts-ignore` ni `console.log`.
6. Ninguna dependencia nueva.

---

### 6. Justificación de Dependencias
No se agrega ninguna. El drawer se hace con elementos HTML y atributos ARIA estándar, Tailwind para el layout y React para el estado. Una librería de diálogos o de modales daría lo mismo, pero sumaría peso y una dependencia más sin que haga falta.

---

### 7. Decisiones Tomadas
1. **Clic en pin:** abre solo el drawer. Se quita el popup, para no tener dos ventanas a la vez.
2. **Fotos de prueba:** 3 SVG locales por inmueble en `frontend/public/mock/inmuebles/`, sin servicios externos.
3. **Descripción de zona:** la descripción completa del GeoJSON, con la excepción de `R1b` y `R2b` (ver sección 3.F).

---

### 8. Riesgos y Coordinación
- **Conflictos con Luis (`CARD-MAP-10`):** `Sidebar.tsx` y `MapView.tsx` los toca también. Esta tarjeta arranca después del merge de `PR #7`, y conviene avisarle antes de abrir el PR.
- **CARD-MAP-13:** en el futuro la URL podría guardar el inmueble seleccionado (`?inmueble=<id>`). No se implementa aquí, pero el estado vive en `App.tsx` para que sea fácil de migrar.

---

### 9. Flujo Git
- **Rama:** `feat/ficha-drawer-inmueble`, creada desde `dev` **después del merge de PR #7**.
- **Commits previstos** (español, minúsculas, Conventional Commits; cada uno compila por separado):
  1. `docs: agregar plan de implementacion de ficha detallada en drawer (CARD-MAP-12)`
  2. `feat(frontend): agregar descripcion oficial a las zonas`
  3. `feat(frontend): agregar fotos de prueba locales a los inmuebles mock`
  4. `feat(frontend): crear galeria de fotos y bloque de contacto del aviso`
  5. `feat(frontend): crear drawer accesible con ficha de inmueble`
  6. `feat(frontend): seleccionar inmueble desde tarjetas y pines`
- **Regla:** no se commitea ni se hace push hasta que el plan esté aprobado y el código probado. El PR apunta a `dev`.
