="use client"; // Make this a client component

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { VideoGrid } from "@/components/library/video-grid";
import { FolderNavigation } from "@/components/library/folder-navigation";
import { SourceVideo, Folder as FolderType } from "@/lib/types";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react"; // For client-side session
import { useSearchParams, useRouter } from "next/navigation"; // For accessing URL query params
import { toast } from "sonner"; // For notifications
import { Download } from "lucide-react"; // Icons for button, removed Loader

// Initialize Supabase client for client-side operations (if needed for direct fetching, though API is preferred)
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl!, supabaseAnonKey!);


export default function LibraryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingCount, setDownloadingCount] = useState(0);

  // Get the current folder ID from URL query params
  useEffect(() => {
    const folderId = searchParams.get('folderId');
    setCurrentFolderId(folderId);
  }, [searchParams]);

  // Count the number of videos that are currently downloading
  useEffect(() => {
    const count = sourceVideos.filter(video =>
      video.status === 'processing' ||
      video.status === 'downloading' ||
      video.status === 'pending'
    ).length;
    
    setDownloadingCount(count);
    
    // If there are downloads in progress, keep the downloading state active
    if (count > 0) {
      setIsDownloading(true);
    } else {
      // If no downloads are in progress, clear the downloading state
      setIsDownloading(false);
    }
  }, [sourceVideos]);

  useEffect(() => {
    const fetchVideos = async () => {
      if (session?.user?.id) {
        setIsLoadingVideos(true);
        try {
          // We'll use an API route to fetch videos to keep Supabase admin client server-side
          const url = new URL('/api/videos/library', window.location.origin);
          if (currentFolderId) {
            url.searchParams.append('folderId', currentFolderId);
          }
          const response = await fetch(url);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch videos');
          }
          const data = await response.json();
          setSourceVideos(data.videos || []);
          setFolders(data.folders || []);
        } catch (error: any) {
          console.error('Error fetching source videos:', error);
          toast.error(`Error fetching videos: ${error.message}`);
          setSourceVideos([]); // Clear videos on error
        } finally {
          setIsLoadingVideos(false);
        }
      }
    };

    if (sessionStatus === "authenticated") {
      fetchVideos();
    } else if (sessionStatus === "unauthenticated") {
      // Handle redirect or show login message if middleware didn't catch it
      // For now, assume middleware handles redirection
      setIsLoadingVideos(false);
    }
  }, [session, sessionStatus, currentFolderId]);


  const handleDownloadVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL.");
      return;
    }
    if (!session?.user?.id) {
      toast.error("You must be logged in to download videos.");
      return;
    }

    setIsDownloading(true);
    toast.info("Initiating video download...", { id: "download-toast" });

    try {
      const response = await fetch('/api/videos/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header might be needed if your API expects it explicitly,
          // but NextAuth.js session cookies should handle auth for API routes.
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to start download (status: ${response.status})`);
      }

      // Show a more informative message that tells the user to wait
      toast.success(
        "Download started! The URL has been cleared and you can track the download progress in the video grid below.",
        {
          id: "download-toast",
          duration: 8000 // Show for 8 seconds to ensure user sees it
        }
      );
      
      // Store the URL that's being downloaded so we can track it
      const downloadingUrl = videoUrl;
      
      // Clear the input field immediately after starting the download
      setVideoUrl("");
      
      // Set up a polling mechanism to refresh the videos list
      const pollInterval = setInterval(async () => {
        if (session?.user?.id) {
            const refreshResponse = await fetch('/api/videos/library');
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                
                // Check if the download is complete
                const newVideo = data.videos.find((v: SourceVideo) => v.original_url === downloadingUrl);
                
                if (newVideo && newVideo.status === 'completed') {
                  // Update the videos list with the new video
                  setSourceVideos(data.videos || []);
                  
                  // Show success message
                  toast.success("Download completed! The video is now available in your library.");
                  
                  // Wait a moment to ensure the UI updates with the new video
                  setTimeout(() => {
                    // Count how many videos are still downloading
                    const stillDownloading = data.videos.filter((v: SourceVideo) =>
                      v.status === 'processing' || v.status === 'downloading' || v.status === 'pending'
                    ).length;
                    
                    // Update the downloading count
                    setDownloadingCount(stillDownloading);
                    
                    // If no videos are downloading, clear the downloading state
                    if (stillDownloading === 0) {
                      setIsDownloading(false);
                    }
                    
                    // Clear the interval
                    clearInterval(pollInterval);
                  }, 1000); // Wait 1 second to ensure UI updates
                } else {
                  // Just update the videos list
                  setSourceVideos(data.videos || []);
                }
            }
        }
      }, 3000); // Poll every 3 seconds

    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${error.message}`, { id: "download-toast" });
      
      // Wait a moment to ensure any UI updates have completed
      setTimeout(() => {
        // Count how many videos are still downloading
        const stillDownloading = sourceVideos.filter(video =>
          video.status === 'processing' ||
          video.status === 'downloading' ||
          video.status === 'pending'
        ).length;
        
        // Update the downloading count
        setDownloadingCount(stillDownloading);
        
        // Only set downloading to false if there are no other downloads in progress
        if (stillDownloading === 0) {
          setIsDownloading(false);
        }
      }, 1000); // Wait 1 second to ensure UI updates
    }
  };


  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        {/* Loader icon removed */}
        <p className="text-lg font-semibold">Loading...</p>
        <p className="mt-2 text-muted-foreground">Loading library content.</p>
      </div>
    );
  }

  return (
    // The main layout app/dashboard/layout.tsx already provides the overall structure including DashboardNav
    // So, this page should only return the content for the <main> section
    <>
      <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Library</h1>
          <p className="text-muted-foreground">Manage, download, and organize your source videos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/create">
            <Button>Create Reaction</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-grow">
            <label htmlFor="videoUrl" className="mb-1 block text-sm font-medium text-foreground">
                Download Video from URL
            </label>
            <div className="relative">
              <Input
                  id="videoUrl"
                  type="url"
                  placeholder="Enter video URL (e.g., YouTube, TikTok, Twitter)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={`w-full ${isDownloading ? 'pr-32' : ''}`}
                  disabled={isDownloading}
              />
              {isDownloading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-amber-600 font-medium animate-pulse">
                  {downloadingCount > 0 ? `Downloading (${downloadingCount})...` : 'Downloading...'}
                </div>
              )}
            </div>
            {isDownloading && (
              <p className="mt-1 text-xs text-muted-foreground">
                {downloadingCount > 1
                  ? `Please wait until downloads are completed. ${downloadingCount} videos are currently being processed.`
                  : 'Please wait until downloading is completed. The video will appear in your library.'}
              </p>
            )}
        </div>
        <Button
            onClick={handleDownloadVideo}
            disabled={isDownloading || !videoUrl.trim()}
            className="w-full sm:w-auto"
        >
            {isDownloading ? (
                'Downloading...'
            ) : (
                typeof Download !== 'undefined' ? <Download className="mr-2 h-4 w-4" /> : null
            )}
            {isDownloading ? null : 'Download Video'}
        </Button>
      </div>

      {isLoadingVideos && sourceVideos.length === 0 ? (
         <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
            {/* Loader icon removed */}
            <p className="text-md font-semibold text-muted-foreground">Loading videos...</p>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while your video library is being loaded.</p>
        </div>
      ) : (
        <>
          <FolderNavigation
            folders={folders}
            currentFolderId={currentFolderId}
            onFolderCreated={(folder) => {
              setFolders((prev) => [...prev, folder]);
            }}
            onFolderDeleted={(folderId) => {
              setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
            }}
          />
          <VideoGrid videos={sourceVideos} folders={folders} />
        </>
      )}
    </>
  );
}
