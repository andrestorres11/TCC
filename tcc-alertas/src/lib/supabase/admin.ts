import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Cliente con service_role. SOLO servidor (ingesta y detección).
// La clave service_role omite RLS: nunca debe llegar al navegador.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor');
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
