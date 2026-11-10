import { z } from 'zod';

export const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'controller', 'driver']),
});

export const upsertVehicleSchema = z.object({
  id: z.string().uuid().optional(),
  plate: z.string().trim().min(3).max(20),
  description: z.string().max(200).optional(),
  gps_device_id: z.string().max(100).optional(),
  active: z.boolean().default(true),
});

export const assignVehicleSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullable(),
});
