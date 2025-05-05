import Image from "next/image"
import { BarChart3, Eye, ThumbsUp, MessageSquare } from "lucide-react"

export function TopContent() {
  // Mock data - in a real app, this would come from an API
  const topVideos = [
    {
      id: "1",
      title: "Reacting to Viral TikTok Trends",
      thumbnail: "/placeholder.svg?key=12s2y",
      views: "24.5K",
      likes: "1.8K",
      comments: "342",
      platform: "YouTube",
    },
    {
      id: "2",
      title: "My Thoughts on the New iPhone",
      thumbnail: "/placeholder.svg?key=lki21",
      views: "18.2K",
      likes: "1.2K",
      comments: "256",
      platform: "YouTube",
    },
    {
      id: "3",
      title: "Gaming Stream Highlights",
      thumbnail: "/placeholder.svg?key=ad804",
      views: "15.7K",
      likes: "987",
      comments: "189",
      platform: "Twitch",
    },
    {
      id: "4",
      title: "Unboxing the Latest Tech",
      thumbnail: "/placeholder.svg?key=dxot2",
      views: "12.3K",
      likes: "756",
      comments: "124",
      platform: "Instagram",
    },
  ]

  return (
    <div className="space-y-4">
      {topVideos.map((video) => (
        <div key={video.id} className="flex items-center gap-4">
          <div className="relative h-[60px] w-[107px] overflow-hidden rounded-md">
            <Image
              src={video.thumbnail || "/placeholder.svg"}
              alt={video.title}
              width={107}
              height={60}
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-medium line-clamp-1">{video.title}</p>
            <p className="text-xs text-muted-foreground">{video.platform}</p>
          </div>
          <div className="flex gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">{video.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs">{video.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">{video.comments}</span>
            </div>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      ))}
    </div>
  )
}
