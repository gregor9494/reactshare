import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth'; // Assuming your auth setup is here
import { SourceVideo } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
  // Potentially throw an error or handle this case appropriately
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

    console.log('API Request URL:', request.url);
    console.log('Parsed URL parameters - folderId:', folderId, 'videoId:', videoId);
    console.log('User ID:', userId);

    // If a specific video ID is requested, fetch just that video
    if (videoId) {
      console.log('Fetching specific video with ID:', videoId);
      
      const { data, error } = await supabase
        .from('source_videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', userId)
        .single();

      console.log('Supabase query result - data:', data, 'error:', error);

      if (error) {
        console.error('Error fetching specific source video:', error);
        return NextResponse.json({ error: 'Failed to fetch source video', details: error.message }, { status: 500 });
      }

      if (!data) {
        console.log('No video found with ID:', videoId);
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      console.log('Returning single video:', data);
      return NextResponse.json({
        videos: [data] as SourceVideo[],
        folders: []
      }, { status: 200 });
    }

    // Fetch folders for the user
    let folders = [];
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (!error) {
        folders = data;
      } else {
        // If the error is that the table doesn't exist, we'll just continue with empty folders
        if (error.code === '42P01') { // Table doesn't exist
          console.warn('Folders table does not exist yet. Continuing with empty folders array.');
        } else {
          console.error('Error fetching folders:', error);
        }
      }
    } catch (folderError) {
      console.warn('Error fetching folders, continuing with empty folders array:', folderError);
    }

    // Build query for videos
    let query = supabase
      .from('source_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed'); // Only fetch completed videos

    // If folderId is provided and folders table exists, filter by folder
    if (folderId && folders.length > 0) {
      if (folderId === 'null') {
        // Special case: show videos without a folder
        try {
          query = query.is('folder_id', null);
        } catch (error) {
          console.warn('Could not filter by folder_id, the column might not exist:', error);
        }
      } else {
        // Show videos in the specified folder
        try {
          query = query.eq('folder_id', folderId);
        } catch (error) {
          console.warn('Could not filter by folder_id, the column might not exist:', error);
        }
      }
    }

    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed source videos:', error);
      return NextResponse.json({ error: 'Failed to fetch completed source videos', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      videos: data as SourceVideo[],
      folders: folders || [],
      currentFolderId: folderId
    }, { status: 200 });

  } catch (err) {
    console.error('API Error fetching completed source videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}