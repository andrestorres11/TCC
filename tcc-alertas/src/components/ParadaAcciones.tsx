'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignAlert, confirmAlert, resolveAlert } from '@/lib/actions/alerts';

export function ParadaAcciones({
  alertId,
  currentUserId,
}: {
  alertId: string;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        window.alert(res.error ?? 'No se pudo completar la acción');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => confirmAlert({ alert_id: alertId }))}
        className="h-[50px] rounded-xl bg-tcc-green text-[15px] font-semibold text-white disabled:opacity-50"
      >
        Marcar como entregada
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() => assignAlert({ alert_id: alertId, assigned_to: currentUserId }))
        }
        className="h-[50px] rounded-xl border border-tcc-border bg-white text-[15px] font-semibold text-tcc-text disabled:opacity-50"
      >
        Asignármela a mí
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveAlert({ alert_id: alertId }))}
        className="h-[50px] rounded-xl border border-tcc-border bg-white text-[15px] font-semibold text-tcc-red-ink disabled:opacity-50"
      >
        Resolver alerta
      </button>
    </div>
  );
}
