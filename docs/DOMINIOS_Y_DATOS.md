# Diccionario de Dominio y Reglas de Negocio (Tres de Febrero)

## 1. Entidades Principales: `Inmueble` vs `Aviso`
El sistema separa estrictamente la propiedad física de sus publicaciones comerciales:
- **`Inmueble`:** Representa la parcela o propiedad física real en Tres de Febrero. Tiene ubicación única (`lat`, `lng`), dirección normalizada, localidad, superficie, tipo y código de zonificación municipal.
- **`Aviso`:** Representa una publicación en una fuente externa (Argenprop, Zonaprop, Carga Manual, Planilla). Un `Inmueble` puede tener múltiples `Avisos` asociados. El `Aviso` contiene precio, moneda, URL original, comercializadora/inmobiliaria, `fechaVistoPrimeraVez`, `fechaVistoUltimaVez` y estado (`activo` | `baja`).

## 2. Heurística de Deduplicación (MVP)
Cuando ingresa un `Aviso` nuevo, se vincula a un `Inmueble` existente si cumple TODAS estas condiciones:
1. Mismo `tipo` de propiedad (`galpon`, `local`, `oficina`, `terreno`).
2. Misma `localidad` normalizada.
3. Superficie total o cubierta dentro de una tolerancia de `±5%`.
4. Distancia geodésica menor o igual a `80 metros` (calculada con `@turf/distance`).
Si no coincide, se crea un nuevo registro en `Inmueble`.

## 3. Taxonomía Normalizada (Enums del Sistema)
Cualquier término de los portales debe mapearse a estos valores únicos:
- **TipoInmueble:** `'local' | 'galpon' | 'oficina' | 'terreno'`
  *(Nota: "depósito", "nave industrial", "predio logístico" -> mapean a `'galpon'`).*
- **TipoOperacion:** `'venta' | 'alquiler'`
- **Moneda:** `'USD' | 'ARS'`
- **FuenteDatos:** `'argenprop' | 'zonaprop' | 'properati' | 'manual_municipal' | 'planilla_externa'`

## 4. Códigos Oficiales de Zonificación (Plano Zonificación 2020 y Plan Buen Ayre 2024)
El cruce espacial con Turf.js asigna a cada `Inmueble` su código de zona oficial:
- **Comerciales / Centralidad:**
  - `C1`: Área de Centralidad
  - `C2`: Corredor Concentrador de Actividades
  - `C3`: Centros Comerciales (ej. Ciudad Jardín)
- **Residenciales (Restringidas para industria):**
  - `R1a`: Residencial de Densidad Media y baja altura
  - `R1b`: Residencial de Baja Densidad
  - `R2a`: Residencial de Alta Densidad
  - `R2b`: Residencial de Densidad Media Alta
- **Mixto Industrial (Foco de radicación productiva):**
  - `RMI1`: Residencial Mixto Industrial de Baja Densidad
  - `RMI2`: Residencial Mixto Industrial de Media Densidad
  - `RMI3`: Residencial Mixto Industrial de Alta Densidad
- **Sectores Especiales Camino del Buen Ayre (U.F. 12):**
  - `RC1`: Sector RC 1 (Arroyo Morón, Las Flores, Miramar, Buen Ayre, Río Reconquista, Pte. Perón)
  - `RC2`: Sector RC 2 (Lavalle, Buen Ayre, Arroyo Morón, Río Reconquista)
  - `RC3`: Sector RC 3 (Delimitado hacia Ruta Nacional N° 8 / Av. Eva Perón)
- **Macrozonas:**
  - `DESARROLLO_PRIORITARIO` | `PROMOCION_HABITAT` | `PROTECCION_PATRIMONIAL`

## 5. Geocodificación Fallback
Si el aviso scrapeado no incluye coordenadas `(lat, lng)` en su código fuente, el sistema consulta la API pública de Datos Argentina (`https://apis.datos.gob.ar/georef/api/direcciones`) filtrando por `provincia=Buenos Aires` y `departamento=Tres de Febrero`.