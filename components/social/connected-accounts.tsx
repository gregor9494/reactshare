"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Twitch,
  TwitterIcon as TikTok,
  RefreshCw,
  Trash2,
  Plus,
} from "lucide-react"

export function ConnectedAccounts() {
  // Mock data - in a real app, this would come from an API
  const [accounts, setAccounts] = useState([
    {
      id: "1",
      platform: "YouTube",
      username: "ReactShareOfficial",
      connected: true,
      status: "active",
      lastSync: "2 hours ago",
      icon: Youtube,
      color: "text-red-600",
    },
    {
      id: "2",
      platform: "Instagram",
      username: "reactshare",
      connected: true,
      status: "active",
      lastSync: "1 day ago",
      icon: Instagram,
      color: "text-pink-600",
    },
    {
      id: "3",
      platform: "Twitter",
      username: "ReactShare",
      connected: true,
      status: "active",
      lastSync: "3 hours ago",
      icon: Twitter,
      color: "text-blue-400",
    },
    {
      id: "4",
      platform: "Facebook",
      username: "ReactShare Official",
      connected: true,
      status: "token_expired",
      lastSync: "5 days ago",
      icon: Facebook,
      color: "text-blue-600",
    },
    {
      id: "5",
      platform: "Twitch",
      username: "ReactShareLive",
      connected: true,
      status: "active",
      lastSync: "12 hours ago",
      icon: Twitch,
      color: "text-purple-600",
    },
    {
      id: "6",
      platform: "TikTok",
      username: "reactshare",
      connected: false,
      status: "disconnected",
      lastSync: "Never",
      icon: TikTok,
      color: "text-black",
    },
  ])

  const toggleConnection = (id: string) => {
    setAccounts(
      accounts.map((account) => (account.id === id ? { ...account, connected: !account.connected } : account)),
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Active
          </Badge>
        )
      case "token_expired":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            Token Expired
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 hover:bg-slate-100">
            Disconnected
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {accounts.map((account) => (
        <div key={account.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${account.color}`}>
              <account.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium">{account.platform}</h3>
              <p className="text-sm text-muted-foreground">@{account.username}</p>
            </div>
          </div>

          <div className="ml-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Last synced: {account.lastSync}</span>
              {getStatusBadge(account.status)}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={account.connected}
                onCheckedChange={() => toggleConnection(account.id)}
                disabled={account.status === "disconnected"}
              />
              <span className="text-sm">{account.connected ? "Enabled" : "Disabled"}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" title="Refresh connection">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to disconnect your {account.platform} account? This will remove all
                      permissions and you'll need to reconnect to publish content to this platform.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground">
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-3">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Connect a new account</h3>
          <p className="mt-2 text-sm text-muted-foreground">Add more social media accounts to expand your reach</p>
          <Button className="mt-4">Connect Account</Button>
        </div>
      </div>
    </div>
  )
}
