-- ReactShare Database Setup Script
-- Run this in your Supabase SQL Editor after creating a new project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'youtube', 'instagram', etc.
  provider_account_id VARCHAR(255) NOT NULL, -- The ID from the provider
  provider_username VARCHAR(255), -- Username on the platform
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  profile_data JSONB, -- Store additional profile data
  scope TEXT, -- OAuth scopes granted
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'token_expired', 'disconnected'
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS social_accounts_provider_idx ON social_accounts(provider);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_social_accounts_timestamp ON social_accounts;
CREATE TRIGGER update_social_accounts_timestamp
BEFORE UPDATE ON social_accounts
FOR EACH ROW
EXECUTE FUNCTION update_social_account_timestamp();

-- Create social_shares table
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_id UUID NOT NULL,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  platform_post_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'scheduled', 'published', 'failed'
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  content TEXT,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for social_shares
CREATE INDEX IF NOT EXISTS social_shares_user_id_idx ON social_shares(user_id);
CREATE INDEX IF NOT EXISTS social_shares_reaction_id_idx ON social_shares(reaction_id);
CREATE INDEX IF NOT EXISTS social_shares_social_account_id_idx ON social_shares(social_account_id);
CREATE INDEX IF NOT EXISTS social_shares_status_idx ON social_shares(status);
CREATE INDEX IF NOT EXISTS social_shares_scheduled_at_idx ON social_shares(scheduled_at);

-- Add update trigger for social_shares
CREATE OR REPLACE FUNCTION update_social_shares_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_social_shares_timestamp ON social_shares;
CREATE TRIGGER update_social_shares_timestamp
BEFORE UPDATE ON social_shares
FOR EACH ROW
EXECUTE FUNCTION update_social_shares_timestamp();

-- Create youtube_playlists table
CREATE TABLE IF NOT EXISTS youtube_playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  youtube_playlist_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  privacy_status VARCHAR(20) NOT NULL DEFAULT 'private',
  thumbnail_url TEXT,
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(social_account_id, youtube_playlist_id)
);

-- Create youtube_playlist_videos table
CREATE TABLE IF NOT EXISTS youtube_playlist_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES youtube_playlists(id) ON DELETE CASCADE,
  youtube_video_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration VARCHAR(20),
  position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, youtube_video_id)
);

-- Create indexes for YouTube tables
CREATE INDEX IF NOT EXISTS youtube_playlists_user_id_idx ON youtube_playlists(user_id);
CREATE INDEX IF NOT EXISTS youtube_playlists_social_account_id_idx ON youtube_playlists(social_account_id);
CREATE INDEX IF NOT EXISTS youtube_playlist_videos_playlist_id_idx ON youtube_playlist_videos(playlist_id);

-- Add update trigger for youtube_playlists
CREATE OR REPLACE FUNCTION update_youtube_playlists_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_youtube_playlists_timestamp ON youtube_playlists;
CREATE TRIGGER update_youtube_playlists_timestamp
BEFORE UPDATE ON youtube_playlists
FOR EACH ROW
EXECUTE FUNCTION update_youtube_playlists_timestamp();

-- Create folders table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON folders(parent_id);

-- Add any other tables that might be missing
-- You can add more CREATE TABLE statements here for other tables your app needs

-- Grant necessary permissions (adjust as needed)
-- These are basic permissions - you might need to adjust based on your RLS policies

-- Enable Row Level Security on all tables
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (users can only access their own data)
CREATE POLICY "Users can view their own social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view their own social shares" ON social_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social shares" ON social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social shares" ON social_shares
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social shares" ON social_shares
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own youtube playlists" ON youtube_playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube playlists" ON youtube_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own youtube playlists" ON youtube_playlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube playlists" ON youtube_playlists
  FOR DELETE USING (auth.uid() = user_id);

-- YouTube playlist videos inherit permissions from playlists
CREATE POLICY "Users can view youtube playlist videos" ON youtube_playlist_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM youtube_playlists 
      WHERE youtube_playlists.id = youtube_playlist_videos.playlist_id 
      AND youtube_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert youtube playlist videos" ON youtube_playlist_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM youtube_playlists 
      WHERE youtube_playlists.id = youtube_playlist_videos.playlist_id 
      AND youtube_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update youtube playlist videos" ON youtube_playlist_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM youtube_playlists 
      WHERE youtube_playlists.id = youtube_playlist_videos.playlist_id 
      AND youtube_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete youtube playlist videos" ON youtube_playlist_videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM youtube_playlists 
      WHERE youtube_playlists.id = youtube_playlist_videos.playlist_id 
      AND youtube_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);