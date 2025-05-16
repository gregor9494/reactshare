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
  const url = new URL(request.url);
  const accountId = url.searchParams.get('id');
  
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
    
    // Get the user's YouTube accounts from the database
    let query = serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube');
      
    // If an account ID is specified, get only that account
    if (accountId) {
      const { data, error } = await query.eq('id', accountId).single();
      
      if (error) {
        console.error('Error fetching YouTube account:', error);
        return NextResponse.json(
          { error: 'Failed to fetch YouTube account' },
          { status: 500 }
        );
      }
      
      // If no account is found, return null
      if (!data) {
        return NextResponse.json({ account: null });
      }
      
      // Process account to remove sensitive information
      const safeAccount = {
        id: data.id,
        provider: data.provider,
        provider_username: data.provider_username,
        provider_account_id: data.provider_account_id,
        status: data.status,
        last_sync_at: data.last_sync_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        profile_data: data.profile_data
      };
      
      return NextResponse.json({ account: safeAccount });
    } else {
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching YouTube accounts:', error);
        return NextResponse.json(
          { error: 'Failed to fetch YouTube accounts' },
          { status: 500 }
        );
      }
      
      // If no accounts are found, return empty array
      if (!data || data.length === 0) {
        return NextResponse.json({ accounts: [] });
      }
      
      // Process accounts to remove sensitive information
      const safeAccounts = data.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        provider_username: acc.provider_username,
        provider_account_id: acc.provider_account_id,
        status: acc.status,
        last_sync_at: acc.last_sync_at,
        created_at: acc.created_at,
        updated_at: acc.updated_at,
        profile_data: acc.profile_data
      }));
      
      return NextResponse.json({ accounts: safeAccounts });
    }
    
    return NextResponse.json(
      { error: 'This code path should never be reached' },
      { status: 500 }
    );
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
 * POST /api/social/youtube
 * Refreshes the YouTube account data and token if needed
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  // Parse request body
  const body = await request.json().catch(() => ({}));
  const accountId = body.accountId;
  
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
    
    // Get the account(s) with tokens
    const { data: accounts, error: fetchError } = accountId
      ? await serviceClient
          .from('social_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('provider', 'youtube')
          .eq('id', accountId)
      : await serviceClient
          .from('social_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('provider', 'youtube')
          .order('created_at', { ascending: false });

    if (fetchError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No YouTube accounts found' },
        { status: 404 }
      );
    }
    
    // Get the target account(s) - either the specified one or all active ones
    const targetAccounts = accountId 
      ? accounts.filter(acc => acc.id === accountId)
      : accounts;
      
    if (targetAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Specified YouTube account not found' },
        { status: 404 }
      );
    }
    
    // Process each account
    const updatedAccounts = [];
    
    for (const account of targetAccounts) {

      try {
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
    
            console.error(`Failed to refresh token for account ${account.id}:`, tokenData.error);
            continue; // Skip to the next account
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
          console.error(`Failed to fetch YouTube channel data for account ${account.id}`);
          continue; // Skip to the next account
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
          console.error(`Error updating YouTube profile data for account ${account.id}:`, updateError);
          continue; // Skip to the next account
        }
    
        // Add the updated account to the result list (without sensitive data)
        updatedAccounts.push({
          ...account,
          profile_data: profileData,
          provider_username: channel.snippet?.title,
          last_sync_at: new Date().toISOString(),
          // Remove sensitive fields
          access_token: undefined,
          refresh_token: undefined
        });
      } catch (accountError) {
        console.error(`Error processing YouTube account ${account.id}:`, accountError);
        // Continue with other accounts even if one fails
      }
    }
    
    // Return the updated accounts (single or multiple depending on the request)
    if (accountId) {
      return NextResponse.json({ 
        account: updatedAccounts.length > 0 ? updatedAccounts[0] : null 
      });
    } else {
      return NextResponse.json({ accounts: updatedAccounts });
    }
  } catch (error) {
    console.error('Unexpected error refreshing YouTube account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
