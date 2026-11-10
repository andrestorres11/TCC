// Tipos del dominio — reflejan el esquema de la base de datos.

export type UserRole = 'admin' | 'controller' | 'driver';
export type StopSource = 'phone' | 'vehicle';
export type StopStatus = 'pending' | 'confirmed' | 'incident';
export type AlertStatus = 'open' | 'ack' | 'resolved';
export type IncidentType =
  | 'client_absent'
  | 'access_denied'
  | 'address_error'
  | 'other';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  gps_device_id: string | null;
  description: string | null;
  driver_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Stop {
  id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  source: StopSource;
  started_at: string;
  ended_at: string | null;
  status: StopStatus;
  created_at: string;
}

export interface Delivery {
  id: string;
  stop_id: string;
  driver_id: string | null;
  confirmed_at: string;
  note: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  stop_id: string;
  driver_id: string | null;
  type: IncidentType;
  note: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  stop_id: string;
  status: AlertStatus;
  assigned_to: string | null;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

// Etiquetas en español para la UI.
export const INCIDENT_LABELS: Record<IncidentType, string> = {
  client_absent: 'Cliente ausente',
  access_denied: 'Acceso denegado',
  address_error: 'Dirección errada',
  other: 'Otra novedad',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  controller: 'Controlador',
  driver: 'Conductor',
};
