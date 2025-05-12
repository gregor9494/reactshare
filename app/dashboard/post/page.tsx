'use client';

import { useState, useEffect } from 'react';
import { PublishOptions } from '@/components/create/publish-options';
import { Label } from '@/components/ui/label';
import { SourceVideoGrid, VideoWithType } from '@/components/create/source-video-grid';
import { SourceVideo, Reaction } from '@/lib/types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type VideoType = 'source' | 'reaction';

export default function PostPage() {
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [reactionVideos, setReactionVideos] = useState<Reaction[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [selectedVideoType, setSelectedVideoType] = useState<VideoType>('source');
  const [initialTitle, setInitialTitle] = useState<string>('');
  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [isLoadingReactions, setIsLoadingReactions] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('source');

  // Fetch source videos
  useEffect(() => {
    const fetchSourceVideos = async () => {
      setIsLoadingSource(true);
      try {
        const res = await fetch('/api/videos/library');
        if (!res.ok) {
          throw new Error(`Failed to fetch videos: ${res.statusText}`);
        }
        const data = await res.json();
        setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
      } catch (error) {
        console.error('Error fetching source videos:', error);
        toast.error('Failed to load source videos. Please try again later.');
      } finally {
        setIsLoadingSource(false);
      }
    };
    fetchSourceVideos();
  }, []);

  // Fetch reaction videos
  useEffect(() => {
    const fetchReactionVideos = async () => {
      setIsLoadingReactions(true);
      try {
        const res = await fetch('/api/reactions');
        if (!res.ok) {
          throw new Error(`Failed to fetch reactions: ${res.statusText}`);
        }
        const data = await res.json();
        // Filter to only include reactions with completed uploads
        const completedReactions = Array.isArray(data)
          ? data.filter(r => r.status === 'uploaded' || r.status === 'published')
          : [];
        setReactionVideos(completedReactions);
      } catch (error) {
        console.error('Error fetching reaction videos:', error);
        toast.error('Failed to load reaction videos. Please try again later.');
      } finally {
        setIsLoadingReactions(false);
      }
    };
    fetchReactionVideos();
  }, []);

  // Convert source videos to common format for display
  const formattedSourceVideos: VideoWithType[] = sourceVideos.map(video => ({
    id: video.id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    created_at: video.created_at,
    status: video.status,
    type: 'source',
    duration: video.duration,
    original_url: video.original_url
  }));

  // Convert reaction videos to common format for display
  const formattedReactionVideos: VideoWithType[] = reactionVideos.map(video => ({
    id: video.id,
    title: video.title,
    thumbnail_url: null, // Reactions might not have thumbnails
    created_at: video.created_at,
    status: video.status,
    type: 'reaction'
  }));

  // Get the appropriate videos based on active tab
  const displayVideos = activeTab === 'source' ? formattedSourceVideos : formattedReactionVideos;
  const isLoading = activeTab === 'source' ? isLoadingSource : isLoadingReactions;

  const handleSelect = (video: VideoWithType) => {
    setSelectedVideoId(video.id);
    setSelectedVideoType(video.type);
    setInitialTitle(video.title || '');
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Post Video</h1>
      
      <Tabs defaultValue="source" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="source">Downloaded Videos</TabsTrigger>
          <TabsTrigger value="reaction">Reaction Videos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="source" className="space-y-4">
          <Label>Select a Downloaded Video</Label>
          {renderVideoGrid(isLoadingSource, formattedSourceVideos, selectedVideoId, handleSelect)}
        </TabsContent>
        
        <TabsContent value="reaction" className="space-y-4">
          <Label>Select a Reaction Video</Label>
          {renderVideoGrid(isLoadingReactions, formattedReactionVideos, selectedVideoId, handleSelect)}
        </TabsContent>
      </Tabs>
      
      {selectedVideoId && (
        <PublishOptions
          reactionId={selectedVideoId}
          initialTitle={initialTitle}
          isSourceVideo={selectedVideoType === 'source'}
        />
      )}
    </div>
  );
}

// Helper function to render the video grid
function renderVideoGrid(
  isLoading: boolean,
  videos: VideoWithType[],
  selectedVideoId: string | undefined,
  handleSelect: (video: VideoWithType) => void
) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
        <p className="text-md font-semibold text-muted-foreground">Loading videos...</p>
        <p className="mt-2 text-sm text-muted-foreground">Please wait while your videos are being loaded.</p>
      </div>
    );
  }
  
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
        <p className="text-md font-semibold text-muted-foreground">No videos found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to create or upload videos before you can post them to social media.
        </p>
      </div>
    );
  }
  
  return (
    <SourceVideoGrid
      videos={videos}
      selectedVideoId={selectedVideoId}
      onVideoSelect={handleSelect}
    />
  );
}