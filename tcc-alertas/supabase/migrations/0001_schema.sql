-- =====================================================================
-- MVP Torre de Control TCC — Esquema base
-- Enums, tablas e índices. RLS se activa en 0002_security.sql.
-- =====================================================================

-- --------- Enums ---------
create type public.user_role     as enum ('admin', 'controller', 'driver');
create type public.stop_source   as enum ('phone', 'vehicle');
create type public.stop_status   as enum ('pending', 'confirmed', 'incident');
create type public.alert_status  as enum ('open', 'ack', 'resolved');
create type public.incident_type as enum ('client_absent', 'access_denied', 'address_error', 'other');

-- --------- profiles ---------
-- Perfil de cada usuario autenticado. role por defecto 'controller'.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null default 'controller',
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

-- --------- vehicles ---------
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  plate         text not null unique,
  gps_device_id text,
  description   text,
  driver_id     uuid references public.profiles (id) on delete set null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index vehicles_driver_id_idx on public.vehicles (driver_id);

-- --------- stops ---------
-- Una parada georreferenciada. Nace 'pending'.
create table public.stops (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  source     public.stop_source not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  status     public.stop_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index stops_vehicle_id_idx on public.stops (vehicle_id);
create index stops_status_idx     on public.stops (status);
create index stops_started_at_idx on public.stops (started_at);

-- --------- deliveries (proviene del sistema existente, mock) ---------
create table public.deliveries (
  id           uuid primary key default gen_random_uuid(),
  stop_id      uuid not null references public.stops (id) on delete cascade,
  driver_id    uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now()
);
create index deliveries_stop_id_idx on public.deliveries (stop_id);

-- --------- incidents (novedades del sistema existente, mock) ---------
create table public.incidents (
  id         uuid primary key default gen_random_uuid(),
  stop_id    uuid not null references public.stops (id) on delete cascade,
  driver_id  uuid references public.profiles (id) on delete set null,
  type       public.incident_type not null default 'other',
  note       text,
  created_at timestamptz not null default now()
);
create index incidents_stop_id_idx on public.incidents (stop_id);

-- --------- alerts ---------
create table public.alerts (
  id          uuid primary key default gen_random_uuid(),
  stop_id     uuid not null references public.stops (id) on delete cascade,
  status      public.alert_status not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  -- Una sola alerta viva por parada.
  unique (stop_id)
);
create index alerts_status_idx      on public.alerts (status);
create index alerts_assigned_to_idx on public.alerts (assigned_to);
