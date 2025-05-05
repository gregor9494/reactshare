import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { TeamMembers } from "@/components/team/team-members"
import { PendingInvites } from "@/components/team/pending-invites"
import { RolesPermissions } from "@/components/team/roles-permissions"
import { UserPlus } from "lucide-react"

export default function TeamPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
              <p className="text-muted-foreground">Manage your team members and their permissions</p>
            </div>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          </div>

          <Tabs defaultValue="members" className="w-full">
            <TabsList>
              <TabsTrigger value="members">Team Members</TabsTrigger>
              <TabsTrigger value="invites">Pending Invites</TabsTrigger>
              <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team and their access levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamMembers />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invites</CardTitle>
                  <CardDescription>Track and manage outstanding team invitations</CardDescription>
                </CardHeader>
                <CardContent>
                  <PendingInvites />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Roles & Permissions</CardTitle>
                  <CardDescription>Configure access levels and capabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <RolesPermissions />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
