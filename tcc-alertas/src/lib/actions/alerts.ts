'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  assignAlertSchema,
  confirmAlertSchema,
  resolveAlertSchema,
} from '@/lib/validation/alerts';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'Sesión no válida' as const };
  return { supabase, user, error: null };
}

// Confirmar: la parada se da por entregada y la alerta se resuelve.
export async function confirmAlert(input: unknown): Promise<ActionResult> {
  const parsed = confirmAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, user } = await requireStaff();
  if (!user) return { ok: false, error: 'Sesión no válida' };

  const { data: alert, error: readErr } = await supabase
    .from('alerts')
    .select('id, stop_id')
    .eq('id', parsed.data.alert_id)
    .single();
  if (readErr || !alert) return { ok: false, error: 'Alerta no encontrada' };

  const { error: stopErr } = await supabase
    .from('stops')
    .update({ status: 'confirmed', ended_at: new Date().toISOString() })
    .eq('id', alert.stop_id);
  if (stopErr) return { ok: false, error: 'No se pudo actualizar la parada' };

  const { error: alertErr } = await supabase
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      note: parsed.data.note ?? null,
    })
    .eq('id', alert.id);
  if (alertErr) return { ok: false, error: 'No se pudo resolver la alerta' };

  revalidatePath('/dashboard');
  revalidatePath(`/parada/${alert.stop_id}`);
  return { ok: true };
}

// Resolver: cierra la alerta sin cambiar el estado de la parada.
export async function resolveAlert(input: unknown): Promise<ActionResult> {
  const parsed = resolveAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, user } = await requireStaff();
  if (!user) return { ok: false, error: 'Sesión no válida' };

  const { data: alert, error } = await supabase
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      note: parsed.data.note ?? null,
    })
    .eq('id', parsed.data.alert_id)
    .select('stop_id')
    .single();
  if (error || !alert) return { ok: false, error: 'No se pudo resolver la alerta' };

  revalidatePath('/dashboard');
  revalidatePath(`/parada/${alert.stop_id}`);
  return { ok: true };
}

// Asignar la alerta al usuario indicado y marcarla como gestionada (ack).
export async function assignAlert(input: unknown): Promise<ActionResult> {
  const parsed = assignAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { supabase, user } = await requireStaff();
  if (!user) return { ok: false, error: 'Sesión no válida' };

  const { data: alert, error } = await supabase
    .from('alerts')
    .update({ assigned_to: parsed.data.assigned_to, status: 'ack' })
    .eq('id', parsed.data.alert_id)
    .select('stop_id')
    .single();
  if (error || !alert) return { ok: false, error: 'No se pudo asignar la alerta' };

  revalidatePath('/dashboard');
  revalidatePath(`/parada/${alert.stop_id}`);
  return { ok: true };
}
