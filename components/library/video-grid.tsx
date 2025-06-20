"use client"; // Keep as client component for state and interactions

import Image from "next/image"; // Keep Image if we add thumbnail display later
import Link from "next/link"; // Keep Link if needed for reaction details page
import { useState, useEffect } from "react";
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
import { MoreHorizontal, Play, Edit, Share2, BarChart3, Trash2, Download, Plus, Loader2 } from "lucide-react";
import { Folder as FolderType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

// Define grid video shape for this component
export interface GridVideo {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  original_url?: string;
  storage_path?: string | null;
  file_format?: string;
  file_size?: number;
  duration?: number;
}

// Define props interface
interface VideoGridProps {
  videos: GridVideo[]; // Accept an array of grid video objects
  folders?: FolderType[]; // Optional folders for move operation
}

// Update component signature
export function VideoGrid({ videos, folders = [] }: VideoGridProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [singleVideoToMove, setSingleVideoToMove] = useState<string | null>(null);
  const [singleVideoToDelete, setSingleVideoToDelete] = useState<string | null>(null);
  const [downloadingVideos, setDownloadingVideos] = useState<Record<string, { status: string, progress?: number }>>({});
  
  // Function to open the move dialog for a single video
  const openMoveDialogForVideo = (videoId: string) => {
    setSingleVideoToMove(videoId);
    setSelectedVideos([videoId]);
    setIsMoveDialogOpen(true);
  };

  // Function to open the delete dialog for a single video
  const openDeleteDialogForVideo = (videoId: string) => {
    setSingleVideoToDelete(videoId);
    setSelectedVideos([videoId]);
    setIsDeleteDialogOpen(true);
  };
  
  // Poll for download status of videos that are in processing/downloading/pending state
  useEffect(() => {
    // Find videos that are still being processed
    const processingVideos = videos.filter(video =>
      video.status === 'processing' ||
      video.status === 'downloading' ||
      video.status === 'pending'
    );
    
    if (processingVideos.length === 0) return;
    
    // Set up polling for these videos
    const pollInterval = setInterval(async () => {
      const updatedStatuses: Record<string, { status: string, progress?: number }> = {};
      
      // Check status for each processing video
      for (const video of processingVideos) {
        try {
          const response = await fetch(`/api/videos/download?id=${video.id}`);
          if (response.ok) {
            const data = await response.json();
            updatedStatuses[video.id] = {
              status: data.status,
              progress: data.progress
            };
            
            // If video is completed, we'll refresh the page on next interval
            if (data.status === 'completed' &&
                (video.status === 'processing' || video.status === 'downloading' || video.status === 'pending')) {
              // Refresh the page to show the completed video
              window.location.reload();
              break;
            }
          }
        } catch (error) {
          console.error(`Error checking status for video ${video.id}:`, error);
        }
      }
      
      setDownloadingVideos(prev => ({...prev, ...updatedStatuses}));
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [videos]);

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

  // Count the number of videos that are currently downloading
  const downloadingCount = videos.filter(video =>
    video.status === 'processing' ||
    video.status === 'downloading' ||
    video.status === 'pending'
  ).length;

  return (
    <div className="space-y-4">
      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
          <p className="font-medium">{errorMessage}</p>
          <p className="text-sm mt-1">To enable folders, run the SQL migration in migrations/add_folders_table.sql</p>
        </div>
      )}
      
      {/* Download status banner */}
      {downloadingCount > 0 && (
        <div className="mb-4 p-4 border border-amber-300 bg-amber-50 text-amber-700 rounded-md flex items-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <div>
            <p className="font-medium">
              {downloadingCount === 1
                ? '1 video is currently downloading'
                : `${downloadingCount} videos are currently downloading`}
            </p>
            <p className="text-sm mt-1">
              Please wait until the downloads are completed. You can see the progress in the video grid below.
            </p>
          </div>
        </div>
      )}
      {selectedVideos.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted p-2">
          <p className="text-sm">{selectedVideos.length} videos selected</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedVideos.length > 0) {
                  setIsMoveDialogOpen(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Move to Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // If videos are selected, initiate bulk download
                if (selectedVideos.length > 0) {
                  selectedVideos.forEach(id => {
                    const video = videos.find(v => v.id === id);
                    // Only download completed videos with storage_path
                    if (video && video.storage_path && video.status === 'completed') {
                      // Use the new download-file endpoint that properly triggers file download
                      window.open(`/api/videos/download-file?id=${id}`, '_blank');
                    } else if (video) {
                      // Show a toast for videos that can't be downloaded
                      toast.error(`Video "${video.title || 'Untitled'}" is not ready for download yet.`);
                    }
                  });
                }
              }}
              disabled={selectedVideos.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (selectedVideos.length > 0) {
                  setIsDeleteDialogOpen(true);
                }
              }}
              disabled={selectedVideos.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
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
                
                {/* Download status overlay for processing videos */}
                {(video.status === 'processing' || video.status === 'downloading' || video.status === 'pending' ||
                  downloadingVideos[video.id]?.status === 'processing' ||
                  downloadingVideos[video.id]?.status === 'downloading' ||
                  downloadingVideos[video.id]?.status === 'pending') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span className="text-sm font-medium">
                      {downloadingVideos[video.id]?.status === 'downloading' || video.status === 'downloading'
                        ? 'Downloading...'
                        : downloadingVideos[video.id]?.status === 'processing' || video.status === 'processing'
                          ? 'Processing...'
                          : 'Preparing...'}
                    </span>
                    {downloadingVideos[video.id]?.progress && (
                      <div className="w-3/4 mt-2">
                        <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${downloadingVideos[video.id].progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-1 text-center">{downloadingVideos[video.id].progress}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {video.duration && (
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {new Date(video.duration * 1000).toISOString().substr(14, 5)} {/* Format duration */}
                </div>
              )}
              {video.storage_path && video.status === 'completed' && ( // Only show play button if video is available and completed
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
                       window.open(`/api/videos/play?id=${video.id}`, '_blank');
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
                  {/* Show download status if video is still processing */}
                  {(video.status === 'processing' || video.status === 'downloading' || video.status === 'pending' ||
                    downloadingVideos[video.id]?.status === 'processing' ||
                    downloadingVideos[video.id]?.status === 'downloading' ||
                    downloadingVideos[video.id]?.status === 'pending') && (
                    <div className="mt-1 text-xs text-amber-600 font-medium flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      {downloadingVideos[video.id]?.status === 'downloading' || video.status === 'downloading'
                        ? 'Downloading in progress...'
                        : downloadingVideos[video.id]?.status === 'processing' || video.status === 'processing'
                          ? 'Processing video...'
                          : 'Preparing download...'}
                    </div>
                  )}
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
                         window.open(`/api/videos/play?id=${video.id}`, '_blank');
                      }}
                      disabled={!video.storage_path || video.status !== 'completed'}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Play/Preview
                    </DropdownMenuItem>
                     <DropdownMenuItem
                      onClick={() => {
                        // Navigate to create page with sourceVideoId
                        console.log('Creating reaction for video:', video);
                        console.log('Video ID:', video.id);
                        console.log('Video status:', video.status);
                        console.log('Video storage_path:', video.storage_path);
                        
                        const url = `/dashboard/create?sourceVideoId=${video.id}`;
                        console.log('Navigating to URL:', url);
                        
                        // Use router.push instead of window.location for better Next.js integration
                        window.location.href = url;
                      }}
                      disabled={video.status !== 'completed' || !video.storage_path}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Create Reaction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (video.storage_path && video.status === 'completed') {
                          window.open(`/api/videos/download-file?id=${video.id}`, '_blank');
                        }
                      }}
                      disabled={!video.storage_path || video.status !== 'completed'}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Video
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openMoveDialogForVideo(video.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Move to Folder
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => openDeleteDialogForVideo(video.id)}
                    >
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

      {/* Move to Folder Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {singleVideoToMove ?
                "Move video to folder" :
                `Move ${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''} to folder`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={selectedFolderId === null ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedFolderId(null)}
                >
                  <span className="mr-2">🏠</span> No Folder (Root)
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant={selectedFolderId === folder.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <span className="mr-2">📁</span> {folder.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsMoving(true);
                try {
                  const response = await fetch('/api/videos/move', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      videoIds: selectedVideos,
                      folderId: selectedFolderId,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    // Check if the error is related to the folders table not existing
                    if (error.details && (
                      error.details.includes("folders table does not exist") ||
                      error.details.includes("folder_id column does not exist")
                    )) {
                      setErrorMessage("The folders feature is not yet available. Please run the database migration first.");
                    }
                    throw new Error(error.error || 'Failed to move videos');
                  }

                  toast.success(`Successfully moved ${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''}`);
                  setSelectedVideos([]);
                  setSingleVideoToMove(null);
                  setIsMoveDialogOpen(false);
                  
                  // Refresh the page to show updated videos
                  window.location.reload();
                } catch (error: any) {
                  console.error('Error moving videos:', error);
                  toast.error(`Failed to move videos: ${error.message}`);
                } finally {
                  setIsMoving(false);
                }
              }}
              disabled={isMoving}
            >
              {isMoving ? 'Moving...' : 'Move Videos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {singleVideoToDelete ?
                "Delete video" :
                `Delete ${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete {selectedVideos.length === 1 ? "this video" : "these videos"}? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsDeleting(true);
                try {
                  const response = await fetch('/api/videos/delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      videoIds: selectedVideos,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to delete videos');
                  }

                  const result = await response.json();
                  toast.success(result.message || `Successfully deleted ${selectedVideos.length} video${selectedVideos.length !== 1 ? 's' : ''}`);
                  setSelectedVideos([]);
                  setSingleVideoToDelete(null);
                  setIsDeleteDialogOpen(false);
                  
                  // Refresh the page to show updated videos
                  window.location.reload();
                } catch (error: any) {
                  console.error('Error deleting videos:', error);
                  toast.error(`Failed to delete videos: ${error.message}`);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
