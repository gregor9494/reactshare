"use client"; // Keep as client component for state and interactions

import Image from "next/image"; // Keep Image if we add thumbnail display later
import Link from "next/link"; // Keep Link if needed for reaction details page
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Play, Edit, Share2, BarChart3, Trash2, Download } from "lucide-react"; // Added Download icon
import { Reaction } from '@/lib/types'; // Import Reaction type

// Define props interface
interface VideoGridProps {
  reactions: Reaction[]; // Accept an array of Reaction objects
  // Removed type prop for MVP simplicity
}

// Update component signature
export function VideoGrid({ reactions }: VideoGridProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Removed mock data
  // const videos = [...]

  // Removed filtering logic
  // const filteredVideos = type === "all" ? videos : videos.filter((video) => video.type === type)

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) => (prev.includes(id) ? prev.filter((videoId) => videoId !== id) : [...prev, id]));
  };

  const isSelected = (id: string) => selectedVideos.includes(id);

  // Display a message if there are no reactions
  if (!reactions || reactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No reactions found in your library.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedVideos.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted p-2">
          <p className="text-sm">{selectedVideos.length} videos selected</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // If videos are selected, initiate bulk download
                if (selectedVideos.length > 0) {
                  selectedVideos.forEach(id => {
                    const reaction = reactions.find(r => r.id === id);
                    if (reaction && reaction.reaction_video_storage_path) {
                      // Open download in new tab/window
                      window.open(`/api/reactions/download?id=${id}`, '_blank');
                    }
                  });
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Map over the actual reactions data */}
        {reactions.map((reaction) => (
          <Card key={reaction.id} className="overflow-hidden">
            <div className="group relative">
              <div className="aspect-video w-full overflow-hidden">
                {/* Placeholder for thumbnail - ideally would use reaction.reaction_video_storage_path */}
                {/* For now, display a simple placeholder or status */}
                <div className="relative h-full w-full bg-muted flex items-center justify-center text-center text-sm p-2">
                   <span className="text-muted-foreground">{reaction.status}</span>
                </div>
                {/* Removed Image component for now */}
                {/* <Image
                  src={reaction.thumbnail || "/placeholder.svg"} // Need actual thumbnail URL
                  alt={reaction.title || 'Reaction Video'}
                  width={320}
                  height={180}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                /> */}
              </div>
              {/* Remove duration overlay for now */}
              {/* <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {reaction.duration}
              </div> */}
              {/* Keep Play button placeholder */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full">
                  <Play className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute left-2 top-2">
                <Checkbox
                  checked={isSelected(reaction.id)}
                  onCheckedChange={() => toggleVideoSelection(reaction.id)}
                  className="h-5 w-5 rounded-sm border-2 bg-black/50"
                />
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {/* Display reaction title or source URL */}
                  <h3 className="font-medium line-clamp-1">{reaction.title || reaction.source_video_url}</h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {/* Display status and creation date */}
                    <span>Status: {reaction.status}</span>
                    <span className="mx-1">•</span>
                    <span>Created: {new Date(reaction.created_at).toLocaleDateString()}</span>
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
                    {/* Update links/actions to use reaction.id - these are placeholders */}
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Play {/* Placeholder action */}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit {/* Placeholder action */}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share {/* Placeholder action */}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics {/* Placeholder action */}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (reaction.reaction_video_storage_path) {
                          window.open(`/api/reactions/download?id=${reaction.id}`, '_blank');
                        }
                      }}
                      disabled={!reaction.reaction_video_storage_path}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete {/* Placeholder action */}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
