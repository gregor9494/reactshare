import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ai_music')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching AI music:', error);
    return NextResponse.json({ error: 'Failed to fetch AI music' }, { status: 500 });
  }

  return NextResponse.json(data);
}