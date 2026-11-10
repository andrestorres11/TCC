import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';
import { ParadaAcciones } from '@/components/ParadaAcciones';
import { hace, horaCorta, sourceLabel } from '@/lib/format';
import { INCIDENT_LABELS } from '@/lib/types';
import type { IncidentType, StopSource, StopStatus } from '@/lib/types';

const BANNER: Record<
  StopStatus,
  { titulo: string; cls: string; dot: string; sub: (s: string) => string }
> = {
  pending: {
    titulo: 'Pendiente — sin entrega ni novedad',
    cls: 'bg-tcc-red-bg border-tcc-red/30 text-tcc-red-ink',
    dot: '#d81e05',
    sub: (s) => `Parada iniciada ${s}`,
  },
  incident: {
    titulo: 'Novedad reportada',
    cls: 'bg-tcc-orange-bg border-tcc-orange/30 text-tcc-orange-ink',
    dot: '#d9480f',
    sub: (s) => `Parada iniciada ${s}`,
  },
  confirmed: {
    titulo: 'Entregada',
    cls: 'bg-tcc-green-bg border-tcc-green/30 text-tcc-green',
    dot: '#15803d',
    sub: (s) => `Parada iniciada ${s}`,
  },
};

export default async function ParadaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stop } = await supabase
    .from('stops')
    .select(
      'id, lat, lng, source, started_at, ended_at, status, vehicle_id, vehicles(plate, driver_id)',
    )
    .eq('id', id)
    .single();

  if (!stop) notFound();

  const vehicle = stop.vehicles as unknown as {
    plate: string;
    driver_id: string | null;
  } | null;

  const [driverRes, deliveryRes, incidentRes, alertRes] = await Promise.all([
    vehicle?.driver_id
      ? supabase.from('profiles').select('full_name').eq('id', vehicle.driver_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('deliveries')
      .select('confirmed_at, note')
      .eq('stop_id', id)
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('incidents')
      .select('type, note, created_at')
      .eq('stop_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('alerts')
      .select('id, status')
      .eq('stop_id', id)
      .maybeSingle(),
  ]);

  const driverName = (driverRes.data as { full_name: string | null } | null)?.full_name ?? '—';
  const delivery = deliveryRes.data as { confirmed_at: string; note: string | null } | null;
  const incident = incidentRes.data as
    | { type: IncidentType; note: string | null; created_at: string }
    | null;
  const alert = alertRes.data as { id: string; status: string } | null;

  const banner = BANNER[stop.status as StopStatus];
  const alertaAbierta = alert && alert.status !== 'resolved';

  return (
    <div className="flex w-full flex-1 flex-col">
      <AppHeader
        eyebrow={`Parada ${id.slice(0, 8)}`}
        title={`Placa ${vehicle?.plate ?? '—'}`}
        backHref="/dashboard"
      />

      <main className="mx-auto w-full max-w-md px-5 pb-10 pt-5">
        {/* Estado */}
        <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3.5 ${banner.cls}`}>
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: banner.dot }}
          />
          <div>
            <div className="text-sm font-bold">{banner.titulo}</div>
            <div className="mt-0.5 text-[12.5px] opacity-80">
              {banner.sub(hace(stop.started_at))}
            </div>
          </div>
        </div>

        {/* Datos */}
        <section className="mt-5 rounded-2xl border border-tcc-border bg-white px-4.5">
          <Dato label="Conductor" valor={driverName} />
          <Dato
            label="Coordenadas"
            valor={`${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`}
          />
          <Dato label="Fuente GPS" valor={`GPS — ${sourceLabel(stop.source as StopSource)}`} />
          <Dato label="Inicio de parada" valor={horaCorta(stop.started_at)} />
          <Dato
            label="Cierre de parada"
            valor={stop.ended_at ? horaCorta(stop.ended_at) : 'Sin cerrar'}
            last
          />
        </section>

        {/* Registro del conductor */}
        <h2 className="mb-2.5 mt-6 text-[15px] font-bold text-tcc-text">
          Registro del conductor
        </h2>
        {delivery ? (
          <RegistroCard
            titulo="Entrega confirmada"
            detalle={`${horaCorta(delivery.confirmed_at)}${delivery.note ? ` · ${delivery.note}` : ''}`}
            color="text-tcc-green"
          />
        ) : incident ? (
          <RegistroCard
            titulo={INCIDENT_LABELS[incident.type]}
            detalle={`${horaCorta(incident.created_at)}${incident.note ? ` · ${incident.note}` : ''}`}
            color="text-tcc-orange-ink"
          />
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-tcc-border bg-white p-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9A958A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[13px] leading-snug text-tcc-muted">
              No se recibió confirmación de entrega ni reporte de novedad desde la
              app del conductor.
            </p>
          </div>
        )}

        {/* Resolución */}
        {alertaAbierta && (
          <>
            <h2 className="mb-2.5 mt-6 text-[15px] font-bold text-tcc-text">
              Resolver alerta
            </h2>
            <ParadaAcciones alertId={alert!.id} currentUserId={user!.id} />
          </>
        )}
      </main>
    </div>
  );
}

function Dato({
  label,
  valor,
  last,
}: {
  label: string;
  valor: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-3.5 ${last ? '' : 'border-b border-tcc-border/60'}`}
    >
      <span className="text-[13.5px] text-tcc-muted">{label}</span>
      <span className="max-w-[200px] text-right text-[13.5px] font-semibold text-tcc-text">
        {valor}
      </span>
    </div>
  );
}

function RegistroCard({
  titulo,
  detalle,
  color,
}: {
  titulo: string;
  detalle: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-tcc-border bg-white p-4">
      <div className={`text-[14.5px] font-bold ${color}`}>{titulo}</div>
      <div className="mt-1 text-[13px] text-tcc-muted">{detalle}</div>
    </div>
  );
}
