"use client";

import Image from "next/image";
import Link from "next/link";
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
import { MoreHorizontal, Play, Trash2, Download, Share2 } from "lucide-react";
import { Reaction } from '@/lib/types';
import { toast } from "sonner";

interface ReactionVideoGridProps {
  videos: Reaction[];
}

export function ReactionVideoGrid({ videos }: ReactionVideoGridProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id)
        ? prev.filter((videoId) => videoId !== id)
        : [...prev, id]
    );
  };

  const isSelected = (id: string) => selectedVideos.includes(id);

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No reaction videos found in your library.
      </div>
    );
  }

  const handleBulkDelete = async () => {
    toast.info(`Deleting ${selectedVideos.length} reaction(s)...`, { id: "delete-toast" });
    try {
      const response = await fetch('/api/reactions/delete', { // Assuming this endpoint exists
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionIds: selectedVideos }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete reactions");
      }

      toast.success("Successfully deleted selected reactions.", { id: "delete-toast" });
      // Refreshing the page to show the updated list
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting reactions:', error);
      toast.error(`Failed to delete reactions: ${error.message}`, { id: "delete-toast" });
    }
  };


  return (
    <div className="space-y-4">
      {selectedVideos.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted p-2">
          <p className="text-sm">{selectedVideos.length} videos selected</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="group relative">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title || "Reaction thumbnail"}
                    layout="fill"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <span>No Thumbnail</span>
                  </div>
                )}
              </div>
              
              {video.reaction_video_storage_path && video.status === 'uploaded' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={() => window.open(`/api/reactions/play?id=${video.id}`, '_blank')}>
                    <Play className="h-6 w-6" />
                  </Button>
                </div>
              )}
               <div className="absolute left-2 top-2">
                <Checkbox
                  checked={isSelected(video.id)}
                  onCheckedChange={() => toggleVideoSelection(video.id)}
                  className="h-5 w-5 rounded-sm border-2 bg-black/50 data-[state=checked]:bg-primary"
                />
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium line-clamp-2" title={video.title ?? ''}>
                    {video.title || 'Untitled Reaction'}
                  </h3>
                   <div className="flex items-center text-xs text-muted-foreground">
                    <span>Added: {new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Reaction Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={!video.reaction_video_storage_path} onClick={() => window.open(`/api/reactions/play?id=${video.id}`, '_blank')}>
                      <Play className="mr-2 h-4 w-4" />
                      Play/Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/api/reactions/download?id=${video.id}`, '_blank')}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={async () => {
                       await fetch(`/api/reactions/${video.id}`, { method: 'DELETE' });
                       window.location.reload();
                    }}>
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
  );
}