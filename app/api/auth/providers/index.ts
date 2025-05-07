import { SocialProviderConfig } from '@/lib/types';
import { YouTubeProvider } from './youtube';
import { InstagramProvider } from './instagram';
import { TwitterProvider } from './twitter';
import { FacebookProvider } from './facebook';
import { TikTokProvider } from './tiktok';

// Map of all available social providers
const SocialProviders: Record<string, SocialProviderConfig> = {
  youtube: YouTubeProvider,
  instagram: InstagramProvider, 
  twitter: TwitterProvider,
  facebook: FacebookProvider,
  tiktok: TikTokProvider
};

// Utility functions
export const getSocialProvider = (providerId: string): SocialProviderConfig | undefined => {
  return SocialProviders[providerId.toLowerCase()];
};

export const getAvailableProviders = (): SocialProviderConfig[] => {
  return Object.values(SocialProviders).filter(provider => provider.isAvailable);
};

export const getProviders = (): Record<string, SocialProviderConfig> => {
  return SocialProviders;
};

export {
  YouTubeProvider,
  InstagramProvider,
  TwitterProvider,
  FacebookProvider,
  TikTokProvider
};