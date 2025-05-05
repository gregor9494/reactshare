import Image from "next/image"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function RecentReactions() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="relative h-16 w-28 overflow-hidden rounded-md">
            <Image
              src={`/placeholder.svg?key=zfvqh&height=64&width=112&query=reaction%20video%20${i}`}
              alt={`Reaction video ${i}`}
              width={112}
              height={64}
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-medium">Reacting to Viral TikTok #{i}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>2.4K views</span>
              <span className="mx-1">•</span>
              <span>
                {i} day{i !== 1 ? "s" : ""} ago
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem>Analytics</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
