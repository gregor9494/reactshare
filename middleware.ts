import { createSupabaseMiddlewareClient } from './lib/supabase-middleware';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createSupabaseMiddlewareClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return await auth(request as any);
  }

  return response;
}

// Define which routes should be protected by the middleware
// This is generally more efficient than checking paths inside the authorized callback
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes that shouldn't be protected by default (e.g., public api, auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     * - The root landing page ('/')
     * - Login and Signup pages
     */
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|login$|signup$|^/$).*)',

    // Explicitly include routes we want protected, overriding the negative lookahead if needed
    // (though the above pattern should cover dashboard and api/reactions)
    // '/dashboard/:path*',
    // '/api/reactions/:path*',
  ],
};