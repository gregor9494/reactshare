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

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
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
        { error: 'No YouTube account connected' },
        { status: 400 }
      );
    }
    
    const accessToken = account.access_token;
    const channelId = account.profile_data?.id;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }
    
    // Check if fallback data was specifically requested
    const useFallback = request.nextUrl.searchParams.get('fallback') === 'true';
    
    if (useFallback) {
      // Return fallback data if requested
      return NextResponse.json({
        videoPerformance: generateFallbackVideoPerformance(),
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    }
    
    try {
      // Fetch top-performing videos from YouTube using the YouTube API
      const videoData = await fetchYouTubeTopVideos(accessToken, channelId);
      
      return NextResponse.json({
        videoPerformance: videoData,
        lastUpdated: new Date().toISOString(),
        source: 'real_api'
      });
    } catch (error) {
      console.error('Error fetching YouTube video performance:', error);
      
      // Fall back to generated data if the API call fails
      return NextResponse.json({
        videoPerformance: generateFallbackVideoPerformance(),
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch YouTube video performance',
        },
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in YouTube performance API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube video performance data' },
      { status: 500 }
    );
  }
}

/**
 * Fetch top performing videos from YouTube
 */
async function fetchYouTubeTopVideos(accessToken: string, channelId: string) {
  // First, get the list of recent videos from the channel
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=25&order=date&type=video`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!searchResponse.ok) {
    const errorData = await searchResponse.json();
    throw new Error(`YouTube API error: ${errorData.error?.message || searchResponse.statusText}`);
  }
  
  const searchData = await searchResponse.json();
  
  if (!searchData.items || !searchData.items.length) {
    return [];
  }
  
  // Extract video IDs
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
  
  // Get detailed statistics for each video
  const videoStatsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!videoStatsResponse.ok) {
    const errorData = await videoStatsResponse.json();
    throw new Error(`YouTube API error: ${errorData.error?.message || videoStatsResponse.statusText}`);
  }
  
  const videoStatsData = await videoStatsResponse.json();
  
  if (!videoStatsData.items || !videoStatsData.items.length) {
    return [];
  }
  
  // Transform and sort the video data by views (most viewed first)
  const transformedVideos = videoStatsData.items.map((video: any) => ({
    id: video.id,
    title: video.snippet.title,
    views: parseInt(video.statistics.viewCount || '0'),
    likes: parseInt(video.statistics.likeCount || '0'),
    comments: parseInt(video.statistics.commentCount || '0'),
    posted: formatPublishedDate(video.snippet.publishedAt),
    duration: formatDuration(video.contentDetails.duration),
    thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
    engagement: calculateEngagementRate(video.statistics)
  }));
  
  // Sort by views (most viewed first)
  const sortedVideos = transformedVideos.sort((a: any, b: any) => b.views - a.views);
  
  // Return the top 10 videos
  return sortedVideos.slice(0, 10);
}

/**
 * Calculate engagement rate for a video
 */
function calculateEngagementRate(statistics: any) {
  const views = parseInt(statistics.viewCount || '0');
  if (views === 0) return 0;
  
  const likes = parseInt(statistics.likeCount || '0');
  const comments = parseInt(statistics.commentCount || '0');
  const engagement = (likes + comments) / views * 100;
  
  return parseFloat(engagement.toFixed(2));
}

/**
 * Format ISO 8601 duration to readable format
 */
function formatDuration(isoDuration: string) {
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return '0:00';
  
  const hours = matches[1] ? parseInt(matches[1]) : 0;
  const minutes = matches[2] ? parseInt(matches[2]) : 0;
  const seconds = matches[3] ? parseInt(matches[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format published date to readable format
 */
function formatPublishedDate(dateString: string) {
  const date = new Date(dateString);
  
  // If it's less than 24 hours ago, show "X hours ago"
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // If it's less than 30 days ago, show "X days ago"
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // Otherwise show the date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generate fallback video performance data
 */
function generateFallbackVideoPerformance() {
  // Array of common YouTube video titles for mock data
  const videoTitles = [
    "Product review: The latest tech gadget",
    "How to optimize your workflow",
    "My daily routine for productivity",
    "Behind the scenes of our latest project",
    "Tutorial: Getting started with our platform",
    "Customer testimonial: Success story",
    "Live Q&A session recap",
    "Introducing our newest feature",
    "Tips and tricks for beginners",
    "Industry insights: What's coming next"
  ];
  
  // Generate random performance data for each video
  return videoTitles.map((title, index) => {
    const views = Math.floor(1000 + Math.random() * 49000);
    const likes = Math.floor(views * (0.05 + Math.random() * 0.15));
    const comments = Math.floor(likes * (0.1 + Math.random() * 0.2));
    const engagement = parseFloat(((likes + comments) / views * 100).toFixed(2));
    
    // Generate a published date between 1 and 60 days ago
    const daysAgo = Math.floor(1 + Math.random() * 59);
    const publishedDate = new Date();
    publishedDate.setDate(publishedDate.getDate() - daysAgo);
    
    return {
      id: `video-${index + 1}`,
      title,
      views,
      likes,
      comments,
      posted: formatPublishedDate(publishedDate.toISOString()),
      duration: `${Math.floor(2 + Math.random() * 8)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      engagement,
      thumbnail: `https://i.ytimg.com/vi/placeholder-${index + 1}/mqdefault.jpg`
    };
  });
}