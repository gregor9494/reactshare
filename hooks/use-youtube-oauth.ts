"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { YouTubeProvider } from '@/app/api/auth/providers/youtube';

interface UseYouTubeOAuthResult {
  connectToYouTube: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

/**
 * A hook for handling YouTube OAuth connection
 * This simplifies the YouTube connection process throughout the app
 */
export default function useYouTubeOAuth(): UseYouTubeOAuthResult {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectToYouTube = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    try {
      // Open the OAuth flow - will redirect to Google
      await signIn('google', {
        callbackUrl: YouTubeProvider.authCallbackUrl,
        // Request YouTube-specific scopes for this sign-in
        scopes: [
          YouTubeProvider.scopes.read,
          YouTubeProvider.scopes.write,
          YouTubeProvider.scopes.upload
        ].join(' ')
      });
      
      // Note: With a provider like Google, signIn redirects the user
      // and doesn't return a result we can check here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Error connecting to YouTube:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    connectToYouTube,
    isConnecting,
    error
  };
}