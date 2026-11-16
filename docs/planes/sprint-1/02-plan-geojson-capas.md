# Plan de Implementación: Captura y Digitalización de Capas GeoJSON
## Tarjeta: [CARD-GEO-07] | Estimación: 2 SP | Rama: feat/geojson-capas
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación de la Tarea
La plataforma inmobiliaria de Tres de Febrero basa su propuesta de valor en el **cruce normativo territorial automático**: determinar si un inmueble comercial o industrial está en zona habilitable según la Ordenanza de Zonificación 2020 y el Plan Camino del Buen Ayre 2024 (U.F. 12).

Siguiendo la **restricción dura de AGENTS.md** (*"Cruce Espacial en capa de aplicación usando Turf.js, NO usar extensiones PostGIS en BD"*), el backend y el mapa de Leaflet necesitan disponer de archivos `.geojson` estandarizados, depurados y validados en `/data/geojson/`.

---

### 2. Archivos GeoJSON a Digitalizar en `/data/geojson/`

```
data/geojson/
├── limite-partido-3f.geojson       # Límite perimetral completo del Partido de Tres de Febrero
├── zonificacion-2020.geojson       # Polígonos de zonas C1..C3, RMI1..RMI3 y Residenciales
└── buen-ayre-uf12.geojson          # Polígonos de los Sectores RC1, RC2 y RC3 (Buen Ayre)
```

#### A. `data/geojson/limite-partido-3f.geojson`
* **Propósito:** Validar si una propiedad está dentro del territorio de Tres de Febrero o debe clasificarse como `"fuera_de_ejido"`.
* **Geometría:** `Polygon` cerrado con el perímetro del municipio (linderos con San Martín, Morón, Hurlingham, San Miguel y CABA - Av. General Paz).
* **Properties:**
  ```json
  {
    "partido": "Tres de Febrero",
    "provincia": "Buenos Aires",
    "codigoIndec": "06840",
    "cabecera": "Caseros"
  }
  ```

#### B. `data/geojson/zonificacion-2020.geojson`
* **Propósito:** Asignar la zona urbanística oficial y renderizar las capas de colores en el mapa React-Leaflet.
* **Geometría:** `FeatureCollection` de polígonos representativos basados en el mapa oficial de Zonificación 2020:
  - **Comerciales / Centralidad:**
    - `C1`: Área de Centralidad (Caseros Centro, Av. San Martín, Urquiza). Color: `#E65100` (Naranja oscuro).
    - `C2`: Corredor Concentrador (Av. Marcelo T. de Alvear, Av. Rivadavia - Ciudadela, Av. Márquez). Color: `#FB8C00`.
    - `C3`: Centro Comercial Ciudad Jardín Lomas del Palomar. Color: `#FFA726`.
  - **Mixto Industrial (Prioridad productiva de la Dirección de Inversiones):**
    - `RMI1`: Residencial Mixto Industrial Baja Densidad. Color: `#5E35B1` (Púrpura).
    - `RMI2`: Residencial Mixto Industrial Media Densidad (Caseros Sur / Villa Bosch / Pablo Podestá). Color: `#7E57C2`.
    - `RMI3`: Residencial Mixto Industrial Alta Densidad (Zona fabril Loma Hermosa / Churruca). Color: `#9575CD`.
  - **Residenciales:**
    - `R1a` / `R1b`: Residencial baja/media densidad. Color: `#90A4AE` (Gris azulado).
    - `R2a` / `R2b`: Residencial alta densidad. Color: `#B0BEC5`.
* **Properties por Feature:**
  ```json
  {
    "codigo": "RMI2",
    "nombre": "Residencial Mixto Industrial Media Densidad",
    "categoria": "industrial",
    "color": "#7E57C2",
    "opacidad": 0.4
  }
  ```

#### C. `data/geojson/buen-ayre-uf12.geojson`
* **Propósito:** Delimitar con exactitud el polo logístico del Buen Ayre (Plan 2024 / U.F. 12) para catalogar inmuebles como *"Apto Gran Logística / Industria Pesada"*.
* **Geometría:** `FeatureCollection` con 3 polígonos según la Ordenanza municipal:
  - `RC1`: Sector entre Arroyo Morón, Las Flores (Calle 918), Miramar (979), Autopista Buen Ayre, Río Reconquista y Av. Pte. Perón.
  - `RC2`: Sector entre Juan Lavalle (900), Buen Ayre, Arroyo Morón y Río Reconquista.
  - `RC3`: Sector delimitado hacia Ruta Nacional N° 8 (Av. Eva Perón), Rosella y Entre Ríos.
* **Properties por Feature:**
  ```json
  {
    "codigo": "RC1",
    "nombre": "Sector RC1 - Polo Logístico Buen Ayre",
    "categoria": "logistica_pesada",
    "aptoLogistica": true,
    "color": "#1E88E5",
    "opacidad": 0.5
  }
  ```

---

### 3. Estándares de Calidad y Convenciones Geoespaciales
- **Formato Estándar:** RFC 7946 GeoJSON.
- **Sistema de Coordenadas:** WGS84 estándar GPS (`EPSG:4326`).
- **Orden de Coordenadas:** `[longitud, latitud]` estricto (e.g. `[-58.5626, -34.6037]`).
- **Anillos Cerrados:** El primer y último punto de cada polígono deben coincidir exactamente (`coord[0] === coord[n-1]`).

---

### 4. Verificación Automatizada con Turf.js
Se creará un script de prueba ejecutable en `/backend/src/scripts/verificar-geojson.ts` que:
1. Lee y parsea los 3 archivos JSON de `/data/geojson/`.
2. Verifica que cada `Polygon` esté cerrado y contenga coordenadas válidas en el rango de Tres de Febrero.
3. Evalúa 5 coordenadas de control con `@turf/boolean-point-in-polygon`:
   - **Punto 1 (Caseros Centro):** `[-58.5645, -34.6061]` -> Debe dar `true` dentro de 3F y clasificar en zona `C1`.
   - **Punto 2 (Parque Industrial / Villa Bosch):** `[-58.5830, -34.5880]` -> Debe dar `true` dentro de 3F y clasificar en `RMI2`.
   - **Punto 3 (Buen Ayre y Arroyo Morón):** `[-58.6180, -34.5750]` -> Debe clasificar en sector `RC1`.
   - **Punto 4 (Ramos Mejía - La Matanza):** `[-58.5650, -34.6500]` -> Debe dar `false` (fuera del partido).
   - **Punto 5 (Villa Devoto - CABA):** `[-58.5100, -34.5950]` -> Debe dar `false` (fuera del partido).
4. Confirma que la ejecución del cruce tarde menos de **5 milisegundos por punto** en memoria.

---

### 5. Flujo Git
- **Rama activa:** `feat/geojson-capas` (creada limpiamente a partir de la rama base `docs/historias-de-usuario`).
- **Regla estricta:** No se realizarán commits ni pushes remotos hasta que el plan sea aprobado y el código esté probado.

