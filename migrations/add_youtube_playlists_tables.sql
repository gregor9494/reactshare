-- Migration to add tables for storing YouTube playlist data

-- Table for YouTube playlists
CREATE TABLE IF NOT EXISTS youtube_playlists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL, -- YouTube's playlist ID
  title TEXT NOT NULL,
  description TEXT,
  privacy TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  
  -- Add unique constraint to prevent duplicates
  UNIQUE(user_id, playlist_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_playlists_user_id ON youtube_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_playlists_playlist_id ON youtube_playlists(playlist_id);

-- Table for YouTube playlist items (videos in playlists)
CREATE TABLE IF NOT EXISTS youtube_playlist_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL, -- YouTube's playlist ID
  video_id TEXT NOT NULL, -- YouTube's video ID
  playlist_item_id TEXT NOT NULL, -- YouTube's playlist item ID (unique for each video in a playlist)
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  
  -- Add unique constraint to prevent duplicates
  UNIQUE(user_id, playlist_item_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_playlist_items_user_id ON youtube_playlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_playlist_items_playlist_id ON youtube_playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_youtube_playlist_items_video_id ON youtube_playlist_items(video_id);

-- Add RLS policies for youtube_playlists
ALTER TABLE youtube_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY youtube_playlists_select_policy
  ON youtube_playlists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY youtube_playlists_insert_policy
  ON youtube_playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY youtube_playlists_update_policy
  ON youtube_playlists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY youtube_playlists_delete_policy
  ON youtube_playlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for youtube_playlist_items
ALTER TABLE youtube_playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY youtube_playlist_items_select_policy
  ON youtube_playlist_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY youtube_playlist_items_insert_policy
  ON youtube_playlist_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY youtube_playlist_items_update_policy
  ON youtube_playlist_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY youtube_playlist_items_delete_policy
  ON youtube_playlist_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on youtube_playlists table
CREATE TRIGGER update_youtube_playlists_modified
BEFORE UPDATE ON youtube_playlists
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();