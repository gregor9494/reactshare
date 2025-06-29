import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // Import auth function from next-auth
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

// Schema for creating a new reaction metadata entry
const createReactionSchema = z.object({
  source_video_url: z.string().url({ message: 'Invalid source video URL' }).optional(),
  source_video_id: z.string().optional(), // Allow creating from source_video_id
  title: z.string().optional(), // Optional title for now
}).refine(data => data.source_video_url || data.source_video_id, {
  message: 'Either source_video_url or source_video_id must be provided',
});


// --- POST Handler: Create new reaction metadata ---
export async function POST(request: Request) {
  const supabaseAdmin = createSupabaseServiceClient();
  const session = await auth(); // Get session using next-auth
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate input
  const validationResult = createReactionSchema.safeParse(requestBody);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
    return NextResponse.json({ error: `Invalid input: ${errorMessages}` }, { status: 400 });
  }

  const { source_video_url, source_video_id, title } = validationResult.data;

  try {
    // Prepare the reaction data
    const reactionData: any = {
      user_id: userId,
      title: title, // Add title if provided
      status: 'pending_upload', // Initial status
    };

    // Set source_video_url and source_video_id if provided
    if (source_video_id) {
      console.log(`POST /api/reactions: source_video_id ${source_video_id} provided. Fetching details.`);
      
      
      const { data: sourceVideo, error: sourceVideoError } = await supabaseAdmin
        .from('source_videos')
        .select('public_url, storage_path, thumbnail_url, status') // Also fetch storage_path
        .eq('id', source_video_id)
        .maybeSingle();

      if (sourceVideoError) {
        console.error('POST /api/reactions: Error fetching source video by ID:', sourceVideoError);
        return NextResponse.json({ error: 'Failed to fetch source video details.' }, { status: 500 });
      }

      if (!sourceVideo) {
        return NextResponse.json({ error: 'Source video not found.' }, { status: 404 });
      }

      if (sourceVideo.status !== 'completed') {
        return NextResponse.json({ error: `Source video is not ready yet. Status: ${sourceVideo.status}` }, { status: 400 });
      }

      if (!sourceVideo.public_url) {
        return NextResponse.json({ error: 'Source video is missing a public URL.' }, { status: 400 });
      }
      
      reactionData.source_video_url = sourceVideo.public_url;
      if (sourceVideo.storage_path) {
        reactionData.reaction_video_storage_path = sourceVideo.storage_path; // Set this for the reaction
        reactionData.status = 'uploaded'; // Mark as uploaded since the video exists
        console.log(`POST /api/reactions: Using source video storage path: ${sourceVideo.storage_path}`);
      } else {
        console.warn(`POST /api/reactions: Source video ${source_video_id} missing storage_path, cannot set reaction_video_storage_path`);
      }
      
      // Title is now solely based on the request body
      
      // Assign thumbnail_url if the source video has one
      if (sourceVideo.thumbnail_url) {
        reactionData.thumbnail_url = sourceVideo.thumbnail_url;
        console.log(`POST /api/reactions: Thumbnail URL ${sourceVideo.thumbnail_url} assigned to the new reaction.`);
      } else {
        console.warn(`POST /api/reactions: Source video ${source_video_id} does not have a thumbnail_url.`);
      }

      console.log(`POST /api/reactions: Using URL ${reactionData.source_video_url} and path ${reactionData.reaction_video_storage_path} from source_video ${source_video_id}. Status set to 'uploaded'.`);

    } else if (source_video_url) {
      // This case is for when a new video URL is provided, implying a new recording will be uploaded later.
      // So, status remains 'pending_upload' and no reaction_video_storage_path yet.
      reactionData.source_video_url = source_video_url;
      console.log(`POST /api/reactions: Using provided source_video_url ${source_video_url}`);
    } else {
      // This case should be caught by Zod schema validation, but as a safeguard:
      return NextResponse.json({ error: 'Either source_video_url or source_video_id must be provided.' }, { status: 400 });
    }
    
    // Insert new reaction record into Supabase
    console.log('POST /api/reactions: Inserting reaction with data:', {
      userId: reactionData.user_id,
      title: reactionData.title,
      status: reactionData.status,
      source_video_url: reactionData.source_video_url,
      hasThumbnail: !!reactionData.thumbnail_url
    });

    const { data, error } = await supabaseAdmin
      .from('reactions')
      .insert([reactionData])
      .select() // Return the created record
      .single(); // Expecting a single record to be created

    if (error) {
      console.error('Supabase Insert Reaction Error:', error.message);
      // Handle specific errors like unique constraint violations if needed
      return NextResponse.json({ error: 'Failed to create reaction metadata.' }, { status: 500 });
    }

    console.log(`Created reaction metadata for user ${userId}:`, data);
    return NextResponse.json(data, { status: 201 });

  } catch (e) {
    console.error('Unexpected error creating reaction:', e);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// --- GET Handler: Fetch user's reactions ---
export async function GET(request: Request) {
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const session = await auth(); // Get session using next-auth
    if (!session?.user?.id) {
      console.error('GET /api/reactions: Unauthorized - No session or user ID.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Parse query parameters
    const url = new URL(request.url);
    const sourceVideoId = url.searchParams.get('sourceVideoId');
    
    // Build the query
    let query = supabaseAdmin
      .from('reactions')
      .select(
        `
        id,
        title,
        status,
        created_at,
        reaction_video_storage_path,
        thumbnail_url
      `
      )
      .eq('user_id', userId); // Filter by the authenticated user's ID
    
    
    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false }); // Order by creation date

    if (error) {
      console.error('GET /api/reactions: Supabase Fetch Reactions Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch reactions.' }, { status: 500 });
    }

    console.log(`GET /api/reactions: Fetched ${data?.length || 0} reactions for user ${userId}`);
    return NextResponse.json(data || [], { status: 200 });

  } catch (e) {
    console.error('GET /api/reactions: Unexpected error:', e);
    // Return a generic 500 error response
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
