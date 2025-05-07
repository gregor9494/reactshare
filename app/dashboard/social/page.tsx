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
import TikTokAnalytics from "@/components/social/tiktok-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSocialAccounts from "@/hooks/use-social-accounts";

export default function SocialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("accounts");
  const { accounts, isLoading: accountsLoading } = useSocialAccounts();
  const [hasYouTubeAccount, setHasYouTubeAccount] = useState(false);
  const [hasTikTokAccount, setHasTikTokAccount] = useState(false);

  // Detect if user has YouTube/TikTok accounts connected
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

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6 p-6 pb-16">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Social Accounts</h2>
        <p className="text-muted-foreground">
          Connect and manage your social media accounts to share your reactions across platforms.
        </p>
      </div>
      
      <Tabs defaultValue="accounts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-5">
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="activity">Account Activity</TabsTrigger>
          <TabsTrigger value="youtube" disabled={!hasYouTubeAccount} className="relative">
            <div className="flex items-center gap-1">
              <Youtube className="h-4 w-4" />
              <span>Analytics</span>
              {!hasYouTubeAccount && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-sm text-xs">
                  Connect first
                </div>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="playlists" disabled={!hasYouTubeAccount} className="relative">
            <div className="flex items-center gap-1">
              <Youtube className="h-4 w-4" />
              <span>Playlists</span>
              {!hasYouTubeAccount && (
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
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              YouTube Analytics
            </h3>
            <p className="text-muted-foreground">
              Monitor your YouTube channel performance and video analytics.
            </p>
            {hasYouTubeAccount ? (
              <YouTubeAnalytics />
            ) : (
              <div className="text-center py-10 border rounded-md bg-muted/10">
                <p className="text-muted-foreground mb-4">
                  Connect your YouTube account to see analytics
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
          </div>
        </TabsContent>

        <TabsContent value="playlists" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              YouTube Playlists
            </h3>
            <p className="text-muted-foreground">
              Create and manage YouTube playlists for your reaction videos.
            </p>
            {hasYouTubeAccount ? (
              <YouTubePlaylists />
            ) : (
              <div className="text-center py-10 border rounded-md bg-muted/10">
                <p className="text-muted-foreground mb-4">
                  Connect your YouTube account to manage playlists
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
          </div>
        </TabsContent>

        <TabsContent value="tiktok" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TikTokIcon className="h-5 w-5" />
              TikTok Analytics
            </h3>
            <p className="text-muted-foreground">
              Monitor your TikTok videos performance and account growth.
            </p>
            {hasTikTokAccount ? (
              <div className="grid gap-4">
                {/* We need to render TikTokAnalytics per share, as it's designed for individual shares */}
                {/* This is a placeholder until we fetch actual TikTok shares */}
                <div className="text-center py-10 border rounded-md bg-muted/10">
                  <p className="text-muted-foreground mb-4">
                    Select a video from the Account Activity tab to view its detailed analytics
                  </p>
                  <button
                    className="bg-black text-white px-4 py-2 rounded-md flex items-center mx-auto gap-2"
                    onClick={() => setActiveTab("activity")}
                  >
                    <TikTokIcon className="h-4 w-4" />
                    View Account Activity
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border rounded-md bg-muted/10">
                <p className="text-muted-foreground mb-4">
                  Connect your TikTok account to see analytics
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
