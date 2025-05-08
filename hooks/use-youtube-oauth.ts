"use client";

import { useState, useEffect } from 'react';

interface UseYouTubeOAuthResult {
  connectToYouTube: () => void;
  isConnecting: boolean;
  error: string | null;
}

/**
 * A hook for handling YouTube OAuth connection
 * This requires configuring the redirect URI:
 *   ${window.location.origin}/api/social/youtube/oauth-callback
 */
export default function useYouTubeOAuth(): UseYouTubeOAuthResult {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`[YouTube OAuth] Expected redirect URI: ${window.location.origin}/api/social/youtube/oauth-callback`);
    }
  }, []);

  const connectToYouTube = (): void => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('[YouTube OAuth] Starting authentication flow...');
      const redirectUri = `${window.location.origin}/api/social/youtube/oauth-callback`;
      const googleOauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleOauthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
      googleOauthUrl.searchParams.set('redirect_uri', redirectUri);
      googleOauthUrl.searchParams.set('response_type', 'code');
      googleOauthUrl.searchParams.set('scope', [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.upload'
      ].join(' '));
      googleOauthUrl.searchParams.set('access_type', 'offline');
      googleOauthUrl.searchParams.set('prompt', 'consent');

      console.log(`[YouTube OAuth] Redirecting to: ${googleOauthUrl.toString()}`);
      window.location.href = googleOauthUrl.toString();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('[YouTube OAuth] Error:', message);
      setError(message);
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