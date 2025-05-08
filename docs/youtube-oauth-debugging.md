# YouTube OAuth Debugging Guide

## Problem: `redirect_uri_mismatch` Error

When connecting to YouTube, you may encounter a `400: redirect_uri_mismatch` error. This occurs when the callback URL registered in your Google Cloud Console doesn't match the one used by your application during the OAuth flow.

## Root Cause

The issue is that NextAuth.js uses different callback URLs depending on the provider ID:

- When using `signIn('google')` → `/api/auth/callback/google`
- When using `signIn('youtube')` → `/api/auth/callback/youtube`

If only the Google callback URL is registered in Google Cloud Console, but you're using the custom YouTube provider in your code, this mismatch occurs.

## Solution

### 1. Register Both Callback URLs in Google Cloud Console

In your [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add **both** of these redirect URIs to your OAuth 2.0 Client ID:

```
https://yourdomain.com/api/auth/callback/google
https://yourdomain.com/api/auth/callback/youtube
```

For local development:
```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/youtube
```

### 2. Ensure Proper Provider Configuration

The application now has two providers configured in `auth.ts`:

1. The standard Google provider (with ID 'google')
2. A custom YouTube provider (with ID 'youtube')

Both use the same Google OAuth endpoints but have different provider IDs for NextAuth.js.

### 3. Authentication Flow

The auth flow has been updated to accept tokens from either provider:

```typescript
// Handle Google or YouTube auth
if ((account?.provider === 'google' || account?.provider === 'youtube') && account.access_token) {
  // Check if this is a YouTube authentication
  const isYouTubeAuth = account.provider === 'youtube' || 
                       (account.provider === 'google' && (
                         account.scope?.includes('youtube') ||
                         account.scope?.includes('https://www.googleapis.com/auth/youtube.readonly')
                       ));
  
  if (isYouTubeAuth && user?.id) {
    // Save the token for YouTube access
    // ...
  }
}
```

## Troubleshooting

If you continue to experience issues:

1. Check the browser console for OAuth debugging information
2. Verify that both callback URLs are registered in Google Cloud Console
3. Ensure you have the correct scopes configured (`youtube.readonly`, `youtube.force-ssl`, etc.)
4. Remember that changes to OAuth settings in Google Cloud Console may take a few minutes to propagate

## Understanding NextAuth.js Callback URLs

NextAuth.js constructs callback URLs based on:
- Your site's base URL (from `NEXTAUTH_URL` environment variable or inferred from the request)
- The provider ID used in the `signIn()` call

This is why using `signIn('youtube')` requires a different callback URL than `signIn('google')`, even though both use Google's OAuth endpoints.