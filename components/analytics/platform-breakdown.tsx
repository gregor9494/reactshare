"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export function PlatformBreakdown() {
  // Mock data - in a real app, this would come from an API
  const data = [
    { name: "YouTube", value: 45, color: "#FF0000" },
    { name: "TikTok", value: 25, color: "#000000" },
    { name: "Instagram", value: 15, color: "#E1306C" },
    { name: "Twitter", value: 10, color: "#1DA1F2" },
    { name: "Facebook", value: 5, color: "#4267B2" },
  ]

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
