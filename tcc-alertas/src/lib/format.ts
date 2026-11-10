import type { StopSource } from './types';

// "hace 48 min", "hace 1 h 12 min", "hace 2 d"
export function hace(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `hace ${h} h ${m} min` : `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function sourceLabel(s: StopSource): string {
  return s === 'phone' ? 'teléfono' : 'vehículo';
}

export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '··';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
