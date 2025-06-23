"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Camera, Monitor, Play, Square, Settings, AlertTriangle, LayoutGrid, LayoutPanelTop, MoveHorizontal, Maximize2, Minimize2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing for video recorder component.');
}

const SOURCE_VIDEO_BUCKET_NAME = 'source-videos'; // For fetching source videos
const REACTION_VIDEO_BUCKET_NAME = 'reaction-videos'; // For uploading new reactions
const THUMBNAIL_BUCKET_NAME = 'reaction-thumbnails';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob, storagePath: string | null) => void; // Pass storagePath back
  sourceVideoId?: string;
  reactionId: string; // This is now required to associate the upload
}

export function VideoRecorder({ onRecordingComplete, sourceVideoId, reactionId }: VideoRecorderProps) {
  const { data: session } = useSession();
  const supabase = useMemo(() => {
    return createSupabaseBrowserClient();
  }, []);
// Authenticate Supabase client with NextAuth session for storage RLS
useEffect(() => {
  if (session?.accessToken) {
    // @ts-ignore: Ensure Supabase client uses NextAuth JWT for storage requests
    supabase.auth.setAuth(session.accessToken);
  }
}, [session, supabase]);
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const lastVideoStateRef = useRef({ time: 0, playing: false });
  
  // View mode and customization options
  const [viewMode, setViewMode] = useState<'side-by-side' | 'picture-in-picture'>('side-by-side')
  const [reactionPosition, setReactionPosition] = useState({ x: 10, y: 10 }) // Position in percentage for PiP mode
  const [reactionSize, setReactionSize] = useState(30) // Size in percentage for PiP mode (1-100)
  const [sourceVideoDimensions, setSourceVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const isSourcePortrait = sourceVideoDimensions ? sourceVideoDimensions.height > sourceVideoDimensions.width : false;
  
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
  }, [selectedDevices, viewMode])
  
  // Init logging for video element events
  useEffect(() => {
    const sourceVideo = sourceVideoRef.current;
    
    if (sourceVideo) {
      // Add event listeners for debugging
      const videoEvents = ['loadstart', 'durationchange', 'loadedmetadata',
                          'loadeddata', 'progress', 'canplay', 'canplaythrough', 'error'];
      
      const logEvent = (event: Event) => {
        console.log(`Source video event: ${event.type}`);
        
        if (event.type === 'canplaythrough') {
          console.log('Video can play through - readyState:', sourceVideo.readyState);
        }
      };
      
      // Add listeners
      videoEvents.forEach(event => {
        sourceVideo.addEventListener(event, logEvent);
      });
      
      // Cleanup
      return () => {
        if (sourceVideo) {
          videoEvents.forEach(event => {
            sourceVideo.removeEventListener(event, logEvent);
          });
        }
      };
    }
  }, [sourceVideoRef.current]);

  // Initialize source video
  useEffect(() => {
    // Only proceed if we have a sourceVideoId
    if (!sourceVideoId || !sourceVideoRef.current) {
      return;
    }
    
    // Log when we attempt to initialize the source video
    console.log('Initializing source video', { sourceVideoId, videoElement: !!sourceVideoRef.current });

    const fetchSourceVideo = async () => {
      if (!supabase) return;
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
                .from(SOURCE_VIDEO_BUCKET_NAME)
                .getPublicUrl(videoData.storage_path);
              
              if (publicUrlData?.publicUrl) {
                console.log('Setting source video from API response:', publicUrlData.publicUrl);
                // Set crossOrigin attribute to allow CORS content
                videoElement.crossOrigin = "anonymous";
                // Use a query param to bust cache
                const cacheBuster = `?t=${Date.now()}`;
                videoElement.src = publicUrlData.publicUrl + cacheBuster;
                
                // Add onloadedmetadata event listener to check if video loaded successfully
                videoElement.onloadedmetadata = () => {
                  console.log('Source video metadata loaded successfully from API');
                  setSourceVideoDimensions({ width: videoElement.videoWidth, height: videoElement.videoHeight });
                  console.log(`Source video dimensions (API): ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                  videoElement.currentTime = lastVideoStateRef.current.time;
                  if (lastVideoStateRef.current.playing) {
                    videoElement.play().catch(e => console.error('Error playing video after state restore (API):', e));
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(false);
                  }
                };
                
                // Add error event listener to catch and log any errors
                videoElement.onerror = (err) => {
                  console.error('Error loading source video:', videoElement.error);
                  setError(`Error loading video: ${videoElement.error?.message || 'Unknown error'}`);
                };
                
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
          console.log('Setting video source from public_url:', sourceVideo.public_url);
          // Set crossOrigin attribute to allow CORS content
          videoElement.crossOrigin = "anonymous";
          // Use a query param to bust cache
          const cacheBuster = `?t=${Date.now()}`;
          videoElement.src = sourceVideo.public_url + cacheBuster;
          
          // Add onloadedmetadata event listener to check if video loaded successfully
          videoElement.onloadedmetadata = () => {
            console.log('Source video metadata loaded successfully from public_url');
            setSourceVideoDimensions({ width: videoElement.videoWidth, height: videoElement.videoHeight });
            console.log(`Source video dimensions (public_url): ${videoElement.videoWidth}x${videoElement.videoHeight}`);
            videoElement.currentTime = lastVideoStateRef.current.time;
            if (lastVideoStateRef.current.playing) {
              videoElement.play().catch(e => console.error('Error playing video after state restore (public_url):', e));
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          };
          
          // Add error event listener to catch and log any errors
          videoElement.onerror = (err) => {
            console.error('Error loading source video from public_url:', videoElement.error);
            setError(`Error loading video: ${videoElement.error?.message || 'Unknown error'}`);
          };
          
          return;
        }

        // If no public_url but we have a storage_path, get the public URL
        if (sourceVideo.storage_path) {
          const { data: publicUrlData } = await supabase.storage
            .from(SOURCE_VIDEO_BUCKET_NAME)
            .getPublicUrl(sourceVideo.storage_path);

          if (publicUrlData?.publicUrl) {
            console.log('Setting video source from storage path:', publicUrlData.publicUrl);
            // Set crossOrigin attribute to allow CORS content
            videoElement.crossOrigin = "anonymous";
            // Use a query param to bust cache
            const cacheBuster = `?t=${Date.now()}`;
            videoElement.src = publicUrlData.publicUrl + cacheBuster;
            
            // Add onloadedmetadata event listener to check if video loaded successfully
            videoElement.onloadedmetadata = () => {
              console.log('Source video metadata loaded successfully from storage path');
              setSourceVideoDimensions({ width: videoElement.videoWidth, height: videoElement.videoHeight });
              console.log(`Source video dimensions (storage path): ${videoElement.videoWidth}x${videoElement.videoHeight}`);
              videoElement.currentTime = lastVideoStateRef.current.time;
              if (lastVideoStateRef.current.playing) {
                videoElement.play().catch(e => console.error('Error playing video after state restore (storage path):', e));
                setIsPlaying(true);
              } else {
                setIsPlaying(false);
              }
            };
            
            // Add error event listener to catch and log any errors
            videoElement.onerror = (err) => {
              console.error('Error loading source video from storage path:', videoElement.error);
              setError(`Error loading video: ${videoElement.error?.message || 'Unknown error'}`);
            };
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
          console.log('Setting fallback video due to error');
          videoElement.crossOrigin = "anonymous";
          videoElement.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
          
          // Add onloadedmetadata event listener to check if fallback loaded successfully
          videoElement.onloadedmetadata = () => {
            console.log('Fallback video metadata loaded successfully');
            setSourceVideoDimensions({ width: videoElement.videoWidth, height: videoElement.videoHeight }); // Still set dimensions for fallback
            console.log(`Fallback video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
            videoElement.currentTime = 0; // Start fallback from beginning
            setIsPlaying(false);
          };
        }
      }
    };

    fetchSourceVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceVideoId, viewMode]);
  
  // Handle recording start/stop
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  
  // Helper function to draw an image/video "contained" within a bounding box
  const drawImageContain = (
    ctx: CanvasRenderingContext2D,
    img: HTMLVideoElement | HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const iw = (img as HTMLVideoElement).videoWidth || img.width;
    const ih = (img as HTMLVideoElement).videoHeight || img.height;
    if (!iw || !ih) return; // Do not draw if image dimensions are not available

    const r = Math.min(w / iw, h / ih);
    const nw = iw * r;
    const nh = ih * r;
    const nx = x + (w - nw) / 2;
    const ny = y + (h - nh) / 2;
    ctx.drawImage(img, nx, ny, nw, nh);
  };

  const startRecording = async () => {
    recordedChunksRef.current = []
    
    if (!stream) {
      setError('No camera stream available. Please check permissions.')
      return
    }
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx || !sourceVideoRef.current || !webcamRef.current) {
        setError('Failed to initialize recording canvas')
        return;
      }
      
      let canvasRenderWidth = 1280; // Default
      let canvasRenderHeight = 720; // Default

      if (sourceVideoDimensions) {
        canvasRenderWidth = sourceVideoDimensions.width;
        canvasRenderHeight = sourceVideoDimensions.height;
        console.log(`Using source dimensions for canvas: ${canvasRenderWidth}x${canvasRenderHeight}`);
      } else {
        console.log(`Source dimensions unknown, using default canvas: ${canvasRenderWidth}x${canvasRenderHeight}`);
      }
      canvas.width = canvasRenderWidth;
      canvas.height = canvasRenderHeight;
      
      // Start playing the source video
      if (sourceVideoRef.current) {
        sourceVideoRef.current.play()
        setIsPlaying(true)
      }
      
      // Create a canvas stream for recording both videos together
      const canvasStream = canvas.captureStream(30); // 30 FPS
      
      // Add audio track from webcam stream to the canvas stream
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
      
      // Create a new MediaRecorder instance with the canvas stream
      const calculatedBitrate = Math.min(8000000, canvas.width * canvas.height * 2.5); // Cap at 8Mbps
      console.log(`Recording with bitrate: ${calculatedBitrate / 1000000} Mbps`);
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: calculatedBitrate
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Event handler for when data is available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Function to draw the video streams to canvas
      const drawVideoToCanvas = () => {
        if (!ctx || !sourceVideoRef.current || !webcamRef.current) return;
        
        // Clear the canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Log video state for debugging
        // console.log(`Source video state: readyState=${sourceVideoRef.current.readyState}, paused=${sourceVideoRef.current.paused}`);
        
        const sourceReady = sourceVideoRef.current.readyState >= 2; // HAVE_CURRENT_DATA or higher
        const webcamReady = webcamRef.current.readyState >= 2;
        const isCanvasVertical = canvas.height > canvas.width;

        if (viewMode === 'side-by-side' && !isCanvasVertical) {
            // Standard Landscape Side-by-Side
            if (sourceReady) {
                drawImageContain(ctx, sourceVideoRef.current, 0, 0, canvas.width * 0.66, canvas.height);
            } else {
                ctx.fillStyle = '#333333';
                ctx.fillRect(0, 0, canvas.width * 0.66, canvas.height);
                ctx.fillStyle = 'white'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Loading source...', canvas.width * 0.33, canvas.height / 2);
            }
            if (webcamReady) {
                drawImageContain(ctx, webcamRef.current, canvas.width * 0.66, 0, canvas.width * 0.34, canvas.height);
            } else {
                ctx.fillStyle = '#333333';
                ctx.fillRect(canvas.width * 0.66, 0, canvas.width * 0.34, canvas.height);
                // Optionally, add a loading text for webcam too
            }
        } else {
            // This covers:
            // 1. Picture-in-Picture mode (for both landscape and vertical canvas)
            // 2. "Side-by-Side" mode when the canvas is vertical (treat as PiP on full source)
            
            // Draw source video to fill the canvas (maintaining aspect ratio)
            if (sourceReady) {
                drawImageContain(ctx, sourceVideoRef.current, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#333333';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Loading source video...', canvas.width / 2, canvas.height / 2);
            }

            // Draw webcam as PiP
            if (webcamReady) {
                let pipWidth = canvas.width * (reactionSize / 100);
                let pipHeight = (webcamRef.current.videoWidth > 0) ?
                                pipWidth * (webcamRef.current.videoHeight / webcamRef.current.videoWidth) :
                                pipWidth * 0.75; // Default to 4:3 aspect ratio

                const pipX = canvas.width - pipWidth - (canvas.width * (reactionPosition.x / 100));
                const pipY = canvas.height * (reactionPosition.y / 100);
                
                drawImageContain(ctx, webcamRef.current, pipX, pipY, pipWidth, pipHeight);
                
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2; // Consider scaling lineWidth based on canvas size for HiDPI
                ctx.strokeRect(pipX, pipY, pipWidth, pipHeight);
            }
        }
        
        // Request the next frame when:
        // 1. We're recording, OR
        // 2. The source video is playing (for preview)
        if ((mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') ||
            (!sourceVideoRef.current.paused)) {
          requestAnimationFrame(drawVideoToCanvas);
        }
      };
      
      // Start the canvas drawing loop
      drawVideoToCanvas();
      
      // Event handler for when recording stops
      mediaRecorder.onstop = () => {
        console.log('[VideoRecorder] mediaRecorder.onstop triggered.'); // ADD THIS LOG
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })
        console.log('[VideoRecorder] Blob created in onstop, size:', blob.size);
        
        setRecordedBlob(blob);
        
        // Automatically start upload and finalize process
        console.log('[VideoRecorder] Calling handleUploadAndFinalize from onstop.');
        handleUploadAndFinalize(blob);

        // The onRecordingComplete callback is now called from within handleUploadAndFinalize
        // to ensure it's called after the upload attempt (success or failure).
      }
      
      // First set the recording flag, then start the animation and recording
      setIsRecording(true)
      
      // Start the animation loop (it will keep running as long as mediaRecorder.state === 'recording')
      requestAnimationFrame(drawVideoToCanvas)
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      
      // Start timer
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      console.log('Recording started with combined video streams')
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Could not start recording. Please try again.')
    }
  }
  
  const stopRecording = () => {
    console.log('[VideoRecorder] stopRecording called.'); // ADD THIS LOG
    // Stop the media recorder
    if (mediaRecorderRef.current && isRecording) {
      console.log('[VideoRecorder] Attempting to stop mediaRecorder.');
      mediaRecorderRef.current.stop();
      console.log('[VideoRecorder] mediaRecorder.stop() called.');
    } else {
      console.log('[VideoRecorder] stopRecording: mediaRecorderRef.current is null or not recording.');
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

  const generateThumbnail = (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
  
      if (!context) {
        return reject(new Error('Failed to get canvas context'));
      }
  
      video.src = URL.createObjectURL(videoBlob);
      video.muted = true;
  
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
  
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  
        canvas.toBlob((thumbnailBlob) => {
          if (thumbnailBlob) {
            resolve(thumbnailBlob);
          } else {
            reject(new Error('Failed to create thumbnail blob.'));
          }
        }, 'image/jpeg', 0.8); // 80% quality
  
        URL.revokeObjectURL(video.src); // Clean up
      };
  
      video.onerror = (e) => {
        reject(new Error('Failed to load video for thumbnail generation.'));
        URL.revokeObjectURL(video.src); // Clean up
      };
    });
  };

  const handleUploadAndFinalize = async (blob: Blob) => {
    if (!reactionId) {
      console.error("Cannot upload: reactionId is missing.");
      setUploadError("Cannot upload: reaction ID is missing. Please ensure the reaction metadata was created.");
      if (onRecordingComplete) onRecordingComplete(blob, null);
      return;
    }
    if (!blob) {
      console.error("Cannot upload: recorded blob is missing.");
      setUploadError("Cannot upload: recorded video data is missing.");
      if (onRecordingComplete) onRecordingComplete(blob, null);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    console.log('[VideoRecorder] handleUploadAndFinalize started for reactionId:', reactionId);

    if (!supabase) {
      setUploadError("Supabase client not initialized. Is the user logged in?");
      if (onRecordingComplete) onRecordingComplete(blob, null);
      return;
    }

    try {
      const fileName = `reaction_${reactionId}_${Date.now()}.webm`;
      const fileType = blob.type;
      console.log('[VideoRecorder] Preparing to get upload info. FileName:', fileName, 'FileType:', fileType);

      // 1. Get storagePath from backend
      const uploadInfoResponse = await fetch('/api/reactions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType, reactionId }),
      });
      console.log('[VideoRecorder] Got response from /api/reactions/upload:', uploadInfoResponse.status);

      if (!uploadInfoResponse.ok) {
        const errorData = await uploadInfoResponse.json().catch(() => ({ error: 'Failed to parse error from /api/reactions/upload' }));
        console.error('[VideoRecorder] Error getting upload info:', errorData);
        throw new Error(errorData.error || 'Failed to get upload information.');
      }
      const { storagePath } = await uploadInfoResponse.json();

      if (!storagePath) {
        console.error('[VideoRecorder] Storage path not received from server.');
        throw new Error('Storage path not received from server.');
      }
      
      console.log(`[VideoRecorder] Received storage path: ${storagePath} for reaction ${reactionId}`);

      // 2. Upload file to Supabase Storage
      console.log('[VideoRecorder] Attempting to upload to Supabase Storage. Path:', storagePath);
      const { error: supabaseUploadError } = await supabase.storage // Renamed to avoid conflict
        .from(REACTION_VIDEO_BUCKET_NAME)
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists, though path should be unique
        });

      if (supabaseUploadError) {
        console.error('[VideoRecorder] Supabase storage upload error:', supabaseUploadError);
        throw new Error(`Failed to upload video to storage: ${supabaseUploadError.message}`);
      }
      
      console.log(`[VideoRecorder] Successfully uploaded reaction video to ${storagePath}`);
       // 3. Generate and upload thumbnail
       let thumbnailUrl: string | null = null;
       try {
         console.log('[VideoRecorder] Generating thumbnail...');
         const thumbnailBlob = await generateThumbnail(blob);
         const thumbnailPath = `thumbnail_${reactionId}_${Date.now()}.jpeg`;
         
         const { error: thumbnailUploadError } = await supabase.storage
           .from(THUMBNAIL_BUCKET_NAME)
           .upload(thumbnailPath, thumbnailBlob, {
             cacheControl: '3600',
             upsert: true,
           });
 
         if (thumbnailUploadError) {
           console.error('[VideoRecorder] Supabase thumbnail upload error:', thumbnailUploadError);
           // Non-fatal, we can continue without a thumbnail
         } else {
           const { data: { publicUrl } } = supabase.storage.from(THUMBNAIL_BUCKET_NAME).getPublicUrl(thumbnailPath);
           thumbnailUrl = publicUrl;
           console.log(`[VideoRecorder] Generated public thumbnail URL: ${thumbnailUrl}`);
         }
       } catch (thumbError: any) {
         console.error('[VideoRecorder] Error generating or uploading thumbnail:', thumbError);
       }
 
      // 4. Call PATCH endpoint to finalize
      console.log('[VideoRecorder] Attempting to call PATCH /api/reactions/.../complete-upload');
      const finalizePayload: { storagePath: string; thumbnailUrl?: string } = {
        storagePath,
      };
      if (thumbnailUrl) {
        finalizePayload.thumbnailUrl = thumbnailUrl;
      }
      const finalizeResponse = await fetch(`/api/reactions/${reactionId}/complete-upload`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizePayload),
      });
      console.log('[VideoRecorder] Got response from PATCH /api/reactions/.../complete-upload:', finalizeResponse.status);

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json().catch(() => ({ error: 'Failed to parse error from PATCH complete-upload' }));
        console.error('[VideoRecorder] Error finalizing upload:', errorData);
        throw new Error(errorData.error || 'Failed to finalize upload.');
      }

      console.log(`[VideoRecorder] Successfully finalized upload for reaction ${reactionId}`);
      if (onRecordingComplete) onRecordingComplete(blob, storagePath);

    } catch (err: any) {
      console.error('[VideoRecorder] Error in upload and finalize process:', err);
      setUploadError(err.message || 'An unexpected error occurred during upload.');
      if (onRecordingComplete) onRecordingComplete(blob, null);
    } finally {
      setIsUploading(false);
    }
  };

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
        
        {/* View Mode Toggle */}
        <div className="flex justify-center space-x-4 mb-4">
          <Button
            variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
            onClick={() => {
              if (sourceVideoRef.current && sourceVideoRef.current.readyState > 0) {
                lastVideoStateRef.current = {
                  time: sourceVideoRef.current.currentTime,
                  playing: !sourceVideoRef.current.paused,
                };
                console.log("Captured state before side-by-side:", lastVideoStateRef.current);
              } else {
                lastVideoStateRef.current = { time: 0, playing: false };
              }
              setSourceVideoDimensions(null); // Reset dimensions on mode change
              setViewMode('side-by-side');
            }}
            disabled={isRecording}
            className="flex-1"
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Side by Side View
          </Button>
          <Button
            variant={viewMode === 'picture-in-picture' ? 'default' : 'outline'}
            onClick={() => {
              if (sourceVideoRef.current && sourceVideoRef.current.readyState > 0) {
                lastVideoStateRef.current = {
                  time: sourceVideoRef.current.currentTime,
                  playing: !sourceVideoRef.current.paused,
                };
                console.log("Captured state before picture-in-picture:", lastVideoStateRef.current);
              } else {
                lastVideoStateRef.current = { time: 0, playing: false };
              }
              setSourceVideoDimensions(null); // Reset dimensions on mode change
              setViewMode('picture-in-picture');
            }}
            disabled={isRecording}
            className="flex-1"
          >
            <LayoutPanelTop className="mr-2 h-4 w-4" />
            Picture-in-Picture View
          </Button>
        </div>

        {viewMode === 'side-by-side' ? (
          // Side-by-side view
          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            {/* Source Video */}
            <div className={`${isSourcePortrait ? 'aspect-[9/16] w-auto max-h-[50vh]' : 'aspect-video'} overflow-hidden rounded-md bg-black mx-auto`}>
              <video
                ref={sourceVideoRef}
                className="h-full w-full object-contain"
                controls={false}
                playsInline
                crossOrigin="anonymous"
                muted // Mute source video to avoid feedback
                onError={(e) => console.error("Source video error event:", e)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget as HTMLVideoElement;
                  const w = v.videoWidth;
                  const h = v.videoHeight;
                  console.log("Side-by-side source metadata loaded:", w, h);
                  setSourceVideoDimensions({ width: w, height: h });
                }}
                preload="auto"
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
        ) : (
          // Picture-in-Picture view with enhanced debugging and controls
          <div className={`relative ${isSourcePortrait ? 'aspect-[9/16] w-auto max-h-[50vh]' : 'aspect-video'} overflow-hidden rounded-md bg-black mx-auto`}>
            {/* Debug information overlay */}
            <div className="absolute top-0 left-0 bg-black/70 text-white px-2 py-1 z-50 text-xs">
              Video State: {sourceVideoRef.current ?
                `ReadyState: ${sourceVideoRef.current.readyState},
                 ${sourceVideoRef.current.paused ? 'Paused' : 'Playing'},
                 CurrentTime: ${sourceVideoRef.current.currentTime.toFixed(1)}` :
                'No video ref'}
            </div>
            
            {/* Source Video (Background) with explicit controls */}
            <video
              ref={sourceVideoRef}
              className="h-full w-full object-contain"
              controls={true} // Add controls for testing
              playsInline
              crossOrigin="anonymous"
              preload="auto"
              onPlay={() => {
                console.log("Video playing in PiP mode");
                setIsPlaying(true);
              }}
              onPause={() => {
                console.log("Video paused in PiP mode");
                setIsPlaying(false);
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                const w = v.videoWidth;
                const h = v.videoHeight;
                console.log("PiP source metadata loaded:", w, h);
                setSourceVideoDimensions({ width: w, height: h });
                if (isPlaying) {
                  sourceVideoRef.current?.play().catch(e => console.error("Error playing after metadata load:", e));
                }
              }}
              onError={(e) => {
                console.error("Source video error in PiP mode:", sourceVideoRef.current?.error);
                setError(`Error loading video: ${sourceVideoRef.current?.error?.message || 'Unknown error'}`);
              }}
              muted // Mute source video to avoid feedback
            />
            
            {/* Manual play/pause button overlay to ensure video plays */}
            <div className="absolute bottom-4 right-4 z-40">
              <Button
                size="sm"
                onClick={() => {
                  if (sourceVideoRef.current) {
                    if (sourceVideoRef.current.paused) {
                      sourceVideoRef.current.play()
                        .then(() => {
                          console.log("Video started playing via button");
                          setIsPlaying(true);
                        })
                        .catch(e => console.error("Error playing video:", e));
                    } else {
                      sourceVideoRef.current.pause();
                      setIsPlaying(false);
                      console.log("Video paused via button");
                    }
                  }
                }}
              >
                {sourceVideoRef.current && !sourceVideoRef.current.paused ?
                  <Square className="h-4 w-4" /> :
                  <Play className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Webcam (Overlay) */}
            <div
              className="absolute bg-black rounded-md overflow-hidden shadow-lg border-2 border-white"
              style={{
                width: `${reactionSize}%`,
                height: 'auto',
                top: `${reactionPosition.y}%`,
                right: `${reactionPosition.x}%`,
                zIndex: 30
              }}
            >
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
        )}

        {/* Reaction Position Controls (always visible) */}
        {!isRecording && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Reaction Video Settings</h3>
              <span className="text-xs bg-secondary px-2 py-1 rounded-md">
                {viewMode === 'side-by-side' ? 'Applied in Picture-in-Picture mode' : 'Active now'}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              These settings control how your reaction appears in the final video.
              {viewMode === 'side-by-side'
                ? " While you're in side-by-side mode now, these settings will be saved for picture-in-picture mode."
                : " Changes will be reflected immediately in the preview above."}
            </p>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Position in Picture-in-Picture Mode</h3>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Right Edge Distance</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={reactionPosition.x}
                      onChange={(e) => setReactionPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs w-8 text-right">{reactionPosition.x}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Top Edge Distance</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={reactionPosition.y}
                      onChange={(e) => setReactionPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs w-8 text-right">{reactionPosition.y}%</span>
                  </div>
                </div>
              </div>
            </div>
                
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Reaction Video Size</h3>
              <div className="flex items-center space-x-4">
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={reactionSize}
                  onChange={(e) => setReactionSize(parseInt(e.target.value))}
                  className="flex-1"
                />
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs w-8 text-right">{reactionSize}%</span>
              </div>
            </div>
          </div>
        )}
        
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
            disabled={!isRecording && !sourceVideoDimensions} // Disable if not recording AND dimensions are unknown
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
            <div>
              <h4 className="text-xs text-muted-foreground mb-1">Combined Video (Source + Reaction)</h4>
              <video
                src={URL.createObjectURL(recordedBlob)}
                controls
                className="w-full rounded-md"
              />
            </div>

            {isUploading && (
              <Alert className="mt-4" variant="default">
                <AlertTriangle className="h-4 w-4 animate-spin" />
                <AlertTitle>Uploading...</AlertTitle>
                <AlertDescription>Your reaction video is being uploaded. Please wait.</AlertDescription>
              </Alert>
            )}

            {uploadError && !isUploading && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {!isUploading && !uploadError && ( // Show success only if not uploading and no error
                 recordedBlob && // Ensure blob exists before showing success related to it
                <Alert className="mt-4">
                  <AlertTitle>Recording Complete!</AlertTitle>
                  <AlertDescription>
                    Your reaction has been recorded. If upload was successful, it's now linked to your reaction.
                  </AlertDescription>
                </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
