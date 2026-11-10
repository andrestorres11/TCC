'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TccMark } from '@/components/TccMark';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }
    // Redirige a la raíz; el middleware enruta por rol (admin → /admin).
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* Encabezado de marca */}
      <div className="border-b-[5px] border-tcc-yellow bg-tcc-ink px-7 pb-13 pt-16 text-white">
        <TccMark className="text-xl" />
        <h1 className="mb-2 mt-6 text-3xl font-bold tracking-tight">
          Torre de Control
        </h1>
        <p className="text-[15px] leading-relaxed text-white/70">
          Alertas de entregas y novedades en tiempo real.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 px-7 py-9">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-[13px] font-semibold text-tcc-text">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="controlador@tcc.com.co"
            className="h-13 rounded-xl border border-tcc-border bg-white px-4 text-[15px] text-tcc-text outline-none focus:border-tcc-ink"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="pass" className="text-[13px] font-semibold text-tcc-text">
            Contraseña
          </label>
          <input
            id="pass"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-13 rounded-xl border border-tcc-border bg-white px-4 text-[15px] text-tcc-text outline-none focus:border-tcc-ink"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-tcc-red-bg px-3 py-2 text-[13px] font-medium text-tcc-red-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex h-[54px] items-center justify-center rounded-xl bg-tcc-red text-base font-bold text-white disabled:opacity-60"
        >
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>

        <div className="mt-auto flex items-start gap-2.5 rounded-xl border border-tcc-yellow/50 bg-tcc-yellow-bg px-4 py-3.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#141414"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            role="img"
            aria-label="Información"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-[12.5px] leading-relaxed text-tcc-text/75">
            Acceso restringido a personal autorizado de la torre de control. Las
            acciones quedan registradas.
          </p>
        </div>
      </form>
    </main>
  );
}
