"use client"

import { useState, useRef, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Scissors, Type, Music, Smile, Palette, Play, Download, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VideoEditorProps {
  recordedBlob?: Blob;
  onEditingComplete?: () => void;
}

export function VideoEditor({ recordedBlob, onEditingComplete }: VideoEditorProps = {}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [editComplete, setEditComplete] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Set up video when recordedBlob changes
  useEffect(() => {
    if (recordedBlob && videoRef.current) {
      console.log('Setting up VideoEditor with recordedBlob:', recordedBlob.type, recordedBlob.size);
      const videoUrl = URL.createObjectURL(recordedBlob);
      videoRef.current.src = videoUrl;
      
      // Set up event listeners for debugging
      const handleVideoError = (e: Event) => {
        console.error('VideoEditor - Error loading video:', videoRef.current?.error);
      };
      
      const handleCanPlay = () => {
        console.log('VideoEditor - Video can now play');
      };
      
      const handleLoadedData = () => {
        console.log('VideoEditor - Video data loaded');
      };
      
      // Add event listeners
      videoRef.current.addEventListener('error', handleVideoError);
      videoRef.current.addEventListener('canplay', handleCanPlay);
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      // Clean up URL and event listeners when component unmounts
      return () => {
        URL.revokeObjectURL(videoUrl);
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handleVideoError);
          videoRef.current.removeEventListener('canplay', handleCanPlay);
          videoRef.current.removeEventListener('loadeddata', handleLoadedData);
        }
      };
    }
  }, [recordedBlob]);
  
  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(100); // Set end to 100% by default
    }
  };
  
  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      setCurrentTime(newTime);
      
      // Calculate percentage for slider
      const percentage = (newTime / videoRef.current.duration) * 100;
      
      // If we reach the trim end, pause the video
      if (percentage >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // If at the end of trim range, go back to start
        const currentPercentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        if (currentPercentage >= trimEnd) {
          videoRef.current.currentTime = (trimStart / 100) * videoRef.current.duration;
        }
        
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (videoRef.current) {
      const newTime = (value[0] / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  // Handle trim range change
  const handleTrimChange = (value: number[]) => {
    setTrimStart(value[0]);
    setTrimEnd(value[1]);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate current percentage
  const currentPercentage = duration ? (currentTime / duration) * 100 : 0;
  
  // Complete editing
  const completeEditing = () => {
    setEditComplete(true);
    if (onEditingComplete) {
      onEditingComplete();
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">Quick Editor</CardTitle>
        <CardDescription>Edit your reaction video before publishing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        {/* Video Preview */}
        <div className="aspect-video overflow-hidden rounded-md bg-black relative">
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            onLoadedMetadata={handleMetadataLoaded}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            playsInline
            crossOrigin="anonymous"
            onError={(e) => console.error("VideoEditor - Video error event:", e)}
          />
          
          {/* Play button overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button 
                size="icon" 
                variant="secondary" 
                className="h-12 w-12 rounded-full opacity-80"
                onClick={togglePlay}
              >
                <Play className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Timeline</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>
          
          {/* Trim range visualization */}
          <div className="h-8 rounded-md bg-muted p-1">
            <div className="relative h-full w-full">
              {/* Trim start marker */}
              <div 
                className="absolute top-0 h-full w-[2px] bg-primary"
                style={{ left: `${trimStart}%` }}
              />
              
              {/* Trim end marker */}
              <div 
                className="absolute top-0 h-full w-[2px] bg-primary"
                style={{ left: `${trimEnd}%` }}
              />
              
              {/* Playhead */}
              <div 
                className="absolute top-0 h-full w-[2px] bg-red-500"
                style={{ left: `${currentPercentage}%` }}
              />
              
              {/* Trim range highlight */}
              <div 
                className="absolute top-0 h-full bg-primary/20"
                style={{ 
                  left: `${trimStart}%`,
                  width: `${trimEnd - trimStart}%`
                }}
              />
            </div>
          </div>
          
          {/* Playback slider */}
          <Slider 
            value={[currentPercentage]} 
            max={100} 
            step={0.1} 
            onValueChange={handleSliderChange}
          />
        </div>
        
        {/* Editing tabs */}
        <Tabs defaultValue="trim">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>
          
          {/* Trim tab */}
          <TabsContent value="trim" className="py-4 space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Set Start and End Points</h3>
              
              {/* Trim range slider */}
              <Slider 
                value={[trimStart, trimEnd]} 
                max={100} 
                step={1} 
                onValueChange={handleTrimChange}
                className="my-6"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Start Time</p>
                  <div className="flex rounded-md border">
                    <input 
                      type="text" 
                      className="w-full rounded-l-md px-3 py-2 text-sm" 
                      value={formatTime((trimStart / 100) * duration)} 
                      readOnly 
                    />
                    <Button 
                      variant="ghost" 
                      className="rounded-l-none"
                      onClick={() => {
                        if (videoRef.current) {
                          setTrimStart((currentTime / duration) * 100);
                        }
                      }}
                    >
                      Set
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">End Time</p>
                  <div className="flex rounded-md border">
                    <input 
                      type="text" 
                      className="w-full rounded-l-md px-3 py-2 text-sm" 
                      value={formatTime((trimEnd / 100) * duration)} 
                      readOnly 
                    />
                    <Button 
                      variant="ghost" 
                      className="rounded-l-none"
                      onClick={() => {
                        if (videoRef.current) {
                          setTrimEnd((currentTime / duration) * 100);
                        }
                      }}
                    >
                      Set
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Text tab */}
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
                    <input type="color" className="w-10 border-0 p-0" defaultValue="#ffffff" />
                    <input type="text" className="w-full px-3 py-2 text-sm" defaultValue="#FFFFFF" readOnly />
                  </div>
                </div>
              </div>
              <Button>Add Text</Button>
            </div>
          </TabsContent>
          
          {/* Audio tab */}
          <TabsContent value="audio" className="py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Audio Levels</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-xs text-muted-foreground">Your Voice</p>
                    <p className="text-xs">80%</p>
                  </div>
                  <Slider defaultValue={[80]} max={100} step={1} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-xs text-muted-foreground">Background Music</p>
                    <p className="text-xs">30%</p>
                  </div>
                  <Slider defaultValue={[30]} max={100} step={1} />
                </div>
              </div>
              
              <h3 className="text-sm font-medium mt-6">Background Music</h3>
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
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Action buttons */}
        <div className="flex justify-between">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Draft
          </Button>
          <Button onClick={completeEditing}>
            <Check className="mr-2 h-4 w-4" />
            Finish Editing
          </Button>
        </div>
        
        {/* Success message */}
        {editComplete && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              Editing complete! Your reaction video is ready for publishing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
