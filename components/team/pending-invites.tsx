"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, XCircle } from "lucide-react"

export function PendingInvites() {
  // Mock data - in a real app, this would come from an API
  const invites = [
    {
      id: "1",
      email: "david@example.com",
      role: "Editor",
      sentAt: "2 days ago",
      expiresIn: "5 days",
    },
    {
      id: "2",
      email: "jessica@example.com",
      role: "Viewer",
      sentAt: "1 week ago",
      expiresIn: "1 day",
    },
    {
      id: "3",
      email: "robert@example.com",
      role: "Admin",
      sentAt: "3 hours ago",
      expiresIn: "6 days",
    },
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Admin":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
            Admin
          </Badge>
        )
      case "Editor":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            Editor
          </Badge>
        )
      case "Viewer":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
            Viewer
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {invites.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center rounded-md border">
          <p className="text-muted-foreground">No pending invites</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground">
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Sent</div>
            <div className="col-span-2">Expires</div>
            <div className="col-span-2">Actions</div>
          </div>

          {invites.map((invite) => (
            <div key={invite.id} className="grid grid-cols-12 items-center gap-4 border-t p-4">
              <div className="col-span-4">
                <p className="font-medium">{invite.email}</p>
              </div>

              <div className="col-span-2">{getRoleBadge(invite.role)}</div>

              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">{invite.sentAt}</span>
              </div>

              <div className="col-span-2">
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4 text-amber-500" />
                  <span className="text-sm">{invite.expiresIn}</span>
                </div>
              </div>

              <div className="col-span-2 flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Resend
                </Button>
                <Button variant="outline" size="icon" className="text-destructive">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-medium">Invite New Team Members</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Send invitations to colleagues to collaborate on your content
          </p>
          <Button className="mt-4">Send Invitations</Button>
        </div>
      </div>
    </div>
  )
}
