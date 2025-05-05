"use client"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Scissors, Type, Music, Smile, Palette, Play, Download } from "lucide-react"

export function VideoEditor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Editor</CardTitle>
        <CardDescription>Edit your reaction video before publishing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="aspect-video overflow-hidden rounded-md bg-black">
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white">Preview</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Timeline</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">00:45 / 03:21</p>
            </div>
          </div>
          <div className="h-8 rounded-md bg-muted p-1">
            <div className="relative h-full w-full">
              <div className="absolute left-[22%] top-0 h-full w-[1px] bg-primary"></div>
            </div>
          </div>
          <Slider defaultValue={[22]} max={100} step={1} />
        </div>
        <Tabs defaultValue="trim">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trim">
              <Scissors className="mr-2 h-4 w-4" />
              Trim
            </TabsTrigger>
            <TabsTrigger value="text">
              <Type className="mr-2 h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Music className="mr-2 h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="stickers">
              <Smile className="mr-2 h-4 w-4" />
              Stickers
            </TabsTrigger>
            <TabsTrigger value="filters">
              <Palette className="mr-2 h-4 w-4" />
              Filters
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trim" className="py-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Set Start and End Points</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Start Time</p>
                  <div className="flex rounded-md border">
                    <input type="text" className="w-full rounded-l-md px-3 py-2 text-sm" value="00:00:12" readOnly />
                    <Button variant="ghost" className="rounded-l-none">
                      Set
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">End Time</p>
                  <div className="flex rounded-md border">
                    <input type="text" className="w-full rounded-l-md px-3 py-2 text-sm" value="00:03:45" readOnly />
                    <Button variant="ghost" className="rounded-l-none">
                      Set
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="text" className="py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Add Text Overlay</h3>
              <textarea
                className="w-full rounded-md border p-3 text-sm"
                rows={3}
                placeholder="Enter your text here..."
              ></textarea>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Font</p>
                  <select className="w-full rounded-md border px-3 py-2 text-sm">
                    <option>Sans Serif</option>
                    <option>Serif</option>
                    <option>Monospace</option>
                    <option>Display</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Color</p>
                  <div className="flex rounded-md border">
                    <input type="color" className="w-10 border-0 p-0" value="#ffffff" />
                    <input type="text" className="w-full px-3 py-2 text-sm" value="#FFFFFF" readOnly />
                  </div>
                </div>
              </div>
              <Button>Add Text</Button>
            </div>
          </TabsContent>
          <TabsContent value="audio" className="py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Background Music</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {["Upbeat", "Dramatic", "Relaxed", "Funny"].map((category) => (
                  <div key={category} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{category}</p>
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">5 tracks available</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Audio Levels</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">Background Music</p>
                      <p className="text-xs">30%</p>
                    </div>
                    <Slider defaultValue={[30]} max={100} step={1} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">Your Voice</p>
                      <p className="text-xs">80%</p>
                    </div>
                    <Slider defaultValue={[80]} max={100} step={1} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Draft
          </Button>
          <Button>Preview Final Video</Button>
        </div>
      </CardContent>
    </Card>
  )
}
