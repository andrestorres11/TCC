# TCC — Torre de Control (MVP "Alertas de entregas y novedades")

Capa de torre de control: ingiere paradas georreferenciadas y los registros de
entrega/novedad del sistema del conductor, **detecta paradas sin resolver** y
**genera alertas** para que los controladores las gestionen.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth) ·
`@supabase/ssr` · `zod` (validación en servidor) · `react-leaflet` + OpenStreetMap.

- RLS activa en **todas** las tablas (deny por defecto).
- Validación en servidor con `zod` en cada mutación/ingesta.
- Rol **admin** con sección `/admin`.

---

## 1. Requisitos

- Node 20+ (probado con Node 24).
- Un proyecto gratis en **Supabase Cloud** (no requiere Docker).

## 2. Crear el proyecto Supabase

1. Entra a https://supabase.com → **New project**.
2. En **Project Settings → API** copia: `Project URL`, la `anon` key y la `service_role` key.

## 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con tus llaves. `SUPABASE_SERVICE_ROLE_KEY` es **secreta**
(solo servidor) y `.env.local` ya está en `.gitignore`.

## 4. Crear el esquema y la seguridad

**Opción A — SQL Editor (más simple, sin CLI):** en el panel de Supabase abre
**SQL Editor** y ejecuta, en orden, el contenido de:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_security.sql`

**Opción B — Supabase CLI** (aplica las migraciones al proyecto cloud, sin Docker):

```bash
npx supabase init        # si no existe supabase/config.toml (conserva las migraciones)
npx supabase link --project-ref <TU_PROJECT_REF>
npm run db:push
```

## 5. Instalar y poblar datos de ejemplo

```bash
npm install
npm run seed
```

El seed crea usuarios, vehículos y paradas con coordenadas reales de Colombia
(unas pendientes → alerta, otras con novedad, otras entregadas).

### Usuarios de prueba (creados por el seed)

| Rol         | Correo                    | Contraseña   |
|-------------|---------------------------|--------------|
| Admin       | admin@tcc.com.co          | `Admin123!`  |
| Controlador | controlador@tcc.com.co    | `Control123!`|
| Conductor   | conductor@tcc.com.co      | `Conduce123!`|
| Conductor   | conductor2@tcc.com.co     | `Conduce123!`|

> Cambia estas contraseñas antes de cualquier uso real.

## 6. Correr la app

```bash
npm run dev
```

Abre http://localhost:3000. El middleware enruta por rol: **admin → `/admin`**,
**controlador → `/dashboard`**.

---

## Ingesta y detección (mocks del MVP)

Protegidos por la cabecera `x-ingest-secret` (= `INGEST_SECRET` de `.env.local`).

**Ingesta de paradas** (acepta `plate` o `vehicle_id`):

```bash
curl -X POST http://localhost:3000/api/ingest/stops \
  -H "content-type: application/json" \
  -H "x-ingest-secret: $INGEST_SECRET" \
  -d '{"stops":[{"plate":"WGK-412","lat":4.6512,"lng":-74.0932,"source":"phone"}]}'
```

**Ingesta de eventos** (entrega o novedad). `stop_id` sale de la base:

```bash
curl -X POST http://localhost:3000/api/ingest/events \
  -H "content-type: application/json" \
  -H "x-ingest-secret: $INGEST_SECRET" \
  -d '{"events":[{"stop_id":"<UUID>","kind":"delivery","note":"Entregado"}]}'
```

**Detección** (marca como alerta las paradas `pending` más viejas que
`DETECTION_THRESHOLD_MINUTES` sin entrega ni novedad):

```bash
curl -X POST http://localhost:3000/api/detection/run \
  -H "x-ingest-secret: $INGEST_SECRET"
```

## Promover un administrador

El primer admin lo crea el seed. Para promover a otro usuario, en el **SQL Editor**:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'persona@tcc.com.co');
```

## Verificar RLS (acceso denegado entre roles)

Con la `anon` key, una consulta sin sesión a tablas protegidas devuelve 0 filas
(deny por defecto). En el **SQL Editor** (rol `anon`):

```sql
set role anon;
select * from public.alerts;   -- 0 filas: denegado por RLS
reset role;
```

Un conductor solo ve su vehículo y sus paradas; `alerts` es exclusivo de
controlador/admin. Los INSERT de `stops`/`deliveries`/`incidents`/`alerts` solo
ocurren vía `service_role` (ingesta/detección) desde el servidor.

---

## Estructura

```
src/
  app/
    login/ dashboard/ parada/[id]/ admin/      # pantallas (en español)
    api/ingest/stops, api/ingest/events, api/detection/run
  components/                                   # header, KPIs, badges, mapa, acciones
  lib/
    supabase/{server,client,middleware,admin}.ts
    validation/*.ts   actions/*.ts   types.ts  format.ts
  middleware.ts
supabase/migrations/0001_schema.sql  0002_security.sql
scripts/seed.ts
```

El diseño sigue el prototipo aprobado (`../prototipo-tcc/`), con la marca TCC
(amarillo `#FFD100`, rojo `#D81E05`, negro `#141414`).
