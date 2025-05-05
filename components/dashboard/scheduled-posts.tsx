import { Clock } from "lucide-react"

export function ScheduledPosts() {
  return (
    <div className="space-y-4">
      {[
        { title: "Reacting to New Movie Trailer", time: "Today, 3:00 PM", platform: "YouTube" },
        { title: "Hot Takes on Tech News", time: "Tomorrow, 10:00 AM", platform: "TikTok, Instagram" },
        { title: "Gaming Stream Highlights", time: "Friday, 6:00 PM", platform: "Twitch, YouTube" },
      ].map((post, i) => (
        <div key={i} className="flex items-start gap-4 rounded-md border p-3">
          <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">{post.title}</p>
            <div className="flex flex-col space-y-1 text-xs text-muted-foreground sm:flex-row sm:space-x-2 sm:space-y-0">
              <span>{post.time}</span>
              <span className="hidden sm:inline">•</span>
              <span>{post.platform}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
