-- ================================================================
-- Setup completo para Supabase Cloud (pegar en el SQL Editor).
-- Equivale a migrations/0001_schema.sql + 0002_security.sql
-- ================================================================

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


-- =====================================================================
-- MVP Torre de Control TCC — Seguridad
-- Helpers security definer, triggers y RLS (deny por defecto) en TODAS
-- las tablas. Los INSERT de ingesta/detección entran solo con
-- service_role (que omite RLS desde el servidor).
-- =====================================================================

-- --------- Helpers de rol (security definer) ---------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_controller()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('controller', 'admin')
  );
$$;

-- --------- Crear perfil al registrarse ---------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'controller')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------- Anti-escalada de rol ---------
-- Un usuario normal no puede cambiar su propio role. Permite el cambio
-- cuando lo hace un admin o el contexto de servidor (service_role, sin uid).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'No autorizado para cambiar el rol';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.vehicles   enable row level security;
alter table public.stops      enable row level security;
alter table public.deliveries enable row level security;
alter table public.incidents  enable row level security;
alter table public.alerts     enable row level security;

-- --------- profiles ---------
-- El staff (controlador/admin) necesita ver los nombres de los conductores.
create policy "profiles_select_self_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_controller());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- --------- vehicles ---------
create policy "vehicles_select_staff_or_own" on public.vehicles
  for select using (
    public.is_controller() or public.is_admin() or driver_id = auth.uid()
  );

create policy "vehicles_admin_write" on public.vehicles
  for all using (public.is_admin()) with check (public.is_admin());

-- --------- stops ---------
create policy "stops_select_staff_or_own_vehicle" on public.stops
  for select using (
    public.is_controller() or public.is_admin()
    or vehicle_id in (select v.id from public.vehicles v where v.driver_id = auth.uid())
  );

-- Resolver/confirmar una parada desde la UI (sesión de controlador/admin).
create policy "stops_update_staff" on public.stops
  for update using (public.is_controller() or public.is_admin())
  with check (public.is_controller() or public.is_admin());

-- --------- deliveries ---------
create policy "deliveries_select_staff_or_own" on public.deliveries
  for select using (
    public.is_controller() or public.is_admin()
    or stop_id in (
      select s.id from public.stops s
      join public.vehicles v on v.id = s.vehicle_id
      where v.driver_id = auth.uid()
    )
  );

-- --------- incidents ---------
create policy "incidents_select_staff_or_own" on public.incidents
  for select using (
    public.is_controller() or public.is_admin()
    or stop_id in (
      select s.id from public.stops s
      join public.vehicles v on v.id = s.vehicle_id
      where v.driver_id = auth.uid()
    )
  );

-- --------- alerts ---------
create policy "alerts_select_staff" on public.alerts
  for select using (public.is_controller() or public.is_admin());

create policy "alerts_update_staff" on public.alerts
  for update using (public.is_controller() or public.is_admin())
  with check (public.is_controller() or public.is_admin());

-- NOTA: no hay políticas de INSERT para stops/deliveries/incidents/alerts
-- ni de DELETE en ninguna tabla → esas operaciones quedan denegadas para
-- usuarios normales y solo ocurren vía service_role (ingesta/detección),
-- que omite RLS desde el servidor.

-- --------- Endurecimiento ---------
-- Las funciones de trigger no deben ser invocables directamente por la API.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.prevent_role_escalation() from public;
