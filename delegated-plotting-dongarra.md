# Plan — MVP "Alertas de entregas y novedades" (TCC)

## Contexto

La torre de control de **TCC** (logística) supervisa ~800 vehículos con un TMS+GPS, pero **no
detecta a tiempo qué paradas georreferenciadas quedaron sin confirmación de entrega ni novedad**;
hoy eso exige revisión manual. El MVP es la **capa de torre de control**: ingiere paradas y los
registros de entrega/novedad existentes, **detecta las paradas sin resolver y genera alertas**.

Decisiones confirmadas con el usuario:
- **Georreferenciación = doble fuente:** GPS del teléfono del conductor + GPS del vehículo. Cada
  parada guarda su `source` y se concilia por vehículo/tiempo.
- **El registro de entrega/novedad del conductor YA EXISTE** → el MVP **no** construye pantalla de
  conductor; **consume** esos datos (mock para el MVP de una tarde).
- Sigue vigente del primer mensaje: Next.js/TS/Tailwind, Supabase (BD + login), **RLS en todas las
  tablas**, **validación en servidor**, **rol admin**.

## Supuestos (ajustar si hace falta)

1. **Sin prototipo adjunto** → diseño yo la UI (en español, orientada a torre de control).
2. **Supabase local con CLI** (Docker), migraciones + seed versionados; cambiable a Cloud por env.
3. **Mocks** para TMS/GPS y para la app de conductor existente: seed + endpoints de ingesta.
4. **Auth** email + contraseña; WhatsApp fuera de alcance.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres + Auth; `@supabase/ssr` (clientes server/navegador + middleware)
- `zod` para validación en servidor de toda mutación/ingesta
- `react-leaflet` + OpenStreetMap (sin API key) para el mapa
- Supabase CLI: BD local, migraciones SQL, `seed.sql`

## Modelo de datos (todas las tablas con RLS activa, deny por defecto)

Enums: `user_role` (admin, controller, driver), `stop_source` (phone, vehicle),
`stop_status` (pending, confirmed, incident), `alert_status` (open, ack, resolved),
`incident_type` (client_absent, access_denied, address_error, other).

- `profiles` (id → auth.users, role, full_name, phone)
- `vehicles` (id, plate único, gps_device_id, description, driver_id → profiles, active)
- `stops` (id, vehicle_id, lat, lng, source `stop_source`, started_at, ended_at, status, created_at)
- `deliveries` (id, stop_id, driver_id, confirmed_at, note) — proviene del sistema existente (mock)
- `incidents` (id, stop_id, driver_id, type, note, created_at) — del sistema existente (mock)
- `alerts` (id, stop_id, status, assigned_to → profiles, note, created_at, resolved_at)

Flujo: una parada nace `pending`; si llega una entrega → `confirmed`; si llega una novedad →
`incident`. La **detección** marca como alerta las paradas `pending` más antiguas que N minutos
sin entrega ni novedad.

## Seguridad — RLS en TODAS las tablas

- Helpers `security definer`: `is_admin()`, `is_controller()` (leen `profiles.role`).
- `profiles`: SELECT propio o admin; UPDATE propio sin cambiar `role` (trigger anti-escalada); admin full.
- `vehicles`: controlador/admin SELECT todo; conductor solo el suyo; escritura solo admin.
- `stops` / `deliveries` / `incidents`: controlador/admin SELECT todo; INSERT solo vía ingesta
  (service_role en servidor); conductor SELECT lo de su vehículo.
- `alerts`: SELECT/UPDATE solo controlador/admin.

## Validación en servidor

- Mutaciones de UI (resolver/asignar alerta, admin) vía **Server Actions** con sesión del usuario
  (RLS aplica) + esquemas `zod`.
- Ingesta (`/api/ingest/*`) y detección (`/api/detection/run`) en **route handlers** que usan
  `service_role` **solo en servidor**, con zod. `service_role` nunca llega al navegador.

## Rol administrador

- `profiles.role = 'admin'`. Sección `/admin`: usuarios y roles, vehículos, asignación
  conductor↔vehículo. Primer admin por seed / script de promoción documentado.

## Páginas / UX (en español)

- `/login` (Supabase Auth) + `middleware` que protege rutas y enruta por rol.
- `/dashboard` (controlador): KPIs (alertas abiertas, paradas pendientes, entregas de hoy), mapa de
  paradas con color por estado y tabla de alertas con **confirmar/resolver**; filtros por vehículo/tiempo.
- `/parada/[id]` (controlador): detalle de la parada, su entrega/novedad asociada (si existe) y resolución.
- `/admin` (admin): usuarios, vehículos, asignaciones.
- *(No se construye pantalla de conductor: su registro ya existe y se consume por ingesta.)*

## Ingesta y detección (mocks del MVP)

- `POST /api/ingest/stops`: recibe paradas (con `source` phone|vehicle) — simula teléfono + GPS vehículo.
- `POST /api/ingest/events`: recibe entregas/novedades del sistema existente del conductor.
- `POST /api/detection/run`: escanea paradas `pending` antiguas sin entrega ni novedad → crea alertas.
- `supabase/seed.sql`: vehículos, conductores (como datos), controlador, admin y paradas de ejemplo
  con coordenadas reales de Colombia (unas confirmadas, otras con novedad, otras pendientes → alerta).

## Estructura

- `src/app/**`, `src/components/**`, `src/lib/supabase/{server,client,middleware}.ts`,
  `src/lib/validation/*.ts` (zod), `src/lib/actions/*.ts`
- `supabase/migrations/*.sql`, `supabase/seed.sql`
- `.env.example`, `README.md` (setup + cómo promover admin + cómo correr ingesta/detección)

## Verificación (end-to-end)

1. `supabase start` → migraciones → `seed`.
2. `npm run dev`.
3. Login como **controlador** y **admin** del seed.
4. `POST /api/ingest/stops` + `/api/ingest/events` con datos mock (phone y vehicle).
5. `POST /api/detection/run` → se generan alertas de las paradas sin resolver.
6. **Controlador:** ve alertas + mapa, abre `/parada/[id]`, confirma/resuelve.
7. **Admin:** gestiona usuarios/vehículos/asignaciones.
8. **Pruebas RLS:** acceso cruzado con otro rol/anon → denegado (script SQL de verificación).
