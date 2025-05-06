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
  const [sourceVideoId, setSourceVideoId] = useState<string | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [reactionId, setReactionId] = useState<string | null>(null);

  // Form for the source URL input
  const sourceForm = useForm<SourceUrlFormValues>({
    resolver: zodResolver(sourceUrlSchema),
    defaultValues: {
      sourceUrl: "",
    },
  });

  // Handle source URL submission
  const onSourceSubmit = async (values: SourceUrlFormValues) => {
    setIsLoading(true);
    setMessage(null);

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
      setSourceVideoId(downloadResult.id);
      setSourceVideoUrl(values.sourceUrl);
      
      // For MVP, we'll simulate a successful download and move to the next step
      // In a real implementation, you would poll the API for download status
      setTimeout(() => {
        setIsLoading(false);
        setMessage({ type: 'success', text: 'Source video downloaded successfully!' });
        // Move to the recording step
        setCurrentStep('record');
      }, 2000);

    } catch (err) {
      console.error("Source video download error:", err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  // Handle recording completion
  const handleRecordingComplete = (blob: Blob) => {
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
            <Card className="border-none shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl">Select Source Video</CardTitle>
                <CardDescription>Enter the URL of the video you want to react to</CardDescription>
              </CardHeader>
              <Form {...sourceForm}>
                <form onSubmit={sourceForm.handleSubmit(onSourceSubmit)}>
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
                    {isLoading && (
                      <div className="space-y-2 max-w-xl">
                        <p className="text-sm text-muted-foreground">Downloading video... This may take a moment.</p>
                        <Progress value={45} className="w-full" /> {/* Simulated progress */}
                      </div>
                    )}
                  </CardContent>
                  <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={isLoading} size="lg">
                      {isLoading ? "Downloading..." : "Continue to Recording"}
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          )}
          
          {/* Step 2: Recording */}
          {currentStep === 'record' && (
            <>
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
