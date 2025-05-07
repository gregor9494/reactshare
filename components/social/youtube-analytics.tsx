"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from '@/components/ui/button'
import { SocialShare, YouTubeVideoAnalytics } from '@/lib/types'
import { BarChart, LineChart, PieChart } from '@/components/ui/chart'
import useSocialShares from '@/hooks/use-social-shares'
import { Eye, Check, MessageSquare, Share2, BarChart3, RefreshCw, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface YouTubeAnalyticsProps {
  shareId?: string;
  videoId?: string;
}

export function YouTubeAnalytics({ shareId, videoId }: YouTubeAnalyticsProps) {
  const { getAnalytics } = useSocialShares()
  const [analytics, setAnalytics] = useState<YouTubeVideoAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (shareId || videoId) {
      fetchAnalytics()
    }
  }, [shareId, videoId])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getAnalytics('youtube', shareId, videoId)
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      console.error('Error fetching YouTube analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p>Error loading analytics: {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAnalytics} 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Eye className="h-5 w-5 mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{analytics.views.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Check className="h-5 w-5 mb-2 text-green-500" />
            <div className="text-2xl font-bold">{analytics.likes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Likes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <MessageSquare className="h-5 w-5 mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{analytics.comments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Comments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Share2 className="h-5 w-5 mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{analytics.shares.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Shares</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="font-medium mb-2 flex items-center">
          <BarChart3 className="h-4 w-4 mr-1" /> Performance Over Time
        </h4>
        <Card>
          <CardContent className="pt-6">
            <div className="h-[200px]">
              <LineChart
                data={[
                  { name: 'Day 1', Views: Math.floor(analytics.views * 0.4) },
                  { name: 'Day 2', Views: Math.floor(analytics.views * 0.7) },
                  { name: 'Day 3', Views: Math.floor(analytics.views * 0.8) },
                  { name: 'Day 4', Views: Math.floor(analytics.views * 0.9) },
                  { name: 'Day 5', Views: analytics.views },
                ]}
                categories={['Views']}
                index="name"
                className="h-full"
                valueFormatter={(value) => `${value} views`}
                showAnimation
                showLegend
                showXAxis
                showYAxis
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.watchTime && (
        <Card>
          <CardHeader>
            <CardTitle>Watch Time</CardTitle>
            <CardDescription>
              Total time viewers spent watching this video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.watchTime.hours}h {analytics.watchTime.minutes}m {analytics.watchTime.seconds}s
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Average view duration: {analytics.averageViewDuration} seconds ({analytics.averageViewPercentage}%)
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchAnalytics}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Analytics
        </Button>
      </div>
    </div>
  )
}