import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  visibility: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl?: string;
  playlistItemId?: string; // Used for videos in playlists
  publishedAt?: string;
  position?: number;
}

export interface UseYouTubePlaylistsReturn {
  playlists: YouTubePlaylist[];
  playlistVideos: YouTubeVideo[];
  availableVideos: YouTubeVideo[];
  isLoading: boolean;
  error: string | null;
  loadPlaylists: () => Promise<void>;
  loadPlaylistVideos: (playlistId: string) => Promise<void>;
  loadAvailableVideos: () => Promise<void>;
  createPlaylist: (data: { title: string; description?: string; privacy: 'public' | 'unlisted' | 'private' }) => Promise<boolean>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addVideoToPlaylist: (videoId: string, playlistId: string) => Promise<boolean>;
  removeVideoFromPlaylist: (playlistItemId: string, playlistId: string) => Promise<boolean>;
}

export default function useYouTubePlaylists(): UseYouTubePlaylistsReturn {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [availableVideos, setAvailableVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiError = (error: any): string => {
    console.error('API Error:', error);
    const errorMessage = 
      error?.message || 
      (typeof error === 'string' ? error : 'An unexpected error occurred');
    setError(errorMessage);
    return errorMessage;
  };

  const loadPlaylists = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/youtube/playlists');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle 404 "YouTube account not found" error silently
        if (response.status === 404 && errorData.error === 'YouTube account not found') {
          console.log('No YouTube account connected. Playlists will be empty.');
          setPlaylists([]);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to load playlists');
      }
      
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error loading playlists",
        description: handleApiError(error),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPlaylistVideos = useCallback(async (playlistId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle 404 "YouTube account not found" error silently
        if (response.status === 404 && errorData.error === 'YouTube account not found') {
          console.log('No YouTube account connected. Playlist videos will be empty.');
          setPlaylistVideos([]);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to load playlist videos');
      }
      
      const data = await response.json();
      setPlaylistVideos(data.videos || []);
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error loading playlist videos",
        description: handleApiError(error),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAvailableVideos = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/youtube/videos');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle 404 "YouTube account not found" error silently
        if (response.status === 404 && errorData.error === 'YouTube account not found') {
          console.log('No YouTube account connected. Available videos will be empty.');
          setAvailableVideos([]);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to load available videos');
      }
      
      const data = await response.json();
      setAvailableVideos(data.videos || []);
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error loading available videos",
        description: handleApiError(error),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPlaylist = useCallback(async (data: { 
    title: string; 
    description?: string; 
    privacy: 'public' | 'unlisted' | 'private' 
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/youtube/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create playlist');
      }
      
      await loadPlaylists();
      
      toast({
        title: "Playlist created",
        description: "Your YouTube playlist has been created successfully",
      });
      
      return true;
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error creating playlist",
        description: handleApiError(error),
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadPlaylists]);

  const deletePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete playlist');
      }
      
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      
      toast({
        title: "Playlist deleted",
        description: "The playlist has been deleted successfully",
      });
      
      return true;
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error deleting playlist",
        description: handleApiError(error),
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addVideoToPlaylist = useCallback(async (videoId: string, playlistId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add video to playlist');
      }
      
      // Reload the playlist videos
      await loadPlaylistVideos(playlistId);
      
      // Update the playlist item count in the playlists array
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, itemCount: p.itemCount + 1 } 
          : p
      ));
      
      toast({
        title: "Video added",
        description: "The video has been added to the playlist",
      });
      
      return true;
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error adding video",
        description: handleApiError(error),
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadPlaylistVideos]);

  const removeVideoFromPlaylist = useCallback(async (playlistItemId: string, playlistId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos?itemId=${playlistItemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove video from playlist');
      }
      
      // Remove the video from the playlistVideos state
      setPlaylistVideos(prev => prev.filter(v => v.playlistItemId !== playlistItemId));
      
      // Update the playlist item count in the playlists array
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { ...p, itemCount: p.itemCount - 1 } 
          : p
      ));
      
      toast({
        title: "Video removed",
        description: "The video has been removed from the playlist",
      });
      
      return true;
    } catch (error) {
      handleApiError(error);
      toast({
        title: "Error removing video",
        description: handleApiError(error),
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load playlists on initial render
  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  return {
    playlists,
    playlistVideos,
    availableVideos,
    isLoading,
    error,
    loadPlaylists,
    loadPlaylistVideos,
    loadAvailableVideos,
    createPlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist
  };
}