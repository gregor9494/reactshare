"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Youtube, Instagram, Twitter, Facebook, Twitch, Edit, Copy, Trash2 } from "lucide-react"

export function ScheduledList() {
  // Mock data - in a real app, this would come from an API
  const scheduledPosts = [
    {
      id: "1",
      title: "Reacting to Viral TikTok Trends",
      date: "2023-05-05",
      time: "15:00",
      platforms: ["YouTube", "TikTok"],
      status: "scheduled",
    },
    {
      id: "2",
      title: "My Thoughts on the New iPhone",
      date: "2023-05-08",
      time: "10:00",
      platforms: ["YouTube", "Twitter"],
      status: "scheduled",
    },
    {
      id: "3",
      title: "Gaming Stream Highlights",
      date: "2023-05-12",
      time: "18:00",
      platforms: ["Twitch", "YouTube"],
      status: "scheduled",
    },
    {
      id: "4",
      title: "Tech News Roundup",
      date: "2023-05-15",
      time: "12:00",
      platforms: ["YouTube", "Instagram", "Twitter"],
      status: "draft",
    },
    {
      id: "5",
      title: "Movie Trailer Breakdown",
      date: "2023-05-20",
      time: "14:30",
      platforms: ["YouTube"],
      status: "scheduled",
    },
    {
      id: "6",
      title: "Q&A Session",
      date: "2023-05-25",
      time: "19:00",
      platforms: ["Instagram", "TikTok"],
      status: "draft",
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
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Scheduled
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            Draft
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {scheduledPosts.map((post) => (
        <div key={post.id} className="flex items-center justify-between rounded-md border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{post.title}</h3>
              {getStatusBadge(post.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {post.date} at {post.time}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-1">
              {post.platforms.map((platform) => (
                <div
                  key={platform}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-white"
                  title={platform}
                >
                  {getPlatformIcon(platform)}
                </div>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}
