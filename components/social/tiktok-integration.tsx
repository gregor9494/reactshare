"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Loader2, AlertTriangle, Check } from 'lucide-react'
import TikTokIcon from '@/components/ui/icons/tiktok'
import TikTokAnalytics from './tiktok-analytics'
import { useTikTokAccount } from '@/hooks/use-tiktok-account'
import { formatDistanceToNow } from 'date-fns'

export function TikTokIntegration() {
  const { account: tiktokAccount, loading: isLoading, error, refreshAccount: refreshProfile } = useTikTokAccount()
  const profileData = tiktokAccount?.profile_data || null
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Format large numbers with commas
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
    await refreshProfile()
  }

  // If we don't have a connected TikTok account, show a connect prompt
  if (!tiktokAccount) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TikTokIcon className="h-5 w-5" />
            TikTok Integration
          </CardTitle>
          <CardDescription>Connect your TikTok account to publish reaction videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 rounded-full bg-black/5 p-3">
              <TikTokIcon className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-medium">Connect TikTok</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Connect your TikTok account to publish reactions directly to your profile
            </p>
            <Button 
              onClick={() => window.location.href = '/api/auth/providers/tiktok/connect'}
              className="bg-black hover:bg-black/80"
            >
              <TikTokIcon className="mr-2 h-4 w-4" />
              Connect TikTok Account
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-slate-50 px-6 py-3">
          <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
            <span>TikTok API</span>
            <a 
              href="https://developers.tiktok.com/doc/login-kit-web" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center hover:text-foreground"
            >
              TikTok API Terms →
            </a>
          </div>
        </CardFooter>
      </Card>
    )
  }

  // Get TikTok statistics
  const statistics = profileData?.stats || {
    followingCount: 0,
    followerCount: 0,
    heartCount: 0,
    videoCount: 0
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TikTokIcon className="h-5 w-5" />
            <CardTitle>TikTok Account</CardTitle>
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
        <CardDescription>Manage your TikTok account integration</CardDescription>
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
              src={profileData?.avatarUrl || '/placeholder-user.jpg'} 
              alt="Profile Avatar" 
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
                <h3 className="text-lg font-medium">@{profileData?.username || 'username'}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(statistics.followerCount)} followers • 
                  Last synced {formatLastSync(tiktokAccount.last_sync_at)}
                </p>
              </>
            )}
          </div>

          {/* Connection status badge */}
          {tiktokAccount.status === 'active' ? (
            <div className="ml-auto flex items-center text-green-600">
              <Check className="mr-1 h-4 w-4" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="ml-auto flex items-center text-yellow-600">
              <AlertTriangle className="mr-1 h-4 w-4" />
              <span className="text-sm">{tiktokAccount.status}</span>
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
                    <h4 className="text-sm font-medium text-muted-foreground">Followers</h4>
                    <p className="text-2xl font-bold">{formatNumber(statistics.followerCount)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Following</h4>
                    <p className="text-2xl font-bold">{formatNumber(statistics.followingCount)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Hearts</h4>
                    <p className="text-2xl font-bold">{formatNumber(statistics.heartCount)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-lg font-medium">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="outline" className="justify-start" onClick={() => window.open(`https://www.tiktok.com/@${profileData?.username}`, '_blank')}>
                  <TikTokIcon className="mr-2 h-4 w-4" />
                  View TikTok Profile
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => window.open('https://www.tiktok.com/creator-center/analytics', '_blank')}>
                  <TikTokIcon className="mr-2 h-4 w-4" />
                  Open Creator Center
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="space-y-6">
              <TikTokAccountAnalytics account={tiktokAccount} isLoading={isLoading} />
              <div className="text-center pt-3 border-t">
                <p className="text-muted-foreground mb-4">
                  For per-post analytics, view your account activity
                </p>
                <Button variant="outline" onClick={() => window.location.href = "/dashboard/social"}>
                  <TikTokIcon className="mr-2 h-4 w-4" />
                  View Account Activity
                </Button>
              </div>
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
                    <SelectItem value="public">Public (Visible to everyone)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-muted-foreground">
                  This setting determines the default visibility of your TikTok uploads
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <h3 className="mb-3 text-lg font-medium text-destructive">Disconnect Account</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Disconnecting your TikTok account will revoke access permissions. You'll need to reconnect to upload videos.
                </p>
                <Button variant="destructive">
                  Disconnect TikTok Account
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}