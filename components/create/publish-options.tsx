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
    
    try {
      // Handle publishing to each selected platform
      // Get selected accounts
      const selectedAccounts = accounts.filter(account => selectedAccountIds.includes(account.id));
      
      for (const account of selectedAccounts) {
        const platform = account.provider.toLowerCase();
        if (platform === 'youtube') {
          await publishToYouTube()
        } else if (platform === 'tiktok') {
          await publishToTikTok()
        } else {
          // For other platforms, schedule for future implementation
          await scheduleForPlatform(platform)
        }
      }
      
      setPublishComplete(true)
      
      toast({
        title: "Published successfully",
        description: `Your reaction has been published to ${selectedAccounts.length} platform(s)`,
        variant: "default"
      })
      
      if (onPublishingComplete) {
        onPublishingComplete()
      }
    } catch (error) {
      toast({
        title: "Publishing failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
      console.error("Publishing error:", error)
    } finally {
      setIsPublishing(false)
    }
  }
  
  // Publish specifically to YouTube
  const publishToYouTube = async () => {
    if (!reactionId) return null
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
    
    setYoutubeUploadStatus("Preparing video for upload...")
    
    const result = await uploadToYouTube({
      reactionId,
      title,
      description,
      privacy,
      tags: tagsList,
      playlistId: selectedPlaylist === "none" ? undefined : selectedPlaylist
    })
    
    if (!result || !result.success) {
      setYoutubeUploadStatus("")
      throw new Error(result?.error || "Failed to upload to YouTube")
    }
    
    setYoutubeUploadStatus("")
    return result
  }
  
  // Publish specifically to TikTok
  const publishToTikTok = async () => {
    if (!reactionId) return null
    
    const tagsList = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
    
    // Call the API to upload to TikTok
    const response = await fetch('/api/social/tiktok/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reactionId,
        title,
        description,
        privacy,
        tags: tagsList
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to upload to TikTok")
    }
    
    const result = await response.json()
    return result
  }
  
  // Schedule for other platforms (placeholder for future implementation)
  const scheduleForPlatform = async (platform: string) => {
    if (!reactionId || !date) return null
    
    // For now, just schedule the share in the database for future processing
    const result = await scheduleShare({
      reactionId,
      provider: platform,
      title,
      description,
      scheduledFor: date,
      privacy,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
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
                Publishing...
              </>
            ) : (
              selectedAccountIds.length > 0 ? "Publish Now" : "Skip Publishing"
            )}
          </Button>
        </div>
        
        {/* Success message */}
        {publishComplete && (
          <Alert className="bg-green-50 border-green-200 mt-4">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              {selectedAccountIds.length > 0
                ? `Your reaction video has been ${accounts.some(acc => selectedAccountIds.includes(acc.id) && acc.provider.toLowerCase() === 'youtube') ? 'published to YouTube' : 'scheduled for publishing'} to ${selectedAccountIds.length} platform(s).`
                : "Your reaction video has been saved without publishing."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
