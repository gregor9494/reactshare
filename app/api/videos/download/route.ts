import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

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
    
    // For MVP, we'll simulate video download and processing
    // In a production environment, you would use a library like youtube-dl or a service
    // to properly download videos from various platforms
    
    // Generate a unique ID for this download
    const downloadId = uuidv4();
    const storagePath = `${userId}/${downloadId}.mp4`;
    
    // Create a record in the database for this download
    const { data: sourceVideo, error: dbError } = await supabaseAdmin
      .from('source_videos')
      .insert({
        user_id: userId,
        url: url,
        storage_path: storagePath,
        status: 'processing',
      })
      .select()
      .single();
      
    if (dbError) {
      console.error('Error creating source video record:', dbError);
      return NextResponse.json({ error: 'Failed to initiate video download' }, { status: 500 });
    }
    
    // In a real implementation, you would:
    // 1. Use a task queue (like Bull) to handle the download asynchronously
    // 2. Use youtube-dl or similar to download the video
    // 3. Upload the downloaded video to Supabase storage
    // 4. Update the database record with the final status
    
    // For MVP, we'll just return success and assume the video is available
    // In a real implementation, the client would poll for status updates
    
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
    // Query the database for the download status
    const { data, error } = await supabaseAdmin
      .from('source_videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // Ensure the user can only access their own downloads
      .single();
      
    if (error) {
      console.error('Error fetching source video:', error);
      return NextResponse.json({ error: 'Failed to fetch download status' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }
    
    // For MVP, we'll simulate that the download is complete
    // In a real implementation, this would reflect the actual status
    
    return NextResponse.json({
      id: data.id,
      url: data.url,
      status: 'completed',
      storage_path: data.storage_path,
    });
    
  } catch (error) {
    console.error('Unexpected error checking download status:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}