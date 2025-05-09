"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Eye, Smile, MessageSquare, Share2 } from 'lucide-react';
import useYouTubeAccount from '@/hooks/use-youtube-account'; // Reverted to default import
import { LineChart } from '@/components/ui/chart';
import { SocialShare } from '@/lib/types';

// Utility function to format numbers with commas
function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

interface YouTubeAnalyticsProps {
  className?: string;
  shareId?: string;
}

export function YouTubeAnalytics({ className, shareId }: YouTubeAnalyticsProps) {
  const { youtubeAccount, channelData, isLoading, error, refreshChannel } = useYouTubeAccount();
  const [recentShares, setRecentShares] = useState<SocialShare[]>([]); // Typed recentShares
  const [sharesLoading, setSharesLoading] = useState(true);
  const [sharesError, setSharesError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentShares() {
      try {
        const response = await fetch('/api/social/shares?provider=youtube&limit=5');
        if (!response.ok) {
          throw new Error('Failed to fetch recent shares');
        }
        const data = await response.json();
        setRecentShares(data.shares || []);
      } catch (err) {
        setSharesError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching recent YouTube shares:', err);
      } finally {
        setSharesLoading(false);
      }
    }
    
    if (youtubeAccount) {
      fetchRecentShares();
    } else {
      setSharesLoading(false);
    }
  }, [youtubeAccount]);

  const handleRefresh = async () => {
    try {
      // Show loading state
      setSharesLoading(true);
      
      // Refresh channel data
      await refreshChannel();
      
      // Also refresh shares data
      const response = await fetch('/api/social/shares?provider=youtube&limit=5', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentShares(data.shares || []);
        setSharesError(null);
      }
    } catch (err) {
      console.error("Error during refresh:", err);
      setSharesError(err instanceof Error ? err.message : 'An error occurred during refresh');
    } finally {
      setSharesLoading(false);
    }
  };

  if (!youtubeAccount) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">No YouTube Account Connected</h3>
          <p className="text-muted-foreground mb-4">
            Connect your YouTube account to see analytics and manage uploads.
          </p>
          <Button asChild>
            <a href="/dashboard/social">Connect YouTube Account</a>
          </Button>
        </div>
      </Card>
    );
  }

  const statistics = channelData?.statistics || {
    viewCount: 0,
    subscriberCount: 0,
    videoCount: 0
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">YouTube Analytics</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {error && (
        <div className={`${error.includes('fallback') ? 'bg-amber-100 text-amber-800' : 'bg-destructive/10 text-destructive'} p-3 rounded-md mb-4`}>
          {error}
          {error.includes('authentication') && (
            <div className="mt-2">
              <a href="/dashboard/social" className="underline">
                Reconnect your YouTube account
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* Removed incorrect channelData.dataSource check, as YouTubeChannel type does not have this property.
          The error prop from useYouTubeAccount already indicates issues with data fetching.
          A general "Connected" or "Sync status" could be shown if needed, but dataSource was specific to analytics responses. */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticCard
          title="Views"
          value={formatNumber(parseInt((statistics.viewCount || 0).toString()))}
          icon={<Eye className="h-5 w-5" />}
          loading={isLoading}
        />
        <AnalyticCard
          title="Subscribers"
          value={formatNumber(parseInt((statistics.subscriberCount || 0).toString()))}
          icon={<BarChart3 className="h-5 w-5" />}
          loading={isLoading}
        />
        <AnalyticCard
          title="Videos"
          value={formatNumber(parseInt((statistics.videoCount || 0).toString()))}
          icon={<BarChart3 className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>
      
      <Tabs defaultValue="shares">
        <TabsList className="mb-4">
          <TabsTrigger value="shares">Recent Uploads</TabsTrigger>
          <TabsTrigger value="growth">Channel Growth</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shares">
          {sharesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
            </div>
          ) : sharesError ? (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md">
              {sharesError}
            </div>
          ) : recentShares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No videos uploaded to YouTube yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recentShares.map((share) => (
                <ShareItem key={share.id} share={share} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="growth">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChannelGrowthChart isLoading={isLoading} />
            <ViewDistributionChart isLoading={isLoading} />
            <PerformanceMetricsCard isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Analytics card component
function AnalyticCard({ title, value, icon, loading }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <h3 className="text-2xl font-bold">{value}</h3>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

// SocialShare import moved to top of file

function ShareItem({ share }: { share: SocialShare }) {
  const videoUrl = share.provider_post_url;
  const title = share.metadata?.title || 'Untitled Video';
  const publishDate = new Date(share.created_at).toLocaleDateString();
  const dataSource = share.analytics?.data_source || 'real_api';
  
  const stats = {
    views: share.analytics?.views || 0,
    likes: share.analytics?.likes || 0,
    comments: share.analytics?.comments || 0,
    shares: share.analytics?.shares || 0
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <h4 className="font-medium">
            <a href={videoUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {title}
            </a>
            {dataSource === 'fallback' && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 py-0.5 px-2 rounded-full">
                Fallback Data
              </span>
            )}
          </h4>
          <p className="text-sm text-muted-foreground">
            Published on {publishDate}
            {dataSource && (
              <span className="ml-2 text-xs">
                {dataSource === 'real_api' ?
                  <span className="flex items-center inline-block">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Live data
                  </span> :
                  <span className="flex items-center inline-block">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                    Estimated data
                  </span>
                }
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(stats.views)}
          </div>
          <div className="flex items-center gap-1">
            <Smile className="h-4 w-4" />
            {formatNumber(stats.likes)}
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {formatNumber(stats.comments)}
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            {formatNumber(stats.shares)}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Channel Growth Chart with real data
function ChannelGrowthChart({ isLoading }: { isLoading: boolean }) {
  const { youtubeAccount } = useYouTubeAccount();
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchGrowthData() {
      if (!youtubeAccount) {
        setChartLoading(false);
        return;
      }
      
      try {
        setChartLoading(true);
        setError(null); // Reset error state
        const response = await fetch('/api/social/youtube/analytics/growth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error) {
            throw new Error(errorData.error);
          } else {
            throw new Error(`Failed to fetch growth data: ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        
        // Check if we got valid data
        if (data && Array.isArray(data.subscriberGrowth)) {
          setGrowthData(data.subscriberGrowth);
        } else {
          console.warn("Received invalid growth data format:", data);
          setGrowthData([]);
        }
      } catch (err) {
        console.error('Error fetching subscriber growth:', err);
        setError(err instanceof Error ? err.message : 'Failed to load growth data');
      } finally {
        setChartLoading(false);
      }
    }
    
    fetchGrowthData();
  }, [youtubeAccount]);
  
  const loading = isLoading || chartLoading;
  
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Subscriber Growth</h3>
      {loading ? (
        <Skeleton className="h-[200px] w-full" />
      ) : error ? (
        <div className="text-center text-muted-foreground py-12">
          Unable to load growth data. {error}
        </div>
      ) : (
        <div>
          <LineChart
            data={growthData.length > 0 ? growthData : [
              { date: '6 months ago', Subscribers: 0 },
              { date: 'Today', Subscribers: 0 }
            ]}
            index="date"
            categories={['Subscribers']}
            colors={['rgb(234, 67, 53)']}
            height={200}
            showLegend={false}
            valueFormatter={(value: number) => formatNumber(value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <div>6 months ago</div>
            <div>Today</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// View Distribution Chart with real data
function ViewDistributionChart({ isLoading }: { isLoading: boolean }) {
  const { youtubeAccount } = useYouTubeAccount();
  const [viewsData, setViewsData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchViewsData() {
      if (!youtubeAccount) {
        setChartLoading(false);
        return;
      }
      
      try {
        setChartLoading(true);
        setError(null); // Reset error state
        const response = await fetch('/api/social/youtube/analytics/views', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error) {
            throw new Error(errorData.error);
          } else {
            throw new Error(`Failed to fetch views data: ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        
        // Check if we got valid data
        if (data && Array.isArray(data.viewsData)) {
          setViewsData(data.viewsData);
        } else {
          console.warn("Received invalid views data format:", data);
          setViewsData([]);
        }
      } catch (err) {
        console.error('Error fetching views distribution:', err);
        setError(err instanceof Error ? err.message : 'Failed to load views data');
      } finally {
        setChartLoading(false);
      }
    }
    
    fetchViewsData();
  }, [youtubeAccount]);
  
  const loading = isLoading || chartLoading;
  
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">View Distribution</h3>
      {loading ? (
        <Skeleton className="h-[200px] w-full" />
      ) : error ? (
        <div className="text-center text-muted-foreground py-12">
          Unable to load views data. {error}
        </div>
      ) : (
        <div>
          <LineChart
            data={viewsData.length > 0 ? viewsData : [
              { date: '1/1', Views: 0 },
              { date: '1/8', Views: 0 },
              { date: '1/15', Views: 0 },
              { date: '1/22', Views: 0 },
              { date: '1/29', Views: 0 },
              { date: 'Today', Views: 0 }
            ]}
            index="date"
            categories={['Views']}
            colors={['rgb(234, 67, 53)']}
            height={200}
            showLegend={false}
            valueFormatter={(value: number) => formatNumber(value)}
          />
          <div className="text-center text-xs text-muted-foreground mt-2">
            Daily views (last 30 days)
          </div>
        </div>
      )}
    </Card>
  );
}

// Performance Metrics with real data
function PerformanceMetricsCard({ isLoading }: { isLoading: boolean }) {
  const { youtubeAccount } = useYouTubeAccount();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchPerformanceMetrics() {
      if (!youtubeAccount) {
        setMetricsLoading(false);
        return;
      }
      
      try {
        setMetricsLoading(true);
        setError(null); // Reset error state
        const response = await fetch('/api/social/youtube/analytics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error) {
            throw new Error(errorData.error);
          } else {
            throw new Error(`Failed to fetch performance metrics: ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        
        // Store the entire response object if it's valid
        if (data) {
          setMetrics(data);
          // Log success for debugging
          console.log("Successfully loaded YouTube metrics data, source:", data.source || "unknown");
        } else {
          throw new Error("Received empty response from analytics API");
        }
      } catch (err) {
        console.error('Error fetching performance metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setMetricsLoading(false);
      }
    }
    
    fetchPerformanceMetrics();
  }, [youtubeAccount]);
  
  const loading = isLoading || metricsLoading;
  
  // Extract metrics from response data
  const summaryStats = metrics?.summaryStats || {};
  const engagementMetrics = metrics?.engagementMetrics || {};
  
  return (
    <Card className="p-4 md:col-span-2">
      <h3 className="font-medium mb-4">Performance Metrics</h3>
      {loading ? (
        <Skeleton className="h-[150px] w-full" />
      ) : error ? (
        <div className="text-center text-muted-foreground py-6">
          Unable to load performance metrics. {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Avg. Watch Time</div>
            <div className="text-xl font-semibold">
              {engagementMetrics.avgWatchTime || "N/A"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Engagement Rate</div>
            <div className="text-xl font-semibold">
              {engagementMetrics.engagementRate || "N/A"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Click-Through Rate</div>
            <div className="text-xl font-semibold">
              {engagementMetrics.ctr || "N/A"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Avg. Views</div>
            <div className="text-xl font-semibold">
              {engagementMetrics.avgViews ? formatNumber(engagementMetrics.avgViews) : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Avg. Likes</div>
            <div className="text-xl font-semibold">
              {engagementMetrics.avgLikes ? formatNumber(engagementMetrics.avgLikes) : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Avg. Views Per Video</div>
            <div className="text-xl font-semibold">
              {summaryStats.avgViewsPerVideo ? formatNumber(summaryStats.avgViewsPerVideo) : "N/A"}
              {metrics?.dataSource === 'fallback' && (
                <div className="text-xs text-muted-foreground mt-1">Estimated</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}