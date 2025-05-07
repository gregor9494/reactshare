-- Migration: Add thumbnail_url column and verify/update metrics columns in source_videos

-- Add thumbnail_url column to store the URL of the self-hosted thumbnail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'source_videos' AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE source_videos ADD COLUMN thumbnail_url TEXT;
        COMMENT ON COLUMN source_videos.thumbnail_url IS 'URL of the self-hosted thumbnail image';
    END IF;
END $$;

-- Verify and ensure processing_time_seconds column exists with NUMERIC type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'source_videos' AND column_name = 'processing_time_seconds' AND data_type = 'numeric'
    ) THEN
        -- If it exists but with a different type, it might need manual intervention or a more complex migration.
        -- For now, we'll attempt to add it if it doesn't exist, assuming it's missing or was dropped.
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'source_videos' AND column_name = 'processing_time_seconds'
        ) THEN
            ALTER TABLE source_videos ADD COLUMN processing_time_seconds NUMERIC;
        ELSE
            -- If it exists with wrong type, this ALTER might fail or might be what's needed.
            -- Supabase might handle type changes gracefully or require a cast.
            -- This is a best-effort to ensure it's NUMERIC.
            ALTER TABLE source_videos ALTER COLUMN processing_time_seconds TYPE NUMERIC USING processing_time_seconds::NUMERIC;
        END IF;
        COMMENT ON COLUMN source_videos.processing_time_seconds IS 'Total time in seconds to download and process the video';
    END IF;
END $$;

-- Verify and ensure completed_at column exists with TIMESTAMP WITH TIME ZONE type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'source_videos' AND column_name = 'completed_at' AND data_type = 'timestamp with time zone'
    ) THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'source_videos' AND column_name = 'completed_at'
        ) THEN
            ALTER TABLE source_videos ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        ELSE
            ALTER TABLE source_videos ALTER COLUMN completed_at TYPE TIMESTAMP WITH TIME ZONE USING completed_at::TIMESTAMP WITH TIME ZONE;
        END IF;
        COMMENT ON COLUMN source_videos.completed_at IS 'Timestamp when video processing was completed';
    END IF;
END $$;

-- The following columns are expected by the code and should be in previous migrations.
-- This is just a check and comment for clarity.
-- platform TEXT; -- Should be added when video info is fetched
-- title TEXT; -- Should be added when video info is fetched
-- duration NUMERIC; -- Should be added when video info is fetched

-- Refresh Supabase schema cache (conceptual - actual refresh happens on Supabase side)
-- No direct SQL command for this, but applying migrations usually triggers it.
-- Consider manually refreshing in Supabase dashboard if issues persist after applying.

SELECT pg_notify('supabase_migrations', '{"type": "schema_change"}'); -- Attempt to notify Supabase about schema changes