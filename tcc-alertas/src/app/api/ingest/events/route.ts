import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkIngestSecret } from '@/lib/api-auth';
import { eventsPayloadSchema } from '@/lib/validation/ingest';

// POST /api/ingest/events — entregas/novedades del sistema del conductor (mock).
// Una entrega → parada 'confirmed'; una novedad → parada 'incident'.
// En ambos casos, cualquier alerta abierta de esa parada se resuelve.
export async function POST(request: Request) {
  const authError = checkIngestSecret(request);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = eventsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const supabase = createAdminClient();
  let deliveries = 0;
  let incidents = 0;

  for (const ev of parsed.data.events) {
    if (ev.kind === 'delivery') {
      await supabase.from('deliveries').insert({
        stop_id: ev.stop_id,
        confirmed_at: ev.at ?? new Date().toISOString(),
        note: ev.note ?? null,
      });
      await supabase
        .from('stops')
        .update({ status: 'confirmed', ended_at: ev.at ?? new Date().toISOString() })
        .eq('id', ev.stop_id);
      deliveries += 1;
    } else {
      await supabase.from('incidents').insert({
        stop_id: ev.stop_id,
        type: ev.type ?? 'other',
        note: ev.note ?? null,
        created_at: ev.at ?? new Date().toISOString(),
      });
      await supabase
        .from('stops')
        .update({ status: 'incident', ended_at: ev.at ?? new Date().toISOString() })
        .eq('id', ev.stop_id);
      incidents += 1;
    }

    // Resuelve la alerta abierta de esa parada, si existe.
    await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('stop_id', ev.stop_id)
      .neq('status', 'resolved');
  }

  return NextResponse.json({ deliveries, incidents }, { status: 201 });
}
