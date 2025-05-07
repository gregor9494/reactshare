"use client"; // Make this a client component

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { VideoGrid } from "@/components/library/video-grid";
import { SourceVideo } from "@/lib/types";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react"; // For client-side session
import { toast } from "sonner"; // For notifications
import { Download } from "lucide-react"; // Icons for button, removed Loader

// Initialize Supabase client for client-side operations (if needed for direct fetching, though API is preferred)
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl!, supabaseAnonKey!);


export default function LibraryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch initial videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (session?.user?.id) {
        setIsLoadingVideos(true);
        try {
          // We'll use an API route to fetch videos to keep Supabase admin client server-side
          const response = await fetch('/api/videos/library');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch videos');
          }
          const data = await response.json();
          setSourceVideos(data.videos || []);
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
  }, [session, sessionStatus]);


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

      toast.success(result.message || "Download started! It will appear in your library once processed.", { id: "download-toast" });
      setVideoUrl(""); // Clear input field

      // Optionally, you could optimistically add a "processing" video to the list
      // or set up polling/websockets to update the list when the download completes.
      // For now, user will see it when it's 'completed' on next load or manual refresh.
      // Or, we can re-fetch the videos after a short delay
      setTimeout(async () => {
        if (session?.user?.id) {
            const refreshResponse = await fetch('/api/videos/library');
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setSourceVideos(data.videos || []);
            }
        }
      }, 5000); // Refresh after 5 seconds

    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${error.message}`, { id: "download-toast" });
    } finally {
      setIsDownloading(false);
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
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
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
                <Input
                    id="videoUrl"
                    type="url"
                    placeholder="Enter video URL (e.g., YouTube, TikTok, Twitter)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full"
                    disabled={isDownloading}
                />
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
            <VideoGrid videos={sourceVideos} />
          )}
        </main>
      </div>
    </div>
  );
}
