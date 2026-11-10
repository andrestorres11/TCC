import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkIngestSecret } from '@/lib/api-auth';
import { stopsPayloadSchema } from '@/lib/validation/ingest';

// POST /api/ingest/stops — recibe paradas del TMS/GPS (mock).
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

  const parsed = stopsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const supabase = createAdminClient();

  // Resuelve vehicle_id a partir de la placa cuando haga falta.
  const plates = parsed.data.stops
    .filter((s) => !s.vehicle_id && s.plate)
    .map((s) => s.plate!);
  const plateToId = new Map<string, string>();
  if (plates.length > 0) {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, plate')
      .in('plate', plates);
    vehicles?.forEach((v) => plateToId.set(v.plate, v.id));
  }

  const rows: {
    vehicle_id: string;
    lat: number;
    lng: number;
    source: 'phone' | 'vehicle';
    started_at?: string;
    ended_at?: string;
  }[] = [];
  const skipped: string[] = [];

  for (const s of parsed.data.stops) {
    const vehicleId = s.vehicle_id ?? (s.plate ? plateToId.get(s.plate) : undefined);
    if (!vehicleId) {
      skipped.push(s.plate ?? 'desconocido');
      continue;
    }
    rows.push({
      vehicle_id: vehicleId,
      lat: s.lat,
      lng: s.lng,
      source: s.source,
      started_at: s.started_at,
      ended_at: s.ended_at,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Ninguna parada pudo asociarse a un vehículo', skipped },
      { status: 422 },
    );
  }

  const { data, error } = await supabase.from('stops').insert(rows).select('id');
  if (error) {
    return NextResponse.json({ error: 'No se pudieron insertar las paradas' }, { status: 500 });
  }

  return NextResponse.json({ inserted: data.length, skipped }, { status: 201 });
}
