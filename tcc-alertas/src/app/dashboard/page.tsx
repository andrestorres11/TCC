import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';
import { LogoutButton } from '@/components/LogoutButton';
import { MapaParadas } from '@/components/MapaParadas';
import { AlertActions } from '@/components/AlertActions';
import { StopBadge } from '@/components/StatusBadge';
import { hace, sourceLabel, iniciales } from '@/lib/format';
import type { StopSource, StopStatus } from '@/lib/types';

type AlertRow = {
  id: string;
  status: string;
  created_at: string;
  stops: {
    id: string;
    status: StopStatus;
    source: StopSource;
    started_at: string;
    vehicles: { plate: string } | null;
  } | null;
};

type MapRow = {
  id: string;
  lat: number;
  lng: number;
  status: StopStatus;
  vehicles: { plate: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [alertasAbiertas, paradasPendientes, entregasHoy, alertasRes, mapaRes] =
    await Promise.all([
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'resolved'),
      supabase
        .from('stops')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .gte('confirmed_at', startOfToday.toISOString()),
      supabase
        .from('alerts')
        .select(
          'id, status, created_at, stops(id, status, source, started_at, vehicles(plate))',
        )
        .neq('status', 'resolved')
        .order('created_at', { ascending: true }),
      supabase
        .from('stops')
        .select('id, lat, lng, status, vehicles(plate)')
        .order('started_at', { ascending: false })
        .limit(80),
    ]);

  const alertas = (alertasRes.data ?? []) as unknown as AlertRow[];
  const mapa = (mapaRes.data ?? []) as unknown as MapRow[];

  const nombre = profile?.full_name?.split(' ')[0] ?? 'controlador';

  return (
    <div className="flex w-full flex-1 flex-col">
      <AppHeader
        eyebrow="Torre de Control"
        title={`Hola, ${nombre}`}
        right={
          <div className="flex items-center gap-3">
            <LogoutButton />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-tcc-yellow bg-tcc-ink-soft text-sm font-bold text-white">
              {iniciales(profile?.full_name)}
            </div>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-md px-5 pb-10 pt-5">
        {/* KPIs */}
        <section className="grid grid-cols-3 gap-2.5">
          <Kpi value={alertasAbiertas.count ?? 0} label="Alertas abiertas" color="text-tcc-red-ink" accent="border-t-tcc-red" />
          <Kpi value={paradasPendientes.count ?? 0} label="Paradas pendientes" color="text-tcc-orange-ink" accent="border-t-tcc-orange" />
          <Kpi value={entregasHoy.count ?? 0} label="Entregas de hoy" color="text-tcc-green" accent="border-t-tcc-green" />
        </section>

        {/* Mapa */}
        <section className="mt-5 h-45 overflow-hidden rounded-2xl border border-tcc-border">
          <MapaParadas
            stops={mapa.map((s) => ({
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              status: s.status,
              plate: s.vehicles?.plate,
            }))}
          />
        </section>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tcc-muted">
          <Leyenda color="#d81e05" texto="Pendiente" />
          <Leyenda color="#d9480f" texto="Novedad" />
          <Leyenda color="#15803d" texto="Entregada" />
        </div>

        {/* Alertas */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold text-tcc-text">Alertas abiertas</h2>
            <span className="text-[13px] text-tcc-muted">
              {alertas.length} sin resolver
            </span>
          </div>

          {alertas.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-tcc-border bg-white px-4 py-8 text-center text-sm text-tcc-muted">
              No hay alertas abiertas. Todo al día. 🎉
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {alertas.map((a) => {
                const stop = a.stops;
                const borde =
                  stop?.status === 'incident'
                    ? 'border-l-tcc-orange'
                    : 'border-l-tcc-red';
                return (
                  <li
                    key={a.id}
                    className={`rounded-2xl border border-tcc-border border-l-4 bg-white p-4 ${borde}`}
                  >
                    <Link
                      href={stop ? `/parada/${stop.id}` : '#'}
                      className="block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-bold text-tcc-text">
                          Placa {stop?.vehicles?.plate ?? '—'}
                        </span>
                        {stop && <StopBadge status={stop.status} />}
                      </div>
                      <p className="mt-1 text-[13px] text-tcc-muted">
                        {stop?.status === 'incident'
                          ? 'Novedad reportada'
                          : 'Parada sin confirmar'}{' '}
                        · {stop ? hace(stop.started_at) : ''} · Fuente:{' '}
                        {stop ? sourceLabel(stop.source) : ''}
                      </p>
                    </Link>
                    <AlertActions alertId={a.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Kpi({
  value,
  label,
  color,
  accent,
}: {
  value: number;
  label: string;
  color: string;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border border-tcc-border border-t-[3px] bg-white px-3 py-3.5 ${accent}`}>
      <div className={`text-[26px] font-extrabold tracking-tight ${color}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] leading-tight text-tcc-muted">
        {label}
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {texto}
    </span>
  );
}
