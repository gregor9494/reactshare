'use client';

import { useState, useEffect } from 'react';
import { PublishOptions } from '@/components/create/publish-options';
import { Label } from '@/components/ui/label';
import { SourceVideoGrid } from '@/components/create/source-video-grid';
import { SourceVideo } from '@/lib/types';
import { toast } from 'sonner';

export default function PostPage() {
  const [videos, setVideos] = useState<SourceVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [initialTitle, setInitialTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/videos/library');
        if (!res.ok) {
          throw new Error(`Failed to fetch videos: ${res.statusText}`);
        }
        const data = await res.json();
        setVideos(Array.isArray(data.videos) ? data.videos : []);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('Failed to load videos. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const handleSelect = (id: string) => {
    setSelectedVideoId(id);
    const video = videos.find((v) => v.id === id);
    setInitialTitle(video?.title || '');
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Post Video</h1>
      <div>
        <Label>Select a Video</Label>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
            <p className="text-md font-semibold text-muted-foreground">Loading videos...</p>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while your videos are being loaded.</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
            <p className="text-md font-semibold text-muted-foreground">No videos found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to create or upload videos before you can post them to social media.
            </p>
          </div>
        ) : (
          <SourceVideoGrid
            videos={videos}
            selectedVideoId={selectedVideoId}
            onVideoSelect={(video) => handleSelect(video.id)}
          />
        )}
      </div>
      {selectedVideoId && (
        <PublishOptions reactionId={selectedVideoId} initialTitle={initialTitle} />
      )}
    </div>
  );
}