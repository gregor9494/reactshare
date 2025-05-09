import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { Folder } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing for server-side operations.');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// GET - Fetch all folders for the authenticated user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
      // Fetch folders for the authenticated user
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) {
        // If the error is that the table doesn't exist, return an empty array
        if (error.code === '42P01') { // Table doesn't exist
          console.warn('Folders table does not exist yet. Returning empty folders array.');
          return NextResponse.json({ folders: [] }, { status: 200 });
        }
        
        console.error('Error fetching folders:', error);
        return NextResponse.json({ error: 'Failed to fetch folders', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ folders: data as Folder[] }, { status: 200 });
    } catch (error: any) {
      console.warn('Error accessing folders table, returning empty array:', error);
      return NextResponse.json({ folders: [] }, { status: 200 });
    }
  } catch (err) {
    console.error('API Error fetching folders:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST - Create a new folder
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { name, description } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    try {
      // Create a new folder
      const { data, error } = await supabase
        .from('folders')
        .insert([
          {
            user_id: userId,
            name: name.trim(),
            description: description || null
          }
        ])
        .select();

      if (error) {
        // If the error is that the table doesn't exist, inform the user
        if (error.code === '42P01') { // Table doesn't exist
          return NextResponse.json({
            error: 'Folders feature is not yet available. Please run the database migration first.',
            details: 'The folders table does not exist in the database.'
          }, { status: 500 });
        }
        
        console.error('Error creating folder:', error);
        return NextResponse.json({ error: 'Failed to create folder', details: error.message }, { status: 500 });
      }

      return NextResponse.json({ folder: data[0] as Folder }, { status: 201 });
    } catch (error: any) {
      console.error('Error accessing folders table:', error);
      return NextResponse.json({
        error: 'Folders feature is not yet available. Please run the database migration first.',
        details: error.message
      }, { status: 500 });
    }
  } catch (err) {
    console.error('API Error creating folder:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}