-- Update RLS for reaction-videos bucket
-- Run this script to allow client uploads for reaction-videos without owner constraint

DROP POLICY IF EXISTS "Users can manage their own reaction videos" ON storage.objects;

-- Allow public insert (upload) into reaction-videos bucket
CREATE POLICY "public_insert_reaction_videos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'reaction-videos');

-- Allow public select (download/list) from reaction-videos bucket
CREATE POLICY "public_select_reaction_videos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'reaction-videos');

-- (Optional) allow deletes if needed
CREATE POLICY "public_delete_reaction_videos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'reaction-videos');