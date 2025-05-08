# YouTube OAuth Troubleshooting Guide

This document provides detailed instructions for troubleshooting common issues with YouTube OAuth integration.

## Fixing "redirect_uri_mismatch" Error

The `redirect_uri_mismatch` error is one of the most common issues encountered when setting up OAuth with YouTube/Google. This happens when the callback URL registered in your Google Cloud Console doesn't match the URL that our application is sending during the authentication flow.

### Step 1: Locate Your OAuth Client Settings

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Click on the OAuth 2.0 Client ID that you're using for YouTube integration

### Step 2: Add All Required Redirect URIs

For our application, you need to add **multiple** redirect URIs to ensure that authentication works correctly:

1. In the "Authorized redirect URIs" section, add ALL of the following URLs:
   - `https://your-domain.com/api/auth/callback/youtube`
   - `https://your-domain.com/api/auth/callback/google`
   
   (Replace `your-domain.com` with your actual domain name. If testing locally, use `localhost:3000` or whatever port your application is running on)

2. Make sure there are no trailing slashes at the end of the URLs
3. Ensure the protocol (http/https) matches your actual deployment
4. Click "Save" to apply the changes

### Step 3: Wait for Changes to Propagate

Google's systems may take up to 5-10 minutes to fully propagate your changes. This is a common source of confusion as users try again immediately and still see the error.

After adding the redirect URIs:
1. Wait at least 5 minutes
2. Clear your browser cache or try in an incognito window
3. Then attempt to connect to YouTube again

### Common Mistakes to Avoid

1. **Missing the "google" callback**: While we use a custom YouTube provider, the system may sometimes fall back to the generic Google provider
2. **Protocol mismatch**: Using `https://` when your application is only served over `http://`, or vice versa
3. **Port mismatch in development**: Using `:3000` in production but testing with a different port locally
4. **Trailing slashes**: Adding `/` at the end of URLs (Google treats these as different URLs)
5. **Subdomain issues**: Using `www.` when your application doesn't include it, or vice versa

### Environment-Specific Configurations

#### Production Environment
- Always use HTTPS URLs for production
- Ensure your NEXTAUTH_URL environment variable is set correctly

#### Development Environment
- Add both `http://localhost:PORT/api/auth/callback/youtube` and `http://localhost:PORT/api/auth/callback/google`
- Ensure your NEXTAUTH_URL environment variable points to your local environment

### Getting Technical Support

If you continue to experience issues after following these steps:

1. Check the browser console for specific error details
2. Look at the network tab to see the exact redirect URI being sent to Google
3. Verify that your Google API project has YouTube Data API v3 enabled
4. Ensure your OAuth consent screen is configured correctly with the appropriate scopes

---

Remember that authentication issues are almost always related to mismatched URLs or incorrect OAuth configuration. By carefully following these steps, most issues can be resolved without needing to modify the application code.