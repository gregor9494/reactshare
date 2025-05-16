"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Youtube } from "lucide-react";
import TikTokIcon from "@/components/ui/icons/tiktok";

import { ConnectedAccounts } from "@/components/social/connected-accounts";
import { AccountActivity } from "@/components/social/account-activity";
import { YouTubeAnalytics } from "@/components/social/youtube-analytics";
import { YouTubePlaylists } from "@/components/social/youtube-playlists";
import { SocialErrorBanner } from "@/components/social/social-error-banner";
import TikTokAccountAnalytics from "@/components/social/tiktok-account-analytics";
import { YouTubeIntegration } from "@/components/social/youtube-integration";
import { TikTokIntegration } from "@/components/social/tiktok-integration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSocialAccounts from "@/hooks/use-social-accounts";
import { useTikTokAccount } from "@/hooks/use-tiktok-account";

export default function SocialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("accounts");
  const { accounts, isLoading: accountsLoading } = useSocialAccounts();
  const { account: tiktokAccount, loading: tiktokLoading } = useTikTokAccount();
  const [youtubeAccounts, setYoutubeAccounts] = useState<any[]>([]);
  const [hasTikTokAccount, setHasTikTokAccount] = useState(false);

  // Detect connected YouTube/TikTok accounts
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      // Get all active YouTube accounts
      const activeYoutubeAccounts = accounts.filter(account =>
        account.provider.toLowerCase() === 'youtube' && account.status === 'active'
      );
      setYoutubeAccounts(activeYoutubeAccounts);

      const tiktokAccount = accounts.find(account =>
        account.provider.toLowerCase() === 'tiktok' && account.status === 'active'
      );
      setHasTikTokAccount(!!tiktokAccount);
    }
  }, [accounts]);

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Social Accounts</h2>
        <p className="text-muted-foreground">
          Connect and manage your social media accounts to share your reactions across platforms.
        </p>
      </div>

      <SocialErrorBanner />
      
      <Tabs defaultValue="accounts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-xl"> {/* Adjusted grid columns */}
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="activity">Account Activity</TabsTrigger>
          <TabsTrigger value="youtube" disabled={youtubeAccounts.length === 0} className="relative">
            <div className="flex items-center gap-1">
              <Youtube className="h-4 w-4" />
              <span>YouTube{youtubeAccounts.length > 1 ? ` (${youtubeAccounts.length})` : ''}</span>
              {youtubeAccounts.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-sm text-xs">
                  Connect first
                </div>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="tiktok" disabled={!hasTikTokAccount} className="relative">
            <div className="flex items-center gap-1">
              <TikTokIcon className="h-4 w-4" />
              <span>TikTok</span>
              {!hasTikTokAccount && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-sm text-xs">
                  Connect first
                </div>
              )}
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Manage Social Accounts</h3>
            <p className="text-muted-foreground">
              Connect your social media accounts to automatically share your reaction videos.
            </p>
            <ConnectedAccounts />
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Recent Activity</h3>
            <p className="text-muted-foreground">
              Track your social media posts, analytics, and engagement.
            </p>
            <AccountActivity />
          </div>
        </TabsContent>
        
        <TabsContent value="youtube" className="mt-6">
          {youtubeAccounts.length > 0 ? (
            <Tabs defaultValue="youtube-channel" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-lg mb-4">
                <TabsTrigger value="youtube-channel">Channel</TabsTrigger>
                <TabsTrigger value="youtube-analytics">Analytics</TabsTrigger>
                <TabsTrigger value="youtube-playlists">Playlists</TabsTrigger>
              </TabsList>
              <TabsContent value="youtube-channel">
                <YouTubeIntegration />
              </TabsContent>
              <TabsContent value="youtube-analytics">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-600" />
                    YouTube Analytics
                  </h3>
                  <p className="text-muted-foreground">
                    Monitor your YouTube channel performance and video analytics.
                  </p>
                  <YouTubeAnalytics />
                </div>
              </TabsContent>
              <TabsContent value="youtube-playlists">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-600" />
                    YouTube Playlists
                  </h3>
                  <p className="text-muted-foreground">
                    Create and manage YouTube playlists for your reaction videos.
                  </p>
                  <YouTubePlaylists />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-10 border rounded-md bg-muted/10">
              <p className="text-muted-foreground mb-4">
                Connect your YouTube account to manage your channel, view analytics, and playlists.
              </p>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center mx-auto gap-2"
                onClick={() => setActiveTab("accounts")}
              >
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tiktok" className="mt-6">
          {hasTikTokAccount ? (
            <Tabs defaultValue="tiktok-channel" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
                <TabsTrigger value="tiktok-channel">Account</TabsTrigger>
                <TabsTrigger value="tiktok-analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="tiktok-channel">
                <TikTokIntegration />
              </TabsContent>
              <TabsContent value="tiktok-analytics">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <TikTokIcon className="h-5 w-5" />
                    TikTok Analytics
                  </h3>
                  <p className="text-muted-foreground">
                    Monitor your TikTok account performance and growth metrics.
                  </p>
                  {tiktokAccount ? (
                    <TikTokAccountAnalytics
                      account={tiktokAccount}
                      isLoading={tiktokLoading}
                    />
                  ) : (
                    <div className="text-center py-10 border rounded-md bg-muted/10">
                      <p className="text-muted-foreground mb-4">
                        Unable to load TikTok account information. Please try reconnecting your account.
                      </p>
                      <button
                        className="bg-black text-white px-4 py-2 rounded-md flex items-center mx-auto gap-2"
                        onClick={() => setActiveTab("accounts")}
                      >
                        <TikTokIcon className="h-4 w-4" />
                        Manage Accounts
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-10 border rounded-md bg-muted/10">
              <p className="text-muted-foreground mb-4">
                Connect your TikTok account to manage your profile and view analytics.
              </p>
              <button
                className="bg-black text-white px-4 py-2 rounded-md flex items-center mx-auto gap-2"
                onClick={() => setActiveTab("accounts")}
              >
                <TikTokIcon className="h-4 w-4" />
                Connect TikTok
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
