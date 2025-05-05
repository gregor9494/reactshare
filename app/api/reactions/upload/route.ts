import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // Import auth function from next-auth
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema for requesting a signed upload URL
const uploadRequestSchema = z.object({
  fileName: z.string().min(1, { message: 'File name is required' }),
  fileType: z.string().min(1, { message: 'File type is required' }),
  reactionId: z.string().uuid({ message: 'Valid reaction ID is required' }), // To associate the upload
});

// Initialize Supabase client using SERVICE_ROLE_KEY for server-side operations
// Generating signed URLs requires admin privileges or specific policies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for upload route.');
}

// Create Supabase admin client instance
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

const BUCKET_NAME = 'reaction-videos'; // Match the bucket name created in Supabase
const SIGNED_URL_EXPIRES_IN = 60 * 5; // URL valid for 5 minutes

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
  const validationResult = uploadRequestSchema.safeParse(requestBody);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
    return NextResponse.json({ error: `Invalid input: ${errorMessages}` }, { status: 400 });
  }

  const { fileName, fileType, reactionId } = validationResult.data;

  // Construct the storage path. Ensure it's unique and user-specific.
  // Example: user_id/reaction_id/original_filename.mp4
  // Consider sanitizing fileName to prevent path traversal issues.
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_'); // Basic sanitization
  const storagePath = `${userId}/${reactionId}/${sanitizedFileName}`;

  try {
    // Optional: Verify the reactionId belongs to the current user before generating URL
    const { data: reactionData, error: reactionError } = await supabaseAdmin
      .from('reactions')
      .select('id')
      .eq('id', reactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (reactionError || !reactionData) {
        console.error(`Verification failed for reaction ${reactionId} and user ${userId}:`, reactionError);
        return NextResponse.json({ error: 'Reaction not found or access denied.' }, { status: 404 });
    }

    // This route's purpose is to verify the reaction belongs to the user
    // and return the intended storage path for the client-side upload.
    // The actual upload will be handled by the client using @supabase/supabase-js,
    // relying on RLS policies for authorization.

    console.log(`Verified reaction ${reactionId} for user ${userId}. Intended storage path: ${storagePath}`);

    // Return the path the client should use for uploading
    return NextResponse.json({ storagePath: storagePath }, { status: 200 });

  } catch (e) {
    console.error('Unexpected error generating upload info:', e);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}