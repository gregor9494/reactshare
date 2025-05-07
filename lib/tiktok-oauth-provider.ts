import type { OAuthConfig } from "next-auth/providers";
import { TikTokProvider } from "@/app/api/auth/providers/tiktok";

/**
 * TikTok OAuth provider configuration for NextAuth.
 * As TikTok is not a built-in provider in NextAuth, we need to create a custom OAuth provider
 * See: https://next-auth.js.org/configuration/providers/oauth
 */
export function getTikTokOAuthConfig(): OAuthConfig<any> {
  return {
    id: "tiktok",
    name: "TikTok",
    type: "oauth",
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    
    // TikTok requires PKCE for OAuth 2.0 flows
    // See: https://developers.tiktok.com/doc/oauth-api-authorize/
    authorization: {
      url: "https://www.tiktok.com/auth/authorize/",
      params: {
        scope: TikTokProvider.scopes.read + "," + TikTokProvider.scopes.write,
        response_type: "code",
      }
    },
    
    // Token endpoint
    token: {
      url: "https://open-api.tiktok.com/oauth/access_token/",
    },
    
    // User info endpoint - we'll handle fetching this separately in the auth.ts signIn callback
    // as TikTok's user info endpoint requires the access token in the header
    userinfo: {
      url: "https://open-api.tiktok.com/user/info/",
      // TikTok returns a nested structure we need to traverse to get the user
      async request({ tokens, client }: { tokens: { access_token: string }; client: any }) {
        const response = await fetch("https://open-api.tiktok.com/user/info/", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        })
        
        const data = await response.json()
        return data.data?.user || {}
      }
    },
    
    // Profile callback to extract user info from TikTok response
    profile(profile) {
      return {
        id: profile.open_id,
        name: profile.display_name,
        image: profile.avatar_url,
        email: null, // TikTok doesn't provide email
      }
    },
    
    // Style options
    style: {
      logo: "/tiktok-logo.svg",
      bg: "#ffffff",
      text: "#000000",
    },
  }
}