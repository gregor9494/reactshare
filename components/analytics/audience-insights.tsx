"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Define types for our data
type AgeGroup = { group: string; percentage: number }
type Gender = { type: string; percentage: number }
type Location = { country: string; percentage: number }

export function AudienceInsights() {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [genders, setGenders] = useState<Gender[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'real_api' | 'fallback' | null>(null)

  useEffect(() => {
    async function fetchDemographicData() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch YouTube performance data which includes demographics
        const youtubeResponse = await fetch('/api/social/youtube/analytics/performance')
        
        if (!youtubeResponse.ok) {
          throw new Error('Failed to fetch YouTube demographic data')
        }
        
        const youtubeData = await youtubeResponse.json()
        
        // Check if we have demographics data
        if (youtubeData && youtubeData.demographics) {
          // Determine if we're getting real or fallback data
          setDataSource(youtubeData.source === 'real_api' ? 'real_api' : 'fallback')
          
          // Transform age groups data
          if (youtubeData.demographics.ageGroups) {
            setAgeGroups(youtubeData.demographics.ageGroups.map((item: any) => ({
              group: item.group,
              percentage: item.percentage
            })))
          }
          
          // Transform gender data
          if (youtubeData.demographics.genderSplit) {
            const genderData = youtubeData.demographics.genderSplit
            setGenders([
              { type: "Male", percentage: genderData.male },
              { type: "Female", percentage: genderData.female },
              { type: "Other", percentage: genderData.other },
            ])
          }
          
          // Transform location data
          if (youtubeData.demographics.topCountries) {
            setLocations(youtubeData.demographics.topCountries.map((item: any) => ({
              country: item.country,
              percentage: item.percentage
            })))
          }
        } else {
          // If we don't have demographics data, fall back to mock data
          setDataSource('fallback')
          setDefaultMockData()
        }
      } catch (err) {
        console.error("Error fetching demographic data:", err)
        setError("Failed to load demographic data. Using fallback data instead.")
        setDataSource('fallback')
        setDefaultMockData()
      } finally {
        setIsLoading(false)
      }
    }

    fetchDemographicData()
  }, [])

  // Function to set default mock data
  const setDefaultMockData = () => {
    setAgeGroups([
      { group: "18-24", percentage: 35 },
      { group: "25-34", percentage: 42 },
      { group: "35-44", percentage: 15 },
      { group: "45-54", percentage: 5 },
      { group: "55+", percentage: 3 },
    ])

    setGenders([
      { type: "Male", percentage: 65 },
      { type: "Female", percentage: 32 },
      { type: "Other", percentage: 3 },
    ])

    setLocations([
      { country: "United States", percentage: 45 },
      { country: "United Kingdom", percentage: 15 },
      { country: "Canada", percentage: 12 },
      { country: "Australia", percentage: 8 },
      { country: "Germany", percentage: 5 },
      { country: "Other", percentage: 15 },
    ])
  }

  if (isLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {dataSource && dataSource === 'fallback' && !error && (
        <div className="mb-2 text-xs flex items-center">
          <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
          <span className="text-muted-foreground">Using estimated data</span>
        </div>
      )}
      
      {dataSource && dataSource === 'real_api' && (
        <div className="mb-2 text-xs flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          <span className="text-muted-foreground">Using real API data</span>
        </div>
      )}
      
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
