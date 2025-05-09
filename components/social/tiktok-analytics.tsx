"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TikTok } from '@/components/ui/icons/tiktok';
import { Share2, Eye, Smile, MessageSquare, RefreshCw, User } from 'lucide-react';
import { SocialShare } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TikTokAnalyticsProps {
  share: SocialShare;
}

interface TikTokAnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  profile_views: number;
  follower_growth: number;
  last_updated?: string;
}

export default function TikTokAnalytics({ share }: TikTokAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TikTokAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real_api' | 'fallback' | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/social/tiktok/analytics?videoId=${share.provider_post_id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle token expiration
        if (errorData.need_refresh) {
          // Attempt to refresh the token
          const refreshResponse = await fetch('/api/social/tiktok', {
            method: 'POST'
          });
          
          if (refreshResponse.ok) {
            // Try again after refreshing token
            const retryResponse = await fetch(`/api/social/tiktok/analytics?videoId=${share.provider_post_id}`);
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setAnalytics(data.analytics);
              setLoading(false);
              return;
            }
          }
          
          throw new Error('TikTok authentication expired. Please reconnect your account.');
        }
        
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data.analytics);
      
      // Determine if we're using real or fallback data
      setDataSource(data.analytics?.data_source || 'real_api');
      
      // If there's an error but we still got fallback data
      if (data.error) {
        setError(`${data.error.message}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching analytics');
      toast({
        title: "Analytics Error",
        description: err.message || 'Failed to load TikTok analytics',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (share.provider_post_id) {
      fetchAnalytics();
    }
  }, [share.provider_post_id]);

  // Chart data preparation
  const chartData = analytics ? [
    {
      name: 'Views',
      value: analytics.views
    },
    {
      name: 'Likes',
      value: analytics.likes
    },
    {
      name: 'Comments',
      value: analytics.comments
    },
    {
      name: 'Shares',
      value: analytics.shares
    },
    {
      name: 'Profile Views',
      value: analytics.profile_views
    }
  ] : [];

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TikTok className="h-5 w-5" /> 
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TikTok className="h-5 w-5" /> TikTok Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // No analytics data
  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TikTok className="h-5 w-5" /> TikTok Analytics
          </CardTitle>
          <CardDescription>
            No analytics data available for this post
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Analytics data may take some time to be available after posting.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Format last updated time
  const lastUpdated = analytics.last_updated 
    ? new Date(analytics.last_updated).toLocaleString() 
    : 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TikTok className="h-5 w-5" /> TikTok Analytics
          {dataSource === 'fallback' && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 py-0.5 px-2 rounded-full">
              Fallback Data
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Performance metrics for your TikTok post
          {dataSource && (
            <span className="block text-xs mt-1">
              {dataSource === 'real_api' ? 'Using real TikTok API data' : 'Using estimated data'}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" /> Views
            </div>
            <div className="text-2xl font-bold">{analytics.views.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Smile className="h-4 w-4" /> Likes
            </div>
            <div className="text-2xl font-bold">{analytics.likes.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" /> Comments
            </div>
            <div className="text-2xl font-bold">{analytics.comments.toLocaleString()}</div>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Share2 className="h-4 w-4" /> Shares
            </div>
            <div className="text-2xl font-bold">{analytics.shares.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" /> Profile Views
            </div>
            <div className="text-2xl font-bold">{analytics.profile_views.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" /> Follower Growth
            </div>
            <div className="text-2xl font-bold">{analytics.follower_growth.toLocaleString()}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[250px] mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#1f2937" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center">
          {dataSource === 'real_api' && (
            <span className="flex items-center mr-4">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Live data
            </span>
          )}
          {dataSource === 'fallback' && (
            <span className="flex items-center mr-4">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
              Fallback data
            </span>
          )}
          <span>Last updated: {lastUpdated}</span>
        </div>
        <Button onClick={fetchAnalytics} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-3 w-3" /> Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}