"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduledCalendar } from "@/components/scheduled/scheduled-calendar"
import { ScheduledList } from "@/components/scheduled/scheduled-list"
import { CalendarIcon, Clock, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ScheduledPage() {
  const [activeTab, setActiveTab] = useState<string>("calendar")
  const router = useRouter()

  return (
    <main className="flex w-full flex-col overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scheduled Posts</h1>
              <p className="text-muted-foreground">Manage your upcoming content releases</p>
            </div>
            <Button onClick={() => router.push('/dashboard/post')}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule New Post
            </Button>
          </div>

          <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="calendar">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Calendar View
                </TabsTrigger>
                <TabsTrigger value="list">
                  <Clock className="mr-2 h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>

              {/* Calendar navigation buttons are now handled within the ScheduledCalendar component */}
            </div>

            <TabsContent value="calendar" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                  <CardDescription>Your scheduled content organized by date</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduledCalendar />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>List View</CardTitle>
                  <CardDescription>All your scheduled content in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduledList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </main>
  )
}
