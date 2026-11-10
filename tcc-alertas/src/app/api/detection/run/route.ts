import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkIngestSecret } from '@/lib/api-auth';

// POST /api/detection/run — escanea paradas 'pending' más antiguas que
// DETECTION_THRESHOLD_MINUTES sin entrega ni novedad y crea una alerta por cada una.
export async function POST(request: Request) {
  const authError = checkIngestSecret(request);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const thresholdMin = Number(process.env.DETECTION_THRESHOLD_MINUTES ?? 45);
  const cutoff = new Date(Date.now() - thresholdMin * 60_000).toISOString();

  const supabase = createAdminClient();

  // Paradas pendientes y vencidas. 'pending' ya implica que no hay entrega ni novedad.
  const { data: stops, error } = await supabase
    .from('stops')
    .select('id')
    .eq('status', 'pending')
    .lt('started_at', cutoff);

  if (error) {
    return NextResponse.json({ error: 'Error al escanear paradas' }, { status: 500 });
  }
  if (!stops || stops.length === 0) {
    return NextResponse.json({ scanned: 0, created: 0 }, { status: 200 });
  }

  // Inserta alertas; el índice único (stop_id) evita duplicados.
  const rows = stops.map((s) => ({ stop_id: s.id, status: 'open' as const }));
  const { data: created, error: insErr } = await supabase
    .from('alerts')
    .upsert(rows, { onConflict: 'stop_id', ignoreDuplicates: true })
    .select('id');

  if (insErr) {
    return NextResponse.json({ error: 'No se pudieron crear las alertas' }, { status: 500 });
  }

  return NextResponse.json(
    { scanned: stops.length, created: created?.length ?? 0 },
    { status: 200 },
  );
}
