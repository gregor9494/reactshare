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
  url: z.string()
    .url({ message: 'Invalid video URL format' })
    .refine(
      (url) => {
        try {
          // Check if it's from a supported platform
          const supportedDomains = [
            // Video platforms
            'youtube.com', 'youtu.be', 'vimeo.com',
            'tiktok.com', 'vm.tiktok.com',
            'instagram.com', 'twitter.com', 'x.com',
            'facebook.com', 'fb.watch', 'fb.com',
            'twitch.tv', 'clips.twitch.tv',
            'dailymotion.com', 'dai.ly',
            
            // Additional supported platforms by yt-dlp
            'reddit.com', 'linkedin.com', 'tumblr.com',
            'soundcloud.com', 'imgur.com', 'gfycat.com',
            'streamable.com', 'bitchute.com', 'odysee.com',
            'rutube.ru', 'vk.com', 'bilibili.com'
          ];
          
          // Extract domain from URL
          const domain = new URL(url).hostname.replace('www.', '');
          
          // Check if the domain or any of its parts match our supported list
          return supportedDomains.some(d => domain === d || domain.endsWith(`.${d}`) || domain.includes(`.${d}`));
        } catch (e) {
          return false;
        }
      },
      { message: 'Please provide a URL from a supported video platform (YouTube, TikTok, Twitter, etc.)' }
    ),
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
    
    // Check if video information can be retrieved before starting download
    const videoInfo = {
      title: '',
      platform: '',
      duration: 0,
      availability: true
    };
    
    try {
      // Create temporary ytDlp instance to check video info
      const ytDlp = new YTDlpWrap();
      const infoCommand = [
        url,
        '--dump-single-json',
        '--no-playlist',
        '--no-check-certificate',
        '--geo-bypass'
      ];
      
      // Set a 30 second timeout for info retrieval
      const infoPromise = ytDlp.execPromise(infoCommand);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Video info retrieval timed out')), 30000);
      });
      
      // Race the info retrieval against the timeout
      const infoResult = await Promise.race([infoPromise, timeoutPromise]);
      
      if (infoResult) {
        try {
          // Handle different output types from yt-dlp
          let info;
          if (typeof infoResult === 'string') {
            info = JSON.parse(infoResult);
          } else if (typeof infoResult === 'object') {
            info = infoResult;
          } else {
            throw new Error('Unexpected result type from yt-dlp');
          }
          videoInfo.title = info.title || '';
          videoInfo.platform = info.extractor || '';
          videoInfo.duration = info.duration || 0;
          
          // If duration is too long (over 10 minutes), add a warning
          if (videoInfo.duration > 600) {
            console.warn(`Long video detected (${Math.floor(videoInfo.duration / 60)} minutes), may take longer to process`);
          }
          
          // Update the database record with the info
          await supabaseAdmin
            .from('source_videos')
            .update({
              title: videoInfo.title,
              platform: videoInfo.platform,
              duration: videoInfo.duration
            })
            .eq('id', sourceVideo.id);
          
        } catch (parseError) {
          console.warn('Could not parse video info result:', parseError);
        }
      }
    } catch (infoError) {
      console.warn('Could not retrieve video info:', infoError);
      // Don't fail the process, just note the warning
    }
    
    // Start the download process asynchronously
    downloadVideo(url, userId, sourceVideo.id, fileName).catch(error => {
      console.error(`Error in background download process for ${url}:`, error);
      // Background process will update the database with the error status
    });
    
    // Return a response to the client with any available metadata
    return NextResponse.json({
      id: sourceVideo.id,
      url: url,
      status: 'processing',
      title: videoInfo.title || undefined,
      platform: videoInfo.platform || undefined,
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
    console.log('Query results:', { count: videos?.length, error, firstVideo: videos?.[0] });
      
    if (error) {
      console.error('Error fetching source video:', error);
      return NextResponse.json({ error: 'Failed to fetch download status' }, { status: 500 });
    }
    
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }
    
    // Use the first result
    const data = videos[0];
    
    // Prepare extended response based on status
    const response: any = {
      id: data.id,
      url: data.url,
      status: data.status,
      storage_path: data.storage_path,
      title: data.title,
      platform: data.platform,
    };
    
    // Add error if present
    if (data.error_message) {
      response.error = data.error_message;
    }
    
    // Add additional information for completed videos
    if (data.status === 'completed') {
      response.public_url = data.public_url;
      response.duration = data.duration;
      response.processing_time_seconds = data.processing_time_seconds;
      response.completed_at = data.completed_at;
    }
    
    // Add progress if available
    if (data.download_progress !== undefined && data.download_progress !== null) {
      response.progress = data.download_progress;
    }
    
    // Return the enhanced status response
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Unexpected error checking download status:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

/**
 * Downloads a video using yt-dlp and uploads it to Supabase Storage
 */
async function downloadVideo(url: string, userId: string, sourceId: string, fileName: string) {
  // Log download start time for performance tracking
  const startTime = Date.now();
  console.log(`[${sourceId}] Starting download process for ${url}`);
  
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
    
    // Set download options with enhanced format selection and more features
    const options = [
      url,
      // Format selection - aiming for wide compatibility, then relying on fallbacks
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4', // Ensure output is mp4
      '--output', outputPath,
      '--no-playlist',    // Don't download playlists
      '--max-filesize', '50m',  // Limit file size to 50MB to ensure compatibility with Supabase
      '--no-warnings',    // Less verbose output
      '--geo-bypass',     // Try to bypass geo-restrictions
      '--ignore-errors',  // Continue on download errors
      '--no-check-certificate',  // Ignore SSL cert validation for some sites
      '--extractor-retries', '3',  // Retry extractor on failure
      '--min-sleep-interval', '1', // ADDED: min sleep interval
      '--max-sleep-interval', '5', // Don't sleep too long between retries
      '--force-ipv4',     // Sometimes helps with network issues
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36', // Mimic browser
      '--add-header', 'Accept-Language:en-US,en;q=0.9', // Set language header
      '--socket-timeout', '30',  // Don't hang indefinitely
    ];
    
    // Execute download with fallback for errors
    try {
      // Note: We can't use onProgress due to typing issues with yt-dlp-wrap
      // Instead, we'll just log key steps in the process
      console.log(`[${sourceId}] Starting download from ${url}`);
      
      // Add the --verbose flag to get more output for debugging
      options.push('--verbose');
      
      await ytDlp.execPromise(options);
      
      console.log(`[${sourceId}] Download completed successfully`);
    } catch (error) {
      console.error(`[${sourceId}] yt-dlp download error:`, error);
      
      // Type guard to check if error is an object with a message property
      const downloadError = error as { message?: string };
      const errorMessage = downloadError.message || 'Unknown error';
      
      // Try multiple fallback strategies based on the error type
      if (errorMessage.includes('format') || errorMessage.includes('codec')) {
        console.log(`[${sourceId}] Trying fallback #1: simpler format...`);
        
        try {
          const fallbackOptions = [
            url,
            '--format', 'best',  // Just get the best available format
            '--output', outputPath,
            '--no-playlist',
            '--max-filesize', '50m',
          ];
          
          // Try the basic format fallback
          await ytDlp.execPromise(fallbackOptions);
          console.log(`[${sourceId}] Fallback #1 succeeded`);
          
        } catch (fallbackError) {
          console.error(`[${sourceId}] Fallback #1 failed, trying fallback #2: forcing format...`);
          
          try {
            // Try an even more basic fallback with format forcing
            const secondFallbackOptions = [
              url,
              '--format', 'mp4',  // Force mp4
              '--output', outputPath,
              '--force-overwrites',
              '--no-check-certificate',
              '--max-filesize', '50m',
            ];
            
            await ytDlp.execPromise(secondFallbackOptions);
            console.log(`[${sourceId}] Fallback #2 succeeded`);
            
          } catch (secondFallbackError) {
            console.error(`[${sourceId}] All fallbacks failed, throwing error`);
            throw new Error(`Failed to download video after multiple attempts: ${errorMessage}`);
          }
        }
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('private')) {
        throw new Error(`Video is unavailable or private: ${errorMessage}`);
      } else if (errorMessage.includes('copyright') || errorMessage.includes('blocked')) {
        throw new Error(`Content is blocked due to copyright restrictions: ${errorMessage}`);
      } else if (errorMessage.includes('geo') || errorMessage.includes('country')) {
        // Try again with stronger geo bypass
        console.log(`[${sourceId}] Trying fallback with stronger geo-bypass...`);
        
        try {
          const geoBypassOptions = [
            url,
            '--format', 'best',
            '--output', outputPath,
            '--no-playlist',
            '--geo-bypass-country', 'US',  // Try US proxy
            '--geo-bypass',
            '--force-ipv4',  // Sometimes helps with geo-restrictions
          ];
          
          await ytDlp.execPromise(geoBypassOptions);
        } catch (geoError) {
          throw new Error(`Content is geo-restricted and bypass failed: ${errorMessage}`);
        }
      } else {
        throw new Error(`Download failed: ${errorMessage}`);
      }
    }
    
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
        upsert: true, // Allow upsert in case of retries
      });
      
    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get the public URL if needed
    const { data: publicUrlData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
      
    // Calculate performance metrics
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    console.log(`[${sourceId}] Download and upload completed in ${durationSeconds.toFixed(2)} seconds`);
    
    // Update the database record with successful status and timing information
    await updateSourceVideoStatus(
      sourceId,
      'completed',
      null,
      publicUrlData?.publicUrl,
      {
        processing_time_seconds: durationSeconds,
        completed_at: new Date().toISOString()
      }
    );
    
  } catch (error: any) {
    console.error(`[${sourceId}] Video download error:`, error);
    
    // Get a more helpful error message
    const errorMessage = error.message || 'Unknown error during video download';
    
    // Add additional context based on error type
    let detailedError = errorMessage;
    
    if (errorMessage.includes('unavailable')) {
      detailedError = `Video is unavailable or private: ${errorMessage}`;
    } else if (errorMessage.includes('copyright')) {
      detailedError = `Content blocked due to copyright: ${errorMessage}`;
    } else if (errorMessage.includes('geo')) {
      detailedError = `Content geo-restricted: ${errorMessage}`;
    } else if (errorMessage.includes('format')) {
      detailedError = `Format conversion error: ${errorMessage}`;
    }
    
    // Update database with error status
    await updateSourceVideoStatus(sourceId, 'error', detailedError);
  } finally {
    // Clean up temporary directory
    try {
      await fs.remove(tempDir);
      console.log(`[${sourceId}] Cleaned up temporary directory: ${tempDir}`);
    } catch (cleanupError) {
      console.error(`[${sourceId}] Error cleaning up temp directory:`, cleanupError);
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
  publicUrl?: string | null,
  additionalData?: Record<string, any>
) {
  try {
    const updateData: any = { status };
    
    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }
    
    if (publicUrl !== undefined) {
      updateData.public_url = publicUrl;
    }
    
    // Add any additional data fields if provided
    if (additionalData && typeof additionalData === 'object') {
      const { completed_at, processing_time_seconds, ...restOfAdditionalData } = additionalData; // Destructure further
      if (Object.keys(restOfAdditionalData).length > 0) {
        Object.assign(updateData, restOfAdditionalData);
      }
      if (completed_at) {
        console.log(`[${sourceId}] Note: 'completed_at' field was provided for source_videos but is being ignored due to schema mismatch.`);
      }
      if (processing_time_seconds) {
        console.log(`[${sourceId}] Note: 'processing_time_seconds' field was provided for source_videos but is being ignored due to schema mismatch.`);
      }
    }
    
    const { error } = await supabaseAdmin
      .from('source_videos')
      .update(updateData)
      .eq('id', sourceId);
      
    if (error) {
      console.error(`Error updating source video status to ${status}:`, error);
      // Add more details about the update attempt
      console.log('Update attempt details:', { sourceId, status, errorMessage, publicUrl });
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
      
      // Update bucket settings to ensure it's properly configured for video access
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
      
      // Note: CORS settings cannot be set via the JavaScript client,
      // they must be set in the Supabase dashboard
      console.log(`Remember to configure CORS settings for bucket "${bucketName}" in the Supabase dashboard`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }
    
    return { error: null };
  } catch (err: any) {
    console.error('Error ensuring bucket exists:', err);
    return { error: { message: err.message || 'Unknown error' } };
  }
}