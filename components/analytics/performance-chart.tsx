"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function PerformanceChart() {
  // Mock data - in a real app, this would come from an API
  const data = [
    { date: "Jan 1", views: 4000, engagement: 2400 },
    { date: "Jan 5", views: 3000, engagement: 1398 },
    { date: "Jan 10", views: 2000, engagement: 9800 },
    { date: "Jan 15", views: 2780, engagement: 3908 },
    { date: "Jan 20", views: 1890, engagement: 4800 },
    { date: "Jan 25", views: 2390, engagement: 3800 },
    { date: "Jan 30", views: 3490, engagement: 4300 },
  ]

  return (
    <div className="h-[300px] w-full">
      <ChartContainer
        config={{
          views: {
            label: "Views",
            color: "hsl(var(--chart-1))",
          },
          engagement: {
            label: "Engagement",
            color: "hsl(var(--chart-2))",
          },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} />
            <Line type="monotone" dataKey="engagement" stroke="var(--color-engagement)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
