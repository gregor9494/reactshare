import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { SocialShare } from '@/lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/social/shares
 * Returns all social shares for the current user
 * Optional query params:
 * - provider: Filter by provider (youtube, instagram, etc)
 * - reactionId: Filter by reaction ID 
 * - status: Filter by status (pending, published, scheduled, failed)
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
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const reactionId = searchParams.get('reactionId');
    const status = searchParams.get('status');
    
    // Start building the query
    let query = serviceClient
      .from('social_shares')
      .select('*')
      .eq('user_id', session.user.id);
    
    // Apply filters
    if (provider) {
      query = query.eq('provider', provider);
    }
    
    if (reactionId) {
      query = query.eq('reaction_id', reactionId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by created_at in descending order (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data: shares, error } = await query;

    if (error) {
      console.error('Error fetching social shares:', error);
      return NextResponse.json(
        { error: 'Failed to fetch social shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: shares || [] });
  } catch (error) {
    console.error('Unexpected error in social shares API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/shares
 * Creates a new social share entry
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const data = await request.json();
    const { 
      reaction_id, 
      provider, 
      provider_post_id, 
      provider_post_url,
      status = 'pending',
      metadata 
    } = data;
    
    // Validate required fields
    if (!reaction_id || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields (reaction_id, provider)' },
        { status: 400 }
      );
    }
    
    // Verify the reaction exists and belongs to the user
    const { data: reaction, error: reactionError } = await serviceClient
      .from('reactions')
      .select('id')
      .eq('id', reaction_id)
      .eq('user_id', session.user.id)
      .single();
    
    if (reactionError || !reaction) {
      return NextResponse.json(
        { error: 'Reaction not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Create the share
    const shareData: Partial<SocialShare> = {
      user_id: session.user.id,
      reaction_id,
      provider,
      provider_post_id,
      provider_post_url,
      status,
      metadata
    };
    
    const { data: share, error } = await serviceClient
      .from('social_shares')
      .insert([shareData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating social share:', error);
      return NextResponse.json(
        { error: 'Failed to create social share' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ share });
  } catch (error) {
    console.error('Unexpected error creating social share:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}