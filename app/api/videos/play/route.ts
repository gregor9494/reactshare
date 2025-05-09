import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for video play route.');
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
    // Query the database for the video
    const { data: videos, error } = await supabaseAdmin
      .from('source_videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (error) {
      console.error('Error fetching source video:', error);
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
    }
    
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    const video = videos[0];
    
    if (!video.storage_path) {
      return NextResponse.json({ error: 'Video file not available' }, { status: 404 });
    }
    
    // Get the public URL of the video
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(video.storage_path);
    
    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
    }
    
    // Redirect to the public URL of the video
    return NextResponse.redirect(publicUrlData.publicUrl);
    
  } catch (error) {
    console.error('Unexpected error playing video:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}