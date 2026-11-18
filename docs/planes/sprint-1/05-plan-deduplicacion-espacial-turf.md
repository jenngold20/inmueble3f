# Plan de Implementación: Algoritmo de Deduplicación Espacial con Turf.js
## Tarjeta: [CARD-ING-03A] | Estimación: 3 SP | Rama: feat/deduplicacion-espacial-turf
### Responsable: Leonardo Murano (@leonardomurano)

---

### 1. Contexto y Justificación
En el mercado inmobiliario de Tres de Febrero, es común que una misma nave industrial, galpón o local comercial sea publicado simultáneamente por 2, 3 o más inmobiliarias distintas en portales como Argenprop, Zonaprop o en planillas municipales. Cada aviso suele tener precios diferentes, descripciones variadas e incluso ligeras discrepancias en las coordenadas aproximadas del pin y en los metros cuadrados informados.

Para evitar que el mapa municipal se sobrecargue con múltiples pines para una misma parcela física, la historia **HU-ING-03** define la separación entre:
- **`Inmueble`:** La parcela o propiedad física única en el territorio.
- **`Aviso`:** Las diversas publicaciones comerciales asociadas a ese inmueble.

El objetivo de esta tarjeta **`[CARD-ING-03A]`** es construir el motor de deduplicación geodésica como **función pura en la capa de servicios del backend** (`backend/src/services/deduplicacion.service.ts`), asegurando máxima velocidad de ejecución en memoria, cero efectos colaterales y testeabilidad al 100% con `@turf/distance`.

---

### 2. Archivos a Crear y Modificar

```
backend/
├── src/
│   ├── services/
│   │   └── deduplicacion.service.ts     # NUEVO: Lógica algorítmica de deduplicación pura
│   └── scripts/
│       └── test-deduplicacion.ts        # NUEVO: Suite de pruebas unitarias y casos borde
├── package.json                         # MODIFICAR: Agregar script "dedup:test"
└── tsconfig.json                        # Verificación estricta TypeScript

docs/
└── planes/
    └── sprint-1/
        └── 05-plan-deduplicacion-espacial-turf.md # Este plan
```

---

### 3. Especificación Algorítmica y Reglas de Negocio (Las 4 Condiciones)

Un aviso entrante se considera que pertenece a un inmueble candidato existente si y solo si cumple **TODAS** las siguientes reglas simultáneas:

#### Regla 1: Tipología Idéntica
- `aviso.tipo === candidato.tipo`
- Los tipos oficiales son: `'galpon' | 'local' | 'oficina' | 'terreno'`.
- Un galpón de 500 m² nunca debe asociarse con un local comercial o una oficina en la misma dirección.

#### Regla 2: Localidad Normalizada Idéntica
- `aviso.localidad.trim().toLowerCase() === candidato.localidad.trim().toLowerCase()`
- Evita falsos positivos en límites entre localidades contiguas (ej. Caseros vs Santos Lugares).

#### Regla 3: Tolerancia de Superficie ($\le \pm 5\%$)
$$\Delta_{\text{sup}} = \frac{|\text{sup}_{\text{aviso}} - \text{sup}_{\text{candidato}}|}{\text{sup}_{\text{candidato}}} \le 0.05$$
- Se evalúa contra la **superficie cubierta** (`superficieCubiertaM2`) y/o la **superficie total** (`superficieTotalM2`).
- Si ambos informan superficie cubierta, se compara cubierta.
- Si alguno solo informa superficie total, se compara superficie total.
- Si la diferencia supera el 5% (ej. 1000 m² vs 1060 m² = +6%), se rechaza la coincidencia (podría ser otra nave o unidad funcional en el mismo predio).

#### Regla 4: Cercanía Geodésica ($\le 80\text{ metros}$) con Turf.js
- Se calcula la distancia sobre el gran círculo utilizando `@turf/distance`.
- **Aviso sobre coordenadas GeoJSON:** `@turf/distance` requiere puntos en formato `[longitud, latitud]` (X, Y):
  ```typescript
  const puntoAviso = point([aviso.lng, aviso.lat]);
  const puntoCandidato = point([candidato.lng, candidato.lat]);
  const distanciaMetros = distance(puntoAviso, puntoCandidato, { units: 'meters' });
  ```
- Condición de éxito: `distanciaMetros <= 80`.
- Si `distanciaMetros > 80`, se descarta la coincidencia.

---

### 4. Desempate y Selección de Mejor Coincidencia

Si existen múltiples inmuebles candidatos en la base de datos que cumplen con las 4 condiciones (por ejemplo, dos naves en un mismo parque industrial que entran en el radio de 80 m y tienen superficies cercanas):
- El algoritmo evalúa todos los candidatos válidos.
- **Criterio de desempate:** Se selecciona aquel candidato que tenga la **menor distancia geodésica** al punto del aviso (`distanciaMinima`).

---

### 5. Suite de Pruebas Unitarias y Casos Borde (`test-deduplicacion.ts`)

La suite validará 8 escenarios automatizados sin depender de una base de datos activa:

| # | Escenario de Prueba | Entrada de Prueba | Resultado Esperado |
|---|---------------------|-------------------|--------------------|
| 1 | **Match Exacto** | Misma coordenada, misma superficie (800 m²), mismo tipo (`galpon`), misma localidad (`Caseros`) | `coincide: true` (distancia 0m, dif 0%) |
| 2 | **Match Límite Geodésico** | Misma superficie, distancia a 79.2 metros ($\le 80\text{ m}$) | `coincide: true` |
| 3 | **Descarte por Distancia** | Misma superficie y tipo, distancia a 81.5 metros ($> 80\text{ m}$) | `coincide: false` (motivo: `DISTANCIA_EXCEDIDA`) |
| 4 | **Match Límite Superficie** | Distancia a 20m, superficie 1000 m² vs 1048 m² (+4.8% $\le 5\%$) | `coincide: true` |
| 5 | **Descarte por Superficie** | Distancia a 20m, superficie 1000 m² vs 1055 m² (+5.5% $> 5\%$) | `coincide: false` (motivo: `SUPERFICIE_FUERA_TOLERANCIA`) |
| 6 | **Descarte por Tipología** | Coordenadas idénticas (0m), misma superficie, pero `local` vs `galpon` | `coincide: false` (motivo: `TIPO_DISTINTO`) |
| 7 | **Descarte por Localidad** | Misma superficie y coordenadas, pero `Caseros` vs `Santos Lugares` | `coincide: false` (motivo: `LOCALIDAD_DISTINTA`) |
| 8 | **Desempate Multi-Candidato** | Candidato A a 55m y Candidato B a 12m (ambos válidos) | `coincide: true`, selecciona Candidato B |

---

### 6. Criterios de Aceptación (DoD)

1. Módulo puro `deduplicacion.service.ts` exporta funciones fuertemente tipadas sin uso de `any`.
2. Integración de `@turf/distance` con el orden correcto `[lng, lat]`.
3. Script ejecutable `npm run dedup:test` en `/backend` que corre la suite y reporta 8/8 tests exitosos.
4. Compilación estricta `npm run build` en `/backend` sin advertencias ni errores de TypeScript.
