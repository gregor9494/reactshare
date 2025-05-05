import type { NextAuthConfig } from 'next-auth';

/**
 * Configuration options for NextAuth.js.
 * This object is used by the main `auth.ts` configuration
 * and potentially by middleware if edge compatibility is needed.
 *
 * Read more: https://nextjs.authjs.dev/getting-started/installation
 */
export const authConfig = {
  // Specify providers here if needed for edge compatibility,
  // otherwise, they can be defined solely in `auth.ts`.
  providers: [
    // We will add the CredentialsProvider in auth.ts
    // Add other providers like Google, GitHub etc. here if desired
  ],
  // Define pages for custom login, error, etc. if needed
  pages: {
    signIn: '/login', // Redirect users to /login if they are not authenticated
    // error: '/auth/error', // Optional: Error code passed in query string as ?error=
    // newUser: '/auth/new-user' // Optional: New users will be directed here first
  },
  // Callbacks are asynchronous functions you can use to control what happens
  // when an action is performed.
  // Read more: https://nextjs.authjs.dev/configuration/callbacks
  callbacks: {
    // Controls if a user is allowed to sign in.
    // signIn({ user, account, profile, email, credentials }) {
    //   return true // Return true to allow sign in, false to deny
    // },

    // Called after successful signin.
    // jwt({ token, user, account, profile, isNewUser }) {
    //   // Persist the OAuth access_token and user's ID to the token right after signin
    //   if (account) {
    //     token.accessToken = account.access_token
    //     token.id = user.id
    //   }
    //   return token
    // },

    // The session callback is called whenever a session is checked.
    // session({ session, token, user }) {
    //   // Send properties to the client, like an access_token and user id from a provider.
    //   session.accessToken = token.accessToken
    //   session.user.id = token.id
    //   return session
    // },

    // The authorized callback is used to verify if a request is authorized to access a page.
    // It's called before a request is completed. Middleware uses this.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnApiReactions = nextUrl.pathname.startsWith('/api/reactions');

      if (isOnDashboard || isOnApiReactions) {
        return isLoggedIn; // Redirect unauthenticated users to login page for these routes
      } else if (isLoggedIn) {
        // Optionally redirect logged-in users from auth pages like /login or /signup
        if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup')) {
          // Use Response.redirect instead of returning false/true for redirection
          // Need to construct the URL properly
          // return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      // Allow access by default for non-protected routes
      return true;
    },
  },
  // Using JWT strategy for session management
  session: { strategy: 'jwt' },
  // Add other configurations like secret, debug flags etc. here
  // secret: process.env.AUTH_SECRET, // Will be read from .env.local
} satisfies NextAuthConfig;