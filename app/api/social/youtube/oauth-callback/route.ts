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
    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch YouTube channel data
    const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const ytData = await ytRes.json();
    if (!ytRes.ok) {
      console.error('[YouTube Callback] Fetch channel failed', ytData);
      return NextResponse.redirect(`${origin}/dashboard/social?error=fetch_channel`);
    }
    const channel = ytData.items?.[0];
    if (!channel) {
      console.error('[YouTube Callback] No channel data', ytData);
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_channel`);
    }

    // Retrieve NextAuth session token from cookie
    const nextAuthToken = await getToken({ req, secret: process.env.AUTH_SECRET! });
    const userId = nextAuthToken?.id as string;
    if (!userId) {
      console.error('[YouTube Callback] No NextAuth session token');
      return NextResponse.redirect(`${origin}/dashboard/social?error=no_session`);
    }

    // Insert new YouTube account record
    const { error: dbError } = await supabase.from('social_accounts').insert([{
      user_id: userId,
      provider: 'youtube',
      provider_account_id: channel.id,
      provider_username: channel.snippet?.title,
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      profile_data: {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnails: channel.snippet?.thumbnails,
      },
      scope: tokenData.scope,
      status: 'active',
      last_sync_at: new Date().toISOString(),
    }]);
    if (dbError) {
      console.error('[YouTube Callback] DB insert failed', dbError);
      return NextResponse.redirect(`${origin}/dashboard/social?error=db_insert`);
    }

    return NextResponse.redirect(`${origin}/dashboard/social?linked=youtube`);
  } catch (err) {
    console.error('[YouTube Callback] Unexpected error', err);
    return NextResponse.redirect('/dashboard/social?error=unknown');
  }
}