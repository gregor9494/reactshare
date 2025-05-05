"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Clock, Youtube, Instagram, Twitter, Facebook, Twitch } from "lucide-react"

export function PublishOptions() {
  const [date, setDate] = useState<Date>()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Options</CardTitle>
        <CardDescription>Configure where and when to publish your reaction video</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Video Details</h3>
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input id="title" placeholder="Enter a catchy title for your video" />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="description" placeholder="Describe your reaction video" rows={4} />
          </div>
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <Input id="tags" placeholder="reaction, viral, trending (comma separated)" />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Platforms</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="youtube" />
              <div className="flex flex-1 items-center space-x-2">
                <Youtube className="h-5 w-5 text-red-600" />
                <label htmlFor="youtube" className="flex-1 text-sm font-medium">
                  YouTube
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="instagram" />
              <div className="flex flex-1 items-center space-x-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <label htmlFor="instagram" className="flex-1 text-sm font-medium">
                  Instagram
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="twitter" />
              <div className="flex flex-1 items-center space-x-2">
                <Twitter className="h-5 w-5 text-blue-400" />
                <label htmlFor="twitter" className="flex-1 text-sm font-medium">
                  Twitter/X
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="facebook" />
              <div className="flex flex-1 items-center space-x-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                <label htmlFor="facebook" className="flex-1 text-sm font-medium">
                  Facebook
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox id="twitch" />
              <div className="flex flex-1 items-center space-x-2">
                <Twitch className="h-5 w-5 text-purple-600" />
                <label htmlFor="twitch" className="flex-1 text-sm font-medium">
                  Twitch
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Publishing Schedule</h3>
          <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <div className="space-y-2 md:w-1/2">
              <p className="text-sm font-medium">Publish Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 md:w-1/2">
              <p className="text-sm font-medium">Publish Time</p>
              <Button variant="outline" className="w-full justify-start text-left">
                <Clock className="mr-2 h-4 w-4" />
                Select time
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="optimal" />
            <label htmlFor="optimal" className="text-sm font-medium">
              Use AI-recommended optimal posting times for each platform
            </label>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline">Save as Draft</Button>
          <Button>Publish Now</Button>
        </div>
      </CardContent>
    </Card>
  )
}
