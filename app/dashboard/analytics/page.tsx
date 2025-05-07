import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// DashboardHeader and DashboardNav are provided by the layout
import { OverviewMetrics } from "@/components/analytics/overview-metrics"
import { PerformanceChart } from "@/components/analytics/performance-chart"
import { PlatformBreakdown } from "@/components/analytics/platform-breakdown"
import { AudienceInsights } from "@/components/analytics/audience-insights"
import { TopContent } from "@/components/analytics/top-content"
import { Download, Calendar } from "lucide-react"

export default function AnalyticsPage() {
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

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 py-4">
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

            <TabsContent value="audience" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audience Demographics</CardTitle>
                  <CardDescription>Detailed breakdown of your audience</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] items-center justify-center">
                    <p className="text-muted-foreground">Detailed audience analytics will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Performance</CardTitle>
                  <CardDescription>Analytics for individual videos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] items-center justify-center">
                    <p className="text-muted-foreground">Content performance analytics will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platforms" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics</CardTitle>
                  <CardDescription>Performance across different social platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] items-center justify-center">
                    <p className="text-muted-foreground">Platform-specific analytics will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>Likes, comments, shares, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] items-center justify-center">
                    <p className="text-muted-foreground">Engagement analytics will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </div>
  )
}
