import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/social/tiktok/upload
 * Uploads a video to TikTok
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
    // Parse the request body
    const data = await request.json();
    const { reactionId, title, description, privacy, tags } = data;

    // Get the TikTok account
    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('provider', 'tiktok')
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      console.error('Error fetching TikTok account:', accountError);
      return NextResponse.json(
        { error: 'Active TikTok account not found' },
        { status: 404 }
      );
    }

    // Get the video from the storage
    const { data: video, error: videoError } = await serviceClient
      .from('reactions')
      .select('*')
      .eq('id', reactionId)
      .eq('user_id', session.user.id)
      .single();

    if (videoError || !video) {
      console.error('Error fetching video:', videoError);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!video.reaction_video_storage_path) {
      return NextResponse.json(
        { error: 'Video has no associated file' },
        { status: 400 }
      );
    }

    // Download the video file to a temporary location
    const tempFilePath = path.join(os.tmpdir(), `tiktok-upload-${Date.now()}.mp4`);
    const { data: videoFile, error: downloadError } = await serviceClient.storage
      .from('reactions')
      .download(video.reaction_video_storage_path);

    if (downloadError || !videoFile) {
      console.error('Error downloading video file:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download video file' },
        { status: 500 }
      );
    }

    // Write the blob to a temporary file
    const buffer = await videoFile.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    // Create a record for the share
    const { data: share, error: shareError } = await serviceClient
      .from('social_shares')
      .insert([
        {
          user_id: session.user.id,
          reaction_id: reactionId,
          provider: 'tiktok',
          status: 'pending',
          metadata: {
            title: title || video.title || 'My Reaction Video',
            description: description || '',
            privacy: privacy || 'public',
            tags: tags || []
          }
        }
      ])
      .select()
      .single();

    if (shareError || !share) {
      console.error('Error creating share record:', shareError);
      await fs.unlink(tempFilePath).catch(console.error);
      return NextResponse.json(
        { error: 'Failed to create share record' },
        { status: 500 }
      );
    }

    try {
      // Prepare multipart form data for TikTok upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      // Read the file into a buffer
      const fileBuffer = await fs.readFile(tempFilePath);
      
      // Create metadata parts
      const metadataParts = [
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="open_id"\r\n\r\n',
        `${account.provider_account_id}\r\n`,
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="access_token"\r\n\r\n',
        `${account.access_token}\r\n`
      ];
      
      if (title) {
        metadataParts.push(
          `--${boundary}\r\n`,
          'Content-Disposition: form-data; name="title"\r\n\r\n',
          `${title}\r\n`
        );
      }
      
      // Add the video file part
      metadataParts.push(
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="video_file"; filename="video.mp4"\r\n',
        'Content-Type: video/mp4\r\n\r\n'
      );

      // Concatenate all parts into a single buffer
      const metadataBuffer = Buffer.from(metadataParts.join(''));
      const closeBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const requestBody = Buffer.concat([
        metadataBuffer,
        fileBuffer,
        closeBuffer
      ]);
      
      // Upload video to TikTok
      const uploadResponse = await fetch('https://open-api.tiktok.com/share/video/upload/', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': requestBody.length.toString(),
        },
        body: requestBody
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.error) {
        throw new Error(`TikTok API error: ${JSON.stringify(uploadResult.error)}`);
      }

      // Update the share record with the post ID and URL
      await serviceClient
        .from('social_shares')
        .update({
          provider_post_id: uploadResult.data.share_id,
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', share.id);

      // Clean up the temporary file
      await fs.unlink(tempFilePath).catch(console.error);

      return NextResponse.json({
        success: true,
        share: {
          ...share,
          provider_post_id: uploadResult.data.share_id,
          status: 'published',
          published_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error uploading to TikTok:', error);
      
      // Update the share record with error status
      await serviceClient
        .from('social_shares')
        .update({
          status: 'failed',
          metadata: {
            ...share.metadata,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('id', share.id);
        
      // Clean up temporary file
      await fs.unlink(tempFilePath).catch(console.error);
      
      return NextResponse.json(
        { error: 'Failed to upload video to TikTok' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in TikTok upload:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}