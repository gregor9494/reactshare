import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { RecentReactions } from "@/components/dashboard/recent-reactions"
import { AnalyticsSummary } from "@/components/dashboard/analytics-summary"
import { ScheduledPosts } from "@/components/dashboard/scheduled-posts"
import { StorageUsage } from "@/components/dashboard/storage-usage"
import { auth } from "@/auth"; // Import the auth function
import { redirect } from 'next/navigation'; // Import redirect
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

export default async function DashboardPage() { // Make the component async
  const session = await auth(); // Get session server-side

  // Although middleware protects this route, double-check session for robustness
  if (!session?.user) {
    // This shouldn't normally happen due to middleware, but handle defensively
    redirect('/login'); // Redirect if no session (e.g., middleware failed)
  }

  const userEmail = session.user.email || 'User'; // Get user email or default

  // Fetch reactions directly from Supabase instead of using the API route
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
        console.log(`Fetched ${reactions.length} reactions for user ${session.user.id}`);
      }
    }
  } catch (error) {
    console.error('Error fetching reactions:', error);
  }


  return (
    <div className="flex min-h-screen flex-col">
      {/* Pass session to header if needed */}
      <DashboardHeader session={session} />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              {/* Personalized welcome message */}
              <p className="text-muted-foreground">Welcome back, {userEmail}! Here's an overview.</p>
            </div>
            <Link href="/dashboard/create">
              <Button>Create New Reaction</Button>
            </Link>
          </div>
          {/* Placeholder cards - replace with dynamic data or remove */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Display actual count */}
                <div className="text-2xl font-bold">{reactions.length}</div>
                <p className="text-xs text-muted-foreground">Based on your reactions</p> {/* Updated description */}
              </CardContent>
            </Card>
            {/* Remove or update other static cards as needed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div> {/* Placeholder */}
                <p className="text-xs text-muted-foreground">Views not tracked in MVP</p> {/* Updated description */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div> {/* Placeholder */}
                <p className="text-xs text-muted-foreground">Engagement not tracked in MVP</p> {/* Updated description */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div> {/* Placeholder */}
                <p className="text-xs text-muted-foreground">Scheduling not in MVP</p> {/* Updated description */}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Reactions</CardTitle>
                <CardDescription>Your latest reaction videos</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Pass fetched reactions to RecentReactions */}
                <RecentReactions reactions={reactions} />
              </CardContent>
            </Card>
            {/* Remove or update other components as needed */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Analytics Summary</CardTitle>
                <CardDescription>Your content performance</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsSummary /> {/* Keep placeholder for now */}
              </CardContent>
            </Card>
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <CardDescription>Upcoming content releases</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduledPosts /> {/* Keep placeholder for now */}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Your cloud storage allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <StorageUsage /> {/* Keep placeholder for now */}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

// Define a basic type for Reaction if not already in lib/types.ts
// You might need to create lib/types.ts if it doesn't exist
// export interface Reaction {
//   id: string;
//   user_id: string;
//   source_video_url: string;
//   reaction_video_storage_path: string | null;
//   title: string | null;
//   status: string;
//   created_at: string;
//   updated_at: string;
// }
