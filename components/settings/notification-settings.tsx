"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <div className="space-y-2">
          <Label htmlFor="notification-method">Notification Method</Label>
          <Select defaultValue="email">
            <SelectTrigger id="notification-method">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="push">Push Notifications</SelectItem>
              <SelectItem value="both">Both Email and Push</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Comments and Replies</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications when someone comments on your content
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Likes and Shares</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications when someone likes or shares your content
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Followers</p>
              <p className="text-sm text-muted-foreground">Receive notifications when someone follows you</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Publishing Updates</p>
              <p className="text-sm text-muted-foreground">Receive notifications about your scheduled posts</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">System Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Updates</p>
              <p className="text-sm text-muted-foreground">Important information about your account</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Features</p>
              <p className="text-sm text-muted-foreground">Updates about new features and improvements</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tips and Tutorials</p>
              <p className="text-sm text-muted-foreground">Helpful tips to get the most out of ReactShare</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Marketing and Promotions</p>
              <p className="text-sm text-muted-foreground">Special offers and promotional content</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Schedule</h3>
        <div className="space-y-2">
          <Label htmlFor="digest-frequency">Email Digest Frequency</Label>
          <Select defaultValue="daily">
            <SelectTrigger id="digest-frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="daily">Daily Digest</SelectItem>
              <SelectItem value="weekly">Weekly Digest</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Choose how often you want to receive notification digests</p>
        </div>
      </div>
    </div>
  )
}
