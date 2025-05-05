"use client"

import { Progress } from "@/components/ui/progress"

export function AudienceInsights() {
  // Mock data - in a real app, this would come from an API
  const ageGroups = [
    { group: "18-24", percentage: 35 },
    { group: "25-34", percentage: 42 },
    { group: "35-44", percentage: 15 },
    { group: "45-54", percentage: 5 },
    { group: "55+", percentage: 3 },
  ]

  const genders = [
    { type: "Male", percentage: 65 },
    { type: "Female", percentage: 32 },
    { type: "Other", percentage: 3 },
  ]

  const locations = [
    { country: "United States", percentage: 45 },
    { country: "United Kingdom", percentage: 15 },
    { country: "Canada", percentage: 12 },
    { country: "Australia", percentage: 8 },
    { country: "Germany", percentage: 5 },
    { country: "Other", percentage: 15 },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Age Distribution</h3>
        <div className="space-y-2">
          {ageGroups.map((item) => (
            <div key={item.group} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{item.group}</span>
                <span>{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Gender</h3>
        <div className="space-y-2">
          {genders.map((item) => (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{item.type}</span>
                <span>{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Top Locations</h3>
        <div className="space-y-2">
          {locations.slice(0, 3).map((item) => (
            <div key={item.country} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{item.country}</span>
                <span>{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
