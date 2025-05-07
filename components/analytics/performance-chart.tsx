"use client"

import { LineChart } from "@/components/ui/chart";

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
  ];

  const chartCategories = ["views", "engagement"];

  return (
    <div className="h-[300px] w-full">
      <LineChart
        data={data}
        index="date" // Corresponds to XAxis dataKey
        categories={chartCategories} // Corresponds to Line dataKeys
        // The LineChart wrapper from ui/chart.tsx handles its own styling,
        // tooltip, legend, and colors. You can pass props to customize it further if needed.
        // For example:
        // colors={["#yourViewColor", "#yourEngagementColor"]}
        // valueFormatter={(value) => `${value.toLocaleString()} units`}
      />
    </div>
  );
}
