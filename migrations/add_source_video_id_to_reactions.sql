-- Add source_video_id column to reactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'reactions' AND column_name = 'source_video_id'
    ) THEN
        ALTER TABLE reactions ADD COLUMN source_video_id uuid;
        COMMENT ON COLUMN reactions.source_video_id IS 'ID of the source video for this reaction';
    END IF;
END $$;

-- Add index on source_video_id for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'reactions' AND indexname = 'reactions_source_video_id_idx'
    ) THEN
        CREATE INDEX reactions_source_video_id_idx ON reactions(source_video_id);
    END IF;
END $$;
