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
 * GET /api/social/youtube/playlists/[id]/videos
 * Get all videos in a specific playlist
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

    // Get playlist items from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
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
        { error: 'Failed to fetch playlist videos from YouTube', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const videos = data.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      playlistItemId: item.id, // Needed for deletion
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: 
        item.snippet.thumbnails?.medium?.url || 
        item.snippet.thumbnails?.default?.url,
      position: item.snippet.position,
      publishedAt: item.snippet.publishedAt
    }));

    return NextResponse.json({ success: true, videos });
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/youtube/playlists/[id]/videos
 * Add a video to a playlist
 * Requires: videoId
 */
export async function POST(
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
    // Parse request body
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
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
      const refreshResult = await refreshYouTubeToken(account);
      
      if (!refreshResult.success) {
        return NextResponse.json(
          { error: refreshResult.error, details: refreshResult.details },
          { status: 401 }
        );
      }
      
      accessToken = refreshResult.accessToken;
    }

    // Add video to playlist via YouTube API
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId
            }
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to add video to playlist', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Record this operation in our database if needed
    await serviceClient
      .from('youtube_playlist_items')
      .insert([
        {
          user_id: session.user.id,
          youtube_account_id: account.id,
          playlist_id: playlistId,
          video_id: videoId,
          playlist_item_id: data.id,
          metadata: data
        }
      ]);

    return NextResponse.json({ 
      success: true, 
      playlistItem: {
        id: data.snippet.resourceId.videoId,
        playlistItemId: data.id,
        title: data.snippet.title,
        thumbnailUrl: data.snippet.thumbnails?.medium?.url || data.snippet.thumbnails?.default?.url,
      }
    });
  } catch (error) {
    console.error('Error adding video to playlist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/youtube/playlists/[id]/videos?itemId=xyz
 * Remove a video from a playlist
 * Requires: itemId (the playlist item ID, not the video ID) as query parameter
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

  // Get the playlist item ID from query parameters
  const url = new URL(request.url);
  const itemId = url.searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: itemId' },
      { status: 400 }
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

    // Remove video from playlist via YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?id=${itemId}`,
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
        { error: 'Failed to remove video from playlist', details: error },
        { status: response.status }
      );
    }

    // Delete the record from our database if needed
    await serviceClient
      .from('youtube_playlist_items')
      .delete()
      .eq('user_id', session.user.id)
      .eq('playlist_item_id', itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing video from playlist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}