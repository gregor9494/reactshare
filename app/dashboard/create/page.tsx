'use client'; // Make it a client component

// Import necessary hooks and components
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoRecorder } from "@/components/create/video-recorder";
import { VideoEditor } from "@/components/create/video-editor";
import { PublishOptions } from "@/components/create/publish-options";
import { SourceVideoGrid } from '@/components/create/source-video-grid'; // Added
import { SourceVideo } from '@/lib/types'; // Added

// Define Zod schema for the source URL form
const sourceUrlSchema = z.object({
  sourceUrl: z.string().url({ message: "Please enter a valid URL." }),
});

type SourceUrlFormValues = z.infer<typeof sourceUrlSchema>;

// Initialize Supabase client for client-side interactions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing for client-side interactions.');
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const BUCKET_NAME = 'reaction-videos';

// Define the steps in the reaction creation process
type Step = 'source' | 'record' | 'edit' | 'publish';

export default function CreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('source');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [sourceVideoId, setSourceVideoId] = useState<string | null>(null); // Can be from download or library selection
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null); // Original URL of the source video
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [reactionId, setReactionId] = useState<string | null>(null);
  const [sourceSelectionTab, setSourceSelectionTab] = useState<'url' | 'library'>('url'); // Added
  const [libraryVideos, setLibraryVideos] = useState<SourceVideo[]>([]); // Added
  const [selectedLibraryVideoId, setSelectedLibraryVideoId] = useState<string | null>(null); // Added

  // Form for the source URL input
  const sourceForm = useForm<SourceUrlFormValues>({
    resolver: zodResolver(sourceUrlSchema),
    defaultValues: {
      sourceUrl: "",
    },
  });

  // Fetch library videos
  useEffect(() => {
    const fetchLibraryVideos = async () => {
      if (sourceSelectionTab === 'library') {
        setIsLoading(true);
        setMessage(null);
        try {
          const response = await fetch('/api/videos/library');
          if (!response.ok) {
            const errorResult = await response.json();
            setMessage({ type: 'error', text: errorResult.error || 'Failed to fetch library videos.' });
            setIsLoading(false);
            return;
          }
          const result = await response.json();
          // Ensure result.videos is an array before trying to filter
          const videos: SourceVideo[] = Array.isArray(result.videos) ? result.videos : [];
          setLibraryVideos(videos.filter(v => v.status === 'completed' && v.storage_path)); // Only show completed and available videos
          setIsLoading(false);
        } catch (err) {
          console.error("Fetch library videos error:", err);
          setMessage({ type: 'error', text: 'An unexpected error occurred while fetching library videos.' });
          setIsLoading(false);
        }
      }
    };
    fetchLibraryVideos();
  }, [sourceSelectionTab]);


  // Handle source URL submission
  const onSourceUrlSubmit = async (values: SourceUrlFormValues) => {
    setIsLoading(true);
    setMessage(null);
    setSelectedLibraryVideoId(null); // Clear library selection

    try {
      // Call the video download API
      const downloadResponse = await fetch('/api/videos/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: values.sourceUrl,
        }),
      });

      if (!downloadResponse.ok) {
        const errorResult = await downloadResponse.json();
        setMessage({ type: 'error', text: errorResult.error || 'Failed to download source video.' });
        setIsLoading(false);
        return;
      }

      const downloadResult = await downloadResponse.json();
      setSourceVideoId(downloadResult.id); // This is the ID from the 'source_videos' table
      setSourceVideoUrl(values.sourceUrl); // This is the original URL submitted by the user
      
      // Start polling for download status
      await pollDownloadStatus(downloadResult.id);

    } catch (err) {
      console.error("Source video download error:", err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  // Handle library video selection
  const handleLibraryVideoSelect = (video: SourceVideo) => {
    setMessage(null);
    setSourceVideoId(video.id); // This is the ID from the 'source_videos' table
    setSourceVideoUrl(video.original_url); // Use the original URL from the selected library video
    setSelectedLibraryVideoId(video.id);
    sourceForm.reset({ sourceUrl: "" }); // Clear URL input if library video is selected
    console.log(`Selected library video: ID=${video.id}, URL=${video.original_url}`);
  };

  // Proceed to recording step
  const proceedToRecording = () => {
    if (!sourceVideoId || !sourceVideoUrl) {
      setMessage({ type: 'error', text: 'Please select or download a source video first.' });
      return;
    }
    // If a library video was selected, its status is already 'completed'.
    // If a URL was submitted, pollDownloadStatus would have moved to 'record' on completion.
    // So, we can directly move to 'record' if sourceVideoId and sourceVideoUrl are set.
    setCurrentStep('record');
    setMessage(null); // Clear any previous messages
  };

  // Handle recording completion
  const handleRecordingComplete = (blob: Blob) => {
    console.log('Recording completed, blob type:', blob.type, 'size:', blob.size);
    setRecordedBlob(blob);
    // Create reaction metadata
    createReactionMetadata(blob);
  };

  // Create reaction metadata
  const createReactionMetadata = async (blob: Blob) => {
    setIsLoading(true);
    
    try {
      // Step 1: Create reaction metadata via API route
      const metadataResponse = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_video_url: sourceVideoUrl,
          title: `Reaction to ${sourceVideoUrl}`, // Default title
        }),
      });

      if (!metadataResponse.ok) {
        const errorResult = await metadataResponse.json();
        setMessage({ type: 'error', text: errorResult.error || 'Failed to create reaction metadata.' });
        setIsLoading(false);
        return;
      }

      const reactionMetadata = await metadataResponse.json();
      setReactionId(reactionMetadata.id);
      
      // Move to the editing step
      setCurrentStep('edit');
      setIsLoading(false);
      
    } catch (err) {
      console.error("Create reaction metadata error:", err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  // Handle editing completion
  const handleEditingComplete = () => {
    // Move to the publishing step
    setCurrentStep('publish');
  };

  // Handle publishing completion
  const handlePublishingComplete = async () => {
    if (!recordedBlob || !reactionId) {
      setMessage({ type: 'error', text: 'Missing recording or reaction ID.' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Step 1: Get storage path from API route
      const uploadPathResponse = await fetch('/api/reactions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactionId: reactionId,
          fileName: `reaction-${Date.now()}.webm`,
          fileType: recordedBlob.type,
        }),
      });

      if (!uploadPathResponse.ok) {
        const errorResult = await uploadPathResponse.json();
        setMessage({ type: 'error', text: errorResult.error || 'Failed to get upload path.' });
        setIsLoading(false);
        return;
      }

      const uploadPathResult = await uploadPathResponse.json();
      const storagePath = uploadPathResult.storagePath;

      // Step 2: Upload the blob to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, recordedBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase Upload Error:', uploadError);
        setMessage({ type: 'error', text: uploadError.message || 'Failed to upload reaction video.' });
        setIsLoading(false);
        return;
      }

      // Step 3: Update the reaction metadata with the storage path and status
      const { error: updateError } = await supabase
        .from('reactions')
        .update({ reaction_video_storage_path: storagePath, status: 'uploaded' })
        .eq('id', reactionId);

      if (updateError) {
        console.error('Supabase Update Metadata Error:', updateError);
      }

      setMessage({ type: 'success', text: 'Reaction published successfully!' });
      
      // Redirect to the library page after success
      setTimeout(() => {
        router.push('/dashboard/library');
      }, 2000);
      
    } catch (err) {
      console.error("Publishing error:", err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  // Poll for download status
  const pollDownloadStatus = async (downloadId: string) => {
    const maxAttempts = 30; // Maximum polling attempts (5 minutes with 10s interval)
    const pollInterval = 10000; // Poll every 10 seconds
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const statusResponse = await fetch(`/api/videos/download?id=${downloadId}`);
        
        if (!statusResponse.ok) {
          throw new Error('Failed to get download status');
        }
        
        const statusResult = await statusResponse.json();
        
        console.log('Download status result:', JSON.stringify(statusResult, null, 2));

        // Check for error message first
        if (statusResult.error) {
          setIsLoading(false);
          setMessage({
            type: 'error',
            text: `Download error: ${statusResult.error}`
          });
          return true; // Stop polling
        }

        // Handle different statuses
        switch(statusResult.status) {
          case 'completed':
            setIsLoading(false);
            setMessage({ type: 'success', text: 'Source video downloaded successfully!' });
            console.log('Download completed successfully, source_video_id:', downloadId);
            setCurrentStep('record');
            return true; // Stop polling
            
          case 'error':
            setIsLoading(false);
            setMessage({
              type: 'error',
              text: statusResult.error || 'An error occurred during download.'
            });
            return true; // Stop polling
            
          case 'processing':
          case 'downloading':
          case 'uploading':
            // Continue polling - not done yet
            setMessage({
              type: 'success',
              text: `Source video ${statusResult.status}... This may take a few minutes.`
            });
            return false;
            
          default:
            return false;
        }
      } catch (error) {
        console.error('Error polling for download status:', error);
        return false;
      }
    };
    
    // Initial check
    if (await checkStatus()) {
      return;
    }
    
    // Setup the polling interval
    const pollTimer = setInterval(async () => {
      attempts++;
      
      // Check if we should stop polling
      if (attempts >= maxAttempts || await checkStatus()) {
        clearInterval(pollTimer);
        
        // If we hit the maximum attempts, show an error
        if (attempts >= maxAttempts) {
          setIsLoading(false);
          setMessage({
            type: 'error',
            text: 'Download is taking longer than expected. Please check back later.'
          });
        }
      }
    }, pollInterval);
    
    // Return a promise that resolves when polling completes
    return new Promise((resolve) => {
      const checkComplete = setInterval(() => {
        if (!setIsLoading) { // If loading is no longer true, we're done
          clearInterval(checkComplete);
          resolve(true);
        }
      }, 1000);
    });
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create New Reaction</h1>
              <p className="text-muted-foreground">
                {currentStep === 'source' && "Enter the URL of the video you want to react to"}
                {currentStep === 'record' && "Record your reaction while watching the source video"}
                {currentStep === 'edit' && "Edit your reaction video"}
                {currentStep === 'publish' && "Publish your reaction video"}
              </p>
            </div>
          </div>
          
          {/* Display any messages */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
              <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {['Source', 'Record', 'Edit', 'Publish'].map((step, index) => {
                const stepValue = ['source', 'record', 'edit', 'publish'][index] as Step;
                const isActive = currentStep === stepValue;
                const isCompleted = (
                  (stepValue === 'source' && sourceVideoId) ||
                  (stepValue === 'record' && recordedBlob) ||
                  (stepValue === 'edit' && reactionId)
                );
                
                return (
                  <div
                    key={step}
                    className={`flex flex-col items-center w-1/4 ${isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}
                  >
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full mb-1
                      ${isActive ? 'bg-primary text-white' :
                        isCompleted ? 'bg-green-500 text-white' :
                        'bg-muted text-muted-foreground'}
                    `}>
                      {index + 1}
                    </div>
                    <span className="text-xs font-medium">{step}</span>
                  </div>
                );
              })}
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width:
                    currentStep === 'source' ? '12.5%' :
                    currentStep === 'record' ? '37.5%' :
                    currentStep === 'edit' ? '62.5%' :
                    '87.5%'
                }}
              />
            </div>
          </div>
          
          {/* Step 1: Source Selection */}
          {currentStep === 'source' && (
            <Tabs value={sourceSelectionTab} onValueChange={(value) => setSourceSelectionTab(value as 'url' | 'library')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="url">Enter URL</TabsTrigger>
                <TabsTrigger value="library">Select from Library</TabsTrigger>
              </TabsList>
              <TabsContent value="url">
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-2xl">Provide Source Video URL</CardTitle>
                    <CardDescription>Paste the URL of the video you want to react to (e.g., YouTube, TikTok).</CardDescription>
                  </CardHeader>
                  <Form {...sourceForm}>
                    <form onSubmit={sourceForm.handleSubmit(onSourceUrlSubmit)}>
                      <CardContent className="space-y-6 px-0">
                        <FormField
                          control={sourceForm.control}
                          name="sourceUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source Video URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Paste YouTube, TikTok, or Twitter URL"
                                  {...field}
                                  disabled={isLoading}
                                  className="max-w-xl"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {isLoading && sourceSelectionTab === 'url' && (
                          <div className="space-y-2 max-w-xl">
                            <p className="text-sm text-muted-foreground">Downloading video... This may take a moment.</p>
                            <Progress value={45} className="w-full" /> {/* Simulated progress */}
                          </div>
                        )}
                      </CardContent>
                      <div className="flex justify-end mt-6">
                        <Button type="submit" disabled={isLoading || !sourceForm.formState.isValid || sourceForm.getValues("sourceUrl") === ""} size="lg">
                          {isLoading && sourceSelectionTab === 'url' ? "Downloading..." : "Download & Continue"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Card>
              </TabsContent>
              <TabsContent value="library">
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-2xl">Select From Your Library</CardTitle>
                    <CardDescription>Choose a video you've previously downloaded.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    {isLoading && sourceSelectionTab === 'library' && (
                        <div className="flex justify-center items-center h-32">
                            <p>Loading library...</p> {/* Replace with a Skeleton loader later if desired */}
                        </div>
                    )}
                    {!isLoading && libraryVideos.length === 0 && sourceSelectionTab === 'library' && (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Your library is empty.</p>
                        <p>Download videos using the 'Enter URL' tab first, or check back if a download is in progress.</p>
                      </div>
                    )}
                    {!isLoading && libraryVideos.length > 0 && (
                      <SourceVideoGrid
                        videos={libraryVideos}
                        onVideoSelect={handleLibraryVideoSelect}
                        selectedVideoId={selectedLibraryVideoId}
                      />
                    )}
                  </CardContent>
                  <div className="flex justify-end mt-6">
                    <Button onClick={proceedToRecording} disabled={!selectedLibraryVideoId || isLoading} size="lg">
                      Continue to Recording
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          
          {/* Step 2: Recording */}
          {currentStep === 'record' && (
            <>
              {/* Log the sourceVideoId to help debug */}
              <div className="mb-2 text-xs text-muted-foreground">
                Using source video ID: {sourceVideoId}
              </div>
              <VideoRecorder
                sourceVideoId={sourceVideoId || undefined}
                onRecordingComplete={handleRecordingComplete}
              />
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('source')} size="lg">
                  Back to Source
                </Button>
                <Button onClick={() => setCurrentStep('edit')} size="lg" disabled={!recordedBlob}>
                  Continue to Editing
                </Button>
              </div>
            </>
          )}
          
          {/* Step 3: Editing */}
          {currentStep === 'edit' && (
            <>
              {/* Add debug information */}
              {recordedBlob && (
                <div className="mb-2 text-xs text-muted-foreground">
                  Using recorded blob: {recordedBlob.type}, size: {Math.round(recordedBlob.size / 1024)} KB
                </div>
              )}
              <VideoEditor
                recordedBlob={recordedBlob || undefined}
                onEditingComplete={handleEditingComplete}
              />
              {/* Removed separate buttons since they're now in the VideoEditor component */}
            </>
          )}
          
          {/* Step 4: Publishing */}
          {currentStep === 'publish' && (
            <>
              <PublishOptions
                onPublishingComplete={handlePublishingComplete}
              />
              {/* Removed separate buttons since they're now in the PublishOptions component */}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
