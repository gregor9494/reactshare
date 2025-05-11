"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Clock, Youtube, Instagram, Twitter, Facebook, Twitch, Check, Loader2, AlertTriangle } from "lucide-react"
import TikTok from "@/components/ui/icons/tiktok"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useSocialAccounts from "@/hooks/use-social-accounts"
import useSocialShares from "@/hooks/use-social-shares"
import useYouTubePlaylists from "@/hooks/use-youtube-playlists"
import useYouTubeAccount from "@/hooks/use-youtube-account"
import { toast } from "@/components/ui/use-toast"

interface PublishOptionsProps {
  onPublishingComplete?: () => void;
  reactionId?: string;
  initialTitle?: string;
}

export function PublishOptions({ onPublishingComplete, reactionId, initialTitle }: PublishOptionsProps = {}) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"))
  const [title, setTitle] = useState(initialTitle || "")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [useOptimalTimes, setUseOptimalTimes] = useState(false)
  const [publishComplete, setPublishComplete] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('private')
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("none")
  const [youtubeUploadStatus, setYoutubeUploadStatus] = useState<string>("")
  const [postMode, setPostMode] = useState<'schedule' | 'instant'>('schedule')
  
  // Get social account and share data/functions
  const { accounts } = useSocialAccounts();
  const { scheduleShare } = useSocialShares();
  const { playlists, loadPlaylists } = useYouTubePlaylists();
  const { uploadVideo: uploadToYouTube } = useYouTubeAccount();
  
  // Check for connected accounts
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showYouTubeError, setShowYouTubeError] = useState(false);
  
  // Effect to check which platforms are available based on connected accounts
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const available = accounts
        .filter(account => account.status === 'active')
        .map(account => account.provider.toLowerCase());
      
      setAvailablePlatforms(available);
      
      // Fetch YouTube playlists if YouTube is connected
      if (available.includes('youtube')) {
        loadPlaylists();
        setShowYouTubeError(false);
      } else {
        // If YouTube is selected but not connected, show error
        if (accounts.some(acc => selectedAccountIds.includes(acc.id) && acc.provider.toLowerCase() === 'youtube')) {
          setShowYouTubeError(true);
        }
      }
    } else if (accounts.some(acc => selectedAccountIds.includes(acc.id) && acc.provider.toLowerCase() === 'youtube')) {
      setShowYouTubeError(true);
    }
  }, [accounts, loadPlaylists, selectedAccountIds]);
  
  // Toggle account selection
  const toggleAccount = (accountId: string, forceState?: boolean) => {
    setSelectedAccountIds(prev => {
      const isCurrentlySelected = prev.includes(accountId);
      
      // If forceState is provided, use that, otherwise toggle
      const shouldBeSelected = forceState !== undefined ? forceState : !isCurrentlySelected;
      
      if (shouldBeSelected && !isCurrentlySelected) {
        // Add account if it should be selected and isn't already
        return [...prev, accountId];
      } else if (!shouldBeSelected && isCurrentlySelected) {
        // Remove account if it shouldn't be selected but is
        return prev.filter(id => id !== accountId);
      }
      
      // No change needed
      return prev;
    });
  }
  
  // Combine date and time into a single Date object
  const getScheduledDateTime = () => {
    if (!date) return new Date();
    
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    return scheduledDate;
  }

  // Check if reaction has a valid video path
  const verifyReactionHasVideo = async (reactionId: string): Promise<boolean> => {
    try {
      console.log(`Verifying reaction ${reactionId} has a video path`);
      const response = await fetch(`/api/reactions/${reactionId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error(`Error fetching reaction details: ${response.status}`);
        return false;
      }
      
      const reaction = await response.json();
      
:start_line:122
-------
      if (!reaction.reaction_video_storage_path && !reaction.source_video_id) {
        console.error(`Reaction ${reactionId} missing both video path and source_video_id`);
        toast({
          title: "Incomplete reaction video",
          description: "No stored video or source ID available. Please re-record your reaction video.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error verifying reaction video:", error);
      return false;
    }
  }

  // Handle publishing to platforms
  const handlePublish = async () => {
    if (!reactionId) {
      toast({
        title: "Missing reaction",
        description: "Cannot publish without a reaction video",
        variant: "destructive"
      })
      return
    }
    
    setIsPublishing(true)
    
    // First, check if we need to convert a source_video ID to a reaction ID
    let actualReactionId = reactionId;
    try {
      // Check if this is a source_video ID by trying to fetch the corresponding reaction
      console.log(`Looking up reaction for source video ID: ${reactionId}`);
      // First try the lookup API
      const response = await fetch(`/api/reactions/lookup?sourceVideoId=${reactionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          console.log(`Found reaction for source video ${reactionId}:`, data[0].id);
          actualReactionId = data[0].id;
        } else {
          console.log(`No reaction found for source video ${reactionId}, will try to use it directly`);
          
          // If no reaction is found, we might need to create one
          try {
            console.log(`Attempting to create a reaction for source video ${reactionId}`);
            const createResponse = await fetch('/api/reactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                source_video_id: reactionId,
                title: initialTitle || 'Untitled Reaction'
              })
            });
            
            if (createResponse.ok) {
              const createData = await createResponse.json();
              console.log(`Created new reaction for source video ${reactionId}:`, createData.id);
              actualReactionId = createData.id;
            } else {
              console.error(`Failed to create reaction for source video ${reactionId}`);
            }
          } catch (createError) {
            console.error("Error creating reaction:", createError);
          }
        }
      } else {
        console.log(`Error checking for reaction with source video ${reactionId}, will try to use it directly`);
      }
    } catch (error) {
      console.error("Error converting source video ID to reaction ID:", error);
    }
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(actualReactionId);
    if (!hasVideo) {
      setIsPublishing(false);
      return;
    }
    
    // Handle publishing to each selected platform
    // Get selected accounts
    const selectedAccounts = accounts.filter(account => selectedAccountIds.includes(account.id));
    const successfulPlatforms: string[] = [];
    const failedPlatforms: string[] = [];
    let hasAnyRealSuccess = false;
    
    // Debug information
    console.log("Starting publish process with mode:", postMode);
    console.log("Selected accounts:", selectedAccounts);
    
    for (const account of selectedAccounts) {
      const platform = account.provider.toLowerCase();
      console.log(`Attempting to publish to ${platform}...`);
      
      try {
        let result;
        
        if (postMode === 'instant') {
          // For instant posting
          if (platform === 'youtube') {
            console.log("Calling publishToYouTube with reaction ID:", actualReactionId);
            result = await publishToYouTube(actualReactionId);
            console.log("YouTube result:", result);
            
            if (result && result.success) {
              successfulPlatforms.push(platform);
              hasAnyRealSuccess = true;
            } else {
              // Handle both result types safely
              const errorMessage = 'error' in result ? result.error : "Failed to upload to YouTube";
              throw new Error(errorMessage);
            }
          } else if (platform === 'tiktok') {
            console.log("Calling publishToTikTok...");
            result = await publishToTikTok();
            console.log("TikTok result:", result);
            
            if (result && result.success) {
              successfulPlatforms.push(platform);
              hasAnyRealSuccess = true;
            } else {
              throw new Error(result?.error || "Failed to upload to TikTok");
            }
          } else {
            // For other platforms that don't have direct posting yet
            // Schedule for immediate posting (1 minute from now)
            console.log(`Scheduling immediate post for ${platform}...`);
            const immediateTime = new Date();
            immediateTime.setMinutes(immediateTime.getMinutes() + 1);
            result = await scheduleForPlatform(platform, immediateTime, actualReactionId);
            console.log(`${platform} scheduling result:`, result);
            
            if (result) {
              successfulPlatforms.push(platform);
              // This is just scheduled, not a real success for immediate posting
            } else {
              throw new Error(`Failed to schedule for ${platform}`);
            }
          }
        } else {
          // For scheduled posting
          console.log(`Scheduling post for ${platform} at ${getScheduledDateTime()}...`);
          result = await scheduleForPlatform(platform, getScheduledDateTime(), actualReactionId);
          console.log(`${platform} scheduling result:`, result);
          
          if (result) {
            successfulPlatforms.push(platform);
            hasAnyRealSuccess = true; // Scheduling is considered a success for schedule mode
          } else {
            throw new Error(`Failed to schedule for ${platform}`);
          }
        }
      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);
        failedPlatforms.push(platform);
        toast({
          title: `${platform} publishing failed`,
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        // Continue with other platforms even if one fails
      }
    }
    
    // Show completion status
    setPublishComplete(successfulPlatforms.length > 0);
    setIsPublishing(false);
    
    console.log("Publishing results:", {
      successfulPlatforms,
      failedPlatforms,
      hasAnyRealSuccess
    });
    
    // Show success message if at least one platform succeeded
    if (successfulPlatforms.length > 0) {
      const platformNames = successfulPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
      
      // For instant mode, we need to be more careful about success messages
      if (postMode === 'instant' && !hasAnyRealSuccess) {
        toast({
          title: "Publishing initiated",
          description: `Your reaction has been submitted for processing on: ${platformNames}. Check the dashboard for status updates.`,
          variant: "default"
        });
      } else {
        toast({
          title: postMode === 'instant' ? "Published successfully" : "Scheduled successfully",
          description: postMode === 'instant'
            ? `Your reaction has been published to: ${platformNames}`
            : `Your reaction has been scheduled for publishing to: ${platformNames}`,
          variant: "default"
        });
      }
      
      if (onPublishingComplete) {
        onPublishingComplete();
      }
    }
    
    // Show overall failure message if all platforms failed
    if (successfulPlatforms.length === 0 && failedPlatforms.length > 0) {
      toast({
        title: "Publishing failed for all platforms",
        description: "Please check the error messages and try again",
        variant: "destructive"
      });
    }
  }
  
  // Publish specifically to YouTube
  const publishToYouTube = async (targetReactionId?: string) => {
    const useReactionId = targetReactionId || reactionId;
    
    if (!useReactionId) {
      console.error("No reactionId provided for YouTube upload");
      return { success: false, error: "Missing reaction ID" };
    }
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(useReactionId);
    if (!hasVideo) {
      return { success: false, error: "Reaction video not complete or missing" };
    }
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    console.log("YouTube upload parameters:", {
      reactionId: useReactionId,
      title,
      description: description ? `${description.substring(0, 20)}...` : "(empty)",
      privacy,
      tagsCount: tagsList.length,
      playlistId: selectedPlaylist === "none" ? "none" : selectedPlaylist
    });
    
    setYoutubeUploadStatus("Preparing video for upload...");
    
    try {
      // Try direct upload first
      console.log("Attempting direct YouTube upload...");
      const result = await uploadToYouTube({
        reactionId: useReactionId,
        title,
        description,
        privacy,
        tags: tagsList,
        playlistId: selectedPlaylist === "none" ? undefined : selectedPlaylist
      });
      
      console.log("YouTube upload API response:", result);
      
      if (!result) {
        console.error("YouTube upload returned null/undefined result");
        throw new Error("YouTube upload failed with no response");
      }
      
      if (!result.success) {
        console.error("YouTube upload returned error:", result.error);
        throw new Error(result.error || "Failed to upload to YouTube");
      }
      
      setYoutubeUploadStatus("Upload successful!");
      console.log("YouTube upload successful:", result);
      return result;
    } catch (error) {
      console.error("YouTube direct upload failed, error details:", error);
      setYoutubeUploadStatus("Direct upload failed, using scheduled upload...");
      
      try {
        // Fallback to scheduling API if direct upload fails
        console.log("Falling back to scheduled upload for YouTube...");
        const immediateTime = new Date();
        immediateTime.setMinutes(immediateTime.getMinutes() + 1);
        
        const result = await scheduleShare({
          reactionId: useReactionId,
          provider: 'youtube',
          title,
          description,
          scheduledFor: immediateTime,
          privacy,
          tags: tagsList,
          isImmediate: true
        });
        
        console.log("YouTube scheduled upload result:", result);
        
        if (!result) {
          console.error("YouTube scheduled upload returned null/undefined");
          setYoutubeUploadStatus("");
          throw new Error("Failed to schedule YouTube upload");
        }
        
        setYoutubeUploadStatus("Scheduled for immediate processing");
        // This is not a real success for instant posting, just scheduled
        return { success: false, scheduled: true, videoId: result.id };
      } catch (scheduleError) {
        console.error("YouTube schedule fallback also failed:", scheduleError);
        setYoutubeUploadStatus("");
        throw scheduleError;
      }
    }
  }
  
  // Publish specifically to TikTok
  const publishToTikTok = async (targetReactionId?: string) => {
    const useReactionId = targetReactionId || reactionId;
    
    if (!useReactionId) {
      console.error("No reactionId provided for TikTok upload");
      return { success: false, error: "Missing reaction ID" };
    }
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(useReactionId);
    if (!hasVideo) {
      return { success: false, error: "Reaction video not complete or missing" };
    }
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    console.log("TikTok upload parameters:", {
      reactionId: useReactionId,
      title,
      description: description ? `${description.substring(0, 20)}...` : "(empty)",
      privacy,
      tagsCount: tagsList.length
    });
    
    try {
      // Call the API to upload to TikTok
      console.log("Attempting direct TikTok upload...");
      const response = await fetch('/api/social/tiktok/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionId: useReactionId,
          title,
          description,
          privacy,
          tags: tagsList
        })
      });
      
      console.log("TikTok upload response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("TikTok upload error response:", errorData);
        throw new Error(errorData.error || "Failed to upload to TikTok");
      }
      
      const result = await response.json();
      console.log("TikTok upload successful:", result);
      return result;
    } catch (error) {
      console.error("TikTok direct upload failed, error details:", error);
      
      try {
        // Fallback to scheduling API if direct upload fails
        console.log("Falling back to scheduled upload for TikTok...");
        const immediateTime = new Date();
        immediateTime.setMinutes(immediateTime.getMinutes() + 1);
        
        const result = await scheduleShare({
          reactionId: useReactionId,
          provider: 'tiktok',
          title,
          description,
          scheduledFor: immediateTime,
          privacy,
          tags: tagsList,
          isImmediate: true
        });
        
        console.log("TikTok scheduled upload result:", result);
        
        if (!result) {
          console.error("TikTok scheduled upload returned null/undefined");
          throw new Error("Failed to schedule TikTok upload");
        }
        
        // This is not a real success for instant posting, just scheduled
        return { success: false, scheduled: true, share: result };
      } catch (scheduleError) {
        console.error("TikTok schedule fallback also failed:", scheduleError);
        throw scheduleError;
      }
    }
  }
  
  // Schedule for other platforms (placeholder for future implementation)
  const scheduleForPlatform = async (platform: string, scheduledTime: Date, targetReactionId?: string) => {
    const useReactionId = targetReactionId || reactionId;
    
    if (!useReactionId) return null
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(useReactionId);
    if (!hasVideo) {
      toast({
        title: `${platform} scheduling failed`,
        description: "Reaction video not complete or missing. Please re-record your reaction.",
        variant: "destructive"
      });
      return null;
    }
    
    // For now, just schedule the share in the database for future processing
    const result = await scheduleShare({
      reactionId: useReactionId,
      provider: platform,
      title,
      description,
      scheduledFor: scheduledTime,
      privacy,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      isImmediate: postMode === 'instant'
    })
    
    if (!result) {
      throw new Error(`Failed to schedule for ${platform}`)
    }
    
    return result
  }
  
  // Platform data
  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { id: 'tiktok', name: 'TikTok', icon: TikTok, color: 'text-black' },
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
            <div className="space-y-2">
              <label htmlFor="privacy" className="text-sm font-medium">
                Privacy Setting
              </label>
              <Select
                value={privacy}
                onValueChange={(value) => setPrivacy(value as 'public' | 'unlisted' | 'private')}
              >
                <SelectTrigger id="privacy" className="w-full">
                  <SelectValue placeholder="Select privacy setting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only you can see)</SelectItem>
                  <SelectItem value="unlisted">Unlisted (Anyone with the link)</SelectItem>
                  <SelectItem value="public">Public (Visible to everyone)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* YouTube connection error */}
            {showYouTubeError && (
              <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to connect a YouTube account to use YouTube features.
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-1 text-amber-800 underline"
                    onClick={() => window.location.href = '/dashboard/social'}
                  >
                    Connect your account
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* YouTube Settings - Only show when a YouTube account is selected and connected */}
            {accounts.some(acc => selectedAccountIds.includes(acc.id) && acc.provider.toLowerCase() === 'youtube') && (
              <div className="space-y-4 mt-4 p-4 border rounded-md bg-red-50/30">
                <div className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium">YouTube Upload Settings</h4>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="youtubePlaylist" className="text-sm font-medium">
                    Add to YouTube Playlist
                  </label>
                  <Select
                    value={selectedPlaylist}
                    onValueChange={setSelectedPlaylist}
                  >
                    <SelectTrigger id="youtubePlaylist" className="w-full">
                      <SelectValue placeholder="Add to playlist (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Don't add to playlist)</SelectItem>
                      {playlists.map(playlist => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          {playlist.title} ({playlist.itemCount} videos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The video will be added to the selected playlist after upload.
                  </p>
                </div>
                
                {youtubeUploadStatus && (
                  <div className="flex items-center gap-2 text-sm mt-2 text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{youtubeUploadStatus}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Connected Profiles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Connected Profiles</h3>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
              <p className="text-md font-semibold text-muted-foreground">No social accounts connected</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please connect your social media accounts in the Social Accounts page first.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/dashboard/social'}>
                Connect Accounts
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.filter(account => account.status === 'active').map((account) => {
                const platformInfo = platforms.find(p => p.id === account.provider.toLowerCase());
                if (!platformInfo) return null;
                
                const Icon = platformInfo.icon;
                const isSelected = selectedAccountIds.includes(account.id);
                
                const checkboxId = `platform-${account.id}`;
                return (
                  <div
                    key={account.id}
                    className={`flex items-center space-x-2 rounded-md border p-3 transition-colors
                      ${isSelected ? 'border-primary bg-primary/5' : ''}
                    `}
                  >
                    <div className="flex flex-1 items-center space-x-2">
                      <Checkbox
                        id={checkboxId}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleAccount(account.id, checked === true)}
                      />
                      <label htmlFor={checkboxId} className="flex flex-1 items-center space-x-2 cursor-pointer">
                        <Icon className={`h-5 w-5 ${platformInfo.color}`} strokeWidth={account.provider.toLowerCase() === 'youtube' ? 2 : 1.5} />
                        <div className="flex-1">
                          <span className="text-sm font-medium block">
                            {account.provider_username ? `@${account.provider_username}` : account.provider}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {platformInfo.name}
                          </span>
                        </div>
                      </label>
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Publishing Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Publishing Options</h3>
          
          <div className="flex space-x-4 mb-4">
            <Button
              variant={postMode === 'instant' ? "default" : "outline"}
              onClick={() => setPostMode('instant')}
              className="flex-1"
            >
              Post Instantly
            </Button>
            <Button
              variant={postMode === 'schedule' ? "default" : "outline"}
              onClick={() => setPostMode('schedule')}
              className="flex-1"
            >
              Schedule for Later
            </Button>
          </div>
          
          {postMode === 'schedule' && (
            <div className="space-y-4">
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
                  <div className="relative">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10"
                    />
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
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
            </div>
          )}
          
          {useOptimalTimes && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 mt-2">
              <p className="font-medium">Optimal posting times:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>YouTube: Weekends at 9-11 AM</li>
                <li>TikTok: Tuesday at 9 AM and Thursday at 7-9 PM</li>
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
          <Button
            onClick={handlePublish}
            disabled={isPublishing || (!reactionId && selectedAccountIds.length > 0)}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {postMode === 'instant' ? "Publishing..." : "Scheduling..."}
              </>
            ) : (
              selectedAccountIds.length > 0
                ? (postMode === 'instant' ? "Publish Now" : "Schedule Post")
                : "Skip Publishing"
            )}
          </Button>
        </div>
        
        {/* Success message */}
        {publishComplete && (
          <Alert className="bg-blue-50 border-blue-200 mt-4">
            <Check className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              {selectedAccountIds.length > 0
                ? postMode === 'instant'
                  ? "Your reaction video has been submitted for processing. This may take some time to complete. Check the dashboard for status updates."
                  : "Your reaction video has been scheduled for publishing at the selected time."
                : "Your reaction video has been saved without publishing."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
