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
    
    console.log(`[Reaction Detail] Found reaction: ${reaction.id}, has video path: ${!!reaction.reaction_video_storage_path}, source_video_id: ${reaction.source_video_id || 'none'}`);
    
    // If the reaction doesn't have a video path but has a source_video_id, try to get the path from the source video
    if (!reaction.reaction_video_storage_path && reaction.source_video_id) {
      console.log(`[Reaction Detail] Reaction ${reaction.id} missing video path, checking source video ${reaction.source_video_id}`);
      
      try {
        const { data: sourceVideo, error: sourceVideoError } = await supabaseAdmin
          .from('source_videos')
          .select('storage_path, public_url')
          .eq('id', reaction.source_video_id)
          .maybeSingle();
          
        if (!sourceVideoError && sourceVideo) {
          if (sourceVideo.storage_path) {
            console.log(`[Reaction Detail] Found source video with storage path: ${sourceVideo.storage_path}, updating reaction`);
            
            // Update the reaction with the source video's storage path
            const { data: updatedReaction, error: updateError } = await supabaseAdmin
              .from('reactions')
              .update({
                reaction_video_storage_path: sourceVideo.storage_path,
                status: 'uploaded'  // Update status since we now have a valid video path
              })
              .eq('id', reaction.id)
              .select()
              .single();
              
            if (!updateError && updatedReaction) {
              console.log(`[Reaction Detail] Successfully updated reaction ${reaction.id} with storage path`);
              return NextResponse.json(updatedReaction);
            } else {
              console.error(`[Reaction Detail] Failed to update reaction with storage path:`, updateError);
            }
          } else {
            // Try to fetch the full source video details to ensure we have all necessary data
            console.log(`[Reaction Detail] Source video missing storage_path, checking source videos library API`);
            
            // Make an internal request to the videos library API
            const sourceResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/videos/library?id=${reaction.source_video_id}`);
            
            if (sourceResponse.ok) {
              const sourceData = await sourceResponse.json();
              
              if (sourceData.videos && sourceData.videos.length > 0 && sourceData.videos[0].storage_path) {
                console.log(`[Reaction Detail] Found source video with storage path from library API: ${sourceData.videos[0].storage_path}`);
                
                // Update the reaction with the source video's storage path
                const { data: updatedReaction, error: updateError } = await supabaseAdmin
                  .from('reactions')
                  .update({
                    reaction_video_storage_path: sourceData.videos[0].storage_path,
                    status: 'uploaded'  // Update status since we now have a valid video path
                  })
                  .eq('id', reaction.id)
                  .select()
                  .single();
                  
                if (!updateError && updatedReaction) {
                  console.log(`[Reaction Detail] Successfully updated reaction ${reaction.id} with storage path from library API`);
                  return NextResponse.json(updatedReaction);
                }
              }
            }
            
            console.log(`[Reaction Detail] Source video missing storage_path or could not be found through library API`);
          }
        } else {
          console.log(`[Reaction Detail] Source video not found or missing storage path:`, sourceVideoError || 'No storage path');
        }
      } catch (sourceError) {
        console.error(`[Reaction Detail] Error checking source video:`, sourceError);
      }
    }
    
    return NextResponse.json(reaction);
    
  } catch (e: any) {
    console.error('[Reaction Detail] Unexpected error:', e);
    return NextResponse.json(
      { error: 'An internal server error occurred: ' + e.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reactions/[reactionId]
 * Updates a reaction by ID
 */
export async function PATCH(request: NextRequest) {
  // Extract reactionId from URL path segments
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const reactionId = segments[segments.length - 1];
  const session = await auth();
  
  console.log(`[Reaction Update] PATCH request for reactionId: ${reactionId}, session:`, session?.user?.id ? 'Authenticated' : 'Unauthenticated');
  
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
    // Parse the request body
    const body = await request.json();
    console.log(`[Reaction Update] Update data for reaction ${reactionId}:`, body);
    
    // Verify the reaction exists and belongs to the user
    const { data: existingReaction, error: checkError } = await supabaseAdmin
      .from('reactions')
      .select('id')
      .eq('id', reactionId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !existingReaction) {
      console.error(`[Reaction Update] Reaction ${reactionId} not found or doesn't belong to user ${userId}`);
      return NextResponse.json(
        { error: 'Reaction not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update the reaction
    const { data: updatedReaction, error: updateError } = await supabaseAdmin
      .from('reactions')
      .update(body)
      .eq('id', reactionId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error(`[Reaction Update] Error updating reaction ${reactionId}:`, updateError);
      return NextResponse.json(
        { error: 'Failed to update reaction: ' + updateError.message },
        { status: 500 }
      );
    }
    
    console.log(`[Reaction Update] Successfully updated reaction ${reactionId}`);
    return NextResponse.json(updatedReaction);
    
  } catch (e: any) {
    console.error('[Reaction Update] Unexpected error:', e);
    return NextResponse.json(
      { error: 'An internal server error occurred: ' + e.message },
      { status: 500 }
    );
  }
}