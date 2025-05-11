import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { createReadStream } from 'fs';
import { join } from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/social/youtube/upload
 * Uploads a reaction video to YouTube
 * Requires: reactionId, title, description, privacy (public, unlisted, private)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  console.log('YouTube upload API called with session:', session?.user?.id ? 'Authenticated' : 'Unauthenticated');
  
  if (!session?.user?.id) {
    console.log('YouTube upload API: Unauthorized - No valid session');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const requestData = await request.json();
    const { reactionId, title, description, privacy, tags = [], playlistId } = requestData;
    
    console.log('YouTube upload API: Request body received', {
      reactionId,
      title: title ? `${title.substring(0, 20)}...` : 'missing',
      hasDescription: !!description,
      privacy,
      tagsCount: tags?.length || 0,
      hasPlaylistId: !!playlistId
    });

    if (!reactionId || !title) {
      console.log('YouTube upload API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields (reactionId, title)' },
        { status: 400 }
      );
    }

    // Get the reaction video from the database
    console.log(`YouTube upload API: Attempting to fetch reaction. reactionId: "${reactionId}", userId: "${session.user.id}"`);
    const { data: reaction, error: reactionError } = await serviceClient
      .from('reactions')
      .select('*')
      .eq('id', reactionId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (reactionError) {
      console.error('YouTube upload API: Detailed error fetching reaction:', JSON.stringify(reactionError, null, 2));
      return NextResponse.json(
        { error: 'Error fetching reaction: ' + reactionError.message, details: reactionError },
        { status: 500 }
      );
    }
    
    if (!reaction) {
      console.log(`YouTube upload API: Reaction not found with id ${reactionId} for user ${session.user.id}`);
      return NextResponse.json(
        { error: 'Reaction not found or unauthorized' },
        { status: 404 }
      );
    }
    
    console.log('YouTube upload API: Reaction found:', {
      id: reaction.id,
      hasVideoPath: !!reaction.reaction_video_storage_path
    });

    if (!reaction.reaction_video_storage_path) {
      return NextResponse.json(
        { error: 'Reaction video not found' },
        { status: 400 }
      );
    }

    // Get the user's YouTube account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'youtube')
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not found' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    const now = new Date();
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isTokenExpired = tokenExpiry && tokenExpiry <= now;

    // Refresh token if needed
    let accessToken = account.access_token;

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
      accessToken = tokenData.access_token;
      await serviceClient
        .from('social_accounts')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: 'active'
        })
        .eq('id', account.id);
    }

    // Download the video file from Supabase Storage
    const { data: fileData, error: fileError } = await serviceClient
      .storage
      .from('reactions')
      .download(reaction.reaction_video_storage_path.replace('reactions/', ''));

    if (fileError) {
      console.error('Error downloading video file:', fileError);
      return NextResponse.json(
        { error: 'Failed to download video file' },
        { status: 500 }
      );
    }

    // Convert file data to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Create form data for YouTube upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Setup metadata
    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: '22', // People & Blogs category
      },
      status: {
        privacyStatus: privacy || 'private',
        selfDeclaredMadeForKids: false,
      },
    };

    // Create multipart body
    const body = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: video/*\r\n' +
        'Content-Transfer-Encoding: binary\r\n\r\n'
      ),
      buffer,
      Buffer.from(closeDelimiter),
    ]);

    // Upload to YouTube
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status,id',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': body.length.toString(),
        },
        body,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('YouTube upload error:', errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to upload video to YouTube', 
          details: errorData
        },
        { status: uploadResponse.status }
      );
    }

    const uploadData = await uploadResponse.json();
    
    // If playlistId is provided, add the video to the playlist
    let playlistResponse = null;
    
    if (playlistId && uploadData.id) {
      try {
        // Make request to insert the video into the playlist
        const playlistItemResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                playlistId: playlistId,
                resourceId: {
                  kind: 'youtube#video',
                  videoId: uploadData.id
                }
              }
            }),
          }
        );
        
        if (!playlistItemResponse.ok) {
          const errorData = await playlistItemResponse.json();
          console.error('YouTube playlist add error:', errorData);
          // We'll continue even if playlist addition fails
        } else {
          playlistResponse = await playlistItemResponse.json();
        }
      } catch (playlistError) {
        console.error('Error adding video to playlist:', playlistError);
        // Continue even if there's an error adding to playlist
      }
    }
    
    // Save the upload information to the database
    const { error: saveError } = await serviceClient
      .from('social_shares')
      .insert([
        {
          user_id: session.user.id,
          reaction_id: reactionId,
          provider: 'youtube',
          provider_post_id: uploadData.id,
          provider_post_url: `https://youtube.com/watch?v=${uploadData.id}`,
          status: 'published',
          metadata: {
            title,
            description,
            privacy,
            tags,
            upload_response: uploadData,
            playlist_id: playlistId || null,
            playlist_response: playlistResponse
          }
        }
      ]);

    if (saveError) {
      console.error('Error saving YouTube upload:', saveError);
    }

    return NextResponse.json({
      success: true,
      videoId: uploadData.id,
      videoUrl: `https://youtube.com/watch?v=${uploadData.id}`,
      addedToPlaylist: playlistId ? (playlistResponse !== null) : null,
      playlistId: playlistId || null
    });
    
  } catch (error) {
    console.error('Unexpected error uploading to YouTube:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload' },
      { status: 500 }
    );
  }
}