import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for video download route.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
const BUCKET_NAME = 'source-videos';

export async function GET(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  
  // Get the video ID from the URL
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }
  
  try {
    // Query the database to get the video details
    const { data: videos, error } = await supabaseAdmin
      .from('source_videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // Ensure the user can only access their own videos
      .eq('status', 'completed'); // Only allow downloading completed videos
    
    if (error) {
      console.error('Error fetching source video:', error);
      return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 500 });
    }
    
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'Video not found or not completed' }, { status: 404 });
    }
    
    const video = videos[0];
    
    if (!video.storage_path) {
      return NextResponse.json({ error: 'Video file not found in storage' }, { status: 404 });
    }
    
    // Get a signed URL for the file (even if the bucket is public, this ensures proper access control)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(video.storage_path, 60); // 60 seconds expiry
    
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }
    
    // Create a filename for the download
    const filename = video.title 
      ? `${video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4` 
      : `video_${id}.mp4`;
    
    // Redirect to the signed URL with Content-Disposition header to trigger download
    return new Response(null, {
      status: 302, // Temporary redirect
      headers: {
        'Location': signedUrlData.signedUrl,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
    
  } catch (error) {
    console.error('Unexpected error in video download:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}