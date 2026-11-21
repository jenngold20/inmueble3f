# Identidad Visual: Municipalidad de Tres de Febrero

Guía de uso de la identidad visual oficial para la Plataforma Inmobiliaria 3F. Todo cambio de interfaz (colores, tipografías, logo, componentes) debe respetar este documento.

**Fuente oficial:** `docs/pdfs/MANUAL DE MARCA_Municipalidad de tres de febrero.pdf` (Manual de Identidad Visual de la Municipalidad). Si hay contradicción entre este documento y el manual, **gana el manual**.

**Estado:** documento inicial. Se completa a medida que se revisan las páginas del manual (ver sección 7).

---

## 1. Paleta cromática

Valores tomados del manual (versión web). Los nombres PANTONE son referenciales: la correspondencia exacta muestra a muestra no quedó clara en el texto del manual.

| Color | HEX | RGB | Referencia | Contraste sobre blanco | Uso sugerido en la plataforma |
|---|---|---|---|---|---|
| Azul oscuro | `#00365B` | 0 / 70 / 119 | — | 12,51 : 1 | Títulos, texto principal de encabezados, fondo de la barra superior |
| Azul | `#175588` | 23 / 85 / 136 | — | 7,80 : 1 | Color principal de acciones, enlaces, foco y selección |
| Naranja | `#E4992B` | 228 / 153 / 43 | PANTONE 144 CP | 2,36 : 1 | Acentos y elementos decorativos. **No usar para texto sobre blanco.** |
| Amarillo | `#EEBB31` | 238 / 187 / 49 | PANTONE 130 CP | 1,78 : 1 | Detalles y resaltados. **No usar para texto ni como fondo de texto.** |

**Reglas de contraste:**
- El texto debe cumplir WCAG AA: 4,5 : 1 para texto normal y 3 : 1 para texto grande.
- Naranja y amarillo **no sirven para texto** sobre fondo blanco ni claro. Si hace falta un texto naranja, va sobre fondo azul oscuro (`#00365B`, con el blanco como texto).
- Los colores de las zonas del mapa (C1, RMI, RC) no son colores institucionales: son codificación del cruce espacial y no deben usarse como colores de marca.

---

## 2. Tipografía

| Familia | Uso | Pesos |
|---|---|---|
| **Quicksand** | Texto general de la plataforma y logotipo | Regular, Bold |
| **Montserrat** | Solo títulos en mayúsculas | Black |

- Quicksand es la tipografía principal. Montserrat Black **solo** para títulos en mayúscula; no para párrafos ni etiquetas.
- Pendiente de implementación: la app usa la tipografía por defecto de Tailwind. Cargar Quicksand (y Montserrat, si se usa) desde Google Fonts en `frontend/index.html` cuando se haga la tarea de tipografía.

---

## 3. Logo

### 3.1 Versiones del isotipo "3F"
- Azul sobre blanco (cuadrado azul con el "3" blanco y la "F" naranja).
- Negro o gris oscuro sobre blanco.
- Blanco sobre negro.

### 3.2 Logotipo
- Isotipo + barra vertical + "Municipalidad de Tres de Febrero" en Quicksand.
- Versiones: azul, negro, y blanco sobre negro.

### 3.3 Usos no permitidos
- Agregar palabras ("MUNICIPALIDAD", "DEPORTES" u otras) en bandas debajo o al costado del logo.
- Ponerlo dentro de un círculo u óvalo.
- Cambiar colores (turquesa, fondo naranja, etc.) o usar el logotipo en naranja.
- Deformar o cambiar las proporciones.
- **Recrear el logo a mano o copiarlo desde una captura.** Solo se usa el archivo vectorial oficial.

### 3.4 Área de seguridad
El isotipo necesita espacio libre alrededor, según el diagrama del manual (página "Uso permitido"). Medidas exactas: pendiente de revisión.

### 3.5 Estado actual en la plataforma
- La barra superior muestra un cuadrado azul con "3F" en texto, que es un **placeholder propio** y no el isotipo oficial.
- **Pendiente:** reemplazarlo por el isotipo oficial cuando exista el archivo vectorial (SVG o PDF).

---

## 4. Estado actual del código frente a esta guía

| Aspecto | Hoy | Debería |
|---|---|---|
| Color principal | Escala `municipal` de `tailwind.config.js` (azul celeste `#0284c7` y derivados) | Azul de la marca (`#175588`) y azul oscuro (`#00365B`) |
| Acentos | Ámbar y rosa usados en avisos y errores | Naranja y amarillo de la marca como acentos, sin texto sobre fondo claro |
| Tipografía | Por defecto de Tailwind | Quicksand |
| Logo | Placeholder "3F" en la barra superior | Isotipo oficial |

Los estados de error (rojo) y de éxito no están en el manual: pueden mantenerse con colores semánticos estándar, con contraste verificado.

---

## 5. Reglas para desarrollo

Antes de cualquier cambio de interfaz:

1. Usar los colores de este documento a través de tokens de Tailwind (`municipal-*` u otros nombres centralizados en `tailwind.config.js`). No escribir valores hexadecimales sueltos en los componentes.
2. Verificar contraste 4,5 : 1 para texto (ver sección 1).
3. No usar naranja ni amarillo para texto sobre fondo claro.
4. No recrear ni modificar el logo. Usar el archivo oficial.
5. Consultar la sección 3.3 antes de agregar cualquier variante del logo.

---

## 6. Referencias

- Manual de Identidad Visual de la Municipalidad de Tres de Febrero (`docs/pdfs/`).
- `docs/ARCHITECTURE.md` (capas y reglas del frontend).
- `docs/DOMINIOS_Y_DATOS.md` (códigos de zona, que tienen colores propios para el mapa).

---

## 7. Pendientes de revisión

Páginas del manual revisadas: **uso permitido** y **usos no permitidos**.

Pendientes:
- Páginas de **marca**, **grilla constructiva**, **sistema cromático** (correspondencia PANTONE muestra a muestra).
- Página de **tipografía** (verificar tamaños y jerarquía, no solo las familias).
- Páginas de **color y negativo**, **una tinta y negativo**, **blanco y negro**.
- Página de **área de seguridad** (medidas).
- Archivo vectorial oficial del logo (no disponible hoy).
