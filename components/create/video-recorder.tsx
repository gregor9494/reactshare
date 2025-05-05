"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Camera, Monitor, Play, Square, Settings } from "lucide-react"

export function VideoRecorder() {
  const [isRecording, setIsRecording] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Your Reaction</CardTitle>
        <CardDescription>Capture your reaction with our studio tools</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="aspect-video overflow-hidden rounded-md bg-black">
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-white">Source Video</p>
            </div>
          </div>
          <div className="aspect-video overflow-hidden rounded-md bg-black">
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-white">Your Camera</p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Camera Source</h3>
              <Select defaultValue="webcam">
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webcam">Webcam</SelectItem>
                  <SelectItem value="external">External Camera</SelectItem>
                  <SelectItem value="phone">Phone Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Microphone</h3>
              <Select defaultValue="internal">
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Microphone</SelectItem>
                  <SelectItem value="usb">USB Microphone</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth Headset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recording Quality</h3>
              <Select defaultValue="hd">
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sd">Standard (480p)</SelectItem>
                  <SelectItem value="hd">HD (1080p)</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recording Mode</h3>
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
                <Button variant="outline" className="flex-1">
                  <Monitor className="mr-2 h-4 w-4" />
                  Screen
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mic className="mr-2 h-4 w-4" />
                  Audio
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center space-x-4">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
          <Button size="lg" variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Advanced Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
