import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// GET - Fetch a specific folder and its videos
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const folderId = params.id;

    try {
      // Fetch the folder
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('*')
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
        
        console.error('Error fetching folder:', folderError);
        return NextResponse.json({ error: 'Failed to fetch folder', details: folderError.message }, { status: 500 });
      }

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      // Fetch videos in the folder
      try {
        const { data: videos, error: videosError } = await supabase
          .from('source_videos')
          .select('*')
          .eq('folder_id', folderId)
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (videosError) {
          // If the error is related to the folder_id column not existing
          console.error('Error fetching videos in folder:', videosError);
          return NextResponse.json({ folder, videos: [] }, { status: 200 });
        }

        return NextResponse.json({ folder, videos }, { status: 200 });
      } catch (videoError) {
        console.warn('Error fetching videos by folder, returning empty array:', videoError);
        return NextResponse.json({ folder, videos: [] }, { status: 200 });
      }
    } catch (error: any) {
      console.warn('Error accessing folders table:', error);
      return NextResponse.json({
        error: 'Folders feature is not yet available. Please run the database migration first.',
        details: error.message
      }, { status: 500 });
    }
  } catch (err) {
    console.error('API Error fetching folder and videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH - Update a folder
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const folderId = params.id;
    const { name, description } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    try {
      // Check if folder exists and belongs to user
      const { data: existingFolder, error: checkError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (checkError) {
        // If the error is that the table doesn't exist, return a helpful message
        if (checkError.code === '42P01') { // Table doesn't exist
          return NextResponse.json({
            error: 'Folders feature is not yet available. Please run the database migration first.',
            details: 'The folders table does not exist in the database.'
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
      }

      if (!existingFolder) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
      }

      // Update the folder
      const { data, error } = await supabase
        .from('folders')
        .update({
          name: name.trim(),
          description: description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error updating folder:', error);
        return NextResponse.json({ error: 'Failed to update folder', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ folder: data[0] }, { status: 200 });
    } catch (error: any) {
      console.warn('Error accessing folders table:', error);
      return NextResponse.json({
        error: 'Folders feature is not yet available. Please run the database migration first.',
        details: error.message
      }, { status: 500 });
    }
  } catch (err) {
    console.error('API Error updating folder:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE - Delete a folder
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const folderId = params.id;

    try {
      // Check if folder exists and belongs to user
      const { data: existingFolder, error: checkError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (checkError) {
        // If the error is that the table doesn't exist, return a helpful message
        if (checkError.code === '42P01') { // Table doesn't exist
          return NextResponse.json({
            error: 'Folders feature is not yet available. Please run the database migration first.',
            details: 'The folders table does not exist in the database.'
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
      }

      if (!existingFolder) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
      }

      try {
        // First, update all videos in this folder to have folder_id = null
        const { error: updateError } = await supabase
          .from('source_videos')
          .update({ folder_id: null })
          .eq('folder_id', folderId)
          .eq('user_id', userId);

        if (updateError) {
          // If the error is related to the folder_id column not existing, just continue
          console.warn('Error removing videos from folder, continuing with folder deletion:', updateError);
        }
      } catch (updateError) {
        console.warn('Error updating videos, continuing with folder deletion:', updateError);
      }

      // Then delete the folder
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting folder:', deleteError);
        return NextResponse.json({ error: 'Failed to delete folder', details: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
      console.warn('Error accessing folders table:', error);
      return NextResponse.json({
        error: 'Folders feature is not yet available. Please run the database migration first.',
        details: error.message
      }, { status: 500 });
    }
  } catch (err) {
    console.error('API Error deleting folder:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}