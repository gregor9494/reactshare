// Define the Reaction interface based on the Supabase 'reactions' table schema
export interface Reaction {
  id: string;
  user_id: string;
  source_video_url: string;
  reaction_video_storage_path: string | null;
  title: string | null;
  status: string; // e.g., 'pending_upload', 'uploaded', 'processing', 'published', 'error'
  created_at: string; // Supabase returns timestamps as strings
  updated_at: string; // Supabase returns timestamps as strings
}

// Interface for social media accounts
export interface SocialAccount {
  id: string;
  user_id: string;
  provider: string; // 'youtube', 'instagram', 'twitter', etc.
  provider_account_id: string; // ID from the provider
  provider_username: string | null; // Username on the platform
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null; // Timestamp when token expires
  profile_data?: any; // JSON data with additional profile information
  scope: string | null; // OAuth scopes granted
  status: 'active' | 'token_expired' | 'disconnected'; // Account status
  last_sync_at: string | null; // Last time account data was synced
  created_at: string;
  updated_at: string;
}

// You can add other types here as needed
// export interface Profile { ... }
export interface SourceVideo {
  id: string;
  user_id: string;
  original_url: string;
  storage_path: string | null; // Path in Supabase storage after download
  title: string | null; // Video title, fetched from source or user-defined
  thumbnail_url: string | null; // URL of a thumbnail image
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'processing'; // Download/processing status
  created_at: string;
  updated_at: string;
  duration?: number; // Optional: duration in seconds
  file_format?: string; // Optional: e.g., 'mp4', 'webm'
  file_size?: number; // Optional: size in bytes
}

// YouTube specific types
export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

// Interface for social media shares
export interface SocialShare {
  id: string;
  user_id: string;
  reaction_id: string | null;
  provider: string; // 'youtube', 'instagram', 'twitter', etc.
  provider_post_id: string | null;
  provider_post_url: string | null;
  status: 'pending' | 'published' | 'scheduled' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  metadata: {
    title: string;
    description?: string;
    privacy?: 'public' | 'unlisted' | 'private';
    tags?: string[];
    thumbnailUrl?: string;
    [key: string]: any;
  };
  analytics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    [key: string]: any;
  };
  last_analytics_sync: string | null;
  created_at: string;
  updated_at: string;
}

// YouTube analytics specific types
export interface YouTubeVideoAnalytics {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  favorites: number;
  shares: number;
  watchTime: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  averageViewDuration: number;
  averageViewPercentage: number;
  demographics: {
    ageGroups: { [key: string]: number };
    genders: { [key: string]: number };
    countries: { [key: string]: number };
  };
  data_source?: 'real_api' | 'fallback'; // Indicates if data is from API or generated as fallback
}

// OAuth scopes configuration
export interface OAuthScopes {
  read: string;
  write: string;
  upload?: string;
  [key: string]: string | undefined;
}

// Social provider configuration
export interface SocialProviderConfig {
  id: string;
  name: string;
  authProvider: string;
  color: string;
  icon: string;
  isAvailable: boolean;
  scopes: OAuthScopes;
  endpoints: {
    userInfo: string;
    tokenRefresh: string;
    videos?: string;
    playlists?: string;
    upload?: string;
    [key: string]: string | undefined;
  };
  analyticsMetrics: string[];
  authCallbackUrl: string;
  features: {
    upload: boolean;
    playlists: boolean;
    analytics: boolean;
    scheduling: boolean;
    [key: string]: boolean;
  };
}