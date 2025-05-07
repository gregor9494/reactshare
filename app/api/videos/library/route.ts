import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth'; // Assuming your auth setup is here
import { SourceVideo } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
  // Potentially throw an error or handle this case appropriately
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch source videos for the authenticated user
    // Assuming you have a 'source_videos' table
    const { data, error } = await supabase
      .from('source_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed') // Only fetch completed videos
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed source videos:', error);
      return NextResponse.json({ error: 'Failed to fetch completed source videos', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data as SourceVideo[] }, { status: 200 });

  } catch (err) {
    console.error('API Error fetching completed source videos:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}