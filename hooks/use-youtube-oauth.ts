"use client";

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { YouTubeProvider } from '@/app/api/auth/providers/youtube';
import { logOAuthDebugInfo } from '@/lib/oauth-debug';

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

  // On mount, log the expected callback URL to help with debugging
  useEffect(() => {
    // Only run once on mount
    if (typeof window !== 'undefined') {
      console.log('[YouTube OAuth] Component mounted. Expected callback URL info:');
      logOAuthDebugInfo();
    }
  }, []);

  const connectToYouTube = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    try {
      // Define the redirect destination after successful authentication
      const callbackUrl = `/dashboard/social`;
      
      // Log detailed OAuth information to help with debugging
      console.log('[YouTube OAuth] Starting authentication flow...');
      const expectedCallbackUrl = logOAuthDebugInfo('youtube');
      const googleCallbackUrl = logOAuthDebugInfo('google');
      
      console.log('[YouTube OAuth] Make sure BOTH of these URLs are configured in Google Cloud Console:');
      console.log('1.', expectedCallbackUrl, '(primary)');
      console.log('2.', googleCallbackUrl, '(fallback)');
      
      // Use the dedicated YouTube provider which has the required scopes
      // This will redirect to Google's OAuth page, then to our callback handler,
      // then to the specified callbackUrl after successful authentication
      await signIn('youtube', {
        callbackUrl, // Where to redirect after successful auth
        redirect: true,
      });
      
      // Note: With redirect:true, the code below won't execute as the page will navigate away
    } catch (err) {
      // This will only run for client-side errors before the redirect happens
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('[YouTube OAuth] Error connecting to YouTube:', err);
    } finally {
      // This likely won't execute due to the page redirect
      setIsConnecting(false);
    }
  };

  return {
    connectToYouTube,
    isConnecting,
    error
  };
}