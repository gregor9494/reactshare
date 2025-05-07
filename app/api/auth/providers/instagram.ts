import { SocialProviderConfig, OAuthScopes } from '@/lib/types';

export const InstagramProvider: SocialProviderConfig = {
  id: 'instagram',
  name: 'Instagram',
  authProvider: 'instagram',
  color: 'text-pink-600',
  icon: 'Instagram',
  isAvailable: false, // Will be enabled in the future
  scopes: {
    read: 'user_profile,user_media',
    write: 'user_media',
  } as OAuthScopes,
  endpoints: {
    userInfo: 'https://graph.instagram.com/me',
    tokenRefresh: 'https://graph.instagram.com/refresh_access_token',
    upload: 'https://graph.instagram.com/me/media'
  },
  analyticsMetrics: [
    'impressions',
    'reach',
    'engagement',
    'likes',
    'comments'
  ],
  authCallbackUrl: '/dashboard/social',
  features: {
    upload: true,
    playlists: false,
    analytics: true,
    scheduling: true
  }
};