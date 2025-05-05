"use client"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Youtube, Instagram, Twitter, Facebook, Twitch } from "lucide-react"

export function ScheduledCalendar() {
  // Mock data - in a real app, this would come from an API
  const scheduledPosts = [
    {
      id: "1",
      title: "Reacting to Viral TikTok Trends",
      date: "2023-05-05",
      time: "15:00",
      platforms: ["YouTube", "TikTok"],
    },
    {
      id: "2",
      title: "My Thoughts on the New iPhone",
      date: "2023-05-08",
      time: "10:00",
      platforms: ["YouTube", "Twitter"],
    },
    {
      id: "3",
      title: "Gaming Stream Highlights",
      date: "2023-05-12",
      time: "18:00",
      platforms: ["Twitch", "YouTube"],
    },
    {
      id: "4",
      title: "Tech News Roundup",
      date: "2023-05-15",
      time: "12:00",
      platforms: ["YouTube", "Instagram", "Twitter"],
    },
    {
      id: "5",
      title: "Movie Trailer Breakdown",
      date: "2023-05-20",
      time: "14:30",
      platforms: ["YouTube"],
    },
    {
      id: "6",
      title: "Q&A Session",
      date: "2023-05-25",
      time: "19:00",
      platforms: ["Instagram", "TikTok"],
    },
  ]

  // Generate calendar days for May 2023
  const generateCalendarDays = () => {
    const days = []
    const daysInMonth = 31 // May has 31 days
    const firstDayOfMonth = 1 // Monday (0 is Sunday, 1 is Monday, etc.)

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, posts: [] })
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `2023-05-${day.toString().padStart(2, "0")}`
      const postsForDay = scheduledPosts.filter((post) => post.date === date)
      days.push({ day, posts: postsForDay })
    }

    return days
  }

  const calendarDays = generateCalendarDays()

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "YouTube":
        return <Youtube className="h-3 w-3 text-red-600" />
      case "Instagram":
        return <Instagram className="h-3 w-3 text-pink-600" />
      case "Twitter":
        return <Twitter className="h-3 w-3 text-blue-400" />
      case "Facebook":
        return <Facebook className="h-3 w-3 text-blue-600" />
      case "Twitch":
        return <Twitch className="h-3 w-3 text-purple-600" />
      default:
        return null
    }
  }

  return (
    <div className="w-full">
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
                  {day.posts.map((post) => (
                    <HoverCard key={post.id}>
                      <HoverCardTrigger asChild>
                        <Button variant="ghost" className="h-auto w-full justify-start p-1 text-left text-xs">
                          <div className="w-full truncate">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{post.time}</span>
                              <div className="flex">
                                {post.platforms.map((platform) => (
                                  <span key={platform} className="ml-1">
                                    {getPlatformIcon(platform)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="truncate">{post.title}</div>
                          </div>
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">{post.title}</h4>
                          <div className="text-sm">
                            <p>
                              <span className="font-medium">Date:</span> {post.date}
                            </p>
                            <p>
                              <span className="font-medium">Time:</span> {post.time}
                            </p>
                            <div className="mt-2">
                              <span className="font-medium">Platforms:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {post.platforms.map((platform) => (
                                  <div
                                    key={platform}
                                    className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                                  >
                                    {getPlatformIcon(platform)}
                                    <span>{platform}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="w-full">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="w-full">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
