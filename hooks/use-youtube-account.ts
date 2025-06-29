"use client";

import { useState, useEffect } from 'react';
import { SocialAccount, YouTubeChannel } from '@/lib/types';
import useSocialAccounts from './use-social-accounts';

interface UseYouTubeAccountResult {
  youtubeAccounts: SocialAccount[];
  youtubeAccount: SocialAccount | undefined;
  channelData: YouTubeChannel | undefined;
  isLoading: boolean;
  error: string | null;
  refreshChannel: () => Promise<void>;
  selectAccount: (accountId: string) => void;
  selectedAccountId: string | null;
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
  const { accounts, isLoading: accountsLoading, error: accountsError } = useSocialAccounts();
  const [isLoading, setIsLoading] = useState<boolean>(accountsLoading);
  const [error, setError] = useState<string | null>(accountsError);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Filter to get only YouTube accounts
  const youtubeAccounts = accounts.filter(account => 
    account.provider.toLowerCase() === 'youtube' && account.status === 'active'
  );
  
  // Set the first YouTube account as selected by default if none is selected
  useEffect(() => {
    if (youtubeAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(youtubeAccounts[0].id);
    }
  }, [youtubeAccounts, selectedAccountId]);

  // Get the currently selected account
  const youtubeAccount = youtubeAccounts.find(account => account.id === selectedAccountId);
  const channelData = youtubeAccount?.profile_data as YouTubeChannel | undefined;

  // Function to select a different YouTube account
  const selectAccount = (accountId: string) => {
    const account = youtubeAccounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccountId(accountId);
    }
  };

  const refreshChannel = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!youtubeAccount) {
        throw new Error('No YouTube account connected');
      }

      const response = await fetch('/api/social/youtube', {
        method: 'POST', // This is our refresh endpoint
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccountId
        }),
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
    youtubeAccounts,
    youtubeAccount,
    channelData,
    isLoading,
    error,
    refreshChannel,
    selectAccount,
    selectedAccountId,
    uploadVideo,
    getVideoAnalytics
  };
}
