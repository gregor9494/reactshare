/**
 * OAuth Debugging Utilities
 * 
 * This file contains utilities to help debug OAuth issues,
 * particularly with redirect URI mismatches.
 */

interface OAuthError {
  provider: string;
  error: string;
  description: string;
}

/**
 * Returns the expected callback URL for a given provider
 * This is useful for debugging redirect_uri_mismatch errors
 */
export function getExpectedCallbackUrl(provider = 'youtube'): string {
  // Get the base URL from environment, or derive from window in client context
  const baseUrl = process.env.NEXTAUTH_URL || 
                 (typeof window !== 'undefined' ? window.location.origin : '');
  
  // The callback URL follows a predictable pattern for NextAuth.js
  return `${baseUrl}/api/auth/callback/${provider}`;
}

/**
 * Logs OAuth debugging information to help identify issues
 * Returns the expected callback URL for reference
 */
export function logOAuthDebugInfo(provider = 'youtube'): string {
  const expectedCallbackUrl = getExpectedCallbackUrl(provider);
  
  console.log('=== OAuth Debug Information ===');
  console.log(`Provider: ${provider}`);
  console.log(`Expected callback URL: ${expectedCallbackUrl}`);
  console.log(`NEXTAUTH_URL env: ${process.env.NEXTAUTH_URL || 'Not set'}`);
  
  if (typeof window !== 'undefined') {
    console.log(`Window origin: ${window.location.origin}`);
    console.log(`Current URL: ${window.location.href}`);
  }
  
  console.log('=== End OAuth Debug Info ===');
  
  return expectedCallbackUrl;
}

/**
 * Extracts error information from URL parameters
 * Useful for debugging OAuth errors that come back in the redirect
 */
export function extractOAuthErrorFromUrl(): { error: string | null, errorDescription: string | null } {
  if (typeof window === 'undefined') {
    return { error: null, errorDescription: null };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');
  
  if (error) {
    console.error(`OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
  }
  
  return { error, errorDescription };
}

/**
 * Checks for OAuth errors in the URL and returns structured error info
 * Used by components to display appropriate error messages
 */
export function checkForOAuthErrors(): OAuthError | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description') || '';
  const provider = urlParams.get('provider') || 'unknown';
  
  if (error) {
    console.error(`OAuth Error for ${provider}: ${error} - ${errorDescription}`);
    return {
      provider,
      error,
      description: errorDescription
    };
  }
  
  return null;
}