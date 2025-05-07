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
 * GET /api/social/tiktok/analytics?videoId=123
 * Retrieves analytics for a specific TikTok video
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
    // Extract videoId from query params
    const videoId = request.nextUrl.searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }

    // Get the user's TikTok account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Active TikTok account not found' },
        { status: 404 }
      );
    }
    
    // Get the share record to ensure it belongs to this user
    const { data: share, error: shareError } = await serviceClient
      .from('social_shares')
      .select('*')
      .eq('provider_post_id', videoId)
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share record not found' },
        { status: 404 }
      );
    }
    
    // Check if token needs refresh and defer to the client to handle that
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;
    
    if (isTokenExpired) {
      return NextResponse.json(
        { error: 'Token expired', need_refresh: true },
        { status: 401 }
      );
    }

    // Make request to TikTok API for video data
    const analyticsResponse = await fetch(
      'https://open-api.tiktok.com/video/data/', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_ids: [videoId],
          fields: [
            "video_view_count", 
            "like_count", 
            "comment_count", 
            "share_count", 
            "profile_visit_count", 
            "follower_count"
          ]
        })
      }
    );

    if (!analyticsResponse.ok) {
      const errorData = await analyticsResponse.json();
      return NextResponse.json(
        { error: 'Error fetching TikTok analytics', details: errorData },
        { status: analyticsResponse.status }
      );
    }

    const analyticsData = await analyticsResponse.json();

    if (!analyticsData.data || analyticsData.error) {
      return NextResponse.json(
        { error: 'Failed to retrieve analytics data', details: analyticsData.error },
        { status: 500 }
      );
    }

    // Extract metrics
    const videoData = analyticsData.data.videos ? analyticsData.data.videos[0] : null;
    
    if (!videoData) {
      return NextResponse.json(
        { error: 'No analytics data found for this video' },
        { status: 404 }
      );
    }

    // Format the analytics data
    const formattedData = {
      views: videoData.video_view_count || 0,
      likes: videoData.like_count || 0,
      comments: videoData.comment_count || 0,
      shares: videoData.share_count || 0,
      profile_views: videoData.profile_visit_count || 0,
      follower_growth: videoData.follower_count || 0
    };

    // Update the share record with the latest analytics
    await serviceClient
      .from('social_shares')
      .update({
        analytics: formattedData,
        last_analytics_sync: new Date().toISOString()
      })
      .eq('id', share.id);

    return NextResponse.json({
      analytics: formattedData,
      last_updated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching TikTok analytics:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/tiktok/analytics/account
 * Retrieves account-level analytics for TikTok
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
    // Parse request body for date range
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    // Get the user's TikTok account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Active TikTok account not found' },
        { status: 404 }
      );
    }
    
    // Check if token needs refresh and defer to the client to handle that
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;
    
    if (isTokenExpired) {
      return NextResponse.json(
        { error: 'Token expired', need_refresh: true },
        { status: 401 }
      );
    }

    // Make request to TikTok API for user stats
    const userStatsResponse = await fetch(
      'https://open-api.tiktok.com/user/stats/', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date_range: {
            start_date: startDate,
            end_date: endDate
          },
          fields: [
            "follower_count",
            "profile_view", 
            "video_view_count",
            "like_count"
          ]
        })
      }
    );

    if (!userStatsResponse.ok) {
      const errorData = await userStatsResponse.json();
      return NextResponse.json(
        { error: 'Error fetching TikTok user stats', details: errorData },
        { status: userStatsResponse.status }
      );
    }

    const userStatsData = await userStatsResponse.json();

    if (!userStatsData.data || userStatsData.error) {
      return NextResponse.json(
        { error: 'Failed to retrieve user stats', details: userStatsData.error },
        { status: 500 }
      );
    }

    // Format the account analytics data
    const accountStats = {
      follower_count: userStatsData.data.follower_count || 0,
      profile_views: userStatsData.data.profile_view || 0,
      total_video_views: userStatsData.data.video_view_count || 0,
      total_likes: userStatsData.data.like_count || 0,
      start_date: startDate,
      end_date: endDate
    };

    return NextResponse.json({
      account_stats: accountStats,
      last_updated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching TikTok account analytics:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}