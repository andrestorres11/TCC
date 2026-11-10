'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  assignVehicleSchema,
  updateRoleSchema,
  upsertVehicleSchema,
} from '@/lib/validation/admin';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return { supabase, isAdmin: profile?.role === 'admin' };
}

// Cambiar el rol de un usuario (el trigger anti-escalada permite al admin).
export async function updateRole(input: unknown): Promise<ActionResult> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Solo administradores' };

  const { error } = await supabase
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id);
  if (error) return { ok: false, error: 'No se pudo cambiar el rol' };

  revalidatePath('/admin');
  return { ok: true };
}

// Crear o actualizar un vehículo.
export async function upsertVehicle(input: unknown): Promise<ActionResult> {
  const parsed = upsertVehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Solo administradores' };

  const payload = {
    plate: parsed.data.plate,
    description: parsed.data.description ?? null,
    gps_device_id: parsed.data.gps_device_id ?? null,
    active: parsed.data.active,
  };

  const { error } = parsed.data.id
    ? await supabase.from('vehicles').update(payload).eq('id', parsed.data.id)
    : await supabase.from('vehicles').insert(payload);
  if (error) return { ok: false, error: 'No se pudo guardar el vehículo' };

  revalidatePath('/admin');
  return { ok: true };
}

// Asignar (o desasignar) un conductor a un vehículo.
export async function assignVehicle(input: unknown): Promise<ActionResult> {
  const parsed = assignVehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Solo administradores' };

  const { error } = await supabase
    .from('vehicles')
    .update({ driver_id: parsed.data.driver_id })
    .eq('id', parsed.data.vehicle_id);
  if (error) return { ok: false, error: 'No se pudo asignar el conductor' };

  revalidatePath('/admin');
  return { ok: true };
}
