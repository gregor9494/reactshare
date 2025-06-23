import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const MUREKA_AI_API_KEY = process.env.MUREKA_AI_API_KEY;

    if (!MUREKA_AI_API_KEY) {
      return NextResponse.json({ error: 'Mureka API key is not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.mureka.ai/v1/song/query/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MUREKA_AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Mureka API error response:', errorBody);
      throw new Error(`Mureka API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error querying Mureka API:', error);
    return NextResponse.json({ error: 'Failed to query Mureka API' }, { status: 500 });
  }
}