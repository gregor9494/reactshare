import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { videoIds } = await request.json();

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'No video IDs provided' }, { status: 400 });
    }

    // First, verify that all videos belong to the user
    const { data: videos, error: fetchError } = await supabase
      .from('source_videos')
      .select('id, storage_path')
      .eq('user_id', userId)
      .in('id', videoIds);

    if (fetchError) {
      console.error('Error fetching videos for deletion:', fetchError);
      return NextResponse.json({ error: 'Failed to verify video ownership', details: fetchError.message }, { status: 500 });
    }

    // Check if all requested videos were found
    if (!videos || videos.length !== videoIds.length) {
      return NextResponse.json({ error: 'One or more videos not found or not owned by user' }, { status: 404 });
    }

    // Delete the videos from the database
    const { error: deleteError } = await supabase
      .from('source_videos')
      .delete()
      .eq('user_id', userId)
      .in('id', videoIds);

    if (deleteError) {
      console.error('Error deleting videos:', deleteError);
      return NextResponse.json({ error: 'Failed to delete videos', details: deleteError.message }, { status: 500 });
    }

    // If we have storage paths, we could also delete the files from storage
    // This would require additional code to handle Supabase storage deletion

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${videos.length} video(s)`,
      deletedIds: videoIds
    }, { status: 200 });

  } catch (err) {
    console.error('API Error deleting videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}