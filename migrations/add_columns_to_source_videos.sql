-- Add error_message and public_url columns to source_videos table if they don't exist

-- Check if error_message column exists, if not add it
-- This column stores any error messages encountered during the download process
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'source_videos' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE source_videos ADD COLUMN error_message TEXT;
        COMMENT ON COLUMN source_videos.error_message IS 'Error messages from download attempts';
    END IF;
END $$;

-- Check if public_url column exists, if not add it
-- This column stores the public URL for accessing the video after it's uploaded to storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'source_videos' AND column_name = 'public_url'
    ) THEN
        ALTER TABLE source_videos ADD COLUMN public_url TEXT;
        COMMENT ON COLUMN source_videos.public_url IS 'Public URL for accessing the video from Supabase storage';
    END IF;
END $$;

-- Ensure the source_videos table has the proper status values and documentation
COMMENT ON COLUMN source_videos.status IS 'Status of the video: processing, downloading, uploading, completed, error';

-- Add index on user_id for faster queries (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'source_videos' AND indexname = 'source_videos_user_id_idx'
    ) THEN
        CREATE INDEX source_videos_user_id_idx ON source_videos(user_id);
    END IF;
END $$;

-- Add index on status for faster filtering (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'source_videos' AND indexname = 'source_videos_status_idx'
    ) THEN
        CREATE INDEX source_videos_status_idx ON source_videos(status);
    END IF;
END $$;