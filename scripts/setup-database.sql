-- ReactShare Database Setup Script
-- This script is idempotent and can be run multiple times.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: social_accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  provider_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  profile_data JSONB,
  scope TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remove old unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_user_id_provider_key'
    ) THEN
        ALTER TABLE social_accounts DROP CONSTRAINT social_accounts_user_id_provider_key;
    END IF;
END $$;

-- Table: reactions (assuming this table exists from initial setup, as it's referenced)
-- If it doesn't exist, it should be created. Let's ensure it's there.
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    source_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- Table: social_shares
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_id UUID REFERENCES reactions(id) ON DELETE SET NULL,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_post_id VARCHAR(255),
  provider_post_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB,
  analytics JSONB,
  last_analytics_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: folders
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: source_videos (assuming this exists from initial setup)
-- Let's ensure it exists.
CREATE TABLE IF NOT EXISTS source_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    storage_path TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- Add columns to source_videos
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS download_progress INTEGER;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS processing_time_seconds NUMERIC;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;


-- Add columns to reactions
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS reaction_video_storage_path TEXT;
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS source_video_id UUID;


-- Table: youtube_playlists
CREATE TABLE IF NOT EXISTS youtube_playlists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  privacy TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  UNIQUE(user_id, playlist_id)
);

-- Table: youtube_playlist_items
CREATE TABLE IF NOT EXISTS youtube_playlist_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  playlist_item_id TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  UNIQUE(user_id, playlist_item_id)
);


-- RLS Policies
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own social accounts" ON social_accounts;
CREATE POLICY "Users can manage their own social accounts" ON social_accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own social shares" ON social_shares;
CREATE POLICY "Users can manage their own social shares" ON social_shares FOR ALL USING (auth.uid() = user_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;
CREATE POLICY "Users can manage their own folders" ON folders FOR ALL USING (auth.uid() = user_id);

ALTER TABLE youtube_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS youtube_playlists_select_policy ON youtube_playlists;
CREATE POLICY youtube_playlists_select_policy ON youtube_playlists FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlists_insert_policy ON youtube_playlists;
CREATE POLICY youtube_playlists_insert_policy ON youtube_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlists_update_policy ON youtube_playlists;
CREATE POLICY youtube_playlists_update_policy ON youtube_playlists FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlists_delete_policy ON youtube_playlists;
CREATE POLICY youtube_playlists_delete_policy ON youtube_playlists FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE youtube_playlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS youtube_playlist_items_select_policy ON youtube_playlist_items;
CREATE POLICY youtube_playlist_items_select_policy ON youtube_playlist_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlist_items_insert_policy ON youtube_playlist_items;
CREATE POLICY youtube_playlist_items_insert_policy ON youtube_playlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlist_items_update_policy ON youtube_playlist_items;
CREATE POLICY youtube_playlist_items_update_policy ON youtube_playlist_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS youtube_playlist_items_delete_policy ON youtube_playlist_items;
CREATE POLICY youtube_playlist_items_delete_policy ON youtube_playlist_items FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON reactions;
CREATE POLICY "Users can manage their own reactions" ON reactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE source_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own source videos" ON source_videos;
CREATE POLICY "Users can manage their own source videos" ON source_videos FOR ALL USING (auth.uid() = user_id);
-- Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('source-videos', 'source-videos', true),
  ('reaction-videos', 'reaction-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
DROP POLICY IF EXISTS "Users can manage their own source videos" ON storage.objects;
CREATE POLICY "Users can manage their own source videos" ON storage.objects
  FOR ALL
  USING (bucket_id = 'source-videos' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'source-videos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can manage their own reaction videos" ON storage.objects;
CREATE POLICY "Users can manage their own reaction videos" ON storage.objects
  FOR ALL
  USING (bucket_id = 'reaction-videos' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'reaction-videos' AND auth.uid() = owner);