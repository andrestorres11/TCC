import type { StopStatus, AlertStatus } from '@/lib/types';

const STOP_STYLES: Record<StopStatus, { label: string; cls: string }> = {
  pending: { label: 'PENDIENTE', cls: 'bg-tcc-red-bg text-tcc-red-ink' },
  incident: { label: 'NOVEDAD', cls: 'bg-tcc-orange-bg text-tcc-orange-ink' },
  confirmed: { label: 'ENTREGADA', cls: 'bg-tcc-green-bg text-tcc-green' },
};

const ALERT_STYLES: Record<AlertStatus, { label: string; cls: string }> = {
  open: { label: 'ABIERTA', cls: 'bg-tcc-red-bg text-tcc-red-ink' },
  ack: { label: 'EN GESTIÓN', cls: 'bg-tcc-yellow-bg text-tcc-ink' },
  resolved: { label: 'RESUELTA', cls: 'bg-tcc-green-bg text-tcc-green' },
};

export function StopBadge({ status }: { status: StopStatus }) {
  const s = STOP_STYLES[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function AlertBadge({ status }: { status: AlertStatus }) {
  const s = ALERT_STYLES[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}
