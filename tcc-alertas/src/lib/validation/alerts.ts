import { z } from 'zod';

// Confirmar: la parada se da por entregada y la alerta se resuelve.
export const confirmAlertSchema = z.object({
  alert_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// Resolver: cierra la alerta (gestionada por el controlador).
export const resolveAlertSchema = z.object({
  alert_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// Asignar la alerta a un controlador.
export const assignAlertSchema = z.object({
  alert_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
});
