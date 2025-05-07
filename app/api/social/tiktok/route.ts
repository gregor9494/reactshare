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
 * GET /api/social/tiktok
 * Returns the user's connected TikTok account details
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
    // Get the user's TikTok account from the database
    const { data: account, error } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .single();

    if (error) {
      console.error('Error fetching TikTok account:', error);
      return NextResponse.json(
        { error: 'Failed to fetch TikTok account' },
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
    console.error('Unexpected error in TikTok account API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/tiktok
 * Disconnects the TikTok account from the user's profile
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Delete the TikTok account from the database
    const { error } = await serviceClient
      .from('social_accounts')
      .delete()
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok');

    if (error) {
      console.error('Error deleting TikTok account:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect TikTok account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error disconnecting TikTok account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/tiktok/refresh
 * Refreshes the TikTok account data and token if needed
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
    // Get the account with tokens
    const { data: account, error: fetchError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'TikTok account not found' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    if (isTokenExpired && account.refresh_token) {
      // Refresh the token
      const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/refresh_token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY || '',
          client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
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
          access_token: tokenData.data.access_token,
          refresh_token: tokenData.data.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.data.expires_in * 1000).toISOString(),
          status: 'active'
        })
        .eq('id', account.id);
    }

    // Get the current access token (which might have just been refreshed)
    const { data: refreshedAccount } = isTokenExpired && account.refresh_token
      ? await serviceClient.from('social_accounts').select('access_token').eq('id', account.id).single()
      : { data: account };
      
    // Fetch fresh TikTok data
    const headers = {
      Authorization: `Bearer ${refreshedAccount.access_token}`
    };

    // TikTok API requires open_id
    const userResponse = await fetch(
      'https://open-api.tiktok.com/user/info/',
      { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          open_id: account.provider_account_id
        })
      }
    );

    const userData = await userResponse.json();
    
    if (userData.error) {
      console.error('TikTok API error:', userData.error);
      return NextResponse.json(
        { error: 'Failed to fetch TikTok user data' },
        { status: 500 }
      );
    }

    const user = userData.data?.user;

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to fetch TikTok user data' },
        { status: 500 }
      );
    }

    // Update the profile data
    const profileData = {
      id: user.open_id,
      name: user.display_name,
      username: user.username,
      avatar: user.avatar_url,
      followers: user.follower_count,
      following: user.following_count
    };

    const { error: updateError } = await serviceClient
      .from('social_accounts')
      .update({
        provider_username: user.username,
        profile_data: profileData,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Error updating TikTok profile data:', updateError);
      return NextResponse.json(
        { error: 'Failed to update TikTok profile data' },
        { status: 500 }
      );
    }

    // Return the updated account (without sensitive data)
    const updatedAccount = {
      ...account,
      profile_data: profileData,
      provider_username: user.username,
      last_sync_at: new Date().toISOString(),
      // Remove sensitive fields
      access_token: undefined,
      refresh_token: undefined
    };

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Unexpected error refreshing TikTok account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}