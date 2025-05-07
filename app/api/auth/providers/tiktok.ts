import { SocialProviderConfig, OAuthScopes } from '@/lib/types';

export const TikTokProvider: SocialProviderConfig = {
  id: 'tiktok',
  name: 'TikTok',
  authProvider: 'tiktok',
  color: 'text-black',
  icon: 'TikTok', // Custom icon component in components/ui/icons/tiktok.tsx
  isAvailable: true, // Now enabled with implementation
  scopes: {
    read: 'user.info.basic,video.list',
    write: 'video.upload,video.publish',
  } as OAuthScopes,
  endpoints: {
    userInfo: 'https://open-api.tiktok.com/user/info/',
    tokenRefresh: 'https://open-api.tiktok.com/oauth/refresh_token/',
    videos: 'https://open-api.tiktok.com/video/list/',
    upload: 'https://open-api.tiktok.com/share/video/upload/',
    analytics: 'https://open-api.tiktok.com/video/data/'
  },
  analyticsMetrics: [
    'views',
    'likes',
    'comments',
    'shares',
    'profile_views',
    'follower_count'
  ],
  authCallbackUrl: '/dashboard/social',
  features: {
    upload: true,
    playlists: false,
    analytics: true,
    scheduling: false // TikTok API doesn't support scheduling
  }
};