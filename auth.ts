import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google'; // Import Google provider
import { authConfig } from './auth.config';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client
import { z } from 'zod'; // Using Zod for input validation
import { getTikTokOAuthConfig } from './lib/tiktok-oauth-provider';

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
    // Add Google provider with YouTube API access
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl",
          prompt: "consent",
          access_type: "offline",
        }
      },
    }),
    // Custom YouTube provider with explicit endpoint configuration
    {
      id: "youtube",
      name: "YouTube",
      type: "oauth",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Explicitly define OAuth endpoints instead of using wellKnown
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        }
      },
      token: {
        url: "https://oauth2.googleapis.com/token",
      },
      userinfo: {
        url: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
    // Add TikTok OAuth provider
    getTikTokOAuthConfig(),
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

    // Handle OAuth flow and save tokens
    async signIn({ user, account, profile }) {
      // Log the authentication provider to help with debugging
      console.log(`[Auth] Processing sign-in with provider: ${account?.provider}`);
      console.log(`[Auth] Available scopes: ${account?.scope}`);
      
      // Handle Google or YouTube auth (explicit YouTube provider)
      if ((account?.provider === 'google' || account?.provider === 'youtube') && account.access_token) {
        try {
          // Determine if this is a YouTube authentication
          // For direct YouTube provider or Google with YouTube scopes
          const isYouTubeAuth = account.provider === 'youtube' ||
                               (account.provider === 'google' && (
                                 account.scope?.includes('youtube') ||
                                 account.scope?.includes('https://www.googleapis.com/auth/youtube.readonly') ||
                                 account.scope?.includes('https://www.googleapis.com/auth/youtube.force-ssl')
                               ));
          
          console.log(`[Auth] Is YouTube authentication: ${isYouTubeAuth}`);
          
          if (isYouTubeAuth && user?.id) {
            // Store YouTube OAuth tokens with service role for database access
            const serviceClient = createClient(
              supabaseUrl as string,
              process.env.SUPABASE_SERVICE_ROLE_KEY as string
            );
            
            // Get user's YouTube channel data
            const headers = {
              Authorization: `Bearer ${account.access_token}`
            };
            
            try {
              const youtubeResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
                headers
              });
              
              const youtubeData = await youtubeResponse.json();
              const channel = youtubeData.items?.[0];
              
              if (channel) {
                // Check if this social account already exists
                const { data: existingAccount } = await serviceClient
                  .from('social_accounts')
                  .select()
                  .eq('user_id', user.id)
                  .eq('provider', 'youtube')
                  .single();
                
                const profileData = {
                  id: channel.id,
                  title: channel.snippet?.title,
                  description: channel.snippet?.description,
                  thumbnails: channel.snippet?.thumbnails,
                  statistics: channel.statistics
                };
                
                const socialAccountData = {
                  user_id: user.id,
                  provider: 'youtube',
                  provider_account_id: channel.id,
                  provider_username: channel.snippet?.title,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token || null,
                  token_expires_at: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
                  profile_data: profileData,
                  scope: account.scope,
                  status: 'active',
                  last_sync_at: new Date().toISOString()
                };
                
                if (existingAccount) {
                  // Update existing account
                  await serviceClient
                    .from('social_accounts')
                    .update(socialAccountData)
                    .eq('id', existingAccount.id);
                } else {
                  // Insert new account
                  await serviceClient
                    .from('social_accounts')
                    .insert([socialAccountData]);
                }
              }
            } catch (error) {
              console.error('Error fetching YouTube data:', error);
              // Continue sign-in even if YouTube data fetch fails
            }
          }
        } catch (error) {
          console.error('Error in account linking:', error);
          // Continue sign-in even if account linking fails
        }
      }
      
      // Handle TikTok auth
      if (account?.provider === 'tiktok' && account.access_token && user?.id) {
        try {
          // Store TikTok OAuth tokens with service role for database access
          const serviceClient = createClient(
            supabaseUrl as string,
            process.env.SUPABASE_SERVICE_ROLE_KEY as string
          );
          
          // Get user's TikTok account data
          const headers = {
            Authorization: `Bearer ${account.access_token}`
          };
          
          try {
            // Fetch TikTok user info
            const tiktokResponse = await fetch('https://open-api.tiktok.com/user/info/', {
              headers
            });
            
            const tiktokData = await tiktokResponse.json();
            const userInfo = tiktokData.data?.user;
            
            if (userInfo) {
              // Check if this social account already exists
              const { data: existingAccount } = await serviceClient
                .from('social_accounts')
                .select()
                .eq('user_id', user.id)
                .eq('provider', 'tiktok')
                .single();
              
              const profileData = {
                id: userInfo.open_id,
                display_name: userInfo.display_name,
                avatar_url: userInfo.avatar_url,
                bio_description: userInfo.bio_description,
                follower_count: userInfo.follower_count,
                following_count: userInfo.following_count,
                video_count: userInfo.video_count,
              };
              
              const socialAccountData = {
                user_id: user.id,
                provider: 'tiktok',
                provider_account_id: userInfo.open_id,
                provider_username: userInfo.display_name,
                access_token: account.access_token,
                refresh_token: account.refresh_token || null,
                token_expires_at: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
                profile_data: profileData,
                scope: account.scope,
                status: 'active',
                last_sync_at: new Date().toISOString()
              };
              
              if (existingAccount) {
                // Update existing account
                await serviceClient
                  .from('social_accounts')
                  .update(socialAccountData)
                  .eq('id', existingAccount.id);
              } else {
                // Insert new account
                await serviceClient
                  .from('social_accounts')
                  .insert([socialAccountData]);
              }
            }
          } catch (error) {
            console.error('Error fetching TikTok data:', error);
            // Continue sign-in even if TikTok data fetch fails
          }
        } catch (error) {
          console.error('Error in TikTok account linking:', error);
          // Continue sign-in even if account linking fails
        }
      }
      
      // Always return true to allow sign-in
      return true;
    },

    // Add user ID from Supabase to the JWT token
    async jwt({ token, user, account }) {
      if (user) { // User object is available on initial sign in
        token.id = user.id;
      }
      
      // Add OAuth tokens to token if available
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      
      return token;
    },

    // Add user ID from token to the session object
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string; // Add id to session user
        // Add provider info to session if available
        if (token.provider) {
          (session.user as any).provider = token.provider;
        }
      }
      return session;
    },
  },
  // Ensure the AUTH_SECRET is configured in your environment variables (.env.local)
  // secret: process.env.AUTH_SECRET, // Already handled by NextAuth if AUTH_SECRET is set
});