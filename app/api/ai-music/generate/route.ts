import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { prompt, lyrics } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const MUREKA_AI_API_KEY = process.env.MUREKA_AI_API_KEY;

    if (!MUREKA_AI_API_KEY) {
      return NextResponse.json({ error: 'Mureka API key is not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.mureka.ai/v1/song/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, lyrics })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Mureka API error response:', errorBody);
      throw new Error(`Mureka API responded with ${response.status}`);
    }

    const generatedMusic = await response.json();
    console.log('Mureka API response:', JSON.stringify(generatedMusic, null, 2));
    return NextResponse.json({ taskId: generatedMusic.id });
  } catch (error) {
    console.error('Error generating music:', error);
    return NextResponse.json({ error: 'Failed to generate music' }, { status: 500 });
  }
}