"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import useSocialAccounts from "@/hooks/use-social-accounts"

// Platform colors
const PLATFORM_COLORS = {
  YouTube: "#FF0000",
  TikTok: "#000000",
  Instagram: "#E1306C",
  Twitter: "#1DA1F2",
  Facebook: "#4267B2"
}

export function PlatformBreakdown() {
  const { accounts, isLoading: accountsLoading } = useSocialAccounts()
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'real_api' | 'fallback' | null>(null)

  useEffect(() => {
    async function fetchViewsData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const activeAccounts = accounts?.filter(account => account.status === 'active') || []
        
        // No connected accounts
        if (activeAccounts.length === 0) {
          setDataSource(null)
          setData([])
          return
        }
        
        // Fetch YouTube views if connected
        const youtubeAccount = activeAccounts.find(account => account.provider.toLowerCase() === 'youtube')
        let youtubeViews = 0
        
        if (youtubeAccount) {
          const youtubeResponse = await fetch('/api/social/youtube/analytics/performance')
          
          if (youtubeResponse.ok) {
            const youtubeData = await youtubeResponse.json()
            youtubeViews = youtubeData?.summaryStats?.totalViews || 0
          }
        }
        
        // Fetch TikTok views if connected
        const tiktokAccount = activeAccounts.find(account => account.provider.toLowerCase() === 'tiktok')
        let tiktokViews = 0
        
        if (tiktokAccount) {
          const tiktokResponse = await fetch('/api/social/tiktok/analytics')
          
          if (tiktokResponse.ok) {
            const tiktokData = await tiktokResponse.json()
            tiktokViews = tiktokData?.summaryStats?.totalViews || 0
          }
        }
        
        // Calculate total views from connected platforms
        const totalViews = youtubeViews + tiktokViews
        
        if (totalViews > 0) {
          // Real data - using actual view numbers
          setDataSource('real_api')
          
          const platformData = []
          
          if (youtubeViews > 0) {
            const youtubePercentage = Math.round((youtubeViews / totalViews) * 100)
            platformData.push({
              name: "YouTube",
              value: youtubePercentage,
              color: PLATFORM_COLORS.YouTube
            })
          }
          
          if (tiktokViews > 0) {
            const tiktokPercentage = Math.round((tiktokViews / totalViews) * 100)
            platformData.push({
              name: "TikTok",
              value: tiktokPercentage,
              color: PLATFORM_COLORS.TikTok
            })
          }
          
          setData(platformData)
        } else {
          // No real view data available
          setDataSource(null)
          setData([])
          return
        }
      } catch (err) {
        console.error("Error fetching platform breakdown data:", err)
        setError("Failed to load platform data.")
        setDataSource(null)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchViewsData()
  }, [accounts])

  if (isLoading || accountsLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isLoading && !accountsLoading && data.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">No analytics data available yet.</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      {error && (
        <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      
      {dataSource && dataSource === 'real_api' && (
        <div className="mb-2 text-xs flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          <span className="text-muted-foreground">Using real API data</span>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value }) => `${name} ${value}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
