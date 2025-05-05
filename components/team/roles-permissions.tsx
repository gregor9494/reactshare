"use client"

import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Shield, User, Info } from "lucide-react"

export function RolesPermissions() {
  const roles = [
    {
      id: "owner",
      name: "Owner",
      description: "Full access to all resources",
      icon: Crown,
      color: "text-amber-500",
      badge: "bg-amber-50 text-amber-700",
    },
    {
      id: "admin",
      name: "Admin",
      description: "Administrative access to most resources",
      icon: Shield,
      color: "text-purple-500",
      badge: "bg-purple-50 text-purple-700",
    },
    {
      id: "editor",
      name: "Editor",
      description: "Can create and edit content",
      icon: User,
      color: "text-blue-500",
      badge: "bg-blue-50 text-blue-700",
    },
    {
      id: "viewer",
      name: "Viewer",
      description: "Read-only access to content",
      icon: User,
      color: "text-slate-500",
      badge: "bg-slate-100 text-slate-700",
    },
  ]

  const permissions = [
    {
      category: "Content Management",
      items: [
        { name: "Create reactions", owner: true, admin: true, editor: true, viewer: false },
        { name: "Edit reactions", owner: true, admin: true, editor: true, viewer: false },
        { name: "Delete reactions", owner: true, admin: true, editor: false, viewer: false },
        { name: "View reactions", owner: true, admin: true, editor: true, viewer: true },
      ],
    },
    {
      category: "Team Management",
      items: [
        { name: "Invite team members", owner: true, admin: true, editor: false, viewer: false },
        { name: "Remove team members", owner: true, admin: true, editor: false, viewer: false },
        { name: "Manage roles", owner: true, admin: false, editor: false, viewer: false },
      ],
    },
    {
      category: "Social Accounts",
      items: [
        { name: "Connect accounts", owner: true, admin: true, editor: false, viewer: false },
        { name: "Publish content", owner: true, admin: true, editor: true, viewer: false },
        { name: "View analytics", owner: true, admin: true, editor: true, viewer: true },
      ],
    },
    {
      category: "Billing & Subscription",
      items: [
        { name: "View billing details", owner: true, admin: true, editor: false, viewer: false },
        { name: "Change subscription", owner: true, admin: false, editor: false, viewer: false },
        { name: "Manage payment methods", owner: true, admin: false, editor: false, viewer: false },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="roles">Role Descriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-6">
          <div className="rounded-md border">
            <div className="grid grid-cols-6 gap-4 p-4 font-medium text-muted-foreground">
              <div className="col-span-2">Permission</div>
              {roles.map((role) => (
                <div key={role.id} className="col-span-1 text-center">
                  <Badge variant="outline" className={`${role.badge} hover:${role.badge}`}>
                    <role.icon className="mr-1 h-3 w-3" />
                    {role.name}
                  </Badge>
                </div>
              ))}
            </div>

            {permissions.map((category) => (
              <div key={category.category}>
                <div className="border-t bg-muted/50 p-2 px-4 font-medium">{category.category}</div>
                {category.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-6 items-center gap-4 border-t p-4">
                    <div className="col-span-2">{item.name}</div>
                    <div className="col-span-1 flex justify-center">
                      <Switch checked={item.owner} disabled />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Switch checked={item.admin} disabled />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Switch checked={item.editor} disabled />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Switch checked={item.viewer} disabled />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="rounded-md border p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-muted p-2 ${role.color}`}>
                    <role.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{role.name}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                {role.id === "owner" && (
                  <div className="mt-4 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      The Owner role is automatically assigned to the account creator and cannot be assigned to other
                      users. There can only be one Owner per account.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
