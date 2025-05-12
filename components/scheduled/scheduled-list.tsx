"use client"

import { useState, useEffect } from "react"
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
import { MoreHorizontal, Youtube, Instagram, Twitter, Facebook, Twitch, Edit, Trash2, Loader2 } from "lucide-react"
import { SocialShare } from "@/lib/types"
import { format } from "date-fns"
import { toast } from "sonner"
import TikTok from "@/components/ui/icons/tiktok"
import { useRouter } from "next/navigation"

export function ScheduledList() {
  const [scheduledPosts, setScheduledPosts] = useState<SocialShare[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()

  // Fetch scheduled posts
  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const fetchScheduledPosts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/social/shares?status=scheduled')
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled posts')
      }
      const data = await response.json()
      setScheduledPosts(data.shares || [])
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setIsLoading(false)
    }
  }

  // Cancel a scheduled post
  const cancelScheduledPost = async (id: string) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/social/shares/schedule/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel scheduled post')
      }
      
      toast.success('Post canceled successfully')
      // Remove the canceled post from the list
      setScheduledPosts(prev => prev.filter(post => post.id !== id))
    } catch (error) {
      console.error('Error canceling scheduled post:', error)
      toast.error('Failed to cancel scheduled post')
    } finally {
      setIsDeleting(null)
    }
  }

  // Navigate to edit page
  const editScheduledPost = (id: string) => {
    router.push(`/dashboard/post?edit=${id}`)
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return <Youtube className="h-4 w-4 text-red-600" />
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-600" />
      case "twitter":
        return <Twitter className="h-4 w-4 text-blue-400" />
      case "facebook":
        return <Facebook className="h-4 w-4 text-blue-600" />
      case "twitch":
        return <Twitch className="h-4 w-4 text-purple-600" />
      case "tiktok":
        return <TikTok className="h-4 w-4" />
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
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            Pending
          </Badge>
        )
      case "published":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
            Published
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  // Format the scheduled date and time
  const formatScheduledDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString)
      return {
        date: format(date, "yyyy-MM-dd"),
        time: format(date, "HH:mm")
      }
    } catch (error) {
      return { date: "Invalid date", time: "" }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading scheduled posts...</p>
      </div>
    )
  }

  if (scheduledPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
        <p className="text-md font-semibold text-muted-foreground">No scheduled posts found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't scheduled any posts yet. Create a new post to get started.
        </p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/post')}>
          Create New Post
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {scheduledPosts.map((post) => {
        const { date, time } = formatScheduledDateTime(post.scheduled_for || '')
        const title = post.metadata?.title || 'Untitled Post'
        
        return (
          <div key={post.id} className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{title}</h3>
                {getStatusBadge(post.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {date} at {time}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-1">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-white"
                  title={post.provider}
                >
                  {getPlatformIcon(post.provider)}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isDeleting === post.id}>
                    {isDeleting === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editScheduledPost(post.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/post?duplicate=${post.id}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => cancelScheduledPost(post.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}
