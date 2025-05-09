'use client';

import { useState, useEffect } from 'react';
import { PublishOptions } from '@/components/create/publish-options';
import { Label } from '@/components/ui/label';
import { SourceVideoGrid } from '@/components/create/source-video-grid';
import { SourceVideo } from '@/lib/types';

export default function PostPage() {
  const [videos, setVideos] = useState<SourceVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [initialTitle, setInitialTitle] = useState<string>('');

  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const res = await fetch('/api/reactions');
        if (res.ok) {
          const data = await res.json();
          const reactionList = Array.isArray(data) ? data : [];
          const mappedVideos: SourceVideo[] = reactionList
            .filter((r: any) => r.reaction_video_storage_path)
            .map((r: any) => ({
              id: r.id,
              user_id: r.user_id,
              original_url: r.reaction_video_storage_path!,
              storage_path: r.reaction_video_storage_path!,
              title: r.title || '',
              thumbnail_url: null,
              status: r.status,
              created_at: r.created_at,
              updated_at: r.updated_at,
            }));
          setVideos(mappedVideos);
        }
      } catch (error) {
        console.error('Error fetching reactions:', error);
      }
    };
    fetchReactions();
  }, []);

  const handleSelect = (id: string) => {
    setSelectedVideoId(id);
    const video = videos.find((v) => v.id === id);
    setInitialTitle(video?.title || '');
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Post Reaction</h1>
      <div>
        <Label>Select a Reaction Video</Label>
        <SourceVideoGrid
          videos={videos}
          selectedVideoId={selectedVideoId}
          onVideoSelect={(video) => handleSelect(video.id)}
        />
      </div>
      {selectedVideoId && (
        <PublishOptions reactionId={selectedVideoId} initialTitle={initialTitle} />
      )}
    </div>
  );
}