import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase-server';


const completeUploadSchema = z.object({
  storagePath: z.string().min(1, { message: 'Storage path is required' }),
});

interface RouteParams {
  params: {
    reactionId: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // @ts-ignore Awaiting dynamic route params Proxy
  const { reactionId } = await params;
  const supabaseAdmin = createSupabaseServiceClient();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!reactionId) {
    return NextResponse.json({ error: 'Reaction ID is missing from URL' }, { status: 400 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const validationResult = completeUploadSchema.safeParse(requestBody);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
    return NextResponse.json({ error: `Invalid input: ${errorMessages}` }, { status: 400 });
  }

  const { storagePath } = validationResult.data;
  console.log(`[CompleteUpload] PATCH request for reactionId: ${reactionId}, userId: ${userId}, storagePath: ${storagePath}`);

  try {
    // Verify the reaction exists and belongs to the user
    console.log(`[CompleteUpload] Fetching reaction ${reactionId} for user ${userId}`);
    const { data: reaction, error: fetchError } = await supabaseAdmin
      .from('reactions')
      .select('id, user_id, status')
      .eq('id', reactionId)
      // Ownership verification bypassed by service role; checking manually below
      .single(); // Use single to ensure it exists and belongs to user

    if (fetchError) {
      console.error(`[CompleteUpload] Error fetching reaction ${reactionId} for user ${userId}:`, fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Reaction not found or access denied.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Error verifying reaction: ' + fetchError.message }, { status: 500 });
    }

    if (!reaction) {
        console.error(`[CompleteUpload] Reaction ${reactionId} not found for user ${userId} (after fetch, no error but no data).`);
        return NextResponse.json({ error: 'Reaction not found or access denied.' }, { status: 404 });
    }
    // Ensure reaction belongs to session user
    if (reaction.user_id !== userId) {
        return NextResponse.json({ error: 'Reaction not found or access denied.' }, { status: 404 });
    }
    console.log(`[CompleteUpload] Found reaction: ${JSON.stringify(reaction)}`);
    
    // Update the reaction record
    console.log(`[CompleteUpload] Attempting to update reaction ${reactionId} with storagePath: ${storagePath}`);
    const updatePayload = {
      reaction_video_storage_path: storagePath,
      status: 'uploaded', // Or 'processed', 'ready_to_publish' etc.
      updated_at: new Date().toISOString(),
    };
    console.log(`[CompleteUpload] Update payload: ${JSON.stringify(updatePayload)}`);

    const { data: updatedReaction, error: updateError } = await supabaseAdmin
      .from('reactions')
      .update(updatePayload) // Correctly pass the updatePayload object
      .eq('id', reactionId)
      // Ownership already verified above
      .select()
      .single();

    if (updateError) {
      console.error(`[CompleteUpload] Error updating reaction ${reactionId} with storage path:`, updateError);
      // Send back the actual Supabase error message if available
      const errorMessage = updateError.message || 'Failed to update reaction with video path.';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    console.log(`[CompleteUpload] Reaction ${reactionId} successfully updated. Result: ${JSON.stringify(updatedReaction)}`);
    return NextResponse.json(updatedReaction, { status: 200 });

  } catch (e: any) {
    console.error('[CompleteUpload] Unexpected error in complete-upload handler:', e);
    return NextResponse.json({ error: 'An internal server error occurred: ' + e.message }, { status: 500 });
  }
}