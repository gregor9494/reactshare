"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Play, Edit, Share2, BarChart3, Trash2 } from "lucide-react"

interface VideoGridProps {
  type?: "all" | "reactions" | "source" | "drafts" | "archived"
}

export function VideoGrid({ type = "all" }: VideoGridProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])

  // Mock data - in a real app, this would come from an API
  const videos = [
    {
      id: "1",
      title: "Reacting to Viral TikTok Trends",
      thumbnail: "/placeholder.svg?key=y1r0j",
      duration: "5:24",
      views: "12.4K",
      date: "2 days ago",
      type: "reactions",
    },
    {
      id: "2",
      title: "My Thoughts on the New iPhone",
      thumbnail: "/placeholder.svg?key=7cvd5",
      duration: "8:15",
      views: "8.7K",
      date: "1 week ago",
      type: "reactions",
    },
    {
      id: "3",
      title: "Gaming Stream Highlights",
      thumbnail: "/placeholder.svg?key=v1xa8",
      duration: "12:42",
      views: "5.2K",
      date: "2 weeks ago",
      type: "reactions",
    },
    {
      id: "4",
      title: "Unboxing the Latest Tech",
      thumbnail: "/placeholder.svg?key=x2ov2",
      duration: "7:18",
      views: "3.9K",
      date: "3 weeks ago",
      type: "source",
    },
    {
      id: "5",
      title: "Movie Trailer Breakdown",
      thumbnail: "/placeholder.svg?key=myazr",
      duration: "6:05",
      views: "2.1K",
      date: "1 month ago",
      type: "source",
    },
    {
      id: "6",
      title: "Upcoming Game Review (Draft)",
      thumbnail: "/placeholder.svg?key=zfvqh&height=180&width=320&query=draft%20video%201",
      duration: "10:30",
      views: "Not published",
      date: "Edited 3 days ago",
      type: "drafts",
    },
    {
      id: "7",
      title: "Tech News Roundup (Draft)",
      thumbnail: "/placeholder.svg?key=zfvqh&height=180&width=320&query=draft%20video%202",
      duration: "4:45",
      views: "Not published",
      date: "Edited yesterday",
      type: "drafts",
    },
    {
      id: "8",
      title: "Old Reaction Video (Archived)",
      thumbnail: "/placeholder.svg?key=zfvqh&height=180&width=320&query=archived%20video%201",
      duration: "9:12",
      views: "15.6K",
      date: "Archived 2 months ago",
      type: "archived",
    },
  ]

  // Filter videos based on type
  const filteredVideos = type === "all" ? videos : videos.filter((video) => video.type === type)

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) => (prev.includes(id) ? prev.filter((videoId) => videoId !== id) : [...prev, id]))
  }

  const isSelected = (id: string) => selectedVideos.includes(id)

  return (
    <div className="space-y-4">
      {selectedVideos.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted p-2">
          <p className="text-sm">{selectedVideos.length} videos selected</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Share
            </Button>
            <Button variant="outline" size="sm">
              Download
            </Button>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="group relative">
              <div className="aspect-video w-full overflow-hidden">
                <Image
                  src={video.thumbnail || "/placeholder.svg"}
                  alt={video.title}
                  width={320}
                  height={180}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {video.duration}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full">
                  <Play className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute left-2 top-2">
                <Checkbox
                  checked={isSelected(video.id)}
                  onCheckedChange={() => toggleVideoSelection(video.id)}
                  className="h-5 w-5 rounded-sm border-2 bg-black/50"
                />
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium line-clamp-1">{video.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{video.views}</span>
                    <span className="mx-1">•</span>
                    <span>{video.date}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
