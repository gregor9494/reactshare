import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/social/shares/schedule
 * Schedules a video to be posted to social media at a later time
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  console.log('Schedule API called with session:', session?.user?.id ? 'Authenticated' : 'Unauthenticated');
  
  if (!session?.user?.id) {
    console.log('Schedule API: Unauthorized - No valid session');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const requestData = await request.json();
    const {
      reactionId,
      provider,
      title,
      description = '',
      scheduledFor,
      privacy = 'private',
      tags = [],
      isImmediate = false
    } = requestData;
    
    console.log('Schedule API: Request body received', {
      reactionId,
      provider,
      title: title ? `${title.substring(0, 20)}...` : 'missing',
      hasDescription: !!description,
      scheduledFor,
      privacy,
      tagsCount: tags?.length || 0,
      isImmediate
    });
    
    // Validate required fields
    if (!reactionId || !provider || !title || !scheduledFor) {
      console.log('Schedule API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields (reactionId, provider, title, scheduledFor)' },
        { status: 400 }
      );
    }
    
    // Verify the scheduled time is in the future, unless it's an immediate post
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();
    
    if (!isImmediate && scheduledTime <= now) {
      console.log('Schedule API: Scheduled time is not in the future');
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }
    
    // Verify the reaction exists and belongs to the user
    console.log(`Schedule API: Looking for reaction with id ${reactionId} for user ${session.user.id}`);
    const { data: reaction, error: reactionError } = await serviceClient
      .from('reactions')
      .select('id')
      .eq('id', reactionId)
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (reactionError) {
      console.log('Schedule API: Error fetching reaction:', reactionError);
      return NextResponse.json(
        { error: 'Error fetching reaction: ' + reactionError.message },
        { status: 500 }
      );
    }
    
    if (!reaction) {
      console.log(`Schedule API: Reaction not found with id ${reactionId} for user ${session.user.id}`);
      return NextResponse.json(
        { error: 'Reaction not found or unauthorized' },
        { status: 404 }
      );
    }
    
    console.log('Schedule API: Reaction found:', { id: reaction.id });
    
    // Check if the user has a connected account for the specified provider
    const { data: socialAccount, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('id, provider')
      .eq('user_id', session.user.id)
      .eq('provider', provider.toLowerCase())
      .eq('status', 'active')
      .single();
    
    if (accountError || !socialAccount) {
      return NextResponse.json(
        { error: `No active ${provider} account connected` },
        { status: 400 }
      );
    }
    
    // Create the share record
    const { data: share, error } = await serviceClient
      .from('social_shares')
      .insert([{
        user_id: session.user.id,
        reaction_id: reactionId,
        provider: provider.toLowerCase(),
        status: isImmediate ? 'pending' : 'scheduled',
        scheduled_for: scheduledTime.toISOString(),
        metadata: {
          title,
          description,
          privacy,
          tags,
          isImmediate
        }
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error scheduling social share:', error);
      return NextResponse.json(
        { error: 'Failed to schedule social share' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      share,
      message: isImmediate
        ? `Post submitted for immediate publishing`
        : `Post scheduled for ${scheduledTime.toLocaleString()}`
    });
  } catch (error) {
    console.error('Unexpected error scheduling social share:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/shares/schedule/:id
 * Cancels a scheduled post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const id = params.id;
    
    // Verify the share exists and belongs to the user
    const { data: share, error: findError } = await serviceClient
      .from('social_shares')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (findError || !share) {
      return NextResponse.json(
        { error: 'Scheduled share not found or unauthorized' },
        { status: 404 }
      );
    }
    
    if (share.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled shares can be canceled' },
        { status: 400 }
      );
    }
    
    // Delete the scheduled share
    const { error: deleteError } = await serviceClient
      .from('social_shares')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    
    if (deleteError) {
      console.error('Error canceling scheduled share:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cancel scheduled share' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Scheduled post canceled'
    });
  } catch (error) {
    console.error('Unexpected error canceling scheduled share:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/shares/schedule
 * Gets all scheduled shares for the current user
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { data: shares, error } = await serviceClient
      .from('social_shares')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'scheduled')
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error('Error fetching scheduled shares:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled shares' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      shares: shares || []
    });
  } catch (error) {
    console.error('Unexpected error fetching scheduled shares:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}