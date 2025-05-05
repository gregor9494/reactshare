import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { ConnectedAccounts } from "@/components/social/connected-accounts"
import { AccountActivity } from "@/components/social/account-activity"
import { Plus } from "lucide-react"

export default function SocialAccountsPage() {
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
              <h1 className="text-3xl font-bold tracking-tight">Social Accounts</h1>
              <p className="text-muted-foreground">Manage your connected social media platforms</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect New Account
            </Button>
          </div>

          <Tabs defaultValue="connected" className="w-full">
            <TabsList>
              <TabsTrigger value="connected">Connected Accounts</TabsTrigger>
              <TabsTrigger value="activity">Account Activity</TabsTrigger>
              <TabsTrigger value="settings">Publishing Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="connected" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Connected Social Media Accounts</CardTitle>
                  <CardDescription>Manage your connected accounts and their permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ConnectedAccounts />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Account Activity</CardTitle>
                  <CardDescription>Track recent posts and interactions across your social platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountActivity />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Publishing Settings</CardTitle>
                  <CardDescription>Configure default settings for each platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">Publishing settings will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
