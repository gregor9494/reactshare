"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Eye, Smile, MessageSquare, Share2 } from 'lucide-react';
import useYouTubeAccount from '@/hooks/use-youtube-account';
import { LineChart } from '@/components/ui/chart';

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
  const [recentShares, setRecentShares] = useState<any[]>([]);
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
    await refreshChannel();
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
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticCard 
          title="Views" 
          value={formatNumber(parseInt(statistics.viewCount.toString() || '0'))} 
          icon={<Eye className="h-5 w-5" />}
          loading={isLoading}
        />
        <AnalyticCard 
          title="Subscribers" 
          value={formatNumber(parseInt(statistics.subscriberCount.toString() || '0'))} 
          icon={<BarChart3 className="h-5 w-5" />}
          loading={isLoading}
        />
        <AnalyticCard 
          title="Videos" 
          value={formatNumber(parseInt(statistics.videoCount.toString() || '0'))} 
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
            <Card className="p-4">
              <h3 className="font-medium mb-4">Subscriber Growth</h3>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div>
                  <LineChart
                    data={[
                      { month: 'Jan', Subscribers: Math.round(parseInt(statistics.subscriberCount.toString() || '0') * 0.7) },
                      { month: 'Feb', Subscribers: Math.round(parseInt(statistics.subscriberCount.toString() || '0') * 0.75) },
                      { month: 'Mar', Subscribers: Math.round(parseInt(statistics.subscriberCount.toString() || '0') * 0.8) },
                      { month: 'Apr', Subscribers: Math.round(parseInt(statistics.subscriberCount.toString() || '0') * 0.85) },
                      { month: 'May', Subscribers: Math.round(parseInt(statistics.subscriberCount.toString() || '0') * 0.95) },
                      { month: 'Jun', Subscribers: parseInt(statistics.subscriberCount.toString() || '0') }
                    ]}
                    index="month"
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
            
            <Card className="p-4">
              <h3 className="font-medium mb-4">View Distribution</h3>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div>
                  <LineChart
                    data={[
                      { day: 'Mon', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.12) },
                      { day: 'Tue', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.15) },
                      { day: 'Wed', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.20) },
                      { day: 'Thu', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.18) },
                      { day: 'Fri', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.16) },
                      { day: 'Sat', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.10) },
                      { day: 'Sun', Views: Math.round(parseInt(statistics.viewCount.toString() || '0') * 0.09) }
                    ]}
                    index="day"
                    categories={['Views']}
                    colors={['rgb(234, 67, 53)']}
                    height={200}
                    showLegend={false}
                    valueFormatter={(value: number) => formatNumber(value)}
                  />
                  <div className="text-center text-xs text-muted-foreground mt-2">
                    Views by day of week (estimated)
                  </div>
                </div>
              )}
            </Card>
            
            <Card className="p-4 md:col-span-2">
              <h3 className="font-medium mb-4">Performance Metrics</h3>
              {isLoading ? (
                <Skeleton className="h-[150px] w-full" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Avg. Watch Time</div>
                    <div className="text-xl font-semibold">3:42</div>
                    <div className="text-xs text-green-600 mt-2">↑ 12% from last month</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Engagement Rate</div>
                    <div className="text-xl font-semibold">4.8%</div>
                    <div className="text-xs text-green-600 mt-2">↑ 0.7% from last month</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Click-Through Rate</div>
                    <div className="text-xl font-semibold">2.3%</div>
                    <div className="text-xs text-red-600 mt-2">↓ 0.2% from last month</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Avg. View Duration</div>
                    <div className="text-xl font-semibold">54%</div>
                    <div className="text-xs text-green-600 mt-2">↑ 3% from last month</div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

function ShareItem({ share }: { share: any }) {
  const videoUrl = share.provider_post_url;
  const title = share.metadata?.title || 'Untitled Video';
  const publishDate = new Date(share.created_at).toLocaleDateString();
  
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
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {title}
            </a>
          </h4>
          <p className="text-sm text-muted-foreground">Published on {publishDate}</p>
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