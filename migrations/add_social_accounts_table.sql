-- Create social_accounts table
CREATE TABLE social_accounts (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure user can only have one account per provider
  UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX social_accounts_user_id_idx ON social_accounts(user_id);
CREATE INDEX social_accounts_provider_idx ON social_accounts(provider);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_social_accounts_timestamp
BEFORE UPDATE ON social_accounts
FOR EACH ROW
EXECUTE FUNCTION update_social_account_timestamp();