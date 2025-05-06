-- Migration: Add download progress and performance metrics columns to source_videos

-- Add download_progress column to track percentage completion
ALTER TABLE source_videos 
ADD COLUMN IF NOT EXISTS download_progress INTEGER;

-- Add processing_time_seconds to record total processing time
ALTER TABLE source_videos 
ADD COLUMN IF NOT EXISTS processing_time_seconds NUMERIC;

-- Add completed_at to record when the download and process completed
ALTER TABLE source_videos 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add index on status column for faster queries
CREATE INDEX IF NOT EXISTS idx_source_videos_status ON source_videos(status);

-- Add index on user_id column for faster queries
CREATE INDEX IF NOT EXISTS idx_source_videos_user_id ON source_videos(user_id);

-- Comments explaining the columns
COMMENT ON COLUMN source_videos.download_progress IS 'Percentage of download completion (0-100)';
COMMENT ON COLUMN source_videos.processing_time_seconds IS 'Total time in seconds to download and process the video';
COMMENT ON COLUMN source_videos.completed_at IS 'Timestamp when video processing was completed';