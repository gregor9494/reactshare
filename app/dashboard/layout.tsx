import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Protect dashboard routes
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader session={session} />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}