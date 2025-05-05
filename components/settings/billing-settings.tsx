"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Check, CreditCard, Download, ExternalLink } from "lucide-react"

export function BillingSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Plan</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pro Plan</p>
                  <p className="text-sm text-muted-foreground">$19/month</p>
                </div>
                <Badge>Current Plan</Badge>
              </div>
              <Separator className="my-4" />
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  Unlimited reactions
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  1080p HD quality
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  No watermarks
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  Priority support
                </li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="w-full">
                  Change Plan
                </Button>
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Storage Usage</p>
                <p className="text-sm text-muted-foreground">4.2 GB / 10 GB</p>
              </div>
              <Progress value={42} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Monthly Reactions</p>
                <p className="text-sm text-muted-foreground">24 / Unlimited</p>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="font-medium">Next billing date</p>
              <p className="text-sm text-muted-foreground">June 15, 2023</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Methods</h3>
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 04/2025</p>
              </div>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
        </div>
        <Button variant="outline">Add Payment Method</Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Billing History</h3>
        <div className="rounded-md border">
          <div className="grid grid-cols-4 gap-4 p-4 font-medium text-muted-foreground">
            <div>Date</div>
            <div>Description</div>
            <div>Amount</div>
            <div className="text-right">Receipt</div>
          </div>
          {[
            { date: "May 15, 2023", description: "Pro Plan - Monthly", amount: "$19.00" },
            { date: "Apr 15, 2023", description: "Pro Plan - Monthly", amount: "$19.00" },
            { date: "Mar 15, 2023", description: "Pro Plan - Monthly", amount: "$19.00" },
          ].map((invoice, i) => (
            <div key={i} className="grid grid-cols-4 items-center gap-4 border-t p-4">
              <div>{invoice.date}</div>
              <div>{invoice.description}</div>
              <div>{invoice.amount}</div>
              <div className="text-right">
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="link" className="gap-1">
            View All Invoices
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
