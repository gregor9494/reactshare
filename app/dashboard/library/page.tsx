import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { VideoGrid } from "@/components/library/video-grid"
import { VideoFilters } from "@/components/library/video-filters"
import { Search, FolderPlus } from "lucide-react"

export default function LibraryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Video Library</h1>
              <p className="text-muted-foreground">Manage and organize your reaction videos</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
              <Button>Upload Video</Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search videos..." className="w-full bg-background pl-8 md:max-w-xs" />
              </div>
              <VideoFilters />
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Videos</TabsTrigger>
                <TabsTrigger value="reactions">Reactions</TabsTrigger>
                <TabsTrigger value="source">Source Videos</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                <VideoGrid />
              </TabsContent>
              <TabsContent value="reactions" className="mt-6">
                <VideoGrid type="reactions" />
              </TabsContent>
              <TabsContent value="source" className="mt-6">
                <VideoGrid type="source" />
              </TabsContent>
              <TabsContent value="drafts" className="mt-6">
                <VideoGrid type="drafts" />
              </TabsContent>
              <TabsContent value="archived" className="mt-6">
                <VideoGrid type="archived" />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
