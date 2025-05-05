import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Users, Eye, ThumbsUp, Share2 } from "lucide-react"

export function OverviewMetrics() {
  const metrics = [
    {
      title: "Total Views",
      value: "254.8K",
      change: "+12.3%",
      trend: "up",
      icon: Eye,
    },
    {
      title: "Unique Viewers",
      value: "86.4K",
      change: "+8.7%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Engagement Rate",
      value: "5.2%",
      change: "-0.4%",
      trend: "down",
      icon: ThumbsUp,
    },
    {
      title: "Shares",
      value: "12.5K",
      change: "+24.1%",
      trend: "up",
      icon: Share2,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <metric.icon className="h-5 w-5" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-500" : "text-red-500"}`}
              >
                {metric.change}
                {metric.trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{metric.title}</p>
              <p className="text-3xl font-bold">{metric.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
