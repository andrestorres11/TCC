'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmAlert, resolveAlert } from '@/lib/actions/alerts';

export function AlertActions({
  alertId,
  primaryLabel = 'Confirmar',
}: {
  alertId: string;
  primaryLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: (input: unknown) => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn({ alert_id: alertId });
      if (!res.ok) {
        window.alert(res.error ?? 'No se pudo completar la acción');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(confirmAlert)}
        className="flex-1 rounded-lg bg-tcc-ink px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(resolveAlert)}
        className="flex-1 rounded-lg border border-tcc-border bg-white px-3 py-2.5 text-[13px] font-semibold text-tcc-text disabled:opacity-50"
      >
        Resolver
      </button>
    </div>
  );
}
