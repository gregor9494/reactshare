"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Youtube, Twitter, Instagram, Facebook, ExternalLink, Loader2 } from "lucide-react"
import TikTok from "@/components/ui/icons/tiktok"
import useSocialAccounts from "@/hooks/use-social-accounts"
import useSocialShares from "@/hooks/use-social-shares"
import { YouTubeAnalytics } from "./youtube-analytics"
import TikTokAnalytics from "./tiktok-analytics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SocialShare } from "@/lib/types"

type Activity = {
  id: string;
  platform: string;
  content: string;
  type: string;
  status: string;
  date: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  url?: string;
}

export function AccountActivity() {
  const { accounts, isLoading: accountsLoading } = useSocialAccounts();
  const { shares, isLoading: sharesLoading, error: sharesError } = useSocialShares();
  const [filter, setFilter] = useState<string>("all");
  const [activityView, setActivityView] = useState<"posts" | "analytics">("posts");
  const [selectedShareId, setSelectedShareId] = useState<string | undefined>(undefined);
  const [showYoutubeAnalytics, setShowYoutubeAnalytics] = useState<boolean>(false);
  const [showTikTokAnalytics, setShowTikTokAnalytics] = useState<boolean>(false);
  
  const isLoading = accountsLoading || sharesLoading;
  
  // Convert shares to activity format
  const activities = shares.map((share: SocialShare) => {
    return {
      id: share.id,
      platform: share.provider,
      content: share.metadata.title,
      type: "reaction",
      status: share.status,
      date: share.published_at || share.created_at,
      engagement: {
        likes: share.analytics?.likes || 0,
        comments: share.analytics?.comments || 0,
        shares: share.analytics?.shares || 0,
        views: share.analytics?.views || 0
      },
      url: share.provider_post_url || "#"
    };
  });

  // Show YouTube analytics when YouTube is selected
  useEffect(() => {
    const hasYouTubeShares = shares.some(share => share.provider === 'youtube');
    const hasTikTokShares = shares.some(share => share.provider === 'tiktok');
    
    setShowYoutubeAnalytics(filter === "youtube");
    setShowTikTokAnalytics(filter === "tiktok");
    
    // Reset to posts view when switching platforms that don't have analytics
    if (filter !== "youtube" && filter !== "tiktok") {
      setActivityView("posts");
      setSelectedShareId(undefined);
    } else if (filter === "youtube" && hasYouTubeShares && activityView === "analytics") {
      // Set the first YouTube share as selected for analytics view
      const youtubeShare = shares.find(share => share.provider === 'youtube');
      if (youtubeShare) {
        setSelectedShareId(youtubeShare.id);
      }
    } else if (filter === "tiktok" && hasTikTokShares && activityView === "analytics") {
      // Set the first TikTok share as selected for analytics view
      const tiktokShare = shares.find(share => share.provider === 'tiktok');
      if (tiktokShare) {
        setSelectedShareId(tiktokShare.id);
      }
    }
  }, [filter, shares, activityView]);

  // Filter activities based on selected platform
  const filteredActivities = filter === "all"
    ? activities
    : activities.filter(activity => activity.platform === filter);

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-600" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'tiktok':
        return <TikTok className="h-4 w-4 text-black" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Published
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            Scheduled
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            Failed
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
            Draft
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format date to readable format
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // If there are no connected accounts, show a message
  const hasConnectedAccounts = accounts.length > 0;

  // If there are no activities after filtering, show a message
  const hasActivities = filteredActivities.length > 0;

  if (isLoading) {
    return <div className="text-center py-10">Loading account activity...</div>;
  }

  if (!hasConnectedAccounts) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground mb-4">No social accounts connected yet</p>
        <Button asChild>
          <a href="/dashboard/social?tab=accounts">Connect Accounts</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {filter === "youtube" && showYoutubeAnalytics
            ? "YouTube Activity"
            : filter === "tiktok" && showTikTokAnalytics
            ? "TikTok Activity"
            : "Recent Posts"}
        </h3>
        <div className="flex items-center gap-2">
          {(filter === "youtube" || filter === "tiktok") && (
            <Tabs value={activityView} onValueChange={(value) => setActivityView(value as "posts" | "analytics")}>
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.provider.toLowerCase()}>
                  {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filter === "youtube" && activityView === "analytics" ? (
        <YouTubeAnalytics shareId={selectedShareId} />
      ) : filter === "tiktok" && activityView === "analytics" ? (
        <TikTokAnalytics share={shares.find(share => share.id === selectedShareId)!} />
      ) : (
        <>
          {hasActivities ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getIcon(activity.platform)}
                          <span>{activity.platform.charAt(0).toUpperCase() + activity.platform.slice(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.content}</TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                      <TableCell>{formatDate(activity.date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{activity.engagement.views.toLocaleString()} views</div>
                          <div>{activity.engagement.likes.toLocaleString()} likes</div>
                          {activity.engagement.comments > 0 && (
                            <div>{activity.engagement.comments.toLocaleString()} comments</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(activity.platform === 'youtube' || activity.platform === 'tiktok') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setSelectedShareId(activity.id);
                                setActivityView("analytics");
                              }}
                            >
                              Analytics
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                            <a href={activity.url} target="_blank" rel="noopener noreferrer">
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 border rounded-md bg-muted/10">
              <p className="text-muted-foreground">No activities found for the selected platform</p>
            </div>
          )}
          
          <div className="flex justify-center mt-4">
            <Button variant="outline">Load More</Button>
          </div>
        </>
      )}
    </div>
  )
}
