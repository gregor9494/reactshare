"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Camera, Monitor, Play, Square, Settings, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing for video recorder component.');
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const BUCKET_NAME = 'source-videos';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  sourceVideoId?: string;
}

export function VideoRecorder({ onRecordingComplete, sourceVideoId }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [devices, setDevices] = useState<{ videoDevices: MediaDeviceInfo[], audioDevices: MediaDeviceInfo[] }>({
    videoDevices: [],
    audioDevices: []
  })
  const [selectedDevices, setSelectedDevices] = useState({
    videoDeviceId: '',
    audioDeviceId: ''
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const webcamRef = useRef<HTMLVideoElement>(null)
  const sourceVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get available media devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission first by getting a stream
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        
        // Get all devices
        const devices = await navigator.mediaDevices.enumerateDevices()
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        const audioDevices = devices.filter(device => device.kind === 'audioinput')
        
        setDevices({ videoDevices, audioDevices })
        
        // Set default devices
        if (videoDevices.length > 0) {
          setSelectedDevices(prev => ({ ...prev, videoDeviceId: videoDevices[0].deviceId }))
        }
        
        if (audioDevices.length > 0) {
          setSelectedDevices(prev => ({ ...prev, audioDeviceId: audioDevices[0].deviceId }))
        }
        
        // Stop the temporary stream
        tempStream.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.error('Error getting media devices:', err)
        setError('Could not access camera or microphone. Please check permissions.')
      }
    }
    
    getDevices()
    
    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])
  
  // Initialize webcam when devices are selected
  useEffect(() => {
    async function initializeWebcam() {
      try {
        if (stream) {
          // Stop previous stream
          stream.getTracks().forEach(track => track.stop())
        }
        
        // Only proceed if we have device IDs
        if (!selectedDevices.videoDeviceId || !selectedDevices.audioDeviceId) return
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedDevices.videoDeviceId },
          audio: { deviceId: selectedDevices.audioDeviceId }
        })
        
        setStream(newStream)
        
        if (webcamRef.current) {
          webcamRef.current.srcObject = newStream
        }
      } catch (err) {
        console.error('Error initializing webcam:', err)
        setError('Could not initialize webcam. Please check permissions.')
      }
    }
    
    initializeWebcam()
  }, [selectedDevices])
  
  // Initialize source video
  useEffect(() => {
    // Only proceed if we have a sourceVideoId
    if (!sourceVideoId || !sourceVideoRef.current) {
      return;
    }

    const fetchSourceVideo = async () => {
      // Store reference locally to avoid null checks on every access
      const videoElement = sourceVideoRef.current;
      if (!videoElement) return;
      
      try {
        console.log('Fetching source video with ID:', sourceVideoId);
        
        // First try to get the video directly from API endpoint which is more reliable
        // as it includes authentication and user_id filtering
        try {
          const response = await fetch(`/api/videos/download?id=${sourceVideoId}`);
          
          if (response.ok) {
            const videoData = await response.json();
            console.log('Video data from API:', videoData);
            
            if (videoData.status === 'completed' && videoData.storage_path) {
              // Get the public URL from Supabase
              const { data: publicUrlData } = await supabase.storage
                .from('source-videos') // Use the correct bucket name
                .getPublicUrl(videoData.storage_path);
                
              if (publicUrlData?.publicUrl) {
                console.log('Setting source video from API response:', publicUrlData.publicUrl);
                videoElement.src = publicUrlData.publicUrl;
                return;
              }
            }
          }
        } catch (apiError) {
          console.error('Error fetching from API, falling back to direct Supabase query:', apiError);
        }
        
        // Fallback to direct Supabase query
        console.log('Falling back to direct Supabase query');
        
        // Get the user ID from the session to filter by both ID and user_id
        // This ensures we only get videos that belong to the current user
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        if (!userId) {
          setError('Authentication required to load source video');
          return;
        }
        
        // Try to fetch with both ID and user_id to ensure we get exactly one result
        let { data: sourceVideos, error: fetchError } = await supabase
          .from('source_videos')
          .select('*')
          .eq('id', sourceVideoId)
          .eq('user_id', userId);

        // Log results for debugging
        console.log('Supabase query results:', { sourceVideos, fetchError });
        
        if (fetchError) {
          console.error('Error fetching source video:', fetchError);
          setError(`Error loading source video: ${fetchError.message}`);
          return;
        }

        if (!sourceVideos || sourceVideos.length === 0) {
          setError('Source video not found');
          return;
        }
        
        // Use the first result if multiple were returned
        const sourceVideo = sourceVideos[0];

        // Check if we have a public_url directly from the database
        if (sourceVideo.public_url) {
          videoElement.src = sourceVideo.public_url;
          return;
        }

        // If no public_url but we have a storage_path, get the public URL
        if (sourceVideo.storage_path) {
          const { data: publicUrlData } = await supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(sourceVideo.storage_path);

          if (publicUrlData?.publicUrl) {
            videoElement.src = publicUrlData.publicUrl;
          } else {
            // Fall back to placeholder if all else fails
            console.warn('No public URL available, using placeholder');
            videoElement.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            setError('Could not load the actual source video. Using a placeholder instead.');
          }
        } else {
          console.warn('No storage path available, using placeholder');
          videoElement.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
          setError('Could not load the actual source video. Using a placeholder instead.');
        }
      } catch (err) {
        console.error('Error fetching source video:', err);
        setError('An error occurred while loading the source video');
        
        // Fall back to placeholder in case of any error
        if (videoElement) {
          videoElement.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        }
      }
    };

    fetchSourceVideo();
  }, [sourceVideoId]);
  
  // Handle recording start/stop
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  
  const startRecording = () => {
    recordedChunksRef.current = []
    
    if (!stream) {
      setError('No camera stream available. Please check permissions.')
      return
    }
    
    try {
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      // Start playing the source video
      if (sourceVideoRef.current) {
        sourceVideoRef.current.play()
        setIsPlaying(true)
      }
      
      // Event handler for when data is available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      // Event handler for when recording stops
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })
        
        setRecordedBlob(blob)
        
        // Call the callback if provided
        if (onRecordingComplete) {
          onRecordingComplete(blob)
        }
      }
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      
      // Start timer
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Could not start recording. Please try again.')
    }
  }
  
  const stopRecording = () => {
    // Stop the media recorder
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Pause the source video
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause()
      setIsPlaying(false)
    }
    
    setIsRecording(false)
  }
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Your Reaction</CardTitle>
        <CardDescription>Capture your reaction while watching the source video</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          {/* Source Video */}
          <div className="aspect-video overflow-hidden rounded-md bg-black">
            <video
              ref={sourceVideoRef}
              className="h-full w-full object-contain"
              controls={false}
              playsInline
              muted // Mute source video to avoid feedback
            />
          </div>
          
          {/* Webcam */}
          <div className="aspect-video overflow-hidden rounded-md bg-black">
            <video
              ref={webcamRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted // Mute preview to avoid feedback
            />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-2 right-2 flex items-center bg-red-500 text-white px-2 py-1 rounded-md text-xs">
                <span className="animate-pulse mr-1">●</span> REC {formatTime(recordingTime)}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Camera Source</h3>
              <Select
                value={selectedDevices.videoDeviceId}
                onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, videoDeviceId: value }))}
                disabled={isRecording}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.videoDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Microphone</h3>
              <Select
                value={selectedDevices.audioDeviceId}
                onValueChange={(value) => setSelectedDevices(prev => ({ ...prev, audioDeviceId: value }))}
                disabled={isRecording}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices.audioDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recording Quality</h3>
              <Select defaultValue="hd" disabled={isRecording}>
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
                <Button variant="outline" className="flex-1" disabled={isRecording}>
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
                <Button variant="outline" className="flex-1" disabled={isRecording}>
                  <Monitor className="mr-2 h-4 w-4" />
                  Screen
                </Button>
                <Button variant="outline" className="flex-1" disabled={isRecording}>
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
            onClick={toggleRecording}
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
          <Button size="lg" variant="outline" disabled={isRecording}>
            <Settings className="mr-2 h-4 w-4" />
            Advanced Settings
          </Button>
        </div>
        
        {recordedBlob && !isRecording && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Preview Recording</h3>
            <video
              src={URL.createObjectURL(recordedBlob)}
              controls
              className="w-full rounded-md"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
