"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Youtube, Instagram, Twitter, Facebook, Twitch, TwitterIcon as TikTok, ExternalLink } from "lucide-react"

export function AccountActivity() {
  // Mock data - in a real app, this would come from an API
  const activities = [
    {
      id: "1",
      platform: "YouTube",
      type: "post",
      title: "Reacting to Viral TikTok Trends",
      date: "2 hours ago",
      stats: { views: "1.2K", likes: "156", comments: "32" },
      thumbnail: "/placeholder.svg?key=y1r0j",
      icon: Youtube,
      color: "text-red-600",
      url: "#",
    },
    {
      id: "2",
      platform: "Instagram",
      type: "reel",
      title: "Quick Tech Review",
      date: "1 day ago",
      stats: { views: "3.4K", likes: "421", comments: "47" },
      thumbnail: "/placeholder.svg?key=7cvd5",
      icon: Instagram,
      color: "text-pink-600",
      url: "#",
    },
    {
      id: "3",
      platform: "Twitter",
      type: "tweet",
      title: "Thoughts on the latest Apple event",
      date: "3 hours ago",
      stats: { retweets: "24", likes: "118", replies: "15" },
      icon: Twitter,
      color: "text-blue-400",
      url: "#",
    },
    {
      id: "4",
      platform: "Twitch",
      type: "stream",
      title: "Live Gaming Session",
      date: "12 hours ago",
      stats: { viewers: "342", followers: "+15" },
      thumbnail: "/placeholder.svg?key=v1xa8",
      icon: Twitch,
      color: "text-purple-600",
      url: "#",
    },
    {
      id: "5",
      platform: "TikTok",
      type: "video",
      title: "60-Second Tech Tip",
      date: "5 hours ago",
      stats: { views: "5.7K", likes: "876", shares: "124" },
      thumbnail: "/placeholder.svg?key=x2ov2",
      icon: TikTok,
      color: "text-black",
      url: "#",
    },
  ]

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "YouTube":
        return <Youtube className="h-4 w-4 text-red-600" />
      case "Instagram":
        return <Instagram className="h-4 w-4 text-pink-600" />
      case "Twitter":
        return <Twitter className="h-4 w-4 text-blue-400" />
      case "Facebook":
        return <Facebook className="h-4 w-4 text-blue-600" />
      case "Twitch":
        return <Twitch className="h-4 w-4 text-purple-600" />
      case "TikTok":
        return <TikTok className="h-4 w-4" />
      default:
        return null
    }
  }

  const renderStats = (platform: string, stats: any) => {
    switch (platform) {
      case "YouTube":
        return (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.views} views</span>
            <span>{stats.likes} likes</span>
            <span>{stats.comments} comments</span>
          </div>
        )
      case "Instagram":
        return (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.views} views</span>
            <span>{stats.likes} likes</span>
            <span>{stats.comments} comments</span>
          </div>
        )
      case "Twitter":
        return (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.retweets} retweets</span>
            <span>{stats.likes} likes</span>
            <span>{stats.replies} replies</span>
          </div>
        )
      case "Twitch":
        return (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.viewers} peak viewers</span>
            <span>{stats.followers} new followers</span>
          </div>
        )
      case "TikTok":
        return (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.views} views</span>
            <span>{stats.likes} likes</span>
            <span>{stats.shares} shares</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Platforms</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 rounded-lg border p-4">
              {activity.thumbnail ? (
                <div className="relative h-16 w-28 overflow-hidden rounded-md">
                  <Image
                    src={activity.thumbnail || "/placeholder.svg"}
                    alt={activity.title}
                    width={112}
                    height={64}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-muted">
                  <activity.icon className={`h-8 w-8 ${activity.color}`} />
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(activity.platform)}
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activity.date}</span>
                  </div>
                  <h3 className="mt-1 font-medium">{activity.title}</h3>
                </div>
                {renderStats(activity.platform, activity.stats)}
              </div>

              <div className="flex items-start">
                <Button variant="ghost" size="icon" asChild>
                  <a href={activity.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">View on {activity.platform}</span>
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {["youtube", "instagram", "twitter", "tiktok"].map((platform) => (
          <TabsContent key={platform} value={platform} className="mt-4">
            <div className="flex h-[300px] items-center justify-center rounded-lg border">
              <p className="text-muted-foreground">
                {platform.charAt(0).toUpperCase() + platform.slice(1)} activity will appear here
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
