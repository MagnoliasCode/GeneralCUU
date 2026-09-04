# Territorios App

Aplicación web para visualizar y asignar territorios (secciones, colonias, zonas azules,
CUU prioritario, códigos postales, distritos y casillas) a partir de los polígonos WKT
del catálogo `Catalogo ordenado.xlsx`.

- **Geometrías**: se convirtieron una sola vez a GeoJSON estático (`public/data/*.geojson.json`)
  porque no cambian; se sirven directamente desde la app y cada capa se carga solo cuando se activa.
- **Asignaciones** (responsable, prioritario, pendiente): viven en una tabla de Postgres en
  Supabase (`public.assignments`) y se sincronizan en tiempo real (Supabase Realtime) entre
  todos los usuarios conectados.
- **Login**: Supabase Auth (correo/contraseña). No hay registro público — los usuarios los
  crea el administrador directamente en Supabase (ver paso 3). Un solo rol: cualquier
  usuario autenticado puede ver y editar cualquier territorio.
- **Hosting**: pensado para GitHub Pages, con un workflow de GitHub Actions que hace el
  build y despliega automáticamente en cada push a `main`.

## 1. Crear el proyecto en Supabase

1. Crea un proyecto en https://supabase.com/dashboard
2. Ve a **Project Settings > API** y copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → la usarás solo en scripts locales de administración, nunca en el
     frontend ni en git.
3. Copia `.env.example` a `.env` y llena las dos variables `VITE_*`:

   ```bash
   cp .env.example .env
   ```

4. Copia `.env.admin.example` a `.env.admin` y llena `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (este archivo está en `.gitignore`, nunca lo subas a git):

   ```bash
   cp .env.admin.example .env.admin
   ```

## 2. Crear la tabla de asignaciones

En Supabase Dashboard, abre **SQL Editor** y ejecuta el contenido de
[`supabase/schema.sql`](supabase/schema.sql). Esto crea la tabla `assignments`, sus
políticas de seguridad (RLS) y activa Realtime sobre ella.

## 3. Precargar usuarios (administrador)

No hay pantalla de registro: el equipo se crea directamente en Supabase Auth. El script
`scripts/create-admin-users.mjs` ya trae **3 usuarios de ejemplo precargados** — puedes
usarlos tal cual para probar o editar el archivo antes de correrlo:

| Correo                      | Contraseña        |
|------------------------------|-------------------|
| admin1@territorios.local     | `#qdKq3XiKTyASy`  |
| admin2@territorios.local     | `ZKGm9%MZ2wmhR9`  |
| admin3@territorios.local     | `anr7swEZT#zLg3`  |

```bash
npm install
npm run create-admins
```

Para agregar, quitar o cambiar contraseñas después, ve a **Authentication > Users** en el
Dashboard de Supabase — ahí es donde el administrador gestiona el acceso, sin tocar código.

## 4. Importar los territorios a la tabla `assignments`

Hay dos formas de subir los 14,707 renglones (uno por territorio de las 8 hojas). Solo
necesitas usar una de las dos:

**Opción A — script (recomendada, más rápida):**

```bash
npm run seed
```

**Opción B — CSV desde el Dashboard**, si prefieres no usar la Service Role Key desde tu
máquina: genera `supabase-seed.csv` a partir del JSON...

```bash
npm run convert:csv
```

...y en Supabase Dashboard ve a **Table Editor > assignments > Insert > Import data from
CSV**, selecciona `supabase-seed.csv` y confirma que las columnas coincidan (`doc_id`,
`layer`, `territory_id`, `label`, `responsable`, `prioritario`, `pendiente`, `updated_at`,
`updated_by`). El importador de la interfaz solo acepta CSV, no JSON — por eso existe este
paso adicional.

## 5. Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## 6. Desplegar en GitHub Pages

1. Sube este proyecto (`territorios-app/`) como la raíz de un repositorio en GitHub.
2. En **Settings > Pages**, selecciona la fuente **GitHub Actions**.
3. En **Settings > Secrets and variables > Actions**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Cada push a `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
   que compila con Vite y publica `dist/` en GitHub Pages automáticamente.

## Estructura de datos

- `public/data/<capa>.geojson.json`: geometría estática de cada hoja del Excel
  (`secciones`, `zonas_azules`, `cuu_prioritario`, `colonias`, `cp`, `distrito_local`,
  `distrito_federal`, `casillas`). Cada feature trae `properties.id`, `properties.layer`
  y las columnas originales de esa hoja, más un `label` legible.
- Tabla `public.assignments` en Supabase, un renglón por territorio con `doc_id`
  `<capa>_<id>`, ej. `secciones_3130`:

  ```
  doc_id: "secciones_3130"
  layer: "secciones"
  territory_id: "3130"
  label: "Sección 3279"
  responsable: ""
  prioritario: false
  pendiente: false
  updated_at: null
  updated_by: null
  ```

## Regenerar los datos desde el Excel

Si el catálogo original cambia, coloca `Catalogo ordenado.xlsx` un nivel arriba de este
proyecto y corre:

```bash
npm run convert
```

Esto vuelve a generar `public/data/*.geojson.json` y `supabase-seed.json`; después corre
`npm run seed` de nuevo para actualizar la tabla (usa `upsert`, así que no duplica filas).

## Notas sobre los datos originales

- La hoja **Casillas** trae `WKT_GEOM` en coordenadas UTM (proyectadas), no en
  lat/lng — para ubicar cada casilla en el mapa se usaron directamente las columnas
  `LONGITUD_G` / `LATITUD_GO` de esa misma hoja (en WGS84).
- Los polígonos de **Secciones**, **Colonias** y **CP** se simplificaron ligeramente
  (con tolerancia geométrica, sin perder la forma general) para que el mapa cargue y
  se dibuje con fluidez en el navegador; si necesitas la precisión exacta original,
  ajusta `simplifyTolerance` en `scripts/convert-excel.cjs` y vuelve a correr `npm run convert`.
