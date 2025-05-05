"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Upload, X } from "lucide-react"

export function ProfileSettings() {
  const [avatar, setAvatar] = useState("/diverse-group.png")

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <Image
              src={avatar || "/placeholder.svg"}
              alt="Profile picture"
              width={96}
              height={96}
              className="rounded-full object-cover"
            />
            <button
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
              aria-label="Remove profile picture"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload New Image
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Recommended: Square image, at least 300x300px</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input id="first-name" defaultValue="Alex" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input id="last-name" defaultValue="Johnson" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <Input id="display-name" defaultValue="Alex Johnson" />
          <p className="text-sm text-muted-foreground">
            This is the name that will be displayed on your profile and in comments
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={4}
            defaultValue="Content creator specializing in tech reviews and reaction videos."
          />
          <p className="text-sm text-muted-foreground">Brief description that appears on your public profile</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="url" defaultValue="https://alexjohnson.com" />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Social Links</h3>
        <p className="text-sm text-muted-foreground">
          Add your social media profiles to display on your public profile
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" type="url" placeholder="https://youtube.com/@username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" type="url" placeholder="https://instagram.com/username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input id="twitter" type="url" placeholder="https://twitter.com/username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input id="tiktok" type="url" placeholder="https://tiktok.com/@username" />
          </div>
        </div>
      </div>
    </div>
  )
}
