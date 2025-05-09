import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables in YouTube OAuth callback route.');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');
    const origin = url.origin;

    if (oauthError) {
      console.error(`[YouTube Callback] OAuth error: ${oauthError}`);
      return NextResponse.redirect(`${origin}/dashboard/social?error=${encodeURIComponent(oauthError)}`);
    }
    if (!code) {
      console.error('[YouTube Callback] No code returned from OAuth');
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_code`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/social/youtube/oauth-callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[YouTube Callback] Token exchange failed', tokenData);
      return NextResponse.redirect(`${origin}/dashboard/social?error=token_exchange`);
    }
    const { access_token, refresh_token, expires_in, scope: granted_scopes } = tokenData;
    console.log('[YouTube Callback] Tokens obtained. Granted scopes:', granted_scopes);

    // First, fetch the user's email and info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const userInfo = await userInfoResponse.json();
    console.log('[YouTube Callback] User info (redacted):', {
      ...userInfo,
      email: userInfo.email ? `${userInfo.email.substring(0, 3)}...` : undefined
    });

    // Fetch YouTube channel data
    let ytData;
    let channelsResponse;
    let channels;

    // First, try with mine=true
    console.log('[YouTube Callback] Attempting to fetch channels with mine=true');
    channelsResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    ytData = await channelsResponse.json();

    if (!channelsResponse.ok) {
      console.error('[YouTube Callback] Fetch channel (mine=true) API call failed. Status:', channelsResponse.status, 'Response:', ytData);
      // Don't immediately redirect yet, allow fallback to managedByMe=true
    }
    console.log('[YouTube Callback] Raw response from channels.list (mine=true) API:', JSON.stringify(ytData, null, 2));
    channels = ytData.items; // Initialize channels with items from mine=true attempt

    // If mine=true returns no channels (or API call failed), try with managedByMe=true.
    // This is particularly useful for Brand Accounts.
    if (!channelsResponse.ok || !channels || channels.length === 0 || (ytData.pageInfo && ytData.pageInfo.totalResults === 0)) {
      if (ytData.pageInfo && ytData.pageInfo.totalResults === 0) {
        console.log('[YouTube Callback] mine=true returned 0 channels. Attempting with managedByMe=true.');
      } else if (!channelsResponse.ok) {
        console.log('[YouTube Callback] mine=true API call failed. Attempting with managedByMe=true as a fallback.');
      } else {
        console.log('[YouTube Callback] mine=true returned no channel items. Attempting with managedByMe=true.');
      }
      
      channelsResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&managedByMe=true', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      ytData = await channelsResponse.json();

      if (!channelsResponse.ok) {
        console.error('[YouTube Callback] Fetch channel (managedByMe=true) API call also failed. Status:', channelsResponse.status, 'Response:', ytData);
        // Continue to check if this Google account has any YouTube channels at all
      }
      else {
        console.log('[YouTube Callback] Raw response from channels.list (managedByMe=true) API:', JSON.stringify(ytData, null, 2));
        channels = ytData.items; // Update channels with items from managedByMe=true attempt
      }
    }

    if (!channels || channels.length === 0) {
      console.error('[YouTube Callback] No channel items in API response after trying both mine=true and managedByMe=true.');
      
      // Redirect with a more specific error message about no channels found for this Google account
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_youtube_channels_found&email=${encodeURIComponent(userInfo.email || 'unknown')}`);
    }

    // Retrieve NextAuth session token from cookie
    const nextAuthToken = await getToken({ req, secret: process.env.AUTH_SECRET! });
    const userId = nextAuthToken?.id as string;
    if (!userId) {
      console.error('[YouTube Callback] No NextAuth session token');
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_session`);
    }

    let linkedAnyChannel = false;
    for (const channel of channels) {
      if (!channel.id) {
        console.warn('[YouTube Callback] Skipping channel due to missing ID', channel);
        continue;
      }
      try {
        const { error: dbError } = await supabase.from('social_accounts').insert([{
          user_id: userId,
          provider: 'youtube',
          provider_account_id: channel.id,
          provider_username: channel.snippet?.title,
          access_token, // These tokens are for the user, not specific to a channel
          refresh_token, // So they will be the same for all channels from this auth flow
          token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
          profile_data: {
            id: channel.id,
            title: channel.snippet?.title,
            description: channel.snippet?.description,
            thumbnails: channel.snippet?.thumbnails,
            statistics: channel.statistics, // Assuming statistics are part of the channel object
          },
          scope: tokenData.scope,
          status: 'active',
          last_sync_at: new Date().toISOString(),
        }]);

        if (dbError) {
          // Check for unique constraint violation (user_id, provider, provider_account_id)
          // Supabase error code for unique violation is '23505'
          if (dbError.code === '23505') {
            console.warn(`[YouTube Callback] Channel ${channel.id} already exists for user ${userId}. Skipping.`);
            // Potentially update existing record if needed, e.g., refresh tokens
            // For now, just skip to allow adding other new channels.
            linkedAnyChannel = true; // Consider it "linked" if it already exists
          } else {
            console.error(`[YouTube Callback] DB insert failed for channel ${channel.id}:`, dbError);
            // Decide if you want to stop or continue with other channels
            // For now, we'll log and continue.
          }
        } else {
          console.log(`[YouTube Callback] Successfully linked channel ${channel.id} for user ${userId}`);
          linkedAnyChannel = true;
        }
      } catch (insertErr) {
        console.error(`[YouTube Callback] Exception during DB insert for channel ${channel.id}:`, insertErr);
      }
    }

    if (linkedAnyChannel) {
      return NextResponse.redirect(`${origin}/dashboard/social?linked=youtube`);
    } else {
      // This case means loop finished, but no new channels were actually linked (e.g., all were duplicates or other errors)
      // or the initial channels array was empty after filtering.
      console.error('[YouTube Callback] No new channels were linked after processing API response.');
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_new_channel_linked`);
    }
  } catch (err) {
    console.error('[YouTube Callback] Unexpected error', err);
    return NextResponse.redirect('/dashboard/social?error=unknown');
  }
}