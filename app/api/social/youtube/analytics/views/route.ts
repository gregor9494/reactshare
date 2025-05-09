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
 * GET /api/social/youtube/analytics/views
 * Gets view count data for a YouTube channel from the YouTube Analytics API
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
    // Get the YouTube account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .eq('status', 'active')
      .single();
    
    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not found' },
        { status: 404 }
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    let accessToken = account.access_token;

    if (isTokenExpired && account.refresh_token) {
      // Refresh the token
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

          return NextResponse.json(
            { error: 'Failed to refresh token', details: tokenData },
            { status: 401 }
          );
        }

        // Update the access token
        await serviceClient
          .from('social_accounts')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            status: 'active'
          })
          .eq('id', account.id);

        accessToken = tokenData.access_token;
      } catch (refreshError) {
        console.error('Error refreshing YouTube token:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh YouTube token' },
          { status: 500 }
        );
      }
    }

    // Use the YouTube Analytics API to get real view data
    const channelId = account.profile_data?.id;
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID not found in profile data' },
        { status: 404 }
      );
    }
    
    // Calculate dates for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    // Format dates as required by YouTube API (YYYY-MM-DD)
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Call the YouTube Analytics API
    const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    analyticsUrl.searchParams.append('dimensions', 'day');
    analyticsUrl.searchParams.append('metrics', 'views');
    analyticsUrl.searchParams.append('ids', `channel==${channelId}`);
    analyticsUrl.searchParams.append('startDate', startDateStr);
    analyticsUrl.searchParams.append('endDate', endDateStr);
    analyticsUrl.searchParams.append('sort', 'day');
    
    const analyticsResponse = await fetch(analyticsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });
    
    if (!analyticsResponse.ok) {
      const errorData = await analyticsResponse.json();
      console.error('YouTube Analytics API error:', errorData);
      
      // If mock data is requested or API fails, fallback to generated data
      const useGeneratedData = request.nextUrl.searchParams.get('fallback') === 'true' ||
                             !analyticsResponse.ok;
      
      if (useGeneratedData) {
        const viewCount = account.profile_data?.statistics?.viewCount || 10000;
        const viewsData = generateViewsData(parseInt(viewCount));
        
        return NextResponse.json({
          viewsData,
          lastUpdated: new Date().toISOString(),
          source: 'generated'
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch YouTube analytics', details: errorData },
        { status: analyticsResponse.status }
      );
    }
    
    const analyticsData = await analyticsResponse.json();
    
    // Transform the YouTube API response to the expected format for our frontend
    const viewsData = transformYouTubeAnalyticsData(analyticsData);
    
    return NextResponse.json({
      viewsData,
      lastUpdated: new Date().toISOString(),
      source: 'youtube'
    });
  } catch (error) {
    console.error('Error fetching YouTube views analytics:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching views analytics' },
      { status: 500 }
    );
  }
}

/**
 * Transforms YouTube Analytics API data to the format expected by our frontend
 */
function transformYouTubeAnalyticsData(analyticsData: any) {
  if (!analyticsData.rows || analyticsData.rows.length === 0) {
    return [];
  }
  
  const data: Array<{date: string, Views: number}> = [];
  const today = new Date();
  
  // Map the YouTube API data to our required format
  analyticsData.rows.forEach((row: any) => {
    const dateStr = row[0]; // Format: YYYY-MM-DD
    const views = row[1];
    
    // Parse the date
    const date = new Date(dateStr);
    
    // Format date as MM/DD
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    
    // Check if this is today
    const isToday = date.toDateString() === today.toDateString();
    
    data.push({
      date: isToday ? 'Today' : formattedDate,
      Views: views
    });
  });
  
  return data;
}

/**
 * Generates realistic view data for the past 30 days
 * Used as a fallback when the YouTube API is unavailable
 */
function generateViewsData(totalViewCount: number) {
  const data: Array<{date: string, Views: number}> = [];
  const today = new Date();
  
  // Calculate average daily views (roughly 1-3% of total views come from the last 30 days)
  const monthlyViewsPercent = 1 + (Math.random() * 2); // Between 1-3%
  const monthlyViews = Math.floor(totalViewCount * (monthlyViewsPercent / 100));
  const avgDailyViews = Math.floor(monthlyViews / 30);
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Add randomness to daily views
    const randomFactor = 0.7 + (Math.random() * 0.6); // Between 0.7 and 1.3
    const views = Math.floor(avgDailyViews * randomFactor);
    
    // Format date as MM/DD
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    
    data.push({
      date: i === 0 ? 'Today' : formattedDate,
      Views: views
    });
  }
  
  return data;
}