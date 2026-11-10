'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignVehicle, updateRole, upsertVehicle } from '@/lib/actions/admin';
import { ROLE_LABELS, type UserRole } from '@/lib/types';
import { iniciales } from '@/lib/format';

interface ProfileLite {
  id: string;
  full_name: string | null;
  role: UserRole;
}
interface VehicleLite {
  id: string;
  plate: string;
  active: boolean;
  driver_id: string | null;
}

type Tab = 'usuarios' | 'vehiculos' | 'asignaciones';

export function AdminClient({
  profiles,
  vehicles,
  drivers,
}: {
  profiles: ProfileLite[];
  vehicles: VehicleLite[];
  drivers: ProfileLite[];
}) {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [nuevaPlaca, setNuevaPlaca] = useState('');

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) window.alert(res.error ?? 'No se pudo completar la acción');
      else router.refresh();
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'vehiculos', label: 'Vehículos' },
    { id: 'asignaciones', label: 'Asignaciones' },
  ];

  return (
    <>
      {/* Pestañas */}
      <div className="flex border-b border-tcc-border bg-white">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-[3px] py-3.5 text-[13.5px] ${
              tab === t.id
                ? 'border-tcc-red font-bold text-tcc-ink'
                : 'border-transparent font-medium text-tcc-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-5">
        {tab === 'usuarios' && (
          <ul className="flex flex-col gap-3">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-tcc-border bg-white p-4"
              >
                <Avatar nombre={p.full_name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-tcc-text">
                    {p.full_name || 'Sin nombre'}
                  </div>
                  <div className="text-[12.5px] text-tcc-muted">
                    {ROLE_LABELS[p.role]}
                  </div>
                </div>
                <select
                  aria-label={`Rol de ${p.full_name ?? 'usuario'}`}
                  value={p.role}
                  disabled={pending}
                  onChange={(e) =>
                    run(() =>
                      updateRole({ user_id: p.id, role: e.target.value as UserRole }),
                    )
                  }
                  className="rounded-lg border border-tcc-border bg-white px-2 py-1.5 text-[12.5px] font-semibold text-tcc-text"
                >
                  <option value="admin">Admin</option>
                  <option value="controller">Controlador</option>
                  <option value="driver">Conductor</option>
                </select>
              </li>
            ))}
          </ul>
        )}

        {tab === 'vehiculos' && (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevaPlaca.trim()) return;
                run(async () => {
                  const r = await upsertVehicle({
                    plate: nuevaPlaca.trim().toUpperCase(),
                    active: true,
                  });
                  if (r.ok) setNuevaPlaca('');
                  return r;
                });
              }}
              className="flex gap-2.5"
            >
              <input
                value={nuevaPlaca}
                onChange={(e) => setNuevaPlaca(e.target.value)}
                placeholder="Nueva placa (p. ej. WGK-412)"
                aria-label="Nueva placa"
                className="h-12 flex-1 rounded-xl border border-tcc-border bg-white px-3.5 text-sm text-tcc-text outline-none focus:border-tcc-ink"
              />
              <button
                type="submit"
                disabled={pending}
                aria-label="Agregar vehículo"
                className="h-12 w-12 shrink-0 rounded-xl bg-tcc-red text-2xl leading-none text-white disabled:opacity-50"
              >
                +
              </button>
            </form>

            <ul className="flex flex-col gap-3">
              {vehicles.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-2xl border border-tcc-border bg-white p-4"
                >
                  <div>
                    <div className="text-[14.5px] font-bold text-tcc-text">
                      {v.plate}
                    </div>
                    <div className="text-[12.5px] text-tcc-muted">
                      {driverName(drivers, v.driver_id)}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      v.active
                        ? 'bg-tcc-green-bg text-tcc-green'
                        : 'bg-tcc-border/60 text-tcc-muted'
                    }`}
                  >
                    {v.active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'asignaciones' && (
          <ul className="flex flex-col gap-3">
            {vehicles.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border border-tcc-border bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14.5px] font-bold text-tcc-text">
                    {v.plate}
                  </span>
                  <select
                    aria-label={`Conductor de ${v.plate}`}
                    value={v.driver_id ?? ''}
                    disabled={pending}
                    onChange={(e) =>
                      run(() =>
                        assignVehicle({
                          vehicle_id: v.id,
                          driver_id: e.target.value || null,
                        }),
                      )
                    }
                    className="rounded-lg border border-tcc-border bg-white px-2 py-1.5 text-[12.5px] font-semibold text-tcc-text"
                  >
                    <option value="">Sin asignar</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name || 'Conductor'}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function driverName(drivers: ProfileLite[], id: string | null): string {
  if (!id) return 'Sin conductor asignado';
  return drivers.find((d) => d.id === id)?.full_name ?? 'Conductor';
}

function Avatar({ nombre }: { nombre: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tcc-yellow-bg text-sm font-bold text-tcc-ink">
      {iniciales(nombre)}
    </div>
  );
}
