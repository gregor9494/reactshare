import { SocialProviderConfig, OAuthScopes } from '@/lib/types';

export const TwitterProvider: SocialProviderConfig = {
  id: 'twitter',
  name: 'Twitter',
  authProvider: 'twitter',
  color: 'text-blue-400',
  icon: 'Twitter',
  isAvailable: false, // Will be enabled in the future
  scopes: {
    read: 'tweet.read,users.read',
    write: 'tweet.write,tweet.read',
  } as OAuthScopes,
  endpoints: {
    userInfo: 'https://api.twitter.com/2/users/me',
    tokenRefresh: 'https://api.twitter.com/2/oauth2/token',
    upload: 'https://upload.twitter.com/1.1/media/upload.json'
  },
  analyticsMetrics: [
    'impressions',
    'engagements',
    'likes',
    'retweets',
    'replies'
  ],
  authCallbackUrl: '/dashboard/social',
  features: {
    upload: true,
    playlists: false,
    analytics: true,
    scheduling: true
  }
};