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
import { MoreHorizontal, Play, Edit, Share2, BarChart3, Trash2, Download } from "lucide-react"; // Removed problematic icons
import { SourceVideo } from '@/lib/types'; // Import SourceVideo type

// Define props interface
interface VideoGridProps {
  videos: SourceVideo[]; // Accept an array of SourceVideo objects
  // Removed type prop for MVP simplicity
}

// Update component signature
export function VideoGrid({ videos }: VideoGridProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Removed mock data
  // const videos = [...]

  // Removed filtering logic
  // const filteredVideos = type === "all" ? videos : videos.filter((video) => video.type === type)

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) => (prev.includes(id) ? prev.filter((videoId) => videoId !== id) : [...prev, id]));
  };

  const isSelected = (id: string) => selectedVideos.includes(id);

  // Display a message if there are no videos
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No videos found in your library.
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
                    const video = videos.find(v => v.id === id);
                    // Prefer storage_path for direct download, otherwise use API endpoint
                    if (video) {
                      if (video.storage_path) {
                        // Assuming storage_path is a publicly accessible URL or we need a signed URL
                        // For simplicity, let's assume it's a direct link or needs an API endpoint
                        // If Supabase storage, this would be:
                        // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                        // const { data } = supabase.storage.from('source_videos_bucket_name').getPublicUrl(video.storage_path);
                        // window.open(data.publicUrl, '_blank');
                        // For now, let's use a generic download endpoint for source videos
                        window.open(`/api/videos/download?id=${id}`, '_blank');
                      } else {
                        // Fallback if no direct storage_path, though 'completed' status should imply one
                        window.open(`/api/videos/download?id=${id}`, '_blank');
                      }
                    }
                  });
                }
              }}
              disabled={selectedVideos.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Selected
            </Button>
            <Button variant="destructive" size="sm" disabled={selectedVideos.length === 0}>
              Delete Selected {/* Placeholder */}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Map over the actual source videos data */}
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="group relative">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title || 'Video thumbnail'}
                    width={320}
                    height={180}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    {/* Icon removed due to import issues */}
                    <span>No Thumbnail</span>
                  </div>
                )}
              </div>
              {video.duration && (
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {new Date(video.duration * 1000).toISOString().substr(14, 5)} {/* Format duration */}
                </div>
              )}
              {video.storage_path && ( // Only show play button if video is available
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {/* Link to play the video - needs a player or direct link */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full"
                    onClick={() => {
                      // This would ideally open a video player modal or navigate to a player page
                      // For now, let's try to open the storage_path if it's a direct URL
                      // Or use a download link as a proxy for "playing"
                       window.open(`/api/videos/download?id=${video.id}`, '_blank');
                    }}
                  >
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
                  <h3 className="font-medium line-clamp-2" title={video.title || video.original_url}>
                    {video.title || video.original_url}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {video.file_format && <span>{video.file_format.toUpperCase()}</span>}
                    {video.file_format && video.file_size && <span className="mx-1">•</span>}
                    {video.file_size && <span>{(video.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
                    { (video.file_format || video.file_size) && <span className="mx-1">•</span>}
                    <span>Added: {new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                  {video.original_url && (
                    <Link
                        href={video.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center"
                      >
                        {/* Icon removed due to import issues */}
                        Source
                      </Link>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52"> {/* Increased width */}
                    <DropdownMenuLabel>Video Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                         window.open(`/api/videos/download?id=${video.id}`, '_blank');
                      }}
                      disabled={!video.storage_path}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Play/Preview
                    </DropdownMenuItem>
                     <DropdownMenuItem
                      onClick={() => {
                        // Navigate to create page with source_video_id
                        window.location.href = `/dashboard/create?sourceVideoId=${video.id}`;
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Create Reaction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (video.storage_path) {
                          window.open(`/api/videos/download?id=${video.id}`, '_blank');
                        }
                      }}
                      disabled={!video.storage_path}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Video
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled> {/* Placeholder */}
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Video
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled> {/* Placeholder */}
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" disabled> {/* Placeholder */}
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Video
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
