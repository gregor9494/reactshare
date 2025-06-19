import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SocialAccount } from '@/lib/types';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

// Initialize Supabase client with proper error handling
const serviceClient = createSupabaseServiceClient();

/**
 * GET /api/social
 * Returns all connected social media accounts for the current user
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
    // Get all social accounts for the user
    const { data: accounts, error } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching social accounts:', error);
      
      // Check if it's a connection error
      if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
        return NextResponse.json(
          {
            error: 'Database connection failed. Please check your Supabase configuration.',
            details: 'The Supabase project URL may be incorrect or the project may not exist.',
            hint: 'Verify your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
          },
          { status: 503 }
        );
      }
      
      // Check if it's a table not found error
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Database table not found',
            details: 'The social_accounts table does not exist in your database.',
            hint: 'Run the database setup script in your Supabase SQL Editor'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        {
          error: 'Failed to fetch social accounts',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Remove sensitive data before returning to client
    const safeAccounts = accounts.map((account: SocialAccount) => ({
      id: account.id,
      provider: account.provider,
      provider_username: account.provider_username,
      provider_account_id: account.provider_account_id,
      status: account.status,
      last_sync_at: account.last_sync_at,
      created_at: account.created_at,
      updated_at: account.updated_at,
      profile_data: account.profile_data
    }));

    return NextResponse.json({ accounts: safeAccounts });
  } catch (error) {
    console.error('Unexpected error in social accounts API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/social
 * Updates the enabled status of a social account
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id, enabled } = await request.json();

    // Verify the account belongs to the user
    const { data: account, error: fetchError } = await serviceClient
      .from('social_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the account status
    const status = enabled ? 'active' : 'disconnected';
    const { error: updateError } = await serviceClient
      .from('social_accounts')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating social account status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update account status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Unexpected error updating social account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}