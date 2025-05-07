"use client";

import { useState } from 'react';
import Image from 'next/image';
import { SourceVideo } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SourceVideoGridProps {
  videos: SourceVideo[];
  onVideoSelect: (video: SourceVideo) => void;
  selectedVideoId?: string | null;
}

export function SourceVideoGrid({ videos, onVideoSelect, selectedVideoId }: SourceVideoGridProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No videos found in your library. Download a video first to see it here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {videos.map((video) => (
        <Card
          key={video.id}
          className={`overflow-hidden cursor-pointer transition-all ${
            selectedVideoId === video.id ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-lg'
          }`}
          onClick={() => onVideoSelect(video)}
        >
          <div className="relative aspect-video w-full bg-muted">
            {video.thumbnail_url ? (
              <Image
                src={video.thumbnail_url}
                alt={video.title || 'Video thumbnail'}
                layout="fill"
                objectFit="cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No thumbnail
              </div>
            )}
            {selectedVideoId === video.id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Check className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium line-clamp-2 text-sm mb-1">{video.title || video.original_url}</h3>
            <p className="text-xs text-muted-foreground">
              Status: {video.status}
            </p>
            <p className="text-xs text-muted-foreground">
              Added: {new Date(video.created_at).toLocaleDateString()}
            </p>
            {video.duration && (
                <p className="text-xs text-muted-foreground">
                    Duration: {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}