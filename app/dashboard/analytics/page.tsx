"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
// DashboardHeader and DashboardNav are provided by the layout
import { OverviewMetrics } from "@/components/analytics/overview-metrics"
import { PerformanceChart } from "@/components/analytics/performance-chart"
import { PlatformBreakdown } from "../../../components/analytics/platform-breakdown" // Changed to relative path
import { AudienceInsights } from "@/components/analytics/audience-insights"
import { TopContent } from "@/components/analytics/top-content"
import { PlatformAnalytics } from "../../../components/analytics/platform-analytics"
import { AlertTriangle, Download, Calendar, RefreshCw } from "lucide-react" // Changed to AlertTriangle
import useSocialAccounts from "@/hooks/use-social-accounts"

export default function AnalyticsPage() {
  const { accounts, isLoading: accountsLoading } = useSocialAccounts()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  // hasConnectedAccounts state is kept for the refresh button,
  // but the alert will use a more direct derivation.
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(false)

  useEffect(() => {
    // This effect primarily updates hasConnectedAccounts for the refresh button's disabled state.
    if (accounts) { // Check if accounts is not undefined
      const activeAccounts = accounts.filter(account => account.status === 'active');
      setHasConnectedAccounts(activeAccounts.length > 0);
    } else {
      setHasConnectedAccounts(false); // Set to false if accounts is null/undefined
    }
  }, [accounts]);

  // Handle refreshing all analytics data
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true)
      
      // Create an array of promises for fetching data from all endpoints
      const fetchPromises = [
        fetch('/api/social/youtube/analytics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }),
        fetch('/api/social/tiktok/analytics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }),
        fetch('/api/social/youtube/analytics/performance', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }),
        fetch('/api/social/youtube/analytics/growth', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }),
        fetch('/api/social/tiktok/analytics/account', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        })
      ]
      
      // Execute all fetches in parallel
      await Promise.allSettled(fetchPromises)
      
      // Update the last refreshed timestamp
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error refreshing analytics data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    // The main div and header/nav structure are provided by DashboardLayout
    // We only need to render the content specific to the analytics page here
    <div className="flex w-full flex-col overflow-hidden">
      {/* The outer container with grid for nav is in DashboardLayout */}
      {/* The aside for DashboardNav is in DashboardLayout */}
      {/* The main tag is also in DashboardLayout, this div becomes its direct child */}
      
      {/* Page-specific header/title section */}
      <div className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track performance across all your platforms</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing || !hasConnectedAccounts}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {!accountsLoading && (!accounts || accounts.filter(acc => acc.status === 'active').length === 0) && (
        <Alert variant="default" className="mb-4 border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-700"> {/* Changed to default and added warning-like styling */}
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have any social accounts connected.{' '}
            <a href="/dashboard/social" className="underline font-medium">
              Connect your accounts
            </a>{' '}
            to start seeing analytics.
          </AlertDescription>
        </Alert>
      )}

      {lastRefreshed && (
        <div className="text-xs text-muted-foreground mb-2">
          Last refreshed: {lastRefreshed.toLocaleString()}
        </div>
      )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 py-4" key={`overview-${lastRefreshed?.toISOString()}`}>
              <OverviewMetrics />

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                    <CardDescription>Views and engagement across all platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceChart />
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Platform Breakdown</CardTitle>
                    <CardDescription>Distribution of views by platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlatformBreakdown />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Audience Insights</CardTitle>
                    <CardDescription>Demographics and viewer information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AudienceInsights />
                  </CardContent>
                </Card>

                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>Your most successful reaction videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopContent />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="audience" className="py-4" key={`audience-${lastRefreshed?.toISOString()}`}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Audience Demographics</CardTitle>
                    <CardDescription>Age, gender and location breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AudienceInsights />
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Audience Growth</CardTitle>
                    <CardDescription>New subscribers/followers over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <PerformanceChart />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="py-4" key={`content-${lastRefreshed?.toISOString()}`}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>Your most successful videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopContent />
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Content Categories</CardTitle>
                    <CardDescription>Performance by video category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <PlatformBreakdown />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="platforms" className="py-4" key={`platforms-${lastRefreshed?.toISOString()}`}>
              <PlatformAnalytics />
            </TabsContent>

            <TabsContent value="engagement" className="py-4" key={`engagement-${lastRefreshed?.toISOString()}`}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Engagement Metrics</CardTitle>
                    <CardDescription>Likes, comments, shares, and more</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OverviewMetrics />
                  </CardContent>
                </Card>

                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Engagement Over Time</CardTitle>
                    <CardDescription>Trends in audience interaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
    </div>
  )
}
