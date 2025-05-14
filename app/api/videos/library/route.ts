import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { SourceVideo } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
}
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId');
    const videoId = url.searchParams.get('id');

    // Fetch a specific video if ID is provided
    if (videoId) {
      const { data: videoArray, error: videoError } = await supabase
        .from('source_videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', userId);

      if (videoError) {
        console.error('Error fetching specific source video:', videoError);
        return NextResponse.json({ error: 'Failed to fetch source video', details: videoError.message }, { status: 500 });
      }
      if (!videoArray || videoArray.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      const videoRecord = videoArray[0];
      return NextResponse.json({
        videos: [videoRecord] as SourceVideo[],
        folders: []
      }, { status: 200 });
    }

    // Fetch folders
    let folders = [];
    const { data: foldersData, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (!folderError && foldersData) {
      folders = foldersData;
    }

    // Build query for completed videos
    let query = supabase
      .from('source_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (folderId) {
      if (folderId === 'null') {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching completed source videos:', error);
      return NextResponse.json({ error: 'Failed to fetch completed source videos', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      videos: data as SourceVideo[],
      folders,
      currentFolderId: folderId
    }, { status: 200 });
  } catch (err) {
    console.error('API Error fetching source videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}