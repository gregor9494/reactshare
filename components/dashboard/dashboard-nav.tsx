import Link from "next/link"
import { BarChart3, Camera, Clock, Cloud, Home, Settings, Share2, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardNav() {
  return (
    <div className="flex h-full flex-col border-r px-2 py-4">
      <div className="space-y-1">
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/dashboard/create">
          <Button variant="ghost" className="w-full justify-start">
            <Camera className="mr-2 h-4 w-4" />
            Create Reaction
          </Button>
        </Link>
        <Link href="/dashboard/post">
          <Button variant="ghost" className="w-full justify-start">
            <Plus className="mr-2 h-4 w-4" />
            Post
          </Button>
        </Link>
        <Link href="/dashboard/library">
          <Button variant="ghost" className="w-full justify-start">
            <Cloud className="mr-2 h-4 w-4" />
            Video Library
          </Button>
        </Link>
        <Link href="/dashboard/analytics">
          <Button variant="ghost" className="w-full justify-start">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
        </Link>
        <Link href="/dashboard/scheduled">
          <Button variant="ghost" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            Scheduled
          </Button>
        </Link>
        <Link href="/dashboard/social">
          <Button variant="ghost" className="w-full justify-start">
            <Share2 className="mr-2 h-4 w-4" />
            Social Accounts
          </Button>
        </Link>
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  )
}
