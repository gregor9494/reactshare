"use client";

import { useState, useEffect } from 'react';
import { SocialShare, YouTubeVideoAnalytics } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

interface UseSocialSharesResult {
  shares: SocialShare[];
  isLoading: boolean;
  error: string | null;
  uploadToYouTube: (data: {
    reactionId: string;
    title: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    playlistId?: string;
  }) => Promise<SocialShare | null>;
  scheduleShare: (data: {
    reactionId: string;
    provider: string;
    title: string;
    description?: string;
    scheduledFor: Date;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    isImmediate?: boolean;
  }) => Promise<SocialShare | null>;
  getAnalytics: (provider: string, shareId?: string, videoId?: string) => Promise<YouTubeVideoAnalytics | null>;
  fetchSharesByReactionId: (reactionId: string) => Promise<void>;
}

export default function useSocialShares(): UseSocialSharesResult {
  const [shares, setShares] = useState<SocialShare[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all social shares on component mount
  useEffect(() => {
    fetchShares();
  }, []);

  // Fetch all shares for the user
  const fetchShares = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/social/shares');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch social shares');
      }

      const data = await response.json();
      setShares(data.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching social shares:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch shares for a specific reaction
  const fetchSharesByReactionId = async (reactionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/social/shares?reactionId=${reactionId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch social shares');
      }

      const data = await response.json();
      setShares(data.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching social shares:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a video to YouTube
  const uploadToYouTube = async ({
    reactionId,
    title,
    description = '',
    privacy = 'private',
    tags = [],
    playlistId
  }: {
    reactionId: string;
    title: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    playlistId?: string;
  }): Promise<SocialShare | null> => {
    try {
      const response = await fetch('/api/social/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionId,
          title,
          description,
          privacy,
          tags,
          playlistId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload to YouTube');
      }

      const data = await response.json();
      
      // Refetch shares to include the new one
      await fetchShares();
      
      // Show different toast messages depending on whether a playlist was specified
      toast({
        title: 'Upload Successful',
        description: playlistId
          ? `Video "${title}" has been uploaded to YouTube and added to playlist.`
          : `Video "${title}" has been uploaded to YouTube.`,
        variant: 'default'
      });

      return data.share;
    } catch (err) {
      console.error('Error uploading to YouTube:', err);
      
      toast({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Failed to upload video to YouTube',
        variant: 'destructive'
      });
      
      return null;
    }
  };

  // Schedule a social media post
  const scheduleShare = async ({
    reactionId,
    provider,
    title,
    description = '',
    scheduledFor,
    privacy = 'private',
    tags = [],
    isImmediate = false
  }: {
    reactionId: string;
    provider: string;
    title: string;
    description?: string;
    scheduledFor: Date;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    isImmediate?: boolean;
  }): Promise<SocialShare | null> => {
    try {
      const response = await fetch('/api/social/shares/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionId,
          provider,
          title,
          description,
          scheduledFor: scheduledFor.toISOString(),
          privacy,
          tags,
          isImmediate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule post');
      }

      const data = await response.json();
      
      // Refetch shares to include the new one
      await fetchShares();
      
      if (isImmediate) {
        toast({
          title: 'Post Submitted',
          description: `Video "${title}" has been submitted for immediate posting to ${provider}.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Post Scheduled',
          description: `Video "${title}" has been scheduled for ${scheduledFor.toLocaleString()}.`,
          variant: 'default'
        });
      }

      return data.share;
    } catch (err) {
      console.error('Error scheduling post:', err);
      
      toast({
        title: 'Scheduling Failed',
        description: err instanceof Error ? err.message : 'Failed to schedule post',
        variant: 'destructive'
      });
      
      return null;
    }
  };

  // Get analytics for a video
  const getAnalytics = async (
    provider: string,
    shareId?: string,
    videoId?: string
  ): Promise<YouTubeVideoAnalytics | null> => {
    try {
      if (!shareId && !videoId) {
        throw new Error('Either shareId or videoId is required');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (shareId) params.append('shareId', shareId);
      if (videoId) params.append('videoId', videoId);

      const response = await fetch(`/api/social/${provider}/analytics?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${provider} analytics`);
      }

      const data = await response.json();
      return data.analytics;
    } catch (err) {
      console.error(`Error fetching ${provider} analytics:`, err);
      
      toast({
        title: 'Analytics Error',
        description: err instanceof Error ? err.message : `Failed to fetch ${provider} analytics`,
        variant: 'destructive'
      });
      
      return null;
    }
  };

  return {
    shares,
    isLoading,
    error,
    uploadToYouTube,
    scheduleShare,
    getAnalytics,
    fetchSharesByReactionId
  };
}