import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/reactions/lookup
 * Lookup a reaction by source_video_id
 * Query params:
 * - sourceVideoId: ID of the source video to find the corresponding reaction
 */
export async function GET(request: Request) {
  const session = await auth();
  
  console.log('Reaction lookup API called with session:', session?.user?.id ? 'Authenticated' : 'Unauthenticated');
  
  if (!session?.user?.id) {
    console.log('Reaction lookup API: Unauthorized - No valid session');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const sourceVideoId = url.searchParams.get('sourceVideoId');
    
    if (!sourceVideoId) {
      console.log('Reaction lookup API: Missing sourceVideoId parameter');
      return NextResponse.json(
        { error: 'Missing sourceVideoId parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Reaction lookup API: Looking for reaction with source_video_id ${sourceVideoId} for user ${session.user.id}`);

    // Step 1: Get the source_video_url from the source_videos table
    const { data: sourceVideo, error: sourceVideoError } = await serviceClient
      .from('source_videos')
      .select('source_video_url')
      .eq('id', sourceVideoId)
      .eq('user_id', session.user.id) // Ensure user owns the source video
      .maybeSingle();

    if (sourceVideoError) {
      console.error('Reaction lookup API: Error fetching source video URL:', sourceVideoError);
      return NextResponse.json(
        { error: 'Error fetching source video details: ' + sourceVideoError.message },
        { status: 500 }
      );
    }

    if (!sourceVideo || !sourceVideo.source_video_url) {
      console.log(`Reaction lookup API: Source video not found or has no URL for id ${sourceVideoId}`);
      return NextResponse.json({ error: 'Source video not found or missing URL' }, { status: 404 });
    }
    
    // Step 2: Query the reactions table using the fetched source_video_url
    console.log(`Reaction lookup API: Looking for reactions with source_video_url ${sourceVideo.source_video_url}`);
    const { data, error } = await serviceClient
      .from('reactions')
      .select('id, title, status')
      .eq('source_video_url', sourceVideo.source_video_url)
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('Reaction lookup API: Error fetching reaction by URL:', error);
      return NextResponse.json(
        { error: 'Error fetching reaction: ' + error.message },
        { status: 500 }
      );
    }
    
    console.log(`Reaction lookup API: Found ${data?.length || 0} reactions for source video ${sourceVideoId}`);
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in reaction lookup API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}