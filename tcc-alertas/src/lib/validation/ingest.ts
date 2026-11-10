import { z } from 'zod';

// --------- Ingesta de paradas (mock de TMS/GPS) ---------
export const stopItemSchema = z
  .object({
    vehicle_id: z.string().uuid().optional(),
    plate: z.string().trim().min(1).optional(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    source: z.enum(['phone', 'vehicle']),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional(),
  })
  .refine((d) => d.vehicle_id || d.plate, {
    message: 'Indica vehicle_id o plate',
  });

export const stopsPayloadSchema = z.object({
  stops: z.array(stopItemSchema).min(1).max(500),
});

export type StopItemInput = z.infer<typeof stopItemSchema>;

// --------- Ingesta de eventos del sistema del conductor ---------
export const eventItemSchema = z
  .object({
    stop_id: z.string().uuid(),
    kind: z.enum(['delivery', 'incident']),
    note: z.string().max(500).optional(),
    // Solo para novedades (incident):
    type: z
      .enum(['client_absent', 'access_denied', 'address_error', 'other'])
      .optional(),
    at: z.string().datetime().optional(),
  })
  .refine((d) => d.kind !== 'incident' || !!d.type, {
    message: 'Una novedad requiere type',
  });

export const eventsPayloadSchema = z.object({
  events: z.array(eventItemSchema).min(1).max(500),
});

export type EventItemInput = z.infer<typeof eventItemSchema>;
