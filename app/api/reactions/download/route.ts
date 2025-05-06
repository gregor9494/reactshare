import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import YTDlpWrap from 'yt-dlp-wrap';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing for reaction download route.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
const REACTION_BUCKET_NAME = 'reaction-videos'; // This is the bucket where reaction videos are stored

// GET endpoint to download a reaction video
export async function GET(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Get the reaction ID from the URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing reaction ID' }, { status: 400 });
    }

    // Retrieve the reaction from the database
    const { data: reactions, error: reactionError } = await supabaseAdmin
      .from('reactions')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (reactionError || !reactions || reactions.length === 0) {
      console.error('Error fetching reaction:', reactionError);
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 });
    }

    const reaction = reactions[0];

    // Check if this is the user's own reaction or implement permission checks
    // For now, only allow downloading your own reactions
    if (reaction.user_id !== userId) {
      return NextResponse.json({ error: 'You do not have permission to download this reaction' }, { status: 403 });
    }

    // Check if the reaction has a video storage path
    if (!reaction.reaction_video_storage_path) {
      return NextResponse.json({ error: 'No video file available for this reaction' }, { status: 404 });
    }

    // Create a temporary directory for processing
    const tempDir = path.join(os.tmpdir(), `reactshare-download-${uuidv4()}`);
    await fs.ensureDir(tempDir);

    try {
      // Download the file from Supabase storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(REACTION_BUCKET_NAME)
        .download(reaction.reaction_video_storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download reaction video: ${downloadError?.message || 'Unknown error'}`);
      }

      // Generate a filename for the download - use reaction title or a default name
      const filename = `${reaction.title || 'reaction'}-${id.slice(0, 8)}.mp4`;

      // Create headers for file download
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      headers.set('Content-Type', 'video/mp4');
      headers.set('Cache-Control', 'no-cache');

      // Return the file as a stream for download
      return new NextResponse(fileData.stream(), {
        status: 200,
        headers
      });
    } catch (error: any) {
      console.error('Error preparing reaction for download:', error);
      return NextResponse.json({ error: 'Failed to prepare download' }, { status: 500 });
    } finally {
      // Clean up temporary directory
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        console.error('Error cleaning up temp directory:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Unexpected error in reaction download:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

// POST endpoint to download a reaction from a URL (similar to source video download)
export async function POST(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Parse request body
    const body = await request.json();
    const { url, title } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    // Generate unique ID and filename
    const downloadId = uuidv4();
    const fileName = `${downloadId}.mp4`;
    const storagePath = `${userId}/${fileName}`;

    // Start the download process asynchronously
    downloadReactionVideo(url, userId, downloadId, fileName, title || 'Downloaded Reaction').catch(error => {
      console.error(`Error in background download process for ${url}:`, error);
    });

    // Return immediate response to the client
    return NextResponse.json({
      id: downloadId,
      url,
      status: 'processing',
      message: 'Reaction download initiated. This may take a few minutes.',
    }, { status: 202 });

  } catch (error) {
    console.error('Unexpected error in reaction URL download:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

/**
 * Downloads a reaction video from URL using yt-dlp and saves it to the database
 */
async function downloadReactionVideo(url: string, userId: string, downloadId: string, fileName: string, title: string) {
  // Log download start time
  const startTime = Date.now();
  console.log(`[${downloadId}] Entering downloadReactionVideo for URL: ${url}, Title: ${title}`);

  // Create a temporary directory for the download
  const tempDir = path.join(os.tmpdir(), `reactshare-download-${uuidv4()}`);
  await fs.ensureDir(tempDir);

  const outputPath = path.join(tempDir, fileName);
  const storagePath = `${userId}/${fileName}`;

  let reactionId: string | undefined; // Declare reactionId here

  try {
    // Initialize yt-dlp
    const ytDlp = new YTDlpWrap();

    // Create initial database record for this download
    const { data: reactionData, error: insertError } = await supabaseAdmin
      .from('reactions')
      .insert({
        user_id: userId,
        source_video_url: url,
        title,
        status: 'downloading'
      })
      .select();

    if (insertError || !reactionData || reactionData.length === 0) {
      throw new Error(`Failed to create reaction record: ${insertError?.message || 'Unknown error'}`);
    }

    reactionId = reactionData[0].id;
    console.log(`[${reactionId}] Created reaction record in DB. ID: ${reactionId}`);

    // Set download options - similar to the source video download options
    const options = [
      url,
      '--format', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputPath,
      '--no-playlist',
      '--max-filesize', '50m',
      '--no-warnings',
      '--geo-bypass',
      '--no-check-certificate',
      '--extractor-retries', '3',
      '--min-sleep-interval', '1',
      '--max-sleep-interval', '5',
      '--force-ipv4',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      '--add-header', 'Accept-Language:en-US,en;q=0.9', // Added from video download route for consistency
      '--socket-timeout', '30', // Added from video download route for consistency
      '--verbose' // Added verbose for more detailed logs on initial attempt
    ];

    // Execute download with fallback handling
    try {
      console.log(`[${reactionId}] Starting download of reaction from ${url} with options:`, options);
      await ytDlp.execPromise(options);
      console.log(`[${reactionId}] Download completed successfully`);
    } catch (error) {
      console.error(`[${reactionId}] yt-dlp download error (initial attempt):`, error);
      
      // Type guard to check if error has a message property
      const downloadError = error as { message?: string };
      const errorMessage = downloadError.message || 'Unknown error from initial attempt';
      
      // Try fallback with simpler format
      try {
        console.log(`[${reactionId}] Trying fallback with simpler format...`);
        const fallbackOptions = [
          url,
          '--format', 'best',
          '--output', outputPath,
          '--no-playlist',
          '--max-filesize', '50m',
          '--no-warnings', // Keep no-warnings for fallback
          '--ignore-errors', // Add ignore-errors to fallback
          '--verbose' // Add verbose to fallback for more logs
        ];
        console.log(`[${reactionId}] Fallback options:`, fallbackOptions);
        await ytDlp.execPromise(fallbackOptions);
        console.log(`[${reactionId}] Fallback download succeeded`);
      } catch (fallbackError) {
        console.error(`[${reactionId}] yt-dlp download error (fallback attempt):`, fallbackError);
        const fallbackErrorMessage = (fallbackError as { message?: string })?.message || 'Unknown error from fallback attempt';
        throw new Error(`Failed to download reaction video after multiple attempts. Initial: ${errorMessage}. Fallback: ${fallbackErrorMessage}`);
      }
    }

    // Check if file exists and has content
    console.log(`[${reactionId}] Checking file stats for: ${outputPath}`);
    const fileStats = await fs.stat(outputPath);
    console.log(`[${reactionId}] File stats: ${JSON.stringify(fileStats)}`);
    if (!fileStats.size) {
      console.error(`[${reactionId}] Downloaded file is empty: ${outputPath}`);
      throw new Error('Downloaded file is empty');
    }
    console.log(`[${reactionId}] Downloaded file has size: ${fileStats.size}`);

    // Update status to uploading
    if (!reactionId) {
      console.error(`[${downloadId}] reactionId is undefined before updating status to uploading`);
      throw new Error("reactionId is undefined before updating status to uploading");
    }
    console.log(`[${reactionId}] Updating reaction status to 'uploading'.`);
    await updateReactionStatus(reactionId, 'uploading');

    // Ensure the bucket exists
    console.log(`[${reactionId}] Ensuring bucket '${REACTION_BUCKET_NAME}' exists.`);
    const { error: bucketError } = await ensureBucketExists(REACTION_BUCKET_NAME);
    if (bucketError) {
      console.error(`[${reactionId}] Failed to ensure bucket exists:`, bucketError);
      throw new Error(`Failed to ensure bucket exists: ${bucketError.message}`);
    }
    console.log(`[${reactionId}] Bucket '${REACTION_BUCKET_NAME}' ensured.`);

    // Upload the file to Supabase Storage
    console.log(`[${reactionId}] Reading file from ${outputPath} for upload.`);
    const fileBuffer = await fs.readFile(outputPath);
    console.log(`[${reactionId}] File buffer read, size: ${fileBuffer.length}. Uploading to Supabase at ${storagePath}.`);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(REACTION_BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true,
      });
      
    if (uploadError) {
      console.error(`[${reactionId}] Supabase upload failed:`, uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    console.log(`[${reactionId}] Supabase upload successful. Data:`, uploadData);

    // Get the public URL
    const { data: publicUrlData } = await supabaseAdmin.storage
      .from(REACTION_BUCKET_NAME)
      .getPublicUrl(storagePath);
      
    // Calculate performance metrics
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    console.log(`[${reactionId}] Download and upload completed in ${durationSeconds.toFixed(2)} seconds`);
    
    // Update the reaction record with successful status
    if (!reactionId) {
      console.error(`[${downloadId}] reactionId is undefined before final update to 'uploaded'`);
      throw new Error("reactionId is undefined before final update to 'uploaded'");
    }
    console.log(`[${reactionId}] Updating reaction status to 'uploaded' with storage path: ${storagePath}.`);
    await supabaseAdmin
      .from('reactions')
      .update({
        reaction_video_storage_path: storagePath,
        status: 'uploaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', reactionId);
    console.log(`[${reactionId}] Final status update to 'uploaded' complete.`);

  } catch (error: any) {
    console.error(`[${reactionId || downloadId}] Error in downloadReactionVideo catch block:`, error);
    
    // Update database with error status if we have a reaction ID
    if (reactionId) {
      console.log(`[${reactionId}] Updating reaction status to 'error' due to caught exception.`);
      await supabaseAdmin
        .from('reactions')
        .update({
          status: 'error',
          // Optionally, add error.message to a new column in your DB here
          // error_message: error.message
          updated_at: new Date().toISOString()
        })
        .eq('id', reactionId);
      console.log(`[${reactionId}] Status updated to 'error'.`);
    } else {
      console.error(`[${downloadId}] Cannot update status to 'error' as reactionId is undefined.`);
    }
  } finally {
    console.log(`[${reactionId || downloadId}] Entering finally block for downloadReactionVideo.`);
    // Clean up temporary directory
    try {
      console.log(`[${reactionId || downloadId}] Attempting to remove temporary directory: ${tempDir}`);
      await fs.remove(tempDir);
      console.log(`[${reactionId || downloadId}] Cleaned up temporary directory: ${tempDir}`);
    } catch (cleanupError) {
      console.error(`[${reactionId || downloadId}] Error cleaning up temp directory:`, cleanupError);
    }
    console.log(`[${reactionId || downloadId}] Exiting finally block for downloadReactionVideo.`);
  }
}

/**
 * Updates the status of a reaction record
 */
async function updateReactionStatus(reactionId: string, status: string) {
  try {
    const { error } = await supabaseAdmin
      .from('reactions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', reactionId);
      
    if (error) {
      console.error(`Error updating reaction status to ${status}:`, error);
    }
  } catch (err) {
    console.error(`Unexpected error updating reaction status to ${status}:`, err);
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
      });
      
      if (createError) {
        return { error: createError };
      }
      
      console.log(`Bucket "${bucketName}" created successfully.`);
      
      // Update bucket settings
      const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['video/mp4', 'video/webm'],
        fileSizeLimit: 52428800, // 50MB limit
      });
      
      if (updateError) {
        console.error('Error updating bucket settings:', updateError);
      } else {
        console.log(`Bucket "${bucketName}" settings updated successfully.`);
      }
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }
    
    return { error: null };
  } catch (err: any) {
    console.error('Error ensuring bucket exists:', err);
    return { error: { message: err.message || 'Unknown error' } };
  }
}