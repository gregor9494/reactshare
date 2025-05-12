"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Youtube, Instagram, Twitter, Facebook, Twitch, Loader2, Edit, Trash2 } from "lucide-react"
import { SocialShare } from "@/lib/types"
import { format } from "date-fns"
import { toast } from "sonner"
import TikTok from "@/components/ui/icons/tiktok"
import { useRouter } from "next/navigation"

export function ScheduledCalendar() {
  const [scheduledPosts, setScheduledPosts] = useState<SocialShare[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
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

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1)
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    // Adjust for Monday as first day of week (0 = Monday, 6 = Sunday)
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    // Get the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ day: null, posts: [] })
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Format date as YYYY-MM-DD
      const date = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
      
      // Find posts scheduled for this day
      const postsForDay = scheduledPosts.filter((post) => {
        if (!post.scheduled_for) return false
        const postDate = new Date(post.scheduled_for)
        return format(postDate, "yyyy-MM-dd") === date
      })
      
      days.push({ day, posts: postsForDay })
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()
  
  // Format the month and year for display
  const formattedMonth = format(currentMonth, "MMMM yyyy")
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  // Go to current month
  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return <Youtube className="h-3 w-3 text-red-600" />
      case "instagram":
        return <Instagram className="h-3 w-3 text-pink-600" />
      case "twitter":
        return <Twitter className="h-3 w-3 text-blue-400" />
      case "facebook":
        return <Facebook className="h-3 w-3 text-blue-600" />
      case "twitch":
        return <Twitch className="h-3 w-3 text-purple-600" />
      case "tiktok":
        return <TikTok className="h-3 w-3" />
      default:
        return null
    }
  }
  
  // Format time from date string
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "HH:mm")
    } catch (error) {
      return ""
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading calendar...</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{formattedMonth}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex">
            <Button variant="outline" size="sm" className="rounded-r-none" onClick={goToPreviousMonth}>
              &lt;
            </Button>
            <Button variant="outline" size="sm" className="rounded-l-none" onClick={goToNextMonth}>
              &gt;
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}

        {calendarDays.map((day, i) => (
          <div key={i} className={`min-h-[100px] border p-1 ${day.day ? "bg-background" : "bg-muted/50"}`}>
            {day.day && (
              <>
                <div className="text-right text-sm">{day.day}</div>
                <div className="mt-1 space-y-1">
                  {day.posts.map((post) => {
                    const title = post.metadata?.title || 'Untitled Post'
                    const time = formatTime(post.scheduled_for || '')
                    
                    return (
                      <HoverCard key={post.id}>
                        <HoverCardTrigger asChild>
                          <Button variant="ghost" className="h-auto w-full justify-start p-1 text-left text-xs">
                            <div className="w-full truncate">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{time}</span>
                                <div className="flex">
                                  <span className="ml-1">
                                    {getPlatformIcon(post.provider)}
                                  </span>
                                </div>
                              </div>
                              <div className="truncate">{title}</div>
                            </div>
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">{title}</h4>
                            <div className="text-sm">
                              <p>
                                <span className="font-medium">Date:</span> {format(new Date(post.scheduled_for || ''), "yyyy-MM-dd")}
                              </p>
                              <p>
                                <span className="font-medium">Time:</span> {time}
                              </p>
                              <div className="mt-2">
                                <span className="font-medium">Platform:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <div
                                    className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                                  >
                                    {getPlatformIcon(post.provider)}
                                    <span>{post.provider}</span>
                                  </div>
                                </div>
                              </div>
                              {post.metadata?.description && (
                                <div className="mt-2">
                                  <span className="font-medium">Description:</span>
                                  <p className="mt-1 text-xs">{post.metadata.description}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => editScheduledPost(post.id)}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                onClick={() => cancelScheduledPost(post.id)}
                                disabled={isDeleting === post.id}
                              >
                                {isDeleting === post.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-1 h-3 w-3" />
                                )}
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
