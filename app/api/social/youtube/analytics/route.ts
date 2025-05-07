import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { YouTubeVideoAnalytics } from '@/lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/social/youtube/analytics?videoId=xxx or ?shareId=xxx
 * Gets analytics for a YouTube video
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
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const shareId = searchParams.get('shareId');
    
    // We need either a videoId or shareId
    if (!videoId && !shareId) {
      return NextResponse.json(
        { error: 'Missing videoId or shareId parameter' },
        { status: 400 }
      );
    }

    let providerPostId: string | null = videoId;
    
    // If shareId is provided, look up the video ID from the share
    if (shareId) {
      const { data: share, error: shareError } = await serviceClient
        .from('social_shares')
        .select('provider_post_id')
        .eq('id', shareId)
        .eq('user_id', session.user.id)
        .single();
      
      if (shareError || !share) {
        return NextResponse.json(
          { error: 'Social share not found or unauthorized' },
          { status: 404 }
        );
      }
      
      providerPostId = share.provider_post_id;
      
      if (!providerPostId) {
        return NextResponse.json(
          { error: 'This share does not have a valid provider post ID' },
          { status: 404 }
        );
      }
    }

    // Get the YouTube account
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

    // Check if the token is expired and refresh if needed
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    let accessToken = account.access_token;

    if (isTokenExpired && account.refresh_token) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await refreshResponse.json();

      if (tokenData.error) {
        await serviceClient
          .from('social_accounts')
          .update({ status: 'token_expired' })
          .eq('id', account.id);

        return NextResponse.json(
          { error: 'Failed to refresh token', details: tokenData },
          { status: 401 }
        );
      }

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

    // Fetch basic video statistics
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${providerPostId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const statsData = await statsResponse.json();
    
    if (!statsData.items || statsData.items.length === 0) {
      return NextResponse.json(
        { error: 'Video not found on YouTube' },
        { status: 404 }
      );
    }

    const videoStats = statsData.items[0].statistics;
    const contentDetails = statsData.items[0].contentDetails;

    // Fetch video analytics
    // Note: YouTube Analytics API requires specific permissions
    // This is a placeholder for the actual Analytics API call
    const analyticsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?dimensions=day&metrics=views,likes,dislikes,comments,shares,averageViewDuration,averageViewPercentage&sort=day&ids=channel==${account.provider_account_id}&startDate=2020-01-01&endDate=${new Date().toISOString().split('T')[0]}&filters=video==${providerPostId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    // Process analytics data
    let analyticsData: any = {};
    try {
      analyticsData = await analyticsResponse.json();
    } catch (e) {
      console.error('Error parsing YouTube analytics response:', e);
      analyticsData = { error: 'Failed to parse analytics data' };
    }

    // Construct our analytics object
    const analytics: YouTubeVideoAnalytics = {
      views: parseInt(videoStats.viewCount || '0'),
      likes: parseInt(videoStats.likeCount || '0'),
      dislikes: parseInt(videoStats.dislikeCount || '0'),
      comments: parseInt(videoStats.commentCount || '0'),
      favorites: parseInt(videoStats.favoriteCount || '0'),
      shares: 0, // Not provided in basic stats
      watchTime: {
        hours: 0,
        minutes: 0,
        seconds: 0
      },
      averageViewDuration: 0,
      averageViewPercentage: 0,
      demographics: {
        ageGroups: {},
        genders: {},
        countries: {}
      }
    };

    // If we have additional analytics data, add it
    if (analyticsData.rows && analyticsData.rows.length > 0) {
      // Process time-series data here
      // This is placeholder logic, as the actual response format will vary
      analytics.watchTime.hours = Math.floor(analyticsData.totals[0] / 3600);
      analytics.watchTime.minutes = Math.floor((analyticsData.totals[0] % 3600) / 60);
      analytics.watchTime.seconds = Math.floor(analyticsData.totals[0] % 60);
      analytics.averageViewDuration = analyticsData.averages[0];
      analytics.averageViewPercentage = analyticsData.averages[1];
    }

    // Update the analytics in the database if we have a shareId
    if (shareId) {
      await serviceClient
        .from('social_shares')
        .update({
          analytics: analytics,
          last_analytics_sync: new Date().toISOString()
        })
        .eq('id', shareId);
    }

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching YouTube analytics:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching analytics' },
      { status: 500 }
    );
  }
}