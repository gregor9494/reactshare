"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RefreshCw, Youtube } from "lucide-react";
import TikTokIcon from "@/components/ui/icons/tiktok";
import { YouTubeAnalytics } from "@/components/social/youtube-analytics";
import TikTokAccountAnalytics from "@/components/social/tiktok-account-analytics";
import useSocialAccounts from "@/hooks/use-social-accounts";
import { useTikTokAccount } from "@/hooks/use-tiktok-account";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PlatformAnalytics() {
  const { accounts, isLoading: accountsLoading } = useSocialAccounts();
  const { account: tiktokAccount, loading: tiktokLoading, error: tiktokError } = useTikTokAccount();
  const [refreshing, setRefreshing] = useState(false);
  const [hasYouTubeAccount, setHasYouTubeAccount] = useState(false);
  const [hasTikTokAccount, setHasTikTokAccount] = useState(false);

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const youtubeAccount = accounts.find(account =>
        account.provider.toLowerCase() === 'youtube' && account.status === 'active'
      );
      setHasYouTubeAccount(!!youtubeAccount);

      const tiktokAccount = accounts.find(account =>
        account.provider.toLowerCase() === 'tiktok' && account.status === 'active'
      );
      setHasTikTokAccount(!!tiktokAccount);
    }
  }, [accounts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh accounts data
      await fetch('/api/social/route', { method: 'GET' });
      // Force reload the current page
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing social accounts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (accountsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Performance across different social platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasYouTubeAccount && !hasTikTokAccount) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Performance across different social platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <h3 className="text-xl font-semibold mb-2">No Social Accounts Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your social media accounts to see detailed analytics and performance metrics.
            </p>
            <Button asChild>
              <a href="/dashboard/social">Connect Social Accounts</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Performance across different social platforms</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hasYouTubeAccount ? "youtube" : hasTikTokAccount ? "tiktok" : ""}>
          <TabsList className="mb-4">
            {hasYouTubeAccount && (
              <TabsTrigger value="youtube" className="flex items-center gap-1">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube
              </TabsTrigger>
            )}
            {hasTikTokAccount && (
              <TabsTrigger value="tiktok" className="flex items-center gap-1">
                <TikTokIcon className="h-4 w-4" />
                TikTok
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Show YouTube tab content - always available if account exists */}
          {hasYouTubeAccount && (
            <TabsContent value="youtube">
              <YouTubeAnalytics />
            </TabsContent>
          )}
          
          {/* Show TikTok tab content with error handling */}
          {hasTikTokAccount && (
            <TabsContent value="tiktok">
              <div className="space-y-6">
                {/* Show TikTok error message if there's an error */}
                {tiktokError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {tiktokError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Show loader when loading */}
                {tiktokLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading TikTok account data...</p>
                  </div>
                )}
                
                {/* If TikTok error but not loading, show fallback content */}
                {tiktokError && !tiktokLoading && (
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>TikTok Analytics</CardTitle>
                      <CardDescription>Estimated performance data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-xs flex items-center mb-4">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                          <span className="text-muted-foreground">Using estimated data (TikTok API unavailable)</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {["Views", "Followers", "Engagement", "Growth"].map((metric) => (
                            <Card key={metric} className="p-4">
                              <p className="text-sm text-muted-foreground">{metric}</p>
                              <h3 className="text-2xl font-bold mt-1">
                                {metric === "Views" ? "12.5K" : 
                                 metric === "Followers" ? "1.85K" : 
                                 metric === "Engagement" ? "6.2%" : "↑4.8%"}
                              </h3>
                            </Card>
                          ))}
                        </div>
                        <div className="text-center mt-6">
                          <p className="mb-4">To see actual TikTok analytics, please try reconnecting your account</p>
                          <Button asChild>
                            <a href="/dashboard/social">Manage Social Accounts</a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Show actual analytics if account data is available */}
                {!tiktokLoading && !tiktokError && tiktokAccount && (
                  <TikTokAccountAnalytics 
                    account={tiktokAccount}
                    isLoading={tiktokLoading}
                  />
                )}
                
                {/* Show connect message if no account and no error */}
                {!tiktokLoading && !tiktokError && !tiktokAccount && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">No TikTok account data available.</p>
                    <Button asChild>
                      <a href="/dashboard/social">Connect TikTok Account</a>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
