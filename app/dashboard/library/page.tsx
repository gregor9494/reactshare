import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input if needed for future search
import { DashboardHeader } from "@/components/dashboard/dashboard-header"; // Keep DashboardHeader
import { DashboardNav } from "@/components/dashboard/dashboard-nav"; // Keep DashboardNav
import { VideoGrid } from "@/components/library/video-grid"; // Import VideoGrid
// Remove unused imports: Tabs, TabsContent, TabsList, TabsTrigger, VideoFilters, Search, FolderPlus

import { auth } from "@/auth"; // Import auth function
import { redirect } from 'next/navigation'; // Import redirect
import Link from "next/link"; // Import Link
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// Define the Reaction interface directly here temporarily to fix the TypeScript error
interface Reaction {
  id: string;
  user_id: string;
  source_video_url: string;
  reaction_video_storage_path: string | null;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing in environment variables.');
  // We'll handle this in the component
}

// Create a Supabase admin client for server component
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

export default async function LibraryPage() { // Make the component async
  const session = await auth(); // Get session server-side

  // Although middleware protects this route, double-check session for robustness
  if (!session?.user) {
    // This shouldn't normally happen due to middleware, but handle defensively
    redirect('/login'); // Redirect if no session (e.g., middleware failed)
  }

  // Fetch all reactions directly from Supabase instead of using the API route
  let reactions: Reaction[] = [];
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Cannot fetch reactions: Supabase credentials missing');
    } else {
      // Fetch reactions for the logged-in user directly from Supabase
      const { data, error } = await supabaseAdmin
        .from('reactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Fetch Reactions Error:', error.message);
      } else {
        reactions = data || [];
        console.log(`Fetched ${reactions.length} reactions for library for user ${session.user.id}`);
      }
    }
  } catch (error) {
    console.error('Error fetching reactions for library:', error);
  }


  return (
    <div className="flex min-h-screen flex-col">
      {/* DashboardHeader is likely part of the layout or a parent component */}
      {/* <DashboardHeader /> */}
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          {/* DashboardNav is likely static, keep it */}
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Video Library</h1>
              <p className="text-muted-foreground">Manage and organize your reaction videos</p>
            </div>
            {/* Keep Upload Video button, maybe link to Create page */}
            <div className="flex gap-2">
              {/* Removed New Folder for MVP */}
              <Link href="/dashboard/create"> {/* Link to create page */}
                <Button>Upload Video</Button>
              </Link>
            </div>
          </div>

          {/* Simplified UI - focus on displaying the grid */}
          <div className="flex flex-col gap-6">
            {/* Removed Search and Filters for MVP */}
            {/* <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> ... </div> */}

            {/* Use a single VideoGrid to display all fetched reactions */}
            {/* Removed Tabs for MVP simplicity */}
            {/* <Tabs defaultValue="all" className="w-full"> ... </Tabs> */}
            <VideoGrid reactions={reactions} /> {/* Pass fetched reactions */}
          </div>
        </main>
      </div>
    </div>
  );
}
