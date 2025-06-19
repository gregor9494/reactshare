import { createClient } from '@supabase/supabase-js';

// Validate and get Supabase environment variables
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check if environment variables exist
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing in environment variables. Please check your .env.local file.');
  }

  // Check if placeholder values are still being used
  if (supabaseUrl.includes('YOUR_NEW_SUPABASE_PROJECT_URL') || 
      supabaseAnonKey.includes('YOUR_NEW_SUPABASE_ANON_KEY') ||
      (supabaseServiceKey && supabaseServiceKey.includes('YOUR_NEW_SUPABASE_SERVICE_ROLE_KEY'))) {
    throw new Error(
      'Supabase credentials are not configured. Please:\n' +
      '1. Create a new Supabase project at https://supabase.com\n' +
      '2. Update your .env.local file with real credentials\n' +
      '3. Run the database setup script\n' +
      'See docs/supabase-setup-guide.md for detailed instructions.'
    );
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Please check your .env.local file.`);
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey
  };
}

// Create Supabase client with anon key (for client-side operations)
export function createSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Create Supabase client with service role key (for server-side operations)
export function createSupabaseServiceClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
  
  if (!supabaseServiceKey) {
    throw new Error('Supabase Service Role Key is missing in environment variables. Please check your .env.local file.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Legacy exports for backward compatibility
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;