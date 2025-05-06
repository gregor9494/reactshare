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
import { CalendarIcon, Clock, Youtube, Instagram, Twitter, Facebook, Twitch, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PublishOptionsProps {
  onPublishingComplete?: () => void;
}

export function PublishOptions({ onPublishingComplete }: PublishOptionsProps = {}) {
  const [date, setDate] = useState<Date>()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [useOptimalTimes, setUseOptimalTimes] = useState(false)
  const [publishComplete, setPublishComplete] = useState(false)
  
  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    )
  }
  
  // Complete publishing
  const completePublishing = () => {
    setPublishComplete(true)
    if (onPublishingComplete) {
      onPublishingComplete()
    }
  }
  
  // Platform data
  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-blue-400' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { id: 'twitch', name: 'Twitch', icon: Twitch, color: 'text-purple-600' },
  ]

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">Publishing Options</CardTitle>
        <CardDescription>Configure where and when to publish your reaction video</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        {/* Video Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Video Details</h3>
          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input 
                id="title" 
                placeholder="Enter a catchy title for your video" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea 
                id="description" 
                placeholder="Describe your reaction video" 
                rows={4} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <Input 
                id="tags" 
                placeholder="reaction, viral, trending (comma separated)" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Platforms */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Platforms</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => {
              const Icon = platform.icon
              const isSelected = selectedPlatforms.includes(platform.id)
              
              return (
                <div 
                  key={platform.id} 
                  className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors
                    ${isSelected ? 'border-primary bg-primary/5' : ''}
                  `}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <Checkbox 
                    id={platform.id} 
                    checked={isSelected}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <div className="flex flex-1 items-center space-x-2">
                    <Icon className={`h-5 w-5 ${platform.color}`} />
                    <label htmlFor={platform.id} className="flex-1 text-sm font-medium cursor-pointer">
                      {platform.name}
                    </label>
                    {isSelected && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Publishing Schedule */}
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
                {date ? format(date, "h:mm a") : "Select time"}
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="optimal" 
              checked={useOptimalTimes}
              onCheckedChange={(checked) => setUseOptimalTimes(checked === true)}
            />
            <label htmlFor="optimal" className="text-sm font-medium cursor-pointer">
              Use AI-recommended optimal posting times for each platform
            </label>
          </div>
          
          {useOptimalTimes && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 mt-2">
              <p className="font-medium">Optimal posting times:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>YouTube: Weekends at 9-11 AM</li>
                <li>Instagram: Wednesday at 11 AM and Friday at 10-11 AM</li>
                <li>Twitter/X: Weekdays at 9 AM</li>
                <li>Facebook: Weekdays at 1-4 PM</li>
                <li>Twitch: Weekends at 7-9 PM</li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline">Save as Draft</Button>
          <Button onClick={completePublishing}>
            {selectedPlatforms.length > 0 ? "Publish Now" : "Skip Publishing"}
          </Button>
        </div>
        
        {/* Success message */}
        {publishComplete && (
          <Alert className="bg-green-50 border-green-200 mt-4">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              {selectedPlatforms.length > 0 
                ? `Your reaction video has been scheduled for publishing to ${selectedPlatforms.length} platform(s).`
                : "Your reaction video has been saved without publishing."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
