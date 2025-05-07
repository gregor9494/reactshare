import { SocialProviderConfig, OAuthScopes } from '@/lib/types';

/**
 * YouTube Provider Configuration
 *
 * This defines how the application interacts with the YouTube API
 * through Google OAuth for authentication and authorization.
 *
 * The scopes requested allow for:
 * - Reading channel and video data
 * - Managing videos and playlists
 * - Uploading new videos
 */
export const YouTubeProvider: SocialProviderConfig = {
  id: 'youtube',
  name: 'YouTube',
  authProvider: 'google',
  color: 'text-red-600',
  icon: 'Youtube',
  isAvailable: true,
  scopes: {
    read: 'https://www.googleapis.com/auth/youtube.readonly',
    write: 'https://www.googleapis.com/auth/youtube.force-ssl',
    upload: 'https://www.googleapis.com/auth/youtube.upload'
  } as OAuthScopes,
  endpoints: {
    userInfo: 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    tokenRefresh: 'https://oauth2.googleapis.com/token',
    videos: 'https://www.googleapis.com/youtube/v3/videos',
    playlists: 'https://www.googleapis.com/youtube/v3/playlists',
    playlistItems: 'https://www.googleapis.com/youtube/v3/playlistItems',
    upload: 'https://www.googleapis.com/upload/youtube/v3/videos',
    analytics: 'https://youtubeanalytics.googleapis.com/v2/reports'
  },
  analyticsMetrics: [
    'views',
    'likes',
    'comments',
    'shares',
    'watchTime',
    'averageViewDuration',
    'estimatedRevenue',
    'subscribersGained'
  ],
  authCallbackUrl: '/dashboard/social',
  features: {
    upload: true,
    playlists: true,
    analytics: true,
    scheduling: true,
    monetization: true
  }
};