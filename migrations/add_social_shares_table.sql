-- Create social_shares table to track content shared to social media platforms
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_id UUID REFERENCES reactions(id) ON DELETE SET NULL,
  provider VARCHAR(20) NOT NULL, -- 'youtube', 'instagram', 'twitter', etc.
  provider_post_id VARCHAR(255), -- ID of the post on the provider platform
  provider_post_url TEXT, -- URL to the post
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'published', 'scheduled', 'failed'
  scheduled_for TIMESTAMPTZ, -- Timestamp for when post should be published (for scheduled posts)
  published_at TIMESTAMPTZ, -- When the post was actually published
  metadata JSONB, -- Store additional post data (title, description, hashtags, etc.)
  analytics JSONB, -- Store analytics data (views, likes, comments, etc.)
  last_analytics_sync TIMESTAMPTZ, -- Last time analytics were synced
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX social_shares_user_id_idx ON social_shares(user_id);
CREATE INDEX social_shares_reaction_id_idx ON social_shares(reaction_id);
CREATE INDEX social_shares_provider_idx ON social_shares(provider);
CREATE INDEX social_shares_status_idx ON social_shares(status);
CREATE INDEX social_shares_scheduled_for_idx ON social_shares(scheduled_for);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_share_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_social_shares_timestamp
BEFORE UPDATE ON social_shares
FOR EACH ROW
EXECUTE FUNCTION update_social_share_timestamp();