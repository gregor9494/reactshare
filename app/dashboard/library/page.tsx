"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoGrid } from "@/components/library/video-grid";
import { FolderNavigation } from "@/components/library/folder-navigation";
import { SourceVideo, Folder as FolderType, Reaction } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { ReactionVideoGrid } from "@/components/library/reaction-video-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LibraryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [reactionVideos, setReactionVideos] = useState<Reaction[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("source");

  useEffect(() => {
    const folderId = searchParams.get('folderId');
    setCurrentFolderId(folderId);
  }, [searchParams]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          const [videosRes, reactionsRes] = await Promise.all([
            fetch(`/api/videos/library${currentFolderId ? `?folderId=${currentFolderId}` : ''}`),
            fetch('/api/reactions')
          ]);

          if (!videosRes.ok) {
            const errorData = await videosRes.json();
            throw new Error(errorData.error || 'Failed to fetch videos');
          }
          if (!reactionsRes.ok) throw new Error('Failed to fetch reaction videos');

          const videosData = await videosRes.json();
          const reactionsData = await reactionsRes.json();

          setSourceVideos(videosData.videos || []);
          setFolders(videosData.folders || []);
          setReactionVideos(reactionsData || []);
        } catch (error: any) {
          console.error('Error fetching library data:', error);
          toast.error(`Error fetching data: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (sessionStatus === "authenticated") {
      fetchAllData();
    }
  }, [session, sessionStatus, currentFolderId]);

  const handleDownload = async (url: string) => {
    if (!url.trim()) {
      toast.error("Please enter a video URL.");
      return;
    }
    if (!session?.user?.id) {
      toast.error("You must be logged in to download videos.");
      return;
    }

    setIsDownloading(true);
    const toastId = `download-toast-source`;
    toast.info(`Initiating source video download...`, { id: toastId });

    const endpoint = '/api/videos/download';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to start download (status: ${response.status})`);
      }

      toast.success(
        `Source video download started!`,
        { id: toastId, duration: 8000 }
      );

      setVideoUrl("");

      setTimeout(() => window.location.reload(), 3000);
    } catch (error: any) {
      console.error(`Download error for source:`, error);
      toast.error(`Download failed: ${error.message}`, { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg font-semibold">Loading...</p>
        <p className="mt-2 text-muted-foreground">Loading library content.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Library</h1>
          <p className="text-muted-foreground">Manage your source and reaction videos.</p>
        </div>
        <Link href="/dashboard/create">
          <Button>Create Reaction</Button>
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-grow">
          <label htmlFor="videoUrl" className="mb-1 block text-sm font-medium text-foreground">
            Download Source Video from URL
          </label>
          <Input
            id="videoUrl"
            type="url"
            placeholder="Enter video URL (e.g., YouTube, TikTok)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={isDownloading}
          />
        </div>
        <Button
          onClick={() => handleDownload(videoUrl)}
          disabled={isDownloading || !videoUrl.trim()}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Source
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="source">Source Videos</TabsTrigger>
          <TabsTrigger value="reaction">Reaction Videos</TabsTrigger>
        </TabsList>
        <TabsContent value="source">
            <FolderNavigation
              folders={folders}
              currentFolderId={currentFolderId}
              onFolderCreated={(folder) => setFolders((prev) => [...prev, folder])}
              onFolderDeleted={(folderId) => setFolders((prev) => prev.filter((f) => f.id !== folderId))}
            />
            <VideoGrid videos={sourceVideos} folders={folders} />
        </TabsContent>
        <TabsContent value="reaction">
            <ReactionVideoGrid videos={reactionVideos} />
        </TabsContent>
      </Tabs>
    </>
  );
}
