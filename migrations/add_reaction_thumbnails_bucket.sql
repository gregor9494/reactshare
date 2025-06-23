-- Create the new bucket for reaction thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('reaction-thumbnails', 'reaction-thumbnails', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create policy for anonymous users to select from the new bucket
CREATE POLICY "reaction-thumbnails-select-policy"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'reaction-thumbnails');

-- Create policy for authenticated users to manage their own thumbnails
CREATE POLICY "reaction-thumbnails-auth-policy"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'reaction-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);