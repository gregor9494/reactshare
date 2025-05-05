import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Import the config with the authorized callback

// Initialize NextAuth with the configuration.
// The `auth` function returned here also acts as the middleware.
const { auth } = NextAuth(authConfig);

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

// Export the middleware function as the default export
export default auth;