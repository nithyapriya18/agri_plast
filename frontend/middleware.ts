import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const googleUserId = request.cookies.get('agriplast_user_id')?.value;
  const allCookies = request.cookies.getAll().map((c) => c.name);
  console.log('[middleware] path=', pathname, 'agriplast_user_id=', googleUserId ?? 'MISSING', 'cookies=', allCookies.join(','));

  if (!supabaseUrl || !supabaseAnonKey) {
    const protectedPaths = ['/dashboard', '/projects', '/settings'];
    const isProtectedPath = protectedPaths.some((path) =>
      pathname.startsWith(path)
    );
    const hasSession = !!googleUserId;
    console.log('[middleware] no Supabase; isProtectedPath=', isProtectedPath, 'hasSession=', hasSession);
    if (isProtectedPath && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      console.log('[middleware] redirecting to login (no session)');
      return NextResponse.redirect(url);
    }
    if (pathname === '/login' || pathname === '/signup') {
      if (hasSession) {
        console.log('[middleware] auth path with session, redirecting to /dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      auth: {
        // Disable automatic token refresh in middleware to avoid fetch errors
        autoRefreshToken: false,
        // Disable storage persistence in Edge runtime
        persistSession: false,
        // Detect session from cookies only
        detectSessionInUrl: false,
      },
    }
  );

  // Get user with error handling
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
  } catch (error) {
    // Silently handle fetch errors in Edge runtime
    console.error('Auth error in middleware:', error);
  }

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/projects', '/settings'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  const googleUserIdSupabase = request.cookies.get('agriplast_user_id')?.value;
  const hasSession = !!user || !!googleUserIdSupabase;

  if (isProtectedPath && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.includes(request.nextUrl.pathname);

  if (isAuthPath && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
