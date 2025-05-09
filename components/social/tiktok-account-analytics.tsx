"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Eye, Smile, MessageSquare, Share2, User } from 'lucide-react';
import TikTokIcon from '@/components/ui/icons/tiktok';
import { SocialAccount } from '@/lib/types';
import { LineChart } from '@/components/ui/chart';

// Utility function to format numbers with commas
function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// Define a more specific type for the analytics data
interface TikTokAnalyticsData {
  dataSource: 'real_api' | 'fallback';
  summaryStats: {
    totalFollowers?: number;
    totalLikes?: number;
    totalViews?: number;
    profileVisits?: number;
    [key: string]: any; // Allow other stats
  };
  engagementMetrics: {
    avgViews?: number;
    avgLikes?: number;
    engagementRate?: number | string; // Can be "N/A" or number
    viewsToFollowerRatio?: number | string;
    [key: string]: any;
  };
  demographics: {
    ageGroups: { group: string; percentage: number }[];
    genderSplit: { male?: number; female?: number; other?: number; [key: string]: any };
    [key: string]: any;
  };
  followerGrowth: { date: string; Followers: number }[];
  videoPerformance: {
    title: string;
    posted: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    duration: number;
    [key: string]: any;
  }[];
  lastUpdated: string;
  tokenRefreshed?: boolean; // Add tokenRefreshed here
  error?: string | { message?: string }; // To store potential error messages from API
  [key: string]: any; // Allow other dynamic properties
}

interface TikTokAccountAnalyticsProps {
  account: SocialAccount;
  isLoading?: boolean;
  className?: string;
}

export default function TikTokAccountAnalytics({
  account,
  isLoading = false,
  className
}: TikTokAccountAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<TikTokAnalyticsData | null>(null); // Use the new interface
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'real_api' | 'fallback' | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!account) {
      setError('No TikTok account connected');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch both account data and general analytics data
      const [accountResponse, analyticsResponse] = await Promise.allSettled([
        fetch('/api/social/tiktok/analytics/account', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        }),
        fetch('/api/social/tiktok/analytics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        })
      ]);
      
      // Start with default data structure
      let combinedData: TikTokAnalyticsData = { // Use the new interface
        dataSource: 'fallback',
        summaryStats: {},
        engagementMetrics: {},
        demographics: { ageGroups: [], genderSplit: {} },
        followerGrowth: [],
        videoPerformance: [],
        lastUpdated: new Date().toISOString(),
        tokenRefreshed: false // Initialize tokenRefreshed
      };
      
      // Check account response
      if (accountResponse.status === 'fulfilled' && accountResponse.value.ok) {
        const accountData = await accountResponse.value.json();
        combinedData = {
          ...combinedData,
          ...accountData,
          dataSource: accountData.dataSource || combinedData.dataSource,
          summaryStats: {
            ...combinedData.summaryStats,
            ...accountData.summaryStats
          },
          engagementMetrics: {
            ...combinedData.engagementMetrics,
            ...accountData.engagementMetrics
          }
        };
      } else if (accountResponse.status === 'fulfilled') {
        // Try to get error information
        const errorData = await accountResponse.value.json().catch(() => ({}));
        
        // Handle token expiration or auth issues
        if (errorData.need_refresh || errorData.error?.includes('auth')) {
          console.log("Trying to refresh TikTok token due to:", errorData.error);
          // Attempt to refresh the token
          const refreshResponse = await fetch('/api/social/tiktok', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (refreshResponse.ok) {
            console.log("Token refresh successful, retrying analytics fetch");
            // Token refreshed, set a flag to notify user
            combinedData.tokenRefreshed = true;
          } else {
            throw new Error('TikTok authentication expired. Please reconnect your account.');
          }
        }
      }
      
      // Check analytics response
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.ok) {
        const analyticsData = await analyticsResponse.value.json();
        combinedData = {
          ...combinedData,
          ...analyticsData,
          dataSource: analyticsData.dataSource || combinedData.dataSource,
          summaryStats: {
            ...combinedData.summaryStats,
            ...analyticsData.summaryStats
          },
          engagementMetrics: {
            ...combinedData.engagementMetrics,
            ...analyticsData.engagementMetrics
          },
          followerGrowth: analyticsData.followerGrowth || combinedData.followerGrowth,
          videoPerformance: analyticsData.videoPerformance || combinedData.videoPerformance
        };
      }
      
      // Update state with combined data
      setAnalyticsData(combinedData);
      setDataSource(combinedData.dataSource as 'real_api' | 'fallback' || 'fallback');
      
      // If we got some data but had to use fallback
      if (combinedData.dataSource === 'fallback' && combinedData.error) {
        const errorMessage = typeof combinedData.error === 'string' ? combinedData.error : combinedData.error?.message;
        setError(`Using fallback data: ${errorMessage || 'Unknown error'}`);
      } else if (combinedData.tokenRefreshed) {
        setError(`TikTok token was refreshed. Data should be updated now.`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching TikTok analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load TikTok analytics');
    } finally {
      setLoading(false);
    }
  }, [account]);
  
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAnalytics();
    } catch (err) {
      console.error("Error during refresh:", err);
      // Error is already set in fetchAnalytics
    } finally {
      setRefreshing(false);
    }
  };

  const isDataLoading = isLoading || loading;

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Account Overview</h2>
          {dataSource && (
            <div className="text-xs flex items-center">
              <span className={`w-2 h-2 rounded-full mr-1 ${dataSource === 'real_api' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span className="text-muted-foreground">
                {dataSource === 'real_api' ? 'Using real TikTok API data' : 'Using fallback data'}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isDataLoading || refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {error && (
        <div className={`${error.includes('fallback') || error.includes('refreshed') ? 'bg-amber-100 text-amber-800' : 'bg-destructive/10 text-destructive'} p-3 rounded-md mb-4`}>
          {error}
          {error.includes('authentication') && (
            <div className="mt-2">
              <button
                className="underline"
                onClick={() => window.location.href="/dashboard/social"}
              >
                Reconnect your TikTok account
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard 
          title="Followers" 
          value={analyticsData?.summaryStats?.totalFollowers || 0}
          icon={<User className="h-5 w-5" />}
          loading={isDataLoading}
        />
        <SummaryCard 
          title="Total Likes" 
          value={analyticsData?.summaryStats?.totalLikes || 0}
          icon={<Smile className="h-5 w-5" />}
          loading={isDataLoading}
        />
        <SummaryCard 
          title="Total Views" 
          value={analyticsData?.summaryStats?.totalViews || 0}
          icon={<Eye className="h-5 w-5" />}
          loading={isDataLoading}
        />
        <SummaryCard 
          title="Profile Visits" 
          value={analyticsData?.summaryStats?.profileVisits || 0}
          icon={<BarChart3 className="h-5 w-5" />}
          loading={isDataLoading}
        />
      </div>
      
      <Tabs defaultValue="growth">
        <TabsList className="mb-4">
          <TabsTrigger value="growth">Follower Growth</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="growth">
          <Card className="p-4">
            <h3 className="font-medium mb-4">Follower Growth (Last 30 Days)</h3>
            {isDataLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div>
                <LineChart
                  data={analyticsData?.followerGrowth || [
                    { date: '30 days ago', Followers: 0 },
                    { date: 'Today', Followers: 0 }
                  ]}
                  index="date"
                  categories={['Followers']}
                  colors={['#000000']}
                  height={250}
                  showLegend={false}
                  valueFormatter={(value: number) => formatNumber(value)}
                />
              </div>
            )}
          </Card>
          
          {dataSource === 'real_api' && (
            <div className="flex justify-end mt-2">
              <div className="text-xs text-muted-foreground">
                Growth data updated from real TikTok API
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="engagement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-medium mb-4">Engagement Metrics</h3>
              {isDataLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Avg. Views</div>
                    <div className="text-xl font-semibold">{formatNumber(analyticsData?.engagementMetrics?.avgViews || 0)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Avg. Likes</div>
                    <div className="text-xl font-semibold">{formatNumber(analyticsData?.engagementMetrics?.avgLikes || 0)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Engagement Rate</div>
                    <div className="text-xl font-semibold">{analyticsData?.engagementMetrics?.engagementRate || 0}%</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Views/Follower Ratio</div>
                    <div className="text-xl font-semibold">{analyticsData?.engagementMetrics?.viewsToFollowerRatio || 0}</div>
                  </div>
                </div>
              )}
            </Card>
            
            <Card className="p-4">
              <h3 className="font-medium mb-4">Audience Demographics</h3>
              {isDataLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Age Groups</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {analyticsData?.demographics?.ageGroups?.map((group: any) => (
                        <div key={group.group} className="text-center">
                          <div className="h-20 bg-slate-100 rounded-md flex items-end justify-center p-1">
                            <div 
                              className="w-full bg-black rounded-sm" 
                              style={{ height: `${group.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs mt-1">{group.group}</div>
                          <div className="text-xs font-medium">{group.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Gender</h4>
                    <div className="flex h-6 rounded-md overflow-hidden">
                      <div 
                        className="bg-blue-500 text-white text-xs flex items-center justify-center px-2"
                        style={{ width: `${analyticsData?.demographics?.genderSplit?.male || 0}%` }}
                      >
                        {analyticsData?.demographics?.genderSplit?.male || 0}%
                      </div>
                      <div 
                        className="bg-pink-500 text-white text-xs flex items-center justify-center px-2"
                        style={{ width: `${analyticsData?.demographics?.genderSplit?.female || 0}%` }}
                      >
                        {analyticsData?.demographics?.genderSplit?.female || 0}%
                      </div>
                      <div 
                        className="bg-purple-500 text-white text-xs flex items-center justify-center px-2"
                        style={{ width: `${analyticsData?.demographics?.genderSplit?.other || 0}%` }}
                      >
                        {analyticsData?.demographics?.genderSplit?.other || 0}%
                      </div>
                    </div>
                    <div className="flex text-xs mt-1 text-center">
                      <div className="flex-1">Male</div>
                      <div className="flex-1">Female</div>
                      <div className="flex-1">Other</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="content">
          <Card className="p-4">
            <h3 className="font-medium mb-4">Recent Video Performance</h3>
            {isDataLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[80px] w-full" />
                <Skeleton className="h-[80px] w-full" />
                <Skeleton className="h-[80px] w-full" />
              </div>
            ) : analyticsData?.videoPerformance?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No video performance data available.
              </div>
            ) : (
              <div className="space-y-4">
                {analyticsData?.videoPerformance?.map((video: any, index: number) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="flex justify-between mb-2">
                      <div className="font-medium">{video.title}</div>
                      <div className="text-sm text-muted-foreground">{video.posted}</div>
                    </div>
                    <div className="flex items-center text-sm space-x-4">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatNumber(video.views)}
                      </div>
                      <div className="flex items-center">
                        <Smile className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatNumber(video.likes)}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatNumber(video.comments)}
                      </div>
                      <div className="flex items-center">
                        <Share2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatNumber(video.shares)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {video.duration}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          
          {dataSource === 'real_api' && (
            <div className="flex justify-end mt-2">
              <div className="text-xs text-muted-foreground">
                Performance data updated from real TikTok API
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between text-xs text-muted-foreground mt-4 p-2 border rounded-md bg-slate-50">
        <div>
          {dataSource === 'real_api' && (
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Live data from TikTok API
            </span>
          )}
          {dataSource === 'fallback' && (
            <span className="flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
              Fallback data (API limits or estimation)
            </span>
          )}
        </div>
        <div>
          Last updated: {analyticsData?.lastUpdated
            ? new Date(analyticsData.lastUpdated).toLocaleString()
            : new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, loading }: {
  title: string;
  value: number;
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
            <h3 className="text-2xl font-bold">{formatNumber(value)}</h3>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}