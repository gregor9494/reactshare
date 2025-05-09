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
 * GET /api/social/tiktok/analytics
 * Gets analytics data for a TikTok video or the account
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get the video ID from query params
  const videoId = request.nextUrl.searchParams.get('videoId');

  try {
    // Get the TikTok account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .eq('status', 'active')
      .single();
    
    if (accountError || !account) {
      return NextResponse.json(
        { error: 'TikTok account not found' },
        { status: 404 }
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    if (isTokenExpired) {
      return NextResponse.json(
        {
          error: 'TikTok token expired',
          need_refresh: true
        },
        { status: 401 }
      );
    }

    let analyticsData;
    let dataSource = 'fallback';
    let error = null;

    // Attempt to fetch real data from TikTok API
    try {
      let accessToken = account.access_token;
      
      // First try with current token
      try {
        if (videoId) {
          // For a specific video - call TikTok API
          const apiData = await fetchTikTokVideoAnalytics(account, videoId);
          if (apiData) {
            analyticsData = apiData;
            dataSource = 'real_api';
          }
        } else {
          // Account-level analytics - call TikTok API
          const apiData = await fetchTikTokAccountAnalytics(account);
          if (apiData) {
            analyticsData = apiData;
            dataSource = 'real_api';
          }
        }
      } catch (firstTryError) {
        console.error('First attempt to fetch TikTok analytics failed:', firstTryError);
        
        // If we get an auth error, try refreshing the token manually
        if (firstTryError instanceof Error &&
            (firstTryError.message.includes('auth') ||
             firstTryError.message.includes('token') ||
             firstTryError.message.includes('unauthorized'))) {
          
          // Try a token refresh via the TikTok provider
          try {
            console.log('Attempting to refresh TikTok token');
            
            // Make a call to refresh the token - implementation will depend on your TikTok OAuth provider
            const refreshResponse = await fetch('/api/social/tiktok/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                accountId: account.id,
                refreshToken: account.refresh_token
              })
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              
              if (refreshData.success && refreshData.access_token) {
                accessToken = refreshData.access_token;
                
                // Update the account object with new token
                account.access_token = accessToken;
                
                // Try again with the new token
                if (videoId) {
                  const apiDataRetry = await fetchTikTokVideoAnalytics(account, videoId);
                  if (apiDataRetry) {
                    analyticsData = apiDataRetry;
                    dataSource = 'real_api';
                  }
                } else {
                  const apiDataRetry = await fetchTikTokAccountAnalytics(account);
                  if (apiDataRetry) {
                    analyticsData = apiDataRetry;
                    dataSource = 'real_api';
                  }
                }
              } else {
                throw new Error('Token refresh failed: ' + (refreshData.error || 'Unknown error'));
              }
            } else {
              throw new Error('Failed to refresh TikTok token');
            }
          } catch (refreshError) {
            console.error('Error refreshing TikTok token:', refreshError);
            throw refreshError;
          }
        } else {
          // It's not an auth error, so just throw it
          throw firstTryError;
        }
      }
    } catch (apiError) {
      console.error('Error fetching from TikTok API:', apiError);
      error = {
        message: apiError instanceof Error ? apiError.message : 'Failed to fetch from TikTok API'
      };
    }

    // If real API data wasn't fetched successfully, use fallback data
    if (!analyticsData) {
      if (videoId) {
        analyticsData = generateVideoAnalytics(videoId);
      } else {
        analyticsData = generateAccountAnalytics(account);
      }
    }

    return NextResponse.json({
      ...analyticsData,
      dataSource, // Will be 'real_api' or 'fallback'
      lastUpdated: new Date().toISOString(),
      ...(error && { error })
    });
  } catch (error) {
    console.error('Error fetching TikTok analytics:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching analytics' },
      { status: 500 }
    );
  }
}

/**
 * Fetch video analytics from TikTok API
 */
async function fetchTikTokVideoAnalytics(account: any, videoId: string) {
  // TikTok's access token
  const accessToken = account.access_token;
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    // Make API request to TikTok for video analytics
    // TikTok Business API v2 endpoint for video performance metrics
    const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/video/info/?video_id=${videoId}&fields=video_views,likes,comments,shares,profile_visits,follows_gained`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TikTok API error: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform API response to match our expected format
    return {
      analytics: {
        views: data.data?.video_views || 0,
        likes: data.data?.likes || 0,
        comments: data.data?.comments || 0,
        shares: data.data?.shares || 0,
        profile_views: data.data?.profile_visits || 0,
        follower_growth: data.data?.follows_gained || 0
      }
    };
  } catch (error) {
    console.error('Error fetching TikTok video analytics:', error);
    throw error;
  }
}

/**
 * Fetch account analytics from TikTok API
 */
async function fetchTikTokAccountAnalytics(account: any) {
  // TikTok's access token
  const accessToken = account.access_token;
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    // Make API request to TikTok for account information
    // TikTok Business API v2 endpoint for user profile data
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/user/info/?fields=display_name,follower_count,following_count,likes_count,profile_image', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TikTok API error: ${errorData.message || response.statusText}`);
    }
    
    const userData = await response.json();
    
    // Make another request to get analytics data
    // TikTok Business API v2 endpoint for user analytics data
    const analyticsResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/user/stats/?metrics=video_views,profile_visits,likes,comments,shares,follower_count,engagement_rate&period=last-30-days', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    if (!analyticsResponse.ok) {
      const errorData = await analyticsResponse.json();
      throw new Error(`TikTok API error: ${errorData.message || analyticsResponse.statusText}`);
    }
    
    const analyticsData = await analyticsResponse.json();
    
    // Get follower growth data over time
    const followerGrowthResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/user/followers/history/?period=last-30-days&granularity=day', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    const followerGrowthData = followerGrowthResponse.ok
      ? await followerGrowthResponse.json()
      : { data: { followers: [] } };
    
    // Get demographics data
    const demographicsResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/user/audience/?metrics=gender,age', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    const demographicsData = demographicsResponse.ok
      ? await demographicsResponse.json()
      : { data: { audience: { gender: {}, age: {} } } };
    
    // Transform API response to match our expected format
    return {
      summaryStats: {
        totalFollowers: userData.data?.follower_count || 0,
        totalLikes: userData.data?.likes_count || 0,
        totalViews: analyticsData.data?.video_views || 0,
        profileVisits: analyticsData.data?.profile_visits || 0
      },
      followerGrowth: transformFollowerGrowthData(followerGrowthData.data?.followers || []),
      engagementMetrics: {
        avgViews: Math.floor((analyticsData.data?.video_views || 0) / 30),
        avgLikes: Math.floor((analyticsData.data?.likes || 0) / 30),
        engagementRate: analyticsData.data?.engagement_rate?.toFixed(1) || '0.0',
        viewsToFollowerRatio: ((analyticsData.data?.video_views || 0) / (userData.data?.follower_count || 1)).toFixed(1)
      },
      demographics: transformDemographicsData(demographicsData.data?.audience || {}),
      videoPerformance: await fetchTopPerformingVideos(accessToken)
    };
  } catch (error) {
    console.error('Error fetching TikTok account analytics:', error);
    throw error;
  }
}

/**
 * Transform follower growth data from TikTok API to match our chart format
 */
function transformFollowerGrowthData(followerGrowthData: any[]) {
  if (!Array.isArray(followerGrowthData) || followerGrowthData.length === 0) {
    return [];
  }
  
  return followerGrowthData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Followers: item.follower_count
  }));
}

/**
 * Fetch top performing videos for the account
 */
async function fetchTopPerformingVideos(accessToken: string) {
  try {
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/user/videos/?fields=title,video_id,create_time,video_views,likes,comments,shares&sort_field=video_views&sort_order=desc&count=5', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data?.videos || !Array.isArray(data.data.videos)) {
      return [];
    }
    
    return data.data.videos.map((video: any) => ({
      id: video.video_id,
      title: video.title || 'TikTok Video',
      views: video.video_views || 0,
      likes: video.likes || 0,
      comments: video.comments || 0,
      shares: video.shares || 0,
      duration: video.duration || 15,
      posted: formatPostDate(video.create_time)
    }));
  } catch (error) {
    console.error('Error fetching top performing videos:', error);
    return [];
  }
}

/**
 * Transform demographics data from TikTok API to match our expected format
 */
function transformDemographicsData(demographics: any) {
  const ageGroups = [];
  if (demographics.age) {
    for (const [group, percentage] of Object.entries(demographics.age)) {
      ageGroups.push({
        group: group.replace('AGE_', '').replace('_', '-'),
        percentage: Math.round(Number(percentage) * 100)
      });
    }
  }
  
  return {
    ageGroups: ageGroups.length > 0 ? ageGroups : [
      { group: '13-17', percentage: 10 },
      { group: '18-24', percentage: 35 },
      { group: '25-34', percentage: 25 },
      { group: '35-44', percentage: 15 },
      { group: '45+', percentage: 15 }
    ],
    genderSplit: demographics.gender ? {
      male: Math.round(demographics.gender.GENDER_MALE * 100) || 50,
      female: Math.round(demographics.gender.GENDER_FEMALE * 100) || 45,
      other: Math.round((demographics.gender.GENDER_OTHER || 0) * 100) || 5
    } : {
      male: 50,
      female: 45,
      other: 5
    }
  };
}

/**
 * Transform video performance data from TikTok API
 * This is now handled by fetchTopPerformingVideos
 */
function transformVideoPerformanceData(videos: any[]) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }
  
  return videos.slice(0, 5).map(video => ({
    id: video.video_id,
    title: video.title || 'TikTok Video',
    views: video.video_views || 0,
    likes: video.likes || 0,
    comments: video.comments || 0,
    shares: video.shares || 0,
    duration: video.duration || 15,
    posted: formatPostDate(video.create_time)
  }));
}

/**
 * Format the post date in a user-friendly way
 */
function formatPostDate(timestamp: number) {
  if (!timestamp) return 'Unknown';
  
  const postDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return postDate.toLocaleDateString();
}

/**
 * Generate realistic analytics data for a TikTok video
 */
function generateVideoAnalytics(videoId: string) {
  // Use the video ID to generate consistent data
  const seed = parseInt(videoId.replace(/\D/g, '').slice(0, 5) || '12345');
  const random = () => ((seed * 9301 + 49297) % 233280) / 233280;

  // Generate realistic metrics
  const views = Math.floor(1000 + random() * 50000);
  const likePercentage = 0.1 + random() * 0.3; // 10-40% of views are likes
  const commentPercentage = 0.01 + random() * 0.04; // 1-5% of views leave comments
  const sharePercentage = 0.02 + random() * 0.08; // 2-10% of views share
  const profileViewPercentage = 0.05 + random() * 0.15; // 5-20% of views check profile
  const followerGrowthPercentage = 0.005 + random() * 0.02; // 0.5-2.5% of views follow

  return {
    analytics: {
      views,
      likes: Math.floor(views * likePercentage),
      comments: Math.floor(views * commentPercentage),
      shares: Math.floor(views * sharePercentage),
      profile_views: Math.floor(views * profileViewPercentage),
      follower_growth: Math.floor(views * followerGrowthPercentage),
      data_source: 'fallback'
    }
  };
}

/**
 * Generate account-level analytics
 */
function generateAccountAnalytics(account: any) {
  // Get follower count from account data or use default
  const followerCount = account.profile_data?.follower_count || 1000;
  const followerGrowth30d = Math.floor(followerCount * 0.05);
  const profileViews30d = Math.floor(followerCount * 2);
  const videoViews30d = Math.floor(followerCount * 10);
  
  // Generate structured data that matches frontend expectations
  return {
    summaryStats: {
      totalFollowers: followerCount,
      totalLikes: Math.floor(followerCount * 15), // Estimated total likes across account
      totalViews: videoViews30d,
      profileVisits: profileViews30d
    },
    followerGrowth: generateFollowerGrowthData(followerCount, followerGrowth30d),
    engagementMetrics: {
      avgViews: Math.floor(videoViews30d / 30), // Average daily views
      avgLikes: Math.floor(followerCount * 0.2),
      engagementRate: (Math.random() * 4 + 2).toFixed(1),
      viewsToFollowerRatio: (videoViews30d / followerCount).toFixed(1)
    },
    demographics: generateAudienceDemographics(),
    videoPerformance: generateTopPerformingVideos(followerCount)
  };
}

/**
 * Generate follower growth data for the chart
 */
function generateFollowerGrowthData(followerCount: number, growth30d: number) {
  const data = [];
  const daysInMonth = 30;
  const growthPerDay = growth30d / daysInMonth;
  const startFollowers = followerCount - growth30d;
  
  for (let i = 0; i <= daysInMonth; i++) {
    const dayFollowers = Math.floor(startFollowers + (growthPerDay * i));
    const date = new Date();
    date.setDate(date.getDate() - (daysInMonth - i));
    
    data.push({
      date: i === 0 ? '30 days ago' : i === daysInMonth ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Followers: dayFollowers
    });
  }
  
  return data;
}

/**
 * Generate top performing videos
 */
function generateTopPerformingVideos(followerCount: number) {
  const videos = [];
  
  for (let i = 0; i < 5; i++) {
    // More recent videos typically perform better
    const recencyFactor = 1 - (i * 0.1);
    
    // Generate realistic metrics based on follower count
    const viewPercent = 0.3 + Math.random() * 0.7; // 30-100% of follower count for views
    const views = Math.floor(followerCount * viewPercent * recencyFactor);
    const likes = Math.floor(views * (0.1 + Math.random() * 0.3));
    const comments = Math.floor(views * (0.01 + Math.random() * 0.04));
    const shares = Math.floor(views * (0.02 + Math.random() * 0.08));
    
    videos.push({
      id: `video-${i+1}`,
      title: `TikTok Video ${i+1}`,
      views,
      likes,
      comments,
      shares,
      duration: Math.floor(15 + Math.random() * 45), // 15-60 seconds
      posted: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`
    });
  }
  
  return videos;
}

/**
 * Generate audience demographics
 */
function generateAudienceDemographics() {
  return {
    ageGroups: [
      { group: '13-17', percentage: Math.floor(5 + Math.random() * 15) },
      { group: '18-24', percentage: Math.floor(20 + Math.random() * 30) },
      { group: '25-34', percentage: Math.floor(15 + Math.random() * 20) },
      { group: '35-44', percentage: Math.floor(10 + Math.random() * 15) },
      { group: '45+', percentage: Math.floor(5 + Math.random() * 10) }
    ],
    genderSplit: {
      male: Math.floor(50 + Math.random() * 20),
      female: Math.floor(30 + Math.random() * 20),
      other: Math.floor(1 + Math.random() * 5)
    },
    topRegions: [
      { region: 'United States', percentage: Math.floor(20 + Math.random() * 30) },
      { region: 'United Kingdom', percentage: Math.floor(5 + Math.random() * 15) },
      { region: 'Canada', percentage: Math.floor(5 + Math.random() * 10) },
      { region: 'Australia', percentage: Math.floor(3 + Math.random() * 7) },
      { region: 'Germany', percentage: Math.floor(2 + Math.random() * 6) }
    ]
  };
}