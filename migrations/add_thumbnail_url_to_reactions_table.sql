-- Add the thumbnail_url column to the reactions table
ALTER TABLE public.reactions
ADD COLUMN thumbnail_url TEXT;

-- Optional: Add a comment to describe the new column
COMMENT ON COLUMN public.reactions.thumbnail_url IS 'The public URL of the reaction video thumbnail, hosted in Supabase Storage.';