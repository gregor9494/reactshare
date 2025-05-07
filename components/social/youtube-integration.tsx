"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Youtube, RefreshCw, Loader2, AlertTriangle, Check } from 'lucide-react'
import { YouTubeAnalytics } from './youtube-analytics'
import useYouTubeAccount from '@/hooks/use-youtube-account'
import useYouTubeOAuth from '@/hooks/use-youtube-oauth'
import { formatDistanceToNow } from 'date-fns'

export function YouTubeIntegration() {
  const { youtubeAccount, channelData, isLoading, error, refreshChannel } = useYouTubeAccount()
  const { connectToYouTube, isConnecting } = useYouTubeOAuth()
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Format subscriber count with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  // Format the last refresh time
  const formatLastSync = (lastSyncAt: string | null): string => {
    if (!lastSyncAt) return 'Never'
    try {
      return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })
    } catch (e) {
      return 'Unknown'
    }
  }

  const handleRefresh = async () => {
    await refreshChannel()
  }

  // If we don't have a connected YouTube account, show a connect prompt
  if (!youtubeAccount) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            YouTube Integration
          </CardTitle>
          <CardDescription>Connect your YouTube channel to publish reaction videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 rounded-full bg-red-50 p-3">
              <Youtube className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="mb-2 text-xl font-medium">Connect YouTube</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Connect your YouTube account to publish reactions directly to your channel
            </p>
            <Button 
              onClick={connectToYouTube} 
              disabled={isConnecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Connect YouTube Channel
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-slate-50 px-6 py-3">
          <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
            <span>YouTube Data API v3</span>
            <a 
              href="https://developers.google.com/youtube/terms/developer-policies" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center hover:text-foreground"
            >
              YouTube API Terms →
            </a>
          </div>
        </CardFooter>
      </Card>
    )
  }

  // Get channel statistics
  const statistics = channelData?.statistics || {
    viewCount: 0,
    subscriberCount: 0,
    videoCount: 0
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            <CardTitle>YouTube Channel</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Manage your YouTube channel integration</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="h-16 w-16 rounded-full" />
          ) : (
            <img
              src={channelData?.thumbnails?.default?.url || '/placeholder-user.jpg'}
              alt="Channel Thumbnail"
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          
          <div>
            {isLoading ? (
              <>
                <Skeleton className="mb-2 h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">{channelData?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(parseInt(statistics.subscriberCount.toString()))} subscribers • 
                  Last synced {formatLastSync(youtubeAccount.last_sync_at)}
                </p>
              </>
            )}
          </div>

          {/* Connection status badge */}
          {youtubeAccount.status === 'active' ? (
            <div className="ml-auto flex items-center text-green-600">
              <Check className="mr-1 h-4 w-4" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="ml-auto flex items-center text-yellow-600">
              <AlertTriangle className="mr-1 h-4 w-4" />
              <span className="text-sm">{youtubeAccount.status}</span>
            </div>
          )}
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Total Views</h4>
                    <p className="text-2xl font-bold">{formatNumber(parseInt(statistics.viewCount.toString()))}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Subscribers</h4>
                    <p className="text-2xl font-bold">{formatNumber(parseInt(statistics.subscriberCount.toString()))}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Videos</h4>
                    <p className="text-2xl font-bold">{formatNumber(parseInt(statistics.videoCount.toString()))}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-lg font-medium">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="outline" className="justify-start" onClick={() => window.open(`https://studio.youtube.com`, '_blank')}>
                  <Youtube className="mr-2 h-4 w-4 text-red-600" />
                  Open YouTube Studio
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => window.open(`https://youtube.com/channel/${channelData?.id}`, '_blank')}>
                  <Youtube className="mr-2 h-4 w-4 text-red-600" />
                  View Channel
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="space-y-4">
              <YouTubeAnalytics />
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-lg font-medium">Default Privacy</h3>
                <Select defaultValue="private">
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select default privacy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Only you can see)</SelectItem>
                    <SelectItem value="unlisted">Unlisted (Anyone with the link)</SelectItem>
                    <SelectItem value="public">Public (Visible to everyone)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-muted-foreground">
                  This setting determines the default visibility of your YouTube uploads
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <h3 className="mb-3 text-lg font-medium text-destructive">Disconnect Account</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Disconnecting your YouTube account will revoke access permissions. You'll need to reconnect to upload videos.
                </p>
                <Button variant="destructive">
                  Disconnect YouTube Account
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}