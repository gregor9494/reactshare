import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import YTDlpWrap from 'yt-dlp-wrap';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL or Service Key is missing!');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const REACTION_BUCKET_NAME = 'reaction-videos';

// GET endpoint to download a reaction video file
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reactionId = searchParams.get('id');

  if (!reactionId) {
    return NextResponse.json({ error: 'Missing reaction ID' }, { status: 400 });
  }

  const { data: reaction, error } = await supabaseAdmin
    .from('reactions')
    .select('reaction_video_storage_path, user_id, title')
    .eq('id', reactionId)
    .single();

  if (error || !reaction) {
    return NextResponse.json({ error: 'Reaction not found' }, { status: 404 });
  }

  if (reaction.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!reaction.reaction_video_storage_path) {
    return NextResponse.json({ error: 'No video file available' }, { status: 404 });
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(REACTION_BUCKET_NAME)
    .download(reaction.reaction_video_storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download video file' }, { status: 500 });
  }

  const filename = `${reaction.title || 'reaction'}.mp4`;
  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Content-Type', 'video/mp4');

  return new NextResponse(fileData.stream(), { headers });
}

// POST endpoint to start a new download from a URL
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { url, title } = await request.json();

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    const downloadId = uuidv4();
    
    // Fire-and-forget the download process
    downloadAndUpload(url, userId, downloadId, title || 'Untitled Reaction');

    return NextResponse.json({
        id: downloadId,
        message: 'Reaction download initiated.',
    }, { status: 202 });
}


async function downloadAndUpload(url: string, userId: string, downloadId: string, title: string) {
  const tempDir = path.join(os.tmpdir(), `reaction-download-${downloadId}`);
  await fs.ensureDir(tempDir);
  const fileName = `${downloadId}.mp4`;
  const outputPath = path.join(tempDir, fileName);
  const storagePath = `${userId}/${fileName}`;

  let reactionId: string;

  try {
    const { data, error } = await supabaseAdmin
      .from('reactions')
      .insert({ user_id: userId, source_video_url: url, title, status: 'downloading' })
      .select('id')
      .single();

    if (error || !data) throw new Error('Failed to create reaction record');
    reactionId = data.id;

    const ytDlp = new YTDlpWrap();
    await ytDlp.execPromise([
      url,
      '--format', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outputPath,
    ]);

    const fileBuffer = await fs.readFile(outputPath);

    await supabaseAdmin.storage
      .from(REACTION_BUCKET_NAME)
      .upload(storagePath, fileBuffer, { contentType: 'video/mp4', upsert: true });

    await supabaseAdmin
      .from('reactions')
      .update({ status: 'uploaded', reaction_video_storage_path: storagePath })
      .eq('id', reactionId);

  } catch (error: any) {
    console.error(`[Download ${downloadId}] Error:`, error.message);
    const { data: reaction } = await supabaseAdmin.from('reactions').select('id').eq('source_video_url', url).eq('user_id', userId).single();
    if(reaction) {
        await supabaseAdmin
        .from('reactions')
        .update({ status: 'error' })
        .eq('id', reaction.id);
    }
  } finally {
    await fs.remove(tempDir);
  }
}