/**
 * Seed del MVP Torre de Control TCC (Supabase Cloud).
 * Crea usuarios auth (admin, controlador, conductores), vehículos y paradas de
 * ejemplo con coordenadas reales de Colombia, más algunas entregas/novedades y
 * alertas para las paradas pendientes vencidas.
 *
 * Correr:  npm run seed   (carga .env.local)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local',
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Credenciales de prueba (documentadas en el README).
const USERS = [
  { email: 'admin@tcc.com.co', password: 'Admin123!', full_name: 'Juan Peña', role: 'admin' as const },
  { email: 'controlador@tcc.com.co', password: 'Control123!', full_name: 'Camila Rojas', role: 'controller' as const },
  { email: 'conductor@tcc.com.co', password: 'Conduce123!', full_name: 'Andrés Melo', role: 'driver' as const },
  { email: 'conductor2@tcc.com.co', password: 'Conduce123!', full_name: 'Laura Gómez', role: 'driver' as const },
];

async function ensureUser(u: (typeof USERS)[number]): Promise<string> {
  const created = await sb.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });

  let id = created.data.user?.id;
  if (!id) {
    // Ya existe: búscalo.
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    id = data.users.find((x) => x.email === u.email)?.id;
    if (!id) throw new Error(`No se pudo crear/encontrar ${u.email}`);
  }
  // Asegura rol y nombre en el perfil.
  await sb.from('profiles').update({ role: u.role, full_name: u.full_name }).eq('id', id);
  return id;
}

async function main() {
  console.log('→ Usuarios…');
  const ids: Record<string, string> = {};
  for (const u of USERS) ids[u.email] = await ensureUser(u);

  const andres = ids['conductor@tcc.com.co'];
  const laura = ids['conductor2@tcc.com.co'];

  // Limpia datos de demo previos (en orden por las FK; alerts/deliveries/incidents
  // caen por cascade al borrar stops, pero los borramos explícito por claridad).
  console.log('→ Limpiando datos de demo previos…');
  const anyFilter = (q: ReturnType<typeof sb.from>) =>
    q.delete().gte('created_at', '1970-01-01T00:00:00Z');
  await anyFilter(sb.from('alerts'));
  await anyFilter(sb.from('deliveries'));
  await anyFilter(sb.from('incidents'));
  await anyFilter(sb.from('stops'));

  console.log('→ Vehículos…');
  const vehicleDefs = [
    { plate: 'WGK-412', description: 'Furgón urbano', gps_device_id: 'GPS-001', driver_id: andres, active: true },
    { plate: 'HJD-337', description: 'Camión ligero', gps_device_id: 'GPS-002', driver_id: laura, active: true },
    { plate: 'STB-089', description: 'Van de reparto', gps_device_id: 'GPS-003', driver_id: null, active: true },
  ];
  const { data: vehicles, error: vErr } = await sb
    .from('vehicles')
    .upsert(vehicleDefs, { onConflict: 'plate' })
    .select('id, plate');
  if (vErr) throw vErr;
  const vId = (plate: string) => vehicles!.find((v) => v.plate === plate)!.id;

  const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

  console.log('→ Paradas…');
  // Coordenadas reales de Colombia.
  const stopDefs = [
    // Pendientes VENCIDAS (>45 min) → generarán alerta.
    { vehicle: 'WGK-412', lat: 4.6512, lng: -74.0932, source: 'phone', started_at: minsAgo(90), status: 'pending', kind: 'alerta' },
    { vehicle: 'STB-089', lat: 6.2442, lng: -75.5812, source: 'vehicle', started_at: minsAgo(72), status: 'pending', kind: 'alerta' },
    { vehicle: 'HJD-337', lat: 3.4516, lng: -76.532, source: 'phone', started_at: minsAgo(55), status: 'pending', kind: 'alerta' },
    // Pendiente RECIENTE (<45 min) → aún sin alerta.
    { vehicle: 'WGK-412', lat: 4.711, lng: -74.0721, source: 'vehicle', started_at: minsAgo(12), status: 'pending', kind: 'ok' },
    // Con NOVEDAD.
    { vehicle: 'HJD-337', lat: 10.9685, lng: -74.7813, source: 'phone', started_at: minsAgo(60), status: 'incident', kind: 'novedad' },
    // ENTREGADAS.
    { vehicle: 'STB-089', lat: 10.391, lng: -75.4794, source: 'phone', started_at: minsAgo(120), status: 'confirmed', kind: 'entrega' },
    { vehicle: 'WGK-412', lat: 7.1193, lng: -73.1227, source: 'vehicle', started_at: minsAgo(150), status: 'confirmed', kind: 'entrega' },
  ] as const;

  const { data: stops, error: sErr } = await sb
    .from('stops')
    .insert(
      stopDefs.map((s) => ({
        vehicle_id: vId(s.vehicle),
        lat: s.lat,
        lng: s.lng,
        source: s.source,
        started_at: s.started_at,
        status: s.status,
        ended_at: s.status === 'pending' ? null : s.started_at,
      })),
    )
    .select('id');
  if (sErr) throw sErr;

  // Asocia entregas/novedades y alertas por índice.
  const deliveries: { stop_id: string; driver_id: string | null; note: string }[] = [];
  const incidents: { stop_id: string; driver_id: string | null; type: string; note: string }[] = [];
  const alerts: { stop_id: string; status: string }[] = [];

  stopDefs.forEach((s, i) => {
    const stopId = stops![i].id;
    if (s.kind === 'entrega') {
      deliveries.push({ stop_id: stopId, driver_id: s.vehicle === 'WGK-412' ? andres : null, note: 'Entrega confirmada por el conductor' });
    } else if (s.kind === 'novedad') {
      incidents.push({ stop_id: stopId, driver_id: laura, type: 'client_absent', note: 'Cliente ausente en la dirección' });
    } else if (s.kind === 'alerta') {
      alerts.push({ stop_id: stopId, status: 'open' });
    }
  });

  console.log('→ Entregas, novedades y alertas…');
  if (deliveries.length) await sb.from('deliveries').insert(deliveries);
  if (incidents.length) await sb.from('incidents').insert(incidents);
  if (alerts.length) await sb.from('alerts').insert(alerts);

  console.log('\n✅ Seed completo.');
  console.log('   Usuarios de prueba:');
  for (const u of USERS) console.log(`   - ${u.role.padEnd(10)} ${u.email}  /  ${u.password}`);
}

main().catch((e) => {
  console.error('❌ Error en el seed:', e.message ?? e);
  process.exit(1);
});
