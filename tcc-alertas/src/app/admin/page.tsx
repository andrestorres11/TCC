import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';
import { LogoutButton } from '@/components/LogoutButton';
import { AdminClient } from '@/components/AdminClient';
import type { UserRole } from '@/lib/types';

export default async function AdminPage() {
  const supabase = await createClient();

  const [profilesRes, vehiclesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name', { ascending: true }),
    supabase
      .from('vehicles')
      .select('id, plate, active, driver_id')
      .order('plate', { ascending: true }),
  ]);

  const profiles = (profilesRes.data ?? []) as {
    id: string;
    full_name: string | null;
    role: UserRole;
  }[];
  const vehicles = (vehiclesRes.data ?? []) as {
    id: string;
    plate: string;
    active: boolean;
    driver_id: string | null;
  }[];
  const drivers = profiles.filter((p) => p.role === 'driver');

  return (
    <div className="flex w-full flex-1 flex-col">
      <AppHeader
        eyebrow="Administración"
        title="Usuarios y vehículos"
        backHref="/dashboard"
        right={<LogoutButton />}
      />
      <AdminClient profiles={profiles} vehicles={vehicles} drivers={drivers} />
    </div>
  );
}
