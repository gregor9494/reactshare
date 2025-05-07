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
 * GET /api/social/youtube/videos
 * Get available videos for the authenticated user
 * This combines videos from:
 * 1. Videos the user has uploaded
 * 2. Reaction videos uploaded through our platform
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
      const refreshResult = await refreshYouTubeToken(account);
      
      if (!refreshResult.success) {
        return NextResponse.json(
          { error: refreshResult.error, details: refreshResult.details },
          { status: 401 }
        );
      }
      
      accessToken = refreshResult.accessToken;
    }

    // 1. Get videos uploaded by the user from YouTube API
    const uploadedVideosResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!uploadedVideosResponse.ok) {
      const error = await uploadedVideosResponse.json();
      console.error('Error fetching uploaded videos:', error);
      // Continue with other sources even if this one fails
    }

    // Parse the uploaded videos
    let uploadedVideos = [];
    try {
      const data = await uploadedVideosResponse.json();
      uploadedVideos = data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        source: 'youtube_uploads'
      }));
    } catch (error) {
      console.error('Error parsing uploaded videos:', error);
      // Continue with empty array if there's an error
    }

    // 2. Get reaction videos uploaded through our platform
    const { data: reactionVideos, error: reactionsError } = await serviceClient
      .from('social_shares')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'youtube')
      .eq('status', 'published');
      
    if (reactionsError) {
      console.error('Error fetching reaction videos:', reactionsError);
      // Continue with other sources even if this one fails
    }

    // Format reaction videos
    const formattedReactionVideos = (reactionVideos || []).map(video => ({
      id: video.platform_video_id,
      title: video.title || 'Reaction Video',
      thumbnailUrl: video.thumbnail_url,
      publishedAt: video.published_at,
      source: 'reactions'
    }));

    // Combine all videos and remove duplicates
    const allVideos = [...uploadedVideos, ...formattedReactionVideos];
    const uniqueVideos = allVideos.filter((video, index, self) => 
      index === self.findIndex(v => v.id === video.id)
    );

    // Sort by publish date (newest first)
    uniqueVideos.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json({ success: true, videos: uniqueVideos });
  } catch (error) {
    console.error('Error fetching available videos:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}