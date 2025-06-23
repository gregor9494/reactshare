import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateVideo } from '@/lib/generate-video';
import { downloadFile } from '@/lib/download-file';
import { AiMusic } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { musicId, logoUrl } = await request.json();

    if (!musicId) {
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: music, error: fetchError } = await supabase
      .from('ai_music')
      .select('*')
      .eq('id', musicId)
      .single();

    if (fetchError) {
      throw fetchError;
    }
    const tempDir = path.join('/tmp', 'ai-music-videos', `job-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const songPath = path.join(tempDir, `song-${music.id}.mp3`);
    await downloadFile(music.song_url, songPath);

    const logoPath = path.join(tempDir, `logo-${music.id}.png`);
    await downloadFile(logoUrl, logoPath);

    const outputPath = path.join(tempDir, `video-${music.id}.mp4`);

    await generateVideo(music as AiMusic, songPath, logoPath, outputPath);
    const videoFile = await fs.readFile(outputPath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(`ai-music/${music.id}.mp4`, videoFile, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: updatedMusic, error: updateError } = await supabase
      .from('ai_music')
      .update({ video_id: uploadData.path })
      .eq('id', musicId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return NextResponse.json(updatedMusic);
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}