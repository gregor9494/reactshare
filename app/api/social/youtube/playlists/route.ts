import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/social/youtube/playlists
 * Retrieves all YouTube playlists for the authenticated user
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get the user's YouTube account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not found' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    // Refresh token if needed
    let accessToken = account.access_token;

    if (isTokenExpired && account.refresh_token) {
      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        // Update account status to token_expired
        await serviceClient
          .from('social_accounts')
          .update({ status: 'token_expired' })
          .eq('id', account.id);

        return NextResponse.json(
          { error: 'Failed to refresh token', details: tokenData },
          { status: 401 }
        );
      }

      // Update the access token
      accessToken = tokenData.access_token;
      await serviceClient
        .from('social_accounts')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: 'active'
        })
        .eq('id', account.id);
    }

    // Get playlists from YouTube API
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch playlists from YouTube', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    const playlists = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      itemCount: item.contentDetails.itemCount,
      visibility: item.status.privacyStatus,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      createdAt: item.snippet.publishedAt
    }));

    return NextResponse.json({ success: true, playlists });
  } catch (error) {
    console.error('Error fetching YouTube playlists:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/youtube/playlists
 * Creates a new playlist on YouTube
 * Requires: title, description (optional), privacy (public, unlisted, private)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const { title, description, privacy } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required fields (title)' },
        { status: 400 }
      );
    }

    // Get the user's YouTube account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not found' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    // Refresh token if needed
    let accessToken = account.access_token;

    if (isTokenExpired && account.refresh_token) {
      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        // Update account status to token_expired
        await serviceClient
          .from('social_accounts')
          .update({ status: 'token_expired' })
          .eq('id', account.id);

        return NextResponse.json(
          { error: 'Failed to refresh token', details: tokenData },
          { status: 401 }
        );
      }

      // Update the access token
      accessToken = tokenData.access_token;
      await serviceClient
        .from('social_accounts')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: 'active'
        })
        .eq('id', account.id);
    }

    // Create playlist on YouTube
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            title,
            description: description || '',
          },
          status: {
            privacyStatus: privacy || 'private'
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to create playlist on YouTube', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Store the playlist info in our database
    await serviceClient
      .from('youtube_playlists')
      .insert([
        {
          user_id: session.user.id,
          youtube_account_id: account.id,
          playlist_id: data.id,
          title,
          description: description || '',
          privacy: privacy || 'private',
          metadata: data
        }
      ]);

    return NextResponse.json({
      success: true,
      playlist: {
        id: data.id,
        title: data.snippet.title,
        description: data.snippet.description,
        thumbnailUrl: data.snippet.thumbnails?.medium?.url,
        visibility: data.status.privacyStatus,
        createdAt: data.snippet.publishedAt,
        itemCount: 0
      }
    });
  } catch (error) {
    console.error('Error creating YouTube playlist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}