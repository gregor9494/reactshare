import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // Import auth function from next-auth
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema for creating a new reaction metadata entry
const createReactionSchema = z.object({
  source_video_url: z.string().url({ message: 'Invalid source video URL' }),
  title: z.string().optional(), // Optional title for now
});

// Initialize Supabase client using SERVICE_ROLE_KEY for server-side operations
// This allows bypassing RLS if needed, but we'll still filter by user_id manually for safety.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for reactions route.');
  // Avoid throwing during runtime, handle gracefully in handlers
}

// Create a Supabase client instance specifically for this route
// Consider creating a shared server-side client utility later
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// --- POST Handler: Create new reaction metadata ---
export async function POST(request: Request) {
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

  const { source_video_url, title } = validationResult.data;

  try {
    // Insert new reaction record into Supabase
    const { data, error } = await supabaseAdmin
      .from('reactions')
      .insert({
        user_id: userId,
        source_video_url: source_video_url,
        title: title, // Add title if provided
        status: 'pending_upload', // Initial status
      })
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
    const session = await auth(); // Get session using next-auth
    if (!session?.user?.id) {
      console.error('GET /api/reactions: Unauthorized - No session or user ID.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Fetch reactions for the logged-in user from Supabase
    const { data, error } = await supabaseAdmin
      .from('reactions')
      .select('*') // Select all columns for now
      .eq('user_id', userId) // Filter by the authenticated user's ID
      .order('created_at', { ascending: false }); // Order by creation date

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