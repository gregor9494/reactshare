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