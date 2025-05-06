import Image from "next/image";
import Link from "next/link"; // Import Link if needed for reaction details page
import { MoreHorizontal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reaction } from '@/lib/types'; // Import Reaction type

// Define props interface
interface RecentReactionsProps {
  reactions: Reaction[]; // Accept an array of Reaction objects
}

export function RecentReactions({ reactions }: RecentReactionsProps) {
  // Display a message if there are no reactions
  if (!reactions || reactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No reactions created yet. Start by creating one!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reactions.map((reaction) => (
        <div key={reaction.id} className="flex items-center gap-4">
          {/* Placeholder for thumbnail - ideally would use reaction.reaction_video_storage_path */}
          {/* For now, display a simple placeholder or status */}
          <div className="relative h-16 w-28 overflow-hidden rounded-md bg-muted flex items-center justify-center text-center text-xs p-2">
             {/* Display status or a placeholder icon */}
             <span className="text-muted-foreground">{reaction.status}</span>
          </div>
          <div className="flex-1 space-y-1">
            {/* Display reaction title or source URL */}
            <p className="font-medium">{reaction.title || reaction.source_video_url}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              {/* Display status and creation date */}
              <span>Status: {reaction.status}</span>
              <span className="mx-1">•</span>
              <span>Created: {new Date(reaction.created_at).toLocaleDateString()}</span>
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
              {/* Update links/actions to use reaction.id */}
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/reactions/${reaction.id}/edit`} className="flex w-full">Edit</Link> {/* Placeholder link */}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                 <Link href={`/dashboard/reactions/${reaction.id}/share`} className="flex w-full">Share</Link> {/* Placeholder link */}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                 <Link href={`/dashboard/reactions/${reaction.id}/analytics`} className="flex w-full">Analytics</Link> {/* Placeholder link */}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (reaction.reaction_video_storage_path) {
                    window.open(`/api/reactions/download?id=${reaction.id}`, '_blank');
                  }
                }}
                disabled={!reaction.reaction_video_storage_path}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Implement delete functionality later */}
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
