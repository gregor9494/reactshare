"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Mail, MessageSquare, Crown, Shield, User, UserX } from "lucide-react"

export function TeamMembers() {
  // Mock data - in a real app, this would come from an API
  const [members, setMembers] = useState([
    {
      id: "1",
      name: "Alex Johnson",
      email: "alex@reactshare.com",
      role: "Owner",
      avatar: "/diverse-group.png",
      status: "active",
      lastActive: "Just now",
    },
    {
      id: "2",
      name: "Sarah Williams",
      email: "sarah@reactshare.com",
      role: "Admin",
      avatar: "/diverse-group.png",
      status: "active",
      lastActive: "2 hours ago",
    },
    {
      id: "3",
      name: "Michael Chen",
      email: "michael@reactshare.com",
      role: "Editor",
      avatar: "/diverse-group.png",
      status: "active",
      lastActive: "1 day ago",
    },
    {
      id: "4",
      name: "Emily Rodriguez",
      email: "emily@reactshare.com",
      role: "Viewer",
      avatar: "/diverse-group.png",
      status: "inactive",
      lastActive: "2 weeks ago",
    },
  ])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Owner":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            <Crown className="mr-1 h-3 w-3" />
            Owner
          </Badge>
        )
      case "Admin":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        )
      case "Editor":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            <User className="mr-1 h-3 w-3" />
            Editor
          </Badge>
        )
      case "Viewer":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
            <User className="mr-1 h-3 w-3" />
            Viewer
          </Badge>
        )
      default:
        return null
    }
  }

  const getStatusIndicator = (status: string) => {
    return (
      <span className={`mr-2 h-2 w-2 rounded-full ${status === "active" ? "bg-green-500" : "bg-slate-300"}`}></span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Input placeholder="Search team members..." className="max-w-sm" />
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Team Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Invite a new member to join your team. They will receive an email invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="colleague@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Input id="message" placeholder="Join our team!" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground">
          <div className="col-span-5">User</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-1">Actions</div>
        </div>

        {members.map((member) => (
          <div key={member.id} className="grid grid-cols-12 items-center gap-4 border-t p-4">
            <div className="col-span-5 flex items-center gap-3">
              <Image
                src={member.avatar || "/placeholder.svg"}
                alt={member.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>

            <div className="col-span-3">{getRoleBadge(member.role)}</div>

            <div className="col-span-3 flex items-center">
              {getStatusIndicator(member.status)}
              <span className="text-sm text-muted-foreground">{member.lastActive}</span>
            </div>

            <div className="col-span-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <UserX className="mr-2 h-4 w-4" />
                    Remove User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
