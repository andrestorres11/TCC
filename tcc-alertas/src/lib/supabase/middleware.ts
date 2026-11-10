import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refresca la sesión, protege rutas y enruta por rol.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Las rutas de ingesta/detección se protegen por secreto en el handler.
  const isPublic =
    path === '/login' ||
    path.startsWith('/api/ingest') ||
    path.startsWith('/api/detection');

  // Copia las cookies de sesión a una respuesta de redirección.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !isPublic) {
    return redirectTo('/login');
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = profile?.role;

    // Ya autenticado: desde / o /login, enruta por rol.
    if (path === '/' || path === '/login') {
      return redirectTo(role === 'admin' ? '/admin' : '/dashboard');
    }

    // /admin solo para admin.
    if (path.startsWith('/admin') && role !== 'admin') {
      return redirectTo('/dashboard');
    }
  }

  return supabaseResponse;
}
