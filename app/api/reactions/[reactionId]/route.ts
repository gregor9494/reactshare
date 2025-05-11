import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for reaction detail route.');
  // Avoid throwing during runtime, handle gracefully
}
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

interface RouteParams {
  params: {
    reactionId: string;
  };
}

/**
 * GET /api/reactions/[reactionId]
 * Fetches a single reaction by ID
 */
export async function GET(request: NextRequest) {
  // Extract reactionId from URL path segments
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const reactionId = segments[segments.length - 1];
  const session = await auth();
  
  console.log(`[Reaction Detail] GET request for reactionId: ${reactionId}, session:`, session?.user?.id ? 'Authenticated' : 'Unauthenticated');
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  if (!reactionId) {
    return NextResponse.json(
      { error: 'Reaction ID is missing from URL' },
      { status: 400 }
    );
  }
  
  try {
    // Get the reaction from the database
    console.log(`[Reaction Detail] Fetching reaction ${reactionId} for user ${userId}`);
    
    const { data: reaction, error } = await supabaseAdmin
      .from('reactions')
      .select('*')
      .eq('id', reactionId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error(`[Reaction Detail] Error fetching reaction ${reactionId} for user ${userId}:`, error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Reaction not found or access denied' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Error fetching reaction: ' + error.message },
        { status: 500 }
      );
    }
    
    if (!reaction) {
      console.log(`[Reaction Detail] Reaction ${reactionId} not found for user ${userId}`);
      return NextResponse.json(
        { error: 'Reaction not found or access denied' },
        { status: 404 }
      );
    }
    
    console.log(`[Reaction Detail] Found reaction: ${reaction.id}, has video path: ${!!reaction.reaction_video_storage_path}`);
    
    return NextResponse.json(reaction);
    
  } catch (e: any) {
    console.error('[Reaction Detail] Unexpected error:', e);
    return NextResponse.json(
      { error: 'An internal server error occurred: ' + e.message },
      { status: 500 }
    );
  }
}