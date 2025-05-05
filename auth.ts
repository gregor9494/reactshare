import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google'; // Import Google provider
import { authConfig } from './auth.config';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client
import { z } from 'zod'; // Using Zod for input validation

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables. Please check your .env.local file.');
}

// Note: Using the anon key here is standard for client-side operations like login.
// For server-side operations requiring elevated privileges (like in API routes later),
// we might need to use the service_role key.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // Spread the base config (pages, session strategy, basic callbacks)
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g., domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input using Zod
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          console.log(`Attempting login for: ${email}`); // Logging for debug

          // --- Supabase Authentication Logic ---
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (error) {
              console.error('Supabase Sign In Error:', error.message);
              // Check for specific Supabase auth errors like 'Email not confirmed' or 'Invalid login credentials'
              // For any Supabase error during sign-in, we'll return null to trigger the standard CredentialsSignin error flow.
              // We will handle displaying a specific message on the frontend based on the error query param.
              return null; // Indicates failure due to Supabase error
            }

            if (data.user) {
              // Return the user object required by next-auth
              // Ensure the returned object has at least an `id` and `email`.
              console.log(`Successfully authenticated user via Supabase: ${data.user.email}`);
              // You could fetch additional profile data here if needed for the token/session
              return { id: data.user.id, email: data.user.email }; // Essential fields for next-auth
            }

            // Should not happen if there's no error and no user, but handle defensively
            console.log('Supabase sign-in returned no error but no user.');
            return null;

          } catch (e) {
            console.error('Unexpected error during Supabase sign-in:', e);
            return null; // Indicates failure due to unexpected error
          }
        }

        console.log('Invalid credentials format.');
        return null; // Validation failed
      },
    }),
    // Add Google provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Optional: Specify authorization options like scope if needed
      // authorization: { params: { scope: "openid email profile" } },
    }),
    // Add other providers like Facebook, etc. here if needed
  ],
  // Add adapter here if using one (e.g., Supabase adapter)
  // Using an adapter automatically links OAuth accounts to users in your DB.
  // Without it, you might need custom logic in callbacks (e.g., signIn)
  // to create/link users in your Supabase 'profiles' table upon successful OAuth login.
  // adapter: SupabaseAdapter({ ... }), // Requires additional setup and library
  // Add custom callbacks here if they weren't suitable for auth.config.ts
  callbacks: {
    ...authConfig.callbacks, // Include callbacks defined in auth.config.ts

    // Example: Add user ID from Supabase to the JWT token
    async jwt({ token, user }) {
      if (user) { // User object is available on initial sign in
        token.id = user.id;
      }
      return token;
    },

    // Example: Add user ID from token to the session object
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string; // Add id to session user
      }
      return session;
    },
  },
  // Ensure the AUTH_SECRET is configured in your environment variables (.env.local)
  // secret: process.env.AUTH_SECRET, // Already handled by NextAuth if AUTH_SECRET is set
});