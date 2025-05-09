-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on user_id for faster queries
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);

-- Add folder_id to source_videos table
ALTER TABLE source_videos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Add index on folder_id for faster queries
CREATE INDEX IF NOT EXISTS source_videos_folder_id_idx ON source_videos(folder_id);