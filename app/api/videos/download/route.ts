import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import os from 'os';
import YTDlpWrap from 'yt-dlp-wrap';

// Schema for validating the download request
const downloadSchema = z.object({
  url: z.string().url({ message: 'Invalid video URL' }),
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for video download route.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
const BUCKET_NAME = 'source-videos'; // Create this bucket in Supabase

export async function POST(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = downloadSchema.safeParse(body);
    
    if (!validation.success) {
      const errorMessages = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Invalid input: ${errorMessages}` }, { status: 400 });
    }
    
    const { url } = validation.data;
    
    // Generate a unique ID for this download
    const downloadId = uuidv4();
    const fileName = `${downloadId}.mp4`;
    const storagePath = `${userId}/${fileName}`;
    
    // Create a record in the database for this download
    const { data: sourceVideos, error: dbError } = await supabaseAdmin
      .from('source_videos')
      .insert({
        user_id: userId,
        url: url,
        storage_path: storagePath,
        status: 'processing',
      })
      .select(); // Don't use .single() to avoid potential errors
      
    if (dbError || !sourceVideos || sourceVideos.length === 0) {
      console.error('Error creating source video record:', dbError);
      return NextResponse.json({ error: 'Failed to initiate video download' }, { status: 500 });
    }
    
    const sourceVideo = sourceVideos[0];
    
    // Start the download process asynchronously
    // We'll return a response to the client, but keep processing in the background
    downloadVideo(url, userId, sourceVideo.id, fileName).catch(error => {
      console.error(`Error in background download process for ${url}:`, error);
      // Background process will update the database with the error status
    });
    
    // Return a response to the client
    return NextResponse.json({
      id: sourceVideo.id,
      url: url,
      status: 'processing',
      message: 'Video download initiated. This may take a few minutes.',
    }, { status: 202 }); // 202 Accepted indicates the request has been accepted for processing
    
  } catch (error) {
    console.error('Unexpected error in video download:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

// GET endpoint to check the status of a download
export async function GET(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  
  // Get the download ID from the URL
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing download ID' }, { status: 400 });
  }
  
  try {
    console.log(`Fetching download status for ID: ${id}, user: ${userId}`);
    
    // Query the database for the download status - don't use .single() to avoid the error
    const { data: videos, error } = await supabaseAdmin
      .from('source_videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId); // Ensure the user can only access their own downloads
    
    // Log the results for debugging
    console.log('Query results:', { count: videos?.length, error });
      
    if (error) {
      console.error('Error fetching source video:', error);
      return NextResponse.json({ error: 'Failed to fetch download status' }, { status: 500 });
    }
    
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }
    
    // Use the first result
    const data = videos[0];
    
    // Return the actual status from the database
    return NextResponse.json({
      id: data.id,
      url: data.url,
      status: data.status,
      storage_path: data.storage_path,
      error: data.error_message || null,
    });
    
  } catch (error) {
    console.error('Unexpected error checking download status:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

/**
 * Downloads a video using yt-dlp and uploads it to Supabase Storage
 */
async function downloadVideo(url: string, userId: string, sourceId: string, fileName: string) {
  // Create a temporary directory for the download
  const tempDir = path.join(os.tmpdir(), `reactshare-${uuidv4()}`);
  await fs.ensureDir(tempDir);
  
  const outputPath = path.join(tempDir, fileName);
  const storagePath = `${userId}/${fileName}`;
  
  try {
    // Find the location of yt-dlp binary
    const ytDlp = new YTDlpWrap();
    
    // Update status to downloading
    await updateSourceVideoStatus(sourceId, 'downloading');
    
    // Set download options
    const options = [
      url,
      '--format', 'mp4',  // Prefer MP4 format
      '--output', outputPath,
      '--no-playlist',    // Don't download playlists
      '--max-filesize', '50m',  // Limit file size to 50MB to ensure compatibility with Supabase
    ];
    
    // Execute the download
    await ytDlp.execPromise(options);
    
    // Check if file exists and has content
    const fileStats = await fs.stat(outputPath);
    if (!fileStats.size) {
      throw new Error('Downloaded file is empty');
    }
    
    // Update status to uploading
    await updateSourceVideoStatus(sourceId, 'uploading');
    
    // Ensure the bucket exists
    const { error: bucketError } = await ensureBucketExists(BUCKET_NAME);
    if (bucketError) {
      throw new Error(`Failed to ensure bucket exists: ${bucketError.message}`);
    }
    
    // Upload the file to Supabase Storage
    const fileBuffer = await fs.readFile(outputPath);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });
      
    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get the public URL if needed
    const { data: publicUrlData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
      
    // Update the database record with successful status
    await updateSourceVideoStatus(sourceId, 'completed', null, publicUrlData?.publicUrl);
    
  } catch (error: any) {
    console.error('Video download error:', error);
    
    // Update database with error status
    await updateSourceVideoStatus(sourceId, 'error', error.message);
  } finally {
    // Clean up temporary directory
    try {
      await fs.remove(tempDir);
    } catch (cleanupError) {
      console.error('Error cleaning up temp directory:', cleanupError);
    }
  }
}

/**
 * Updates the status of a source_video record
 */
async function updateSourceVideoStatus(
  sourceId: string,
  status: string,
  errorMessage?: string | null,
  publicUrl?: string | null
) {
  try {
    const updateData: any = { status };
    
    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }
    
    if (publicUrl !== undefined) {
      updateData.public_url = publicUrl;
    }
    
    const { error } = await supabaseAdmin
      .from('source_videos')
      .update(updateData)
      .eq('id', sourceId);
      
    if (error) {
      console.error(`Error updating source video status to ${status}:`, error);
    }
  } catch (err) {
    console.error(`Unexpected error updating source video status to ${status}:`, err);
  }
}

/**
 * Ensures that a storage bucket exists, creating it if necessary
 */
async function ensureBucketExists(bucketName: string) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return { error: listError };
    }
    
    // Check if the target bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket "${bucketName}" does not exist. Creating it...`);
      
      // Create the bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true, // Make it public so videos can be accessed without authentication
        // Don't set fileSizeLimit - let Supabase use its default limit based on the plan
      });
      
      if (createError) {
        return { error: createError };
      }
      
      console.log(`Bucket "${bucketName}" created successfully.`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }
    
    return { error: null };
  } catch (err: any) {
    console.error('Error ensuring bucket exists:', err);
    return { error: { message: err.message || 'Unknown error' } };
  }
}