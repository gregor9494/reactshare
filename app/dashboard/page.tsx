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

export default async function DashboardPage() { // Make the component async
  const session = await auth(); // Get session server-side

  // Although middleware protects this route, double-check session for robustness
  if (!session?.user) {
    // This shouldn't normally happen due to middleware, but handle defensively
    redirect('/login'); // Redirect if no session (e.g., middleware failed)
  }

  const userEmail = session.user.email || 'User'; // Get user email or default

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">127</div>
                <p className="text-xs text-muted-foreground">+5.4% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">54.3K</div>
                <p className="text-xs text-muted-foreground">+12.7% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.3%</div>
                <p className="text-xs text-muted-foreground">+0.2% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Next post in 2 hours</p>
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
                <RecentReactions />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Analytics Summary</CardTitle>
                <CardDescription>Your content performance</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsSummary />
              </CardContent>
            </Card>
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <CardDescription>Upcoming content releases</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduledPosts />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Your cloud storage allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <StorageUsage />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
