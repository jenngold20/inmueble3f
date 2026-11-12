# Guía de Contribución y Flujo de Trabajo en Equipo

## 1. Flujo de Ramas (Git)
- La rama `main` está protegida. **PROHIBIDO** hacer push directo a `main`.
- Toda tarea del backlog se desarrolla en una rama corta creada desde `main` con el formato:
  - `feat/nombre-corto` (nuevas funcionalidades)
  - `fix/nombre-corto` (corrección de errores)
  - `chore/nombre-corto` (configuración, Docker, dependencias)
  - `docs/nombre-corto` (documentación o reglas)

## 2. Formato de Commits (Conventional Commits en Español)
Todos los mensajes de commit DEBEN ser en español, en minúsculas y seguir esta estructura:
`<tipo>(<alcance opcional>): <descripción breve en imperativo o infinitivo>`

### Tipos permitidos:
- `feat`: Nueva característica (ej. `feat(scraper): agregar extractor de argenprop desde json embebido`)
- `fix`: Corrección de bug (ej. `fix(geo): corregir tolerancia de distancia en deduplicacion`)
- `refactor`: Cambio de código que no altera funcionalidad ni corrige bugs
- `chore`: Configuración de herramientas, scripts o Docker (ej. `chore(db): configurar servicio postgres en docker-compose`)
- `docs`: Cambios en documentación o reglas de IA

## 3. Checklist antes de abrir un Pull Request (PR)
1. El proyecto compila sin errores de TypeScript (`npm run build` / `tsc --noEmit`).
2. No quedaron `console.log` de depuración ni código comentado.
3. No se subieron archivos `.env` ni credenciales (verificar `.gitignore`).
4. Todo endpoint nuevo o estructura de datos tiene su esquema de validación en **Zod**.