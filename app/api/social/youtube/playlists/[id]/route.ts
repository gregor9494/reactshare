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
 * Helper function to refresh an expired YouTube token
 */
async function refreshYouTubeToken(account: any) {
  try {
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

      return { success: false, error: 'Failed to refresh token', details: tokenData };
    }

    // Update the access token in the database
    await serviceClient
      .from('social_accounts')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        status: 'active'
      })
      .eq('id', account.id);

    return { success: true, accessToken: tokenData.access_token };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { success: false, error: 'An unexpected error occurred refreshing the token' };
  }
}

/**
 * GET /api/social/youtube/playlists/[id]
 * Get a specific YouTube playlist
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const playlistId = params.id;
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
      const refreshResult = await refreshYouTubeToken(account);
      
      if (!refreshResult.success) {
        return NextResponse.json(
          { error: refreshResult.error, details: refreshResult.details },
          { status: 401 }
        );
      }
      
      accessToken = refreshResult.accessToken;
    }

    // Get playlist details from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&id=${playlistId}`,
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
        { error: 'Failed to fetch playlist from YouTube', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    const item = data.items[0];
    const playlist = {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      itemCount: item.contentDetails.itemCount,
      visibility: item.status.privacyStatus,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      createdAt: item.snippet.publishedAt
    };

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error('Error fetching YouTube playlist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/youtube/playlists/[id]
 * Delete a YouTube playlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const playlistId = params.id;
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
      const refreshResult = await refreshYouTubeToken(account);
      
      if (!refreshResult.success) {
        return NextResponse.json(
          { error: refreshResult.error, details: refreshResult.details },
          { status: 401 }
        );
      }
      
      accessToken = refreshResult.accessToken;
    }

    // Delete playlist on YouTube
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?id=${playlistId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // If the deletion is successful, YouTube returns 204 No Content
    if (response.status !== 204 && !response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { error: 'Failed to delete playlist on YouTube', details: error },
        { status: response.status }
      );
    }

    // Delete the playlist from our database if we have it stored
    await serviceClient
      .from('youtube_playlists')
      .delete()
      .eq('user_id', session.user.id)
      .eq('playlist_id', playlistId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting YouTube playlist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}