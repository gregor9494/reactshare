import { Camera, Share2, Edit, BarChart3, Clock, Cloud } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FeatureSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">All-in-One Reaction Video Platform</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Create, edit, and distribute reaction videos across multiple social platforms in minutes, not hours.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Camera className="h-6 w-6" />
              <CardTitle>Record Reactions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Record your reactions with picture-in-picture preview, multiple camera support, and real-time audio
                monitoring.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Edit className="h-6 w-6" />
              <CardTitle>Quick Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Trim footage, add text overlays, insert emojis, adjust colors, and preview your edits in real-time.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Share2 className="h-6 w-6" />
              <CardTitle>Multi-Platform Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Publish to YouTube, TikTok, Instagram, Twitter, Facebook, and Twitch with a single click.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track performance across all platforms with comprehensive analytics and audience insights.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Clock className="h-6 w-6" />
              <CardTitle>Scheduled Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Schedule your content for optimal posting times with platform-specific recommendations.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Cloud className="h-6 w-6" />
              <CardTitle>Cloud Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Store all your reactions in the cloud with easy search, filter, and organization tools.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
