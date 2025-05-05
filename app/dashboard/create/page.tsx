import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { VideoRecorder } from "@/components/create/video-recorder"
import { VideoEditor } from "@/components/create/video-editor"
import { PublishOptions } from "@/components/create/publish-options"

export default function CreatePage() {
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
              <h1 className="text-3xl font-bold tracking-tight">Create New Reaction</h1>
              <p className="text-muted-foreground">Record, edit, and publish your reaction video</p>
            </div>
          </div>
          <Tabs defaultValue="source" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="source">1. Source Selection</TabsTrigger>
              <TabsTrigger value="record">2. Recording</TabsTrigger>
              <TabsTrigger value="edit">3. Quick Editor</TabsTrigger>
              <TabsTrigger value="publish">4. Publishing</TabsTrigger>
            </TabsList>
            <TabsContent value="source" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Source Video</CardTitle>
                  <CardDescription>Choose a video to react to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Enter URL</h3>
                    <div className="flex gap-2">
                      <Input placeholder="Paste YouTube, TikTok, or Twitter URL" className="flex-1" />
                      <Button>Load</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Upload Local File</h3>
                    <div className="rounded-md border border-dashed p-8 text-center">
                      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                            />
                          </svg>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Drag and drop your video file here or click to browse
                        </p>
                        <Button variant="outline" className="mt-4">
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Recent Videos</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="cursor-pointer overflow-hidden rounded-md border">
                          <div className="aspect-video bg-muted">
                            <img
                              src={`/placeholder.svg?key=4z1kk&height=120&width=213&query=video%20${i}`}
                              alt={`Recent video ${i}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="p-2">
                            <p className="truncate text-sm font-medium">Recent Video {i}</p>
                            <p className="text-xs text-muted-foreground">
                              {i} day{i !== 1 ? "s" : ""} ago
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="record" className="py-4">
              <VideoRecorder />
            </TabsContent>
            <TabsContent value="edit" className="py-4">
              <VideoEditor />
            </TabsContent>
            <TabsContent value="publish" className="py-4">
              <PublishOptions />
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline">Save Draft</Button>
            <Button>Continue to Recording</Button>
          </div>
        </main>
      </div>
    </div>
  )
}
