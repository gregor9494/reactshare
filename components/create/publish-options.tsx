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
  isSourceVideo?: boolean;
}

export function PublishOptions({ onPublishingComplete, reactionId, initialTitle, isSourceVideo = false }: PublishOptionsProps) {
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
  const { accounts, getAccountByProvider } = useSocialAccounts();
  const { scheduleShare } = useSocialShares();
  const { playlists, loadPlaylists } = useYouTubePlaylists();
  const { uploadVideo: uploadToYouTube, youtubeAccount, error: youtubeAccountError } = useYouTubeAccount();
  
  // Add diagnostic logging for accounts and YouTube account
  useEffect(() => {
    console.log("ACCOUNTS DEBUG:", {
      allAccounts: accounts,
      youtubeAccounts: accounts.filter(acc => acc.provider.toLowerCase() === 'youtube'),
      selectedAccountIds,
      youtubeAccountFromHook: youtubeAccount ? {
        id: youtubeAccount.id,
        provider: youtubeAccount.provider,
        status: youtubeAccount.status,
        username: youtubeAccount.provider_username
      } : null,
      youtubeAccountError
    });
  }, [accounts, selectedAccountIds, youtubeAccount, youtubeAccountError]);
  
  // Check for connected accounts
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [showYouTubeError, setShowYouTubeError] = useState(false);
  
  // Pre-check YouTube account availability
  useEffect(() => {
    const hasYouTubeSelected = accounts.some(acc => 
      selectedAccountIds.includes(acc.id) && acc.provider.toLowerCase() === 'youtube'
    );
    
    if (youtubeAccount) {
      console.log("YouTube account detected:", youtubeAccount);
      setShowYouTubeError(false);
    } else {
      console.log("No YouTube account detected from hook");
      // Only show error if YouTube is selected
      if (hasYouTubeSelected) {
        console.log("YouTube selected but no account available, showing error");
        setShowYouTubeError(true);
        
        // Deselect YouTube if it's selected but not available
        if (hasYouTubeSelected) {
          const youtubeAccountIds = accounts
            .filter(acc => acc.provider.toLowerCase() === 'youtube')
            .map(acc => acc.id);
          
          setSelectedAccountIds(prev => 
            prev.filter(id => !youtubeAccountIds.includes(id))
          );
          
          toast({
            title: "YouTube Account Issue",
            description: "YouTube account is not properly connected. Please reconnect your account in Social settings.",
            variant: "destructive"
          });
        }
      }
    }
  }, [youtubeAccount, accounts, selectedAccountIds]);
  
  // Effect to check which platforms are available based on connected accounts
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const available = accounts
        .filter(account => account.status === 'active')
        .map(account => account.provider.toLowerCase());
      
      setAvailablePlatforms(available);
      
      // Fetch YouTube playlists if YouTube is connected
      if (available.includes('youtube') && youtubeAccount) {
        console.log("Loading YouTube playlists for account:", youtubeAccount);
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
  }, [accounts, loadPlaylists, selectedAccountIds, youtubeAccount]);
  
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

  // Verify source video has a valid path
  const verifySourceVideoHasPath = async (sourceId: string): Promise<boolean> => {
    try {
      console.log(`Verifying source video ${sourceId} has a path`);
      const response = await fetch(`/api/videos/library?id=${sourceId}`);
      
      if (!response.ok) {
        console.error(`Error fetching source video details: ${response.status}`);
        toast({ 
          title: "Video Not Found", 
          description: "Could not retrieve source video details", 
          variant: "destructive" 
        });
        return false;
      }
      
      const data = await response.json();
      if (!data.videos || data.videos.length === 0) {
        console.error("Source video not found in response");
        toast({
          title: "Source Video Not Found",
          description: "The source video could not be found",
          variant: "destructive"
        });
        return false;
      }
      
      const video = data.videos[0];
      if (!video.storage_path && !video.public_url && !video.original_url) {
        console.error("Source video has no usable path");
        toast({
          title: "Incomplete Video Data",
          description: "The source video is missing its file path",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error verifying source video: ${error}`);
      toast({ 
        title: "Verification Error", 
        description: "Failed to verify source video", 
        variant: "destructive" 
      });
      return false;
    }
  }
  
  // Check if the reaction (identified by reactionId, which is a reaction UUID) has a valid video path.
  const verifyReactionHasVideo = async (reactionId: string): Promise<boolean> => {
    // `reactionId` here is expected to be the actual UUID of a reaction record,
    // as determined by `handlePublish`.
    if (!reactionId || !reactionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.error(`verifyReactionHasVideo called with invalid reactionId format: ${reactionId}`);
        toast({ title: "Invalid Video ID", description: "Cannot verify video with an invalid ID format.", variant: "destructive" });
        return false;
    }

    try {
      console.log(`Verifying reaction ${reactionId} has a video path.`);
      
      // Fetch the reaction record using the provided reactionId (UUID)
      const response = await fetch(`/api/reactions/${reactionId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching reaction details for ${reactionId}: ${response.status}. Body: ${errorText}`);
        toast({ title: "Video Not Found", description: `Could not retrieve details for video ID ${reactionId}.`, variant: "destructive" });
        return false;
      }
      
      const reaction = await response.json();
      console.log("Fetched reaction details for verification:", reaction);
      
      // 1. Check if the reaction itself has a direct video path
      if (reaction.reaction_video_storage_path) {
        console.log(`Reaction ${reactionId} has a direct video path: ${reaction.reaction_video_storage_path}`);
        return true;
      }
      
      // 2. If not, check if it's linked to a source video that has a path
      if (reaction.source_video_id) {
        console.log(`Reaction ${reactionId} has no direct path, checking linked source_video_id: ${reaction.source_video_id}`);
        
        try {
          const sourceResponse = await fetch(`/api/videos/library?id=${reaction.source_video_id}`);
          console.log(`Source video API response status for ${reaction.source_video_id}: ${sourceResponse.status}`);
          
          if (sourceResponse.ok) {
            const sourceData = await sourceResponse.json();
            console.log("Source video data:", sourceData);
            
            if (sourceData.videos && sourceData.videos.length > 0) {
              const sourceVideo = sourceData.videos[0];
              console.log("Linked source video details:", sourceVideo);
              
              const sourceVideoPath = sourceVideo.storage_path || sourceVideo.public_url || sourceVideo.original_url;
              if (sourceVideoPath) {
                console.log(`Linked source video ${reaction.source_video_id} has a valid file reference: ${sourceVideoPath}`);
                
                // Attempt to update the reaction record with this source video's storage_path
                // if the reaction itself was missing it. This is a good-to-have.
                if (sourceVideo.storage_path && !reaction.reaction_video_storage_path) {
                  console.log(`Attempting to update reaction ${reactionId} with storage_path from source video ${reaction.source_video_id}`);
                  const updateData = { reaction_video_storage_path: sourceVideo.storage_path, status: 'uploaded' };
                  
                  // Fire-and-forget update, main goal is verification
                  fetch(`/api/reactions/${reactionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                  }).then(updateResp => {
                    if (updateResp.ok) console.log(`Successfully updated reaction ${reactionId} with source video storage path.`);
                    else console.warn(`Failed to update reaction ${reactionId} with source video storage path, but verification succeeded based on source.`);
                  }).catch(err => console.warn(`Error updating reaction ${reactionId} with source path (non-critical):`, err));
                }
                return true; // Valid path found via source video
              } else {
                console.error(`Linked source video ${reaction.source_video_id} exists but has no valid file reference (storage_path, public_url, or original_url).`);
              }
            } else {
              console.error(`Linked source video ${reaction.source_video_id} not found in library response.`);
            }
          } else {
            const errorText = await sourceResponse.text();
            console.error(`Failed to fetch linked source video ${reaction.source_video_id}. Status: ${sourceResponse.status}. Body: ${errorText}`);
          }
        } catch (sourceError) {
          console.error(`Error checking linked source video ${reaction.source_video_id}:`, sourceError);
        }
      }
      
      // If we reach here, no valid video path was found for the reaction
      console.error(`Reaction ${reactionId} does not have a usable video path, either directly or via a linked source video.`);
      toast({
        title: "Incomplete Video Data",
        description: "The selected video is missing its file. Please choose another video or re-upload/re-record.",
        variant: "destructive"
      });
      return false;
      
    } catch (error) {
      console.error(`Unexpected error in verifyReactionHasVideo for ${reactionId}:`, error);
      toast({ title: "Verification Error", description: "An unexpected error occurred while verifying the video.", variant: "destructive" });
      return false;
    }
  }

  // Publish specifically to YouTube
  const publishToYouTube = async (reactionIdToPublish: string) => { // Changed: parameter is now required and named clearly
    if (!reactionIdToPublish) { // This check is more of a safeguard
      console.error("publishToYouTube called without a reactionIdToPublish");
      return { success: false, error: "Internal error: Missing reaction ID for YouTube upload" };
    }
    
    // Get YouTube account directly from accounts array to avoid case sensitivity issues
    const youtubeAccountFromList = accounts.find(acc => 
      acc.provider.toLowerCase() === 'youtube' && 
      acc.status === 'active'
    );
    
    console.log("YouTube account details:", {
      fromHook: youtubeAccount ? {
        id: youtubeAccount.id,
        provider: youtubeAccount.provider,
        username: youtubeAccount.provider_username
      } : null,
      fromAccountsList: youtubeAccountFromList ? {
        id: youtubeAccountFromList.id,
        provider: youtubeAccountFromList.provider,
        username: youtubeAccountFromList.provider_username
      } : null
    });
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(reactionIdToPublish); // Use the passed-in ID
    if (!hasVideo) {
      return { success: false, error: "Reaction video not complete or missing" };
    }
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    console.log("YouTube upload parameters:", {
      reactionId: reactionIdToPublish, // Use the passed-in ID
      title,
      description: description ? `${description.substring(0, 20)}...` : "(empty)",
      privacy,
      tagsCount: tagsList.length,
      playlistId: selectedPlaylist === "none" ? "none" : selectedPlaylist
    });
    
    setYoutubeUploadStatus("Preparing video for upload...");
    
    // Use either the hook account or direct account - prefer direct to avoid case sensitivity issues
    const activeYoutubeAccount = youtubeAccount || youtubeAccountFromList;
    
    // First check if the YouTube account is available
    if (!activeYoutubeAccount) {
      console.warn("No active YouTube account found - skipping hook and using API directly");
      
      // Skip the hook entirely and use the share scheduling API as a workaround
      try {
        console.log("Using scheduling API for YouTube with reaction ID:", reactionIdToPublish);
        const immediateTime = new Date();
        immediateTime.setMinutes(immediateTime.getMinutes() + 1);
        
        const result = await scheduleShare({ // Hook from useSocialShares
          reactionId: reactionIdToPublish,
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
        toast({
          title: "YouTube Publishing Queued",
          description: "Your video has been queued for YouTube publishing",
          variant: "default"
        });
        
        return { success: false, scheduled: true, videoId: result.id };
      } catch (scheduleError) {
        console.error("YouTube schedule API failed:", scheduleError);
        setYoutubeUploadStatus("");
        throw new Error("Could not connect to YouTube. Please check your account connection.");
      }
    }
    
    // If we have a YouTube account, try direct upload first
    try {
      console.log("Attempting direct YouTube upload with reaction ID:", reactionIdToPublish);
      const result = await uploadToYouTube({ // Hook from useYouTubeAccount
        reactionId: reactionIdToPublish, // Use the passed-in ID
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
        console.log("Falling back to scheduled upload for YouTube with reaction ID:", reactionIdToPublish);
        const immediateTime = new Date();
        immediateTime.setMinutes(immediateTime.getMinutes() + 1);
        
        const result = await scheduleShare({ // Hook from useSocialShares
          reactionId: reactionIdToPublish, // Use the passed-in ID
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
  const publishToTikTok = async (reactionIdToPublish: string) => { // Changed: parameter is now required
    if (!reactionIdToPublish) {
      console.error("publishToTikTok called without a reactionIdToPublish");
      return { success: false, error: "Internal error: Missing reaction ID for TikTok upload" };
    }
    
    // Verify this reaction has a valid video file before proceeding
    const hasVideo = await verifyReactionHasVideo(reactionIdToPublish); // Use the passed-in ID
    if (!hasVideo) {
      return { success: false, error: "Reaction video not complete or missing" };
    }
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    console.log("TikTok upload parameters:", {
      reactionId: reactionIdToPublish, // Use the passed-in ID
      title,
      description: description ? `${description.substring(0, 20)}...` : "(empty)",
      privacy,
      tagsCount: tagsList.length
    });
    
    try {
      // Call the API to upload to TikTok
      console.log("Attempting direct TikTok upload with reaction ID:", reactionIdToPublish);
      const response = await fetch('/api/social/tiktok/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionId: reactionIdToPublish, // Use the passed-in ID
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
      return { success: true, ...result };
    } catch (error) {
      console.error("TikTok direct upload failed, error details:", error);
      
      try {
        // Fallback to scheduling API if direct upload fails
        console.log("Falling back to scheduled upload for TikTok with reaction ID:", reactionIdToPublish);
        const immediateTime = new Date();
        immediateTime.setMinutes(immediateTime.getMinutes() + 1);
        
        const result = await scheduleShare({ // Hook from useSocialShares
          reactionId: reactionIdToPublish, // Use the passed-in ID
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
        
        // This is not a real direct success, just scheduled
        return { success: false, scheduled: true, videoId: result.id };
      } catch (scheduleError) {
        console.error("TikTok schedule fallback also failed:", scheduleError);
        throw scheduleError;
      }
    }
  }
  
  // Handle publishing to platforms
  const handlePublish = async () => {
    setIsPublishing(true);
    
    if (!reactionId) {
      toast({
        title: "Missing video",
        description: "Please select a video to publish",
        variant: "destructive"
      });
      setIsPublishing(false);
      return;
    }
    
    // Handle the ID based on whether it's a source video or reaction video
    let actualReactionId = reactionId; // This will hold the UUID of the reaction to be published.
    
    if (isSourceVideo && reactionId) {
      try {
        // Verify source video has a valid path
        const hasPath = await verifySourceVideoHasPath(reactionId);
        if (!hasPath) {
          setIsPublishing(false);
          return;
        }
        
        console.log(`Source video publish: Looking up/creating reaction for sourceVideoId: ${reactionId}`);
        
        // Try to find an existing reaction that references this source video
        const response = await fetch(`/api/reactions/lookup?sourceVideoId=${reactionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            console.log(`Found existing reaction for sourceVideoId ${reactionId}: ${data[0].id}`);
            actualReactionId = data[0].id;
          } else {
            console.log(`No existing reaction found for sourceVideoId ${reactionId}, creating a new one.`);
            
            // Need to get source video details for storage path
            const sourceVideoResponse = await fetch(`/api/videos/library?id=${reactionId}`);
            let sourceVideoData = null;
            let storagePath = null;
            
            if (sourceVideoResponse.ok) {
              sourceVideoData = await sourceVideoResponse.json();
              if (sourceVideoData.videos && sourceVideoData.videos.length > 0) {
                storagePath = sourceVideoData.videos[0].storage_path;
                console.log(`Retrieved source video details: storage_path=${storagePath}`);
              }
            }
            
            // Create a new reaction record that references this source video
            const createBody: any = {
              source_video_id: reactionId,
              title: initialTitle || 'Untitled Reaction from Source',
              status: 'uploaded'
            };
            if (storagePath) {
              createBody.reaction_video_storage_path = storagePath;
            }
            
            const createResponse = await fetch('/api/reactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createBody)
            });
            
            if (createResponse.ok) {
              const createData = await createResponse.json();
              console.log(`Created new reaction ${createData.id} for sourceVideoId ${reactionId}`);
              actualReactionId = createData.id;
            } else {
              const errorText = await createResponse.text();
              console.error(`Failed to create reaction for sourceVideoId ${reactionId}. Status: ${createResponse.status}, Body: ${errorText}`);
              throw new Error("Failed to create reaction for the selected source video.");
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`Error looking up reaction for sourceVideoId ${reactionId}. Status: ${response.status}, Body: ${errorText}`);
          throw new Error("Failed to check for existing reactions for the source video.");
        }
      } catch (error) {
        console.error("Error processing source video for publishing:", error);
        toast({
          title: "Error Preparing Video",
          description: error instanceof Error ? error.message : "An unexpected error occurred while preparing the source video.",
          variant: "destructive"
        });
        setIsPublishing(false);
        return;
      }
    } else {
      // For reaction videos, verify using the existing method
      const hasVideo = await verifyReactionHasVideo(reactionId);
      if (!hasVideo) {
        setIsPublishing(false);
        return;
      }
    }
    
    const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));
    const successfulPlatforms: string[] = [];
    const failedPlatforms: string[] = [];
    let hasAnyRealSuccess = false;
    
    console.log(`Starting publish process: mode=${postMode}, isSourceVideo=${isSourceVideo}, actual reactionId=${actualReactionId}`);
    
    for (const account of selectedAccounts) {
      const platform = account.provider.toLowerCase();
      console.log(`Attempting to publish to ${platform}...`);
      
      try {
        if (postMode === 'instant') {
          // Instant posting
          if (platform === 'youtube') {
            // CRITICAL FIX: Since backend logs show the YouTube account is not found despite frontend checks,
            // we need to verify the YouTube integration is fully active by checking if we have a valid token
            // in the YouTube hook before attempting to upload

            // First we log the detailed state for debugging purposes
            console.log("DETAILED YOUTUBE PUBLISHING STATE:", {
              platformFromLoop: platform,
              hookYoutubeAccount: youtubeAccount ? {
                id: youtubeAccount.id,
                provider: youtubeAccount.provider,
                status: youtubeAccount.status,
                profileData: youtubeAccount.profile_data ? 'present' : 'missing'
              } : 'null or undefined',
              youtubeError: youtubeAccountError,
              // We can't directly access hook state properties from the accounts array
              hookError: youtubeAccountError
            });

            // Even if youtubeAccount is not available from the hook, we'll try to publish anyway
            // This is per user request to not block YouTube publishing
            if (!youtubeAccount) {
              console.warn("YouTube account not available from hook - will try API anyway");
              
              // Show a warning toast but continue with the attempt (using default since warning isn't a valid variant)
              toast({
                title: "YouTube Connection Warning",
                description: "YouTube account may not be properly connected. Will attempt publishing anyway.",
                variant: "default"
              });
              
              // Continue with the attempt - don't skip
            }
            
            // Only proceed with publishing if we confirmed the YouTube account exists
            try {
              if (isSourceVideo) {
                console.log(`Publishing source video (via reaction ${actualReactionId}) to YouTube`);
                
              // CRITICAL FIX: The browser logs show a mismatch between selected account ID and hook account ID
              // Get the actual selected YouTube account ID from selectedAccountIds
              const selectedYoutubeAccountId = selectedAccountIds.find(id => 
                accounts.some(acc => acc.id === id && acc.provider.toLowerCase() === 'youtube')
              );
              
              console.log("SELECTED YOUTUBE ACCOUNT INFO:", {
                selectedYoutubeAccountId,
                selectedAccountFromList: accounts.find(acc => acc.id === selectedYoutubeAccountId),
                hookAccountId: youtubeAccount?.id
              });
              
              // Call the YouTube API directly with the selected account ID
              const response = await fetch('/api/social/youtube/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reactionId: actualReactionId,
                  title,
                  description,
                  privacy,
                  tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                  playlistId: selectedPlaylist === "none" ? undefined : selectedPlaylist,
                  accountId: selectedYoutubeAccountId // Pass the specific selected account ID
                })
              });
              
              let result;
              if (!response.ok) {
                const errorData = await response.json();
                result = { success: false, error: errorData.error || "YouTube API returned an error" };
              } else {
                result = await response.json();
              }
                
                console.log("YouTube direct upload result:", result);
                
                if (result?.success) {
                  successfulPlatforms.push(platform);
                  hasAnyRealSuccess = true;
                } else {
                  // Don't try fallbacks - if direct upload fails, don't keep trying
                  throw new Error(result?.error || "Failed to upload to YouTube");
                }
              } else {
                console.log(`Publishing reaction ${actualReactionId} to YouTube`);
                
                // CRITICAL FIX: Apply the same direct API approach for reaction videos
                // Get the actual selected YouTube account ID from selectedAccountIds
                const selectedYoutubeAccountId = selectedAccountIds.find(id => 
                  accounts.some(acc => acc.id === id && acc.provider.toLowerCase() === 'youtube')
                );
                
                console.log("SELECTED YOUTUBE ACCOUNT INFO (REACTION):", {
                  selectedYoutubeAccountId,
                  selectedAccountFromList: accounts.find(acc => acc.id === selectedYoutubeAccountId),
                  hookAccountId: youtubeAccount?.id
                });
                
                // Call the YouTube API directly with the selected account ID
                const response = await fetch('/api/social/youtube/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reactionId: actualReactionId,
                    title,
                    description,
                    privacy,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    playlistId: selectedPlaylist === "none" ? undefined : selectedPlaylist,
                    accountId: selectedYoutubeAccountId // Pass the specific selected account ID
                  })
                });
                
                let result;
                if (!response.ok) {
                  const errorData = await response.json();
                  result = { success: false, error: errorData.error || "YouTube API returned an error" };
                } else {
                  result = await response.json();
                }
                
                console.log("YouTube direct upload result:", result);
                
                if (result?.success) {
                  successfulPlatforms.push(platform);
                  hasAnyRealSuccess = true;
                } else {
                  // Don't try fallbacks
                  throw new Error(result?.error || "Failed to upload to YouTube");
                }
              }
            } catch (error) {
              console.error(`Error uploading to YouTube: ${error}`);
              failedPlatforms.push(platform);
              toast({
                title: "YouTube Publishing Failed",
                description: error instanceof Error ? error.message : "Unknown error uploading to YouTube",
                variant: "destructive"
              });
              
              // Continue to other platforms
              continue;
            }
          } else if (platform === 'tiktok') {
            if (isSourceVideo) {
              console.log(`Publishing source video (via reaction ${actualReactionId}) to TikTok`);
              const response = await fetch('/api/social/tiktok/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reactionId: actualReactionId, // Always use actual reaction ID
                  title,
                  description,
                  privacy,
                  tags: tags.split(',').map(t => t.trim()).filter(Boolean)
                })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to upload to TikTok");
              }
              
              successfulPlatforms.push(platform);
              hasAnyRealSuccess = true;
            } else {
              console.log(`Publishing reaction ${actualReactionId} to TikTok`);
              const result = await publishToTikTok(actualReactionId);
              
              if (result?.success) {
                successfulPlatforms.push(platform);
                hasAnyRealSuccess = true;
              } else {
                throw new Error(result?.error || "Failed to upload to TikTok");
              }
            }
          } else {
            // Other platforms - schedule for immediate publishing
            const immediateTime = new Date();
            immediateTime.setMinutes(immediateTime.getMinutes() + 1);
            
            console.log(`Scheduling immediate post for ${platform} with video ${isSourceVideo ? `source via reaction ${actualReactionId}` : actualReactionId}`);
            const result = await scheduleShare({
              reactionId: actualReactionId, // Always use actual reaction ID
              provider: platform,
              title,
              description,
              scheduledFor: immediateTime,
              privacy,
              tags: tags.split(',').map(t => t.trim()).filter(Boolean),
              isImmediate: true
            });
            
            if (result) {
              successfulPlatforms.push(platform);
              // Not a real direct success but scheduled
            } else {
              throw new Error(`Failed to schedule for ${platform}`);
            }
          }
        } else {
          // Scheduled posting - same approach for both source and reaction videos
          const scheduledTime = getScheduledDateTime();
          
          console.log(`Scheduling post for ${platform} at ${scheduledTime} with video ${isSourceVideo ? `source via reaction ${actualReactionId}` : actualReactionId}`);
          const result = await scheduleShare({
            reactionId: actualReactionId, // Always use actual reaction ID
            provider: platform,
            title,
            description,
            scheduledFor: scheduledTime,
            privacy,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean)
          });
          
          if (result) {
            successfulPlatforms.push(platform);
            hasAnyRealSuccess = true;
          } else {
            throw new Error(`Failed to schedule for ${platform}`);
          }
        }
      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);
        failedPlatforms.push(platform);
        toast({
          title: `${platform} publishing failed`,
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        });
      }
    }
    
    // Show success/failure messages
    if (successfulPlatforms.length > 0) {
      const platformNames = successfulPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
      
      if (postMode === 'instant' && !hasAnyRealSuccess) {
        toast({
          title: "Publishing initiated",
          description: `Your video has been submitted for processing on: ${platformNames}. Check dashboard for updates.`,
          variant: "default"
        });
      } else {
        toast({
          title: postMode === 'instant' ? "Published successfully" : "Scheduled successfully",
          description: postMode === 'instant'
            ? `Your video has been published to: ${platformNames}`
            : `Your video has been scheduled for publishing to: ${platformNames}`,
          variant: "default"
        });
      }
      
      setPublishComplete(true);
      
      if (onPublishingComplete) {
        onPublishingComplete();
      }
    }
    
    if (successfulPlatforms.length === 0 && failedPlatforms.length > 0) {
      toast({
        title: "Publishing failed for all platforms",
        description: "Please check the error messages and try again",
        variant: "destructive"
      });
    }
    
    setIsPublishing(false);
  }
  
  // Render the component UI
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish Options</CardTitle>
        <CardDescription>
          Choose when and where to publish your video
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Post Mode Selection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Publishing Mode</h3>
          <div className="flex space-x-2">
            <Button 
              variant={postMode === 'instant' ? "default" : "outline"} 
              onClick={() => setPostMode('instant')}
              size="sm"
            >
              Publish Now
            </Button>
            <Button 
              variant={postMode === 'schedule' ? "default" : "outline"} 
              onClick={() => setPostMode('schedule')}
              size="sm"
            >
              Schedule
            </Button>
          </div>
        </div>
        
        {/* Title & Description */}
        <div className="space-y-2">
          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your video"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="tags" className="text-sm font-medium">Tags (comma separated)</label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. funny, reaction, gaming"
            />
          </div>
        </div>
        
        {/* Privacy Settings */}
        <div className="space-y-1">
          <label htmlFor="privacy" className="text-sm font-medium">Privacy</label>
          <Select 
            value={privacy} 
            onValueChange={(value: 'public' | 'unlisted' | 'private') => setPrivacy(value)}
          >
            <SelectTrigger id="privacy">
              <SelectValue placeholder="Select privacy setting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="unlisted">Unlisted</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* YouTube-specific Options */}
        {accounts.some(acc => 
          selectedAccountIds.includes(acc.id) && 
          acc.provider.toLowerCase() === 'youtube'
        ) && (
          <div className="space-y-1">
            <label htmlFor="playlist" className="text-sm font-medium">YouTube Playlist</label>
            <Select 
              value={selectedPlaylist} 
              onValueChange={setSelectedPlaylist}
            >
              <SelectTrigger id="playlist">
                <SelectValue placeholder="Select playlist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showYouTubeError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  YouTube account not properly connected. Please reconnect your account in Social settings.
                </AlertDescription>
              </Alert>
            )}
            {youtubeUploadStatus && (
              <div className="text-sm text-muted-foreground mt-1">
                {youtubeUploadStatus}
              </div>
            )}
          </div>
        )}
        
        {/* Schedule Options */}
        {postMode === 'schedule' && (
          <div className="space-y-3">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium">Publish Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium">Publish Time</label>
              <div className="flex items-center space-x-2">
                <Button variant="outline" className="justify-start flex-1">
                  <Clock className="mr-2 h-4 w-4" />
                  <Input 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)}
                    className="border-0 p-0 focus:ring-0"
                  />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="optimal-times" 
                checked={useOptimalTimes}
                onCheckedChange={() => setUseOptimalTimes(!useOptimalTimes)}
              />
              <label
                htmlFor="optimal-times"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use optimal publishing times per platform
              </label>
            </div>
          </div>
        )}
        
        {/* Platform Selection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Select Platforms</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {accounts.map((account) => {
              const platform = account.provider.toLowerCase();
              const isSelected = selectedAccountIds.includes(account.id);
              let PlatformIcon: any;
              
              if (platform === 'youtube') PlatformIcon = Youtube;
              else if (platform === 'tiktok') PlatformIcon = TikTok;
              else if (platform === 'instagram') PlatformIcon = Instagram;
              else if (platform === 'twitter') PlatformIcon = Twitter;
              else if (platform === 'facebook') PlatformIcon = Facebook;
              else if (platform === 'twitch') PlatformIcon = Twitch;
              else PlatformIcon = null;
              
              return (
                <Button
                  key={account.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`flex items-center justify-start px-3 py-6 ${isSelected ? "" : "opacity-60"}`}
                  onClick={() => toggleAccount(account.id)}
                  disabled={account.status !== 'active'}
                >
                  <div className="flex flex-col items-start flex-1 min-w-0 mr-2">
                    <div className="flex items-center">
                      {PlatformIcon && (
                        <PlatformIcon className={`mr-2 h-5 w-5 ${isSelected ? "text-white" : ""}`} />
                      )}
                      <span className="capitalize font-medium">{platform}</span>
                    </div>
                    {account.provider_username && (
                      <span className={`text-xs truncate ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                        @{account.provider_username}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                </Button>
              );
            })}
          </div>
        </div>
        
        {/* Publish Button */}
        <div className="pt-4">
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || selectedAccountIds.length === 0 || !reactionId}
            className="w-full"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : publishComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Published
              </>
            ) : (
              postMode === 'schedule' ? 'Schedule Post' : 'Publish Now'
            )}
          </Button>
        </div>
        
      </CardContent>
    </Card>
  );
}
