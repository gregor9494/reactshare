"use client";

import { useState } from 'react';
import { SocialAccount, YouTubeChannel } from '@/lib/types';
import useSocialAccounts from './use-social-accounts';

interface UseYouTubeAccountResult {
  youtubeAccount: SocialAccount | undefined;
  channelData: YouTubeChannel | undefined;
  isLoading: boolean;
  error: string | null;
  refreshChannel: () => Promise<void>;
  uploadVideo: (params: {
    reactionId: string;
    title: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    playlistId?: string;
  }) => Promise<{
    success: boolean;
    videoId?: string;
    videoUrl?: string;
    error?: string;
  }>;
  getVideoAnalytics: (videoId: string) => Promise<any>;
}

export default function useYouTubeAccount(): UseYouTubeAccountResult {
  const { accounts, isLoading: accountsLoading, error: accountsError, getAccountByProvider } = useSocialAccounts();
  const [isLoading, setIsLoading] = useState<boolean>(accountsLoading);
  const [error, setError] = useState<string | null>(accountsError);

  const youtubeAccount = getAccountByProvider('youtube');
  const channelData = youtubeAccount?.profile_data as YouTubeChannel | undefined;

  const refreshChannel = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!youtubeAccount) {
        throw new Error('No YouTube account connected');
      }

      const response = await fetch('/api/social/youtube', {
        method: 'POST', // This is our refresh endpoint
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh YouTube channel');
      }

      // Force a refresh of the accounts
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error refreshing YouTube channel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadVideo = async ({
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
  }): Promise<{
    success: boolean;
    videoId?: string;
    videoUrl?: string;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!youtubeAccount) {
        throw new Error('No YouTube account connected');
      }

      const response = await fetch('/api/social/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reactionId,
          title,
          description,
          privacy,
          tags,
          playlistId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload video to YouTube');
      }

      return {
        success: true,
        videoId: data.videoId,
        videoUrl: data.videoUrl
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error uploading to YouTube:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unknown error occurred'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoAnalytics = async (videoId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!youtubeAccount) {
        throw new Error('No YouTube account connected');
      }

      const response = await fetch(`/api/social/youtube/analytics?videoId=${videoId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get video analytics');
      }

      const data = await response.json();
      return data.analytics;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error getting video analytics:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    youtubeAccount,
    channelData,
    isLoading,
    error,
    refreshChannel,
    uploadVideo,
    getVideoAnalytics
  };
}