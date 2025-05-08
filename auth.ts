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
      console.log(`[Auth] OAuth user data:`, JSON.stringify({ id: user?.id, email: user?.email }));

      // For account linking, we need the ID of the user ALREADY LOGGED INTO YOUR APP.
      // The `user` object passed to signIn is from the OAuth provider and might be different.
      const currentAppSession = await auth(); // Get current application session
      const appUserId = currentAppSession?.user?.id;
      
      // Define account linking mode - a crucial distinction
      const isAccountLinking = Boolean(currentAppSession?.user?.id);
      console.log(`[Auth] Is this account linking? ${isAccountLinking}, App user ID: ${appUserId || 'none'}`);
      
      // If this is account linking, store it in a custom property
      if (isAccountLinking && account) {
        console.log(`[Auth] This is account linking for app user ${appUserId}`);
        // We'll use this information in the JWT callback
        (user as any).isAccountLinking = true;
        (user as any).originalAppUserId = appUserId;
      }
      
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
          
          if (isYouTubeAuth && appUserId) { // Use appUserId for linking
            console.log(`[Auth] Linking YouTube account to existing app user: ${appUserId}`);
            console.log(`[Auth] OAuth profile user ID from provider: ${user?.id}, email: ${profile?.email}`);

            // Store YouTube OAuth tokens with service role for database access
            const serviceClient = createClient(
              supabaseUrl as string,
              process.env.SUPABASE_SERVICE_ROLE_KEY as string
            );
            
            // The database trigger 'on_auth_user_created' handles new user creation in public.users
            // if the OAuth user (user.id) is signing up for the first time.
            // For account linking, appUserId should already exist in public.users.
            console.log(`[YouTube Auth] App user ${appUserId} should exist due to prior login/signup.`);
            console.log(`[YouTube Auth] If OAuth user ${user?.id} is new, DB trigger will handle their public.users entry.`);

            // Get user's YouTube channel data
            const headers = {
              Authorization: `Bearer ${account.access_token}`
            };
            
            try {
              console.log('[YouTube Auth] Fetching channel data with token');
              const youtubeResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
                headers
              });
              
              // Log full response for debugging
              const responseStatus = youtubeResponse.status;
              const youtubeData = await youtubeResponse.json();
              console.log(`[YouTube Auth] Channel API response status: ${responseStatus}`);
              
              if (!youtubeResponse.ok) {
                console.error('[YouTube Auth] Error fetching channel data:', youtubeData);
                throw new Error(`YouTube API error: ${youtubeData.error?.message || 'Unknown API error'}`);
              }
              
              console.log('[YouTube Auth] Channels data:', JSON.stringify(youtubeData));
              const channel = youtubeData.items?.[0];
              
              if (channel) {
                console.log(`[YouTube Auth] Found channel: ${channel.id} - ${channel.snippet?.title}`);
                // Check if this social account already exists
                console.log(`[YouTube Auth] Checking for existing account with user_id: ${appUserId}, provider: youtube`);
                const { data: existingAccount, error: existingError } = await serviceClient
                  .from('social_accounts')
                  .select()
                  .eq('user_id', appUserId) // Use appUserId
                  .eq('provider', 'youtube')
                  .single();
                
                if (existingError && existingError.code !== 'PGRST116') {
                  console.error('[YouTube Auth] Error checking for existing account:', existingError);
                } else {
                  console.log(`[YouTube Auth] Existing account found: ${existingAccount ? 'Yes' : 'No'}`);
                }
                
                const profileData = {
                  id: channel.id,
                  title: channel.snippet?.title,
                  description: channel.snippet?.description,
                  thumbnails: channel.snippet?.thumbnails,
                  statistics: channel.statistics
                };
                
                const socialAccountData = {
                  user_id: appUserId, // Use appUserId
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
                
                console.log(`[YouTube Auth] Preparing to ${existingAccount ? 'update' : 'insert'} YouTube account`);
                
                if (existingAccount) {
                  // Update existing account
                  const { error: updateError } = await serviceClient
                    .from('social_accounts')
                    .update(socialAccountData)
                    .eq('id', existingAccount.id);
                  
                  if (updateError) {
                    console.error('[YouTube Auth] Error updating social account:', updateError);
                  } else {
                    console.log(`[YouTube Auth] Successfully updated YouTube account ${existingAccount.id}`);
                  }
                } else {
                  // Insert new account
                  const { data: insertData, error: insertError } = await serviceClient
                    .from('social_accounts')
                    .insert([socialAccountData])
                    .select();
                  
                  if (insertError) {
                    console.error('[YouTube Auth] Error inserting social account:', insertError);
                  } else {
                    console.log(`[YouTube Auth] Successfully inserted YouTube account ${insertData?.[0]?.id}`);
                  }
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
      // Ensure appUserId is available for linking TikTok account
      if (account?.provider === 'tiktok' && account.access_token && appUserId) {
        try {
          console.log(`[Auth] Linking TikTok account to existing app user: ${appUserId}`);
          console.log(`[Auth] OAuth profile user ID from TikTok provider: ${user?.id}, email: ${profile?.email}`);
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
                .eq('user_id', appUserId) // Use appUserId
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
                user_id: appUserId, // Use appUserId
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
      
      // For account linking operations, we still return true to allow the flow
      // But we've stored the currentAppSession.user.id for reference
      // The session integrity will be preserved in the jwt/session callbacks
      if (account && currentAppSession?.user?.id) {
        console.log(`[Auth] Account linking detected for user: ${currentAppSession.user.id}`);
        // Store the original user ID in a global var or context that the JWT callback can access
        // But we can't do that easily in this architecture
      }
      
      // Always return true to allow the sign-in process to continue
      return true;
    },

    // Add user ID from Supabase to the JWT token
    async jwt({ token, user, account, trigger }) {
      console.log(`[JWT] Processing token, trigger: ${trigger}`);
      
      // Check if this is a social account linking operation
      // The definitive way to detect account linking is through the custom property we set
      const isAccountLinking = (user as any)?.isAccountLinking === true;
      const originalAppUserId = (user as any)?.originalAppUserId;
      
      if (isAccountLinking && originalAppUserId) {
        // This is account linking - OVERRIDE the OAuth user.id with the original app user ID
        console.log(`[JWT] Account linking confirmed. Using original app user ID ${originalAppUserId} instead of OAuth user ID ${user.id}`);
        // Force the token to use the original app user ID
        token.id = originalAppUserId;
        
        // Store OAuth provider info but preserve the original token.id
        if (account?.provider) {
          // Type safe way to handle the custom property
          const linkedProviders = token.linkedProviders as string[] || [];
          if (!linkedProviders.includes(account.provider)) {
            linkedProviders.push(account.provider);
          }
          token.linkedProviders = linkedProviders;
          
          // Add a flag that this is a linked account (for UI purposes)
          token.hasLinkedAccounts = true;
        }
      } else if (user) {
        // Normal sign-in flow (not account linking)
        console.log(`[JWT] Regular sign-in. Setting token.id to user.id: ${user.id}`);
        token.id = user.id;
      }
      
      // Log the resulting token ID to confirm our logic worked
      console.log(`[JWT] Final token.id value: ${token.id}`);
      
      // Add OAuth tokens to token if available
      if (account) {
        console.log(`[JWT] Setting token data for provider: ${account.provider}`);
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expires_at = account.expires_at;
        
        // Special handling for YouTube provider
        if (account.provider === 'youtube' ||
            (account.provider === 'google' && account.scope?.includes('youtube'))) {
          console.log('[JWT] Setting YouTube-specific token data');
          token.youtubeAccessToken = account.access_token;
          token.youtubeRefreshToken = account.refresh_token;
          token.youtubeTokenExpires = account.expires_at;
        }
      }
      
      return token;
    },

    // Add user ID from token to the session object
    async session({ session, token }) {
      if (session.user && token.id) {
        console.log(`[Session] Setting session user ID to token ID: ${token.id}`);
        session.user.id = token.id as string; // Add id to session user
        
        // If token has linked accounts flag, add it to the session
        if (token.hasLinkedAccounts) {
          (session.user as any).hasLinkedAccounts = true;
        }
        
        // If token has linked providers, add them to the session
        if (token.linkedProviders) {
          (session.user as any).linkedProviders = token.linkedProviders;
        }
        
        // Add provider info to session if available
        if (token.provider) {
          (session.user as any).provider = token.provider;
        }
        
        // Add YouTube tokens to the session
        if (token.youtubeAccessToken) {
          console.log('[Session] Adding YouTube token data to session');
          (session.user as any).youtubeAccessToken = token.youtubeAccessToken;
          (session.user as any).youtubeRefreshToken = token.youtubeRefreshToken;
          (session.user as any).youtubeTokenExpires = token.youtubeTokenExpires;
          (session.user as any).hasYouTubeAccess = true;
        }
      }
      return session;
    },
  },
  // Ensure the AUTH_SECRET is configured in your environment variables (.env.local)
  // secret: process.env.AUTH_SECRET, // Already handled by NextAuth if AUTH_SECRET is set
});