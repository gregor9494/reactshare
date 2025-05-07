import { SocialProviderConfig, OAuthScopes } from '@/lib/types';

export const FacebookProvider: SocialProviderConfig = {
  id: 'facebook',
  name: 'Facebook',
  authProvider: 'facebook',
  color: 'text-blue-600',
  icon: 'Facebook',
  isAvailable: false, // Will be enabled in the future
  scopes: {
    read: 'public_profile,email',
    write: 'pages_manage_posts',
    upload: 'pages_read_engagement,pages_manage_posts,pages_show_list'
  } as OAuthScopes,
  endpoints: {
    userInfo: 'https://graph.facebook.com/me',
    tokenRefresh: 'https://graph.facebook.com/oauth/access_token',
    videos: 'https://graph.facebook.com/me/videos',
    upload: 'https://graph-video.facebook.com/me/videos'
  },
  analyticsMetrics: [
    'reach',
    'impressions',
    'engagement',
    'video_views',
    'post_reactions'
  ],
  authCallbackUrl: '/dashboard/social',
  features: {
    upload: true,
    playlists: false,
    analytics: true,
    scheduling: true
  }
};