"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { BarChart3, Eye, Check, MessageSquare, Loader2, Smile, Share2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import useSocialAccounts from "@/hooks/use-social-accounts"
import TikTokIcon from "@/components/ui/icons/tiktok"
import { SocialAccount } from "@/lib/types"

// Define the video type
type Video = {
  id: string
  title: string
  thumbnail?: string
  views: number | string
  likes: number | string
  comments: number | string
  shares?: number | string
  published?: string
  platform: string
  platformIcon?: React.ReactNode
  url?: string
}

// Data source type
type DataSourceStatus = {
  youtube: 'real_api' | 'fallback' | 'unavailable'
  tiktok: 'real_api' | 'fallback' | 'unavailable'
}

export function TopContent() {
  const { accounts, isLoading: accountsLoading } = useSocialAccounts()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<DataSourceStatus>({
    youtube: 'unavailable',
    tiktok: 'unavailable'
  })

  useEffect(() => {
    async function fetchTopContent() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Check if we have connected accounts
        const activeAccounts = accounts?.filter(account => account.status === 'active') || []
        const youtubeAccount = activeAccounts.find(account => account.provider.toLowerCase() === 'youtube')
        const tiktokAccount = activeAccounts.find(account => account.provider.toLowerCase() === 'tiktok')
        
        let youtubeVideos: Video[] = []
        let tiktokVideos: Video[] = []
        const dataSourceStatus: DataSourceStatus = {
          youtube: 'unavailable',
          tiktok: 'unavailable'
        }
        
        // Fetch YouTube data if account is connected
        if (youtubeAccount) {
          try {
            const youtubeResponse = await fetch('/api/social/youtube/analytics/performance')
            
            if (youtubeResponse.ok) {
              const youtubeData = await youtubeResponse.json()
              
              // Check if we have top videos data from the API
              if (youtubeData?.videoPerformance && Array.isArray(youtubeData.videoPerformance) && youtubeData.videoPerformance.length > 0) {
                dataSourceStatus.youtube = youtubeData.source === 'real_api' ? 'real_api' : 'fallback'
                
                // Transform the data into our format
                youtubeVideos = youtubeData.videoPerformance.map((video: any, index: number) => ({
                  id: video.id || `yt-${index}`,
                  title: video.title || `YouTube Video ${index + 1}`,
                  thumbnail: video.thumbnail || `/placeholder.svg?key=yt-${index}`,
                  views: video.views || 0,
                  likes: video.likes || 0,
                  comments: video.comments || 0,
                  shares: video.shares || 0,
                  published: video.posted || '2 weeks ago',
                  platform: 'YouTube',
                  platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                  url: video.url || `https://youtube.com/watch?v=${video.id}`
                }))
              } else {
                dataSourceStatus.youtube = 'fallback'
              }
            } else {
              dataSourceStatus.youtube = 'fallback'
            }
          } catch (err) {
            console.error("Error fetching YouTube data:", err)
            dataSourceStatus.youtube = 'fallback'
          }
        }
        
        // Fetch TikTok data if account is connected
        if (tiktokAccount) {
          try {
            const tiktokResponse = await fetch('/api/social/tiktok/analytics')
            
            if (tiktokResponse.ok) {
              const tiktokData = await tiktokResponse.json()
              
              // Check if we have video performance data
              if (tiktokData?.videoPerformance && Array.isArray(tiktokData.videoPerformance) && tiktokData.videoPerformance.length > 0) {
                dataSourceStatus.tiktok = tiktokData.source === 'real_api' ? 'real_api' : 'fallback'
                
                // Transform the data into our format
                tiktokVideos = tiktokData.videoPerformance.map((video: any, index: number) => ({
                  id: video.id || `tt-${index}`,
                  title: video.title || video.description || `TikTok Video ${index + 1}`,
                  thumbnail: video.thumbnail || `/placeholder.svg?key=tt-${index}`,
                  views: video.views || 0,
                  likes: video.likes || 0,
                  comments: video.comments || 0,
                  shares: video.shares || 0,
                  published: video.posted || '2 weeks ago',
                  platform: 'TikTok',
                  platformIcon: <TikTokIcon className="h-4 w-4" />,
                  url: video.url
                }))
              } else {
                dataSourceStatus.tiktok = 'fallback'
              }
            } else {
              dataSourceStatus.tiktok = 'fallback'
            }
          } catch (err) {
            console.error("Error fetching TikTok data:", err)
            dataSourceStatus.tiktok = 'fallback'
          }
        }
        
        setDataSource(dataSourceStatus)
        
        // Always use the best data available, fallback if necessary
        // NOTE: No longer exiting early if there's no real API data
        
        // Combine videos from both platforms
        let allVideos: Video[] = []
        
        if (youtubeVideos.length > 0 || tiktokVideos.length > 0) {
          // Combine actual fetched videos
          allVideos = [...youtubeVideos, ...tiktokVideos]
        } else if (youtubeAccount || tiktokAccount) {
          // We have connected accounts but no video data - use fallback data for connected platforms
          if (youtubeAccount) {
            allVideos.push(
              {
                id: "yt-1",
                title: "How to Use ReactShare for YouTube Growth",
                thumbnail: "/placeholder.svg?key=yt-fallback-1",
                views: "24.5K",
                likes: "1.8K",
                comments: "342",
                shares: "156",
                platform: "YouTube",
                platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              },
              {
                id: "yt-2",
                title: "My Thoughts on the New iPhone",
                thumbnail: "/placeholder.svg?key=yt-fallback-2",
                views: "18.2K",
                likes: "1.2K",
                comments: "256",
                shares: "89",
                platform: "YouTube",
                platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              }
            )
          }
          
          if (tiktokAccount) {
            allVideos.push(
              {
                id: "tt-1",
                title: "Quick React Hacks Every Developer Should Know",
                thumbnail: "/placeholder.svg?key=tt-fallback-1",
                views: "52.3K",
                likes: "5.4K",
                comments: "321",
                shares: "1.2K",
                platform: "TikTok",
                platformIcon: <TikTokIcon className="h-4 w-4" />
              },
              {
                id: "tt-2",
                title: "Coding Challenge: Build This in 60 Seconds",
                thumbnail: "/placeholder.svg?key=tt-fallback-2",
                views: "38.7K",
                likes: "4.2K",
                comments: "178",
                shares: "856",
                platform: "TikTok",
                platformIcon: <TikTokIcon className="h-4 w-4" />
              }
            )
          }
        } else {
          // No connected accounts - use complete fallback data
          allVideos = [
            {
              id: "1",
              title: "Reacting to Viral TikTok Trends",
              thumbnail: "/placeholder.svg?key=12s2y",
              views: "24.5K",
              likes: "1.8K",
              comments: "342",
              shares: "156",
              platform: "YouTube",
              platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            },
            {
              id: "2",
              title: "My Thoughts on the New iPhone",
              thumbnail: "/placeholder.svg?key=lki21",
              views: "18.2K",
              likes: "1.2K",
              comments: "256",
              shares: "89",
              platform: "YouTube",
              platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            },
            {
              id: "3",
              title: "Quick React Hacks Every Developer Should Know",
              thumbnail: "/placeholder.svg?key=ad804",
              views: "52.3K",
              likes: "5.4K",
              comments: "321",
              shares: "1.2K",
              platform: "TikTok",
              platformIcon: <TikTokIcon className="h-4 w-4" />
            },
            {
              id: "4",
              title: "Coding Challenge: Build This in 60 Seconds",
              thumbnail: "/placeholder.svg?key=dxot2",
              views: "38.7K",
              likes: "4.2K",
              comments: "178",
              shares: "856",
              platform: "TikTok",
              platformIcon: <TikTokIcon className="h-4 w-4" />
            },
          ]
        }
        
        // Sort by views (converting to numbers if they're strings)
        const sortedVideos = allVideos
          .map(video => ({
            ...video,
            views: typeof video.views === 'string' ? parseFloat(video.views.replace(/[^0-9.]/g, '')) : video.views,
            likes: typeof video.likes === 'string' ? parseFloat(video.likes.replace(/[^0-9.]/g, '')) : video.likes,
            comments: typeof video.comments === 'string' ? parseFloat(video.comments.replace(/[^0-9.]/g, '')) : video.comments,
            shares: video.shares ? (typeof video.shares === 'string' ? parseFloat(video.shares.replace(/[^0-9.]/g, '')) : video.shares) : 0
          }))
          .sort((a, b) => Number(b.views) - Number(a.views))
          .slice(0, 4) // Take top 4 videos
        
        setVideos(sortedVideos)
      } catch (err) {
        console.error("Error fetching top content:", err)
        setError("Failed to load content data. Using fallback data instead.")
        
        // Set complete fallback data
        setVideos([
          {
            id: "1",
            title: "Reacting to Viral TikTok Trends",
            thumbnail: "/placeholder.svg?key=12s2y",
            views: "24.5K",
            likes: "1.8K",
            comments: "342",
            shares: "156",
            platform: "YouTube",
            platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          },
          {
            id: "2",
            title: "My Thoughts on the New iPhone",
            thumbnail: "/placeholder.svg?key=lki21",
            views: "18.2K",
            likes: "1.2K",
            comments: "256",
            shares: "89",
            platform: "YouTube",
            platformIcon: <svg className="h-4 w-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          },
          {
            id: "3",
            title: "Quick React Hacks Every Developer Should Know",
            thumbnail: "/placeholder.svg?key=ad804",
            views: "52.3K",
            likes: "5.4K",
            comments: "321",
            shares: "1.2K",
            platform: "TikTok",
            platformIcon: <TikTokIcon className="h-4 w-4" />
          },
          {
            id: "4",
            title: "Coding Challenge: Build This in 60 Seconds",
            thumbnail: "/placeholder.svg?key=dxot2",
            views: "38.7K",
            likes: "4.2K",
            comments: "178",
            shares: "856",
            platform: "TikTok",
            platformIcon: <TikTokIcon className="h-4 w-4" />
          },
        ])
        
        setDataSource({
          youtube: 'fallback',
          tiktok: 'fallback'
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!accountsLoading) {
      fetchTopContent()
    }
  }, [accounts, accountsLoading])

  // Format numbers for display
  const formatNumber = (num: number | string): string => {
    if (typeof num === 'string') return num
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // Determine data source status text
  const getDataSourceText = () => {
    const { youtube, tiktok } = dataSource
    
    if (youtube === 'unavailable' && tiktok === 'unavailable') {
      return 'No connected social accounts'
    }
    
    if (youtube === 'real_api' && tiktok === 'real_api') {
      return 'Using real YouTube and TikTok data'
    }
    
    if (youtube === 'real_api' && tiktok === 'fallback') {
      return 'Using real YouTube data and estimated TikTok data'
    }
    
    if (youtube === 'fallback' && tiktok === 'real_api') {
      return 'Using estimated YouTube data and real TikTok data'
    }
    
    // For individual platforms
    if (youtube !== 'unavailable' && tiktok === 'unavailable') {
      return youtube === 'real_api' ? 'Using real YouTube data' : 'Using estimated YouTube data'
    }
    
    if (tiktok !== 'unavailable' && youtube === 'unavailable') {
      return tiktok === 'real_api' ? 'Using real TikTok data' : 'Using estimated TikTok data'
    }
    
    return 'Using estimated data'
  }
  
  // Determine badge color
  const getDataSourceBadgeColor = () => {
    const { youtube, tiktok } = dataSource
    
    // If at least one platform has real API data
    if (youtube === 'real_api' || tiktok === 'real_api') {
      return 'bg-green-500'
    }
    
    return 'bg-amber-500'
  }

  if (isLoading || accountsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Content</CardTitle>
          <CardDescription>Your best-performing videos across platforms</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Content</CardTitle>
        <CardDescription>Your best-performing videos across platforms</CardDescription>
        
        {error && (
          <Alert variant="default" className="mt-2 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="text-xs flex items-center mt-2">
          <span className={`w-2 h-2 rounded-full mr-1 ${getDataSourceBadgeColor()}`}></span>
          <span className="text-muted-foreground">
            {getDataSourceText()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {videos.length > 0 ? videos.map((video) => (
            <div key={video.id} className="flex items-center gap-4">
              <div className="relative h-[60px] w-[107px] overflow-hidden rounded-md">
                <Image
                  src={video.thumbnail || "/placeholder.svg"}
                  alt={video.title}
                  width={107}
                  height={60}
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium line-clamp-1">
                  {video.url ? (
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {video.title}
                    </a>
                  ) : (
                    video.title
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {video.platformIcon && <span className="mr-1">{video.platformIcon}</span>}
                  {video.platform}
                  {video.published && <span className="ml-2 text-xs opacity-70">· {video.published}</span>}
                </p>
              </div>
              <div className="flex gap-3 text-muted-foreground text-xs">
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{formatNumber(video.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Smile className="h-3.5 w-3.5" />
                  <span>{formatNumber(video.likes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{formatNumber(video.comments)}</span>
                </div>
                {video.shares && (
                  <div className="flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{formatNumber(video.shares)}</span>
                  </div>
                )}
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          )) : (
            <div className="py-10 text-center text-muted-foreground">
              No content data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
