import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// POST - Move videos to a folder
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { videoIds, folderId } = await request.json();

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'Video IDs are required' }, { status: 400 });
    }

    try {
      // If folderId is provided, verify it exists and belongs to the user
      if (folderId) {
        try {
          const { data: folder, error: folderError } = await supabase
            .from('folders')
            .select('id')
            .eq('id', folderId)
            .eq('user_id', userId)
            .single();

          if (folderError) {
            // If the error is that the table doesn't exist, return a helpful message
            if (folderError.code === '42P01') { // Table doesn't exist
              return NextResponse.json({
                error: 'Folders feature is not yet available. Please run the database migration first.',
                details: 'The folders table does not exist in the database.'
              }, { status: 500 });
            }
            
            return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
          }

          if (!folder) {
            return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
          }
        } catch (error: any) {
          console.warn('Error accessing folders table:', error);
          return NextResponse.json({
            error: 'Folders feature is not yet available. Please run the database migration first.',
            details: error.message
          }, { status: 500 });
        }
      }

      // Verify all videos belong to the user
      const { data: videos, error: videosError } = await supabase
        .from('source_videos')
        .select('id')
        .in('id', videoIds)
        .eq('user_id', userId);

      if (videosError) {
        console.error('Error verifying video ownership:', videosError);
        return NextResponse.json({ error: 'Failed to verify video ownership', details: videosError.message }, { status: 500 });
      }

      if (!videos || videos.length !== videoIds.length) {
        return NextResponse.json({ error: 'One or more videos not found or access denied' }, { status: 404 });
      }

      try {
        // Update the videos with the new folder_id (or null to remove from folder)
        const { error: updateError } = await supabase
          .from('source_videos')
          .update({
            folder_id: folderId || null,
            updated_at: new Date().toISOString()
          })
          .in('id', videoIds)
          .eq('user_id', userId);

        if (updateError) {
          // If the error is related to the folder_id column not existing
          if (updateError.message && updateError.message.includes('column "folder_id" of relation "source_videos" does not exist')) {
            return NextResponse.json({
              error: 'Folders feature is not yet available. Please run the database migration first.',
              details: 'The folder_id column does not exist in the source_videos table.'
            }, { status: 500 });
          }
          
          console.error('Error moving videos:', updateError);
          return NextResponse.json({ error: 'Failed to move videos', details: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, videoIds, folderId }, { status: 200 });
      } catch (error: any) {
        console.error('Error updating videos with folder_id:', error);
        return NextResponse.json({
          error: 'Failed to move videos. The folder_id column might not exist.',
          details: error.message
        }, { status: 500 });
      }
    } catch (error: any) {
      console.error('Error in move operation:', error);
      return NextResponse.json({
        error: 'An error occurred during the move operation.',
        details: error.message
      }, { status: 500 });
    }
  } catch (err) {
    console.error('API Error moving videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}