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
 * Ensures that a user exists in the database
 * This prevents foreign key constraint errors when working with social accounts
 */
async function ensureUserExists(userId: string): Promise<boolean> {
  try {
    // Check if the user exists in our users table
    const { data: existingUser, error: userCheckError } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('[YouTube API] Error checking for existing user:', userCheckError);
    }
    
    if (!existingUser) {
      console.log(`[YouTube API] User ${userId} doesn't exist in users table, creating...`);
      
      // Get user information from auth system
      const { data: userData, error: userDataError } = await serviceClient.auth.admin.getUserById(userId);
      
      if (userDataError) {
        console.error('[YouTube API] Error fetching user data:', userDataError);
        return false;
      }
      
      const userEmail = userData?.user?.email;
      const userName = userData?.user?.user_metadata?.name || userEmail?.split('@')[0] || 'User';
      
      // Create a new user record if it doesn't exist
      const { error: userCreateError } = await serviceClient
        .from('users')
        .insert([{
          id: userId,
          email: userEmail,
          name: userName,
          created_at: new Date().toISOString()
        }]);
        
      if (userCreateError) {
        console.error('[YouTube API] Error creating user:', userCreateError);
        return false;
      } else {
        console.log(`[YouTube API] Successfully created user ${userId}`);
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[YouTube API] User verification error:', error);
    return false;
  }
}

/**
 * GET /api/social/youtube
 * Returns the user's connected YouTube account details
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
    // Ensure the user exists in the database before proceeding
    const userExists = await ensureUserExists(session.user.id);
    if (!userExists) {
      console.error(`[YouTube API] User ${session.user.id} verification failed`);
      return NextResponse.json(
        { error: 'Failed to verify user account' },
        { status: 500 }
      );
    }
    
    // Get the user's YouTube account from the database
    const { data: account, error } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .single();

    if (error) {
      console.error('Error fetching YouTube account:', error);
      return NextResponse.json(
        { error: 'Failed to fetch YouTube account' },
        { status: 500 }
      );
    }

    // If no account is found, return null
    if (!account) {
      return NextResponse.json({ account: null });
    }

    // Don't send sensitive token information to the client
    const safeAccount = {
      id: account.id,
      provider: account.provider,
      provider_username: account.provider_username,
      provider_account_id: account.provider_account_id,
      status: account.status,
      last_sync_at: account.last_sync_at,
      created_at: account.created_at,
      updated_at: account.updated_at,
      profile_data: account.profile_data
    };

    return NextResponse.json({ account: safeAccount });
  } catch (error) {
    console.error('Unexpected error in YouTube account API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/youtube
 * Disconnects the YouTube account from the user's profile
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const { id } = await request.json();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Ensure the user exists in the database before proceeding
    const userExists = await ensureUserExists(session.user.id);
    if (!userExists) {
      console.error(`[YouTube API] User ${session.user.id} verification failed`);
      return NextResponse.json(
        { error: 'Failed to verify user account' },
        { status: 500 }
      );
    }
    
    // Delete the YouTube account from the database
    const { error } = await serviceClient
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube');

    if (error) {
      console.error('Error deleting YouTube account:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect YouTube account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error disconnecting YouTube account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/youtube/refresh
 * Refreshes the YouTube account data and token if needed
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const { id } = await request.json();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Ensure the user exists in the database before proceeding
    const userExists = await ensureUserExists(session.user.id);
    if (!userExists) {
      console.error(`[YouTube API] User ${session.user.id} verification failed during token refresh`);
      return NextResponse.json(
        { error: 'Failed to verify user account' },
        { status: 500 }
      );
    }
    
    // Get the account with tokens
    const { data: account, error: fetchError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not found' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    if (isTokenExpired && account.refresh_token) {
      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        // Update account status to token_expired
        await serviceClient
          .from('social_accounts')
          .update({ status: 'token_expired' })
          .eq('id', account.id);

        return NextResponse.json(
          { error: 'Failed to refresh token', details: tokenData },
          { status: 401 }
        );
      }

      // Update the access token
      await serviceClient
        .from('social_accounts')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: 'active'
        })
        .eq('id', account.id);
    }

    // Get the current access token (which might have just been refreshed)
    const { data: refreshedAccount } = isTokenExpired && account.refresh_token
      ? await serviceClient.from('social_accounts').select('access_token').eq('id', account.id).single()
      : { data: account };
      
    // Fetch fresh YouTube data
    const headers = {
      Authorization: `Bearer ${refreshedAccount.access_token}`
    };

    const youtubeResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers }
    );

    const youtubeData = await youtubeResponse.json();
    const channel = youtubeData.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: 'Failed to fetch YouTube channel data' },
        { status: 500 }
      );
    }

    // Update the profile data
    const profileData = {
      id: channel.id,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      thumbnails: channel.snippet?.thumbnails,
      statistics: channel.statistics
    };

    const { error: updateError } = await serviceClient
      .from('social_accounts')
      .update({
        provider_username: channel.snippet?.title,
        profile_data: profileData,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Error updating YouTube profile data:', updateError);
      return NextResponse.json(
        { error: 'Failed to update YouTube profile data' },
        { status: 500 }
      );
    }

    // Return the updated account (without sensitive data)
    const updatedAccount = {
      ...account,
      profile_data: profileData,
      provider_username: channel.snippet?.title,
      last_sync_at: new Date().toISOString(),
      // Remove sensitive fields
      access_token: undefined,
      refresh_token: undefined
    };

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Unexpected error refreshing YouTube account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}