'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
    >
      Salir
    </button>
  );
}
