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