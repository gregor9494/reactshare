import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { ScheduledCalendar } from "@/components/scheduled/scheduled-calendar"
import { ScheduledList } from "@/components/scheduled/scheduled-list"
import { CalendarDays, List, Plus } from "lucide-react"

export default function ScheduledPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scheduled Posts</h1>
              <p className="text-muted-foreground">Manage your upcoming content releases</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule New Post
            </Button>
          </div>

          <Tabs defaultValue="calendar" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="calendar">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Calendar View
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="mr-2 h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Today
                </Button>
                <div className="flex">
                  <Button variant="outline" size="sm" className="rounded-r-none">
                    &lt;
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-l-none">
                    &gt;
                  </Button>
                </div>
              </div>
            </div>

            <TabsContent value="calendar" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>May 2023</CardTitle>
                  <CardDescription>Your scheduled content for this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduledCalendar />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Posts</CardTitle>
                  <CardDescription>All your scheduled content in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduledList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
