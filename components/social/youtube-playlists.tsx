"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Youtube, Plus, Loader2, File, Trash2, Settings, Edit } from "lucide-react"

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  visibility: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface VideoToAdd {
  id: string;
  title: string;
  thumbnailUrl?: string;
  playlistItemId?: string; // Used for videos in playlists
}

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Playlist title must be at least 3 characters."
  }),
  description: z.string().optional(),
  privacy: z.enum(["public", "unlisted", "private"]),
})

export function YouTubePlaylists() {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [videosInPlaylist, setVideosInPlaylist] = useState<VideoToAdd[]>([]);
  const [availableVideos, setAvailableVideos] = useState<VideoToAdd[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      privacy: "private",
    },
  });

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/social/youtube/playlists');
      if (!response.ok) throw new Error('Failed to fetch playlists');
      
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast({
        title: "Error loading playlists",
        description: error instanceof Error ? error.message : "Failed to load playlists",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylistVideos = async (playlistId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos`);
      if (!response.ok) throw new Error('Failed to fetch playlist videos');
      
      const data = await response.json();
      setVideosInPlaylist(data.videos || []);
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/social/youtube/videos');
      if (!response.ok) throw new Error('Failed to fetch available videos');
      
      const data = await response.json();
      setAvailableVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching available videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/social/youtube/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create playlist');
      }
      
      toast({
        title: "Playlist created",
        description: "Your new playlist has been created successfully",
      });
      
      fetchPlaylists();
      form.reset();
    } catch (error) {
      toast({
        title: "Error creating playlist",
        description: error instanceof Error ? error.message : "Failed to create playlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete playlist');
      }
      
      toast({
        title: "Playlist deleted",
        description: "The playlist has been deleted successfully",
      });
      
      fetchPlaylists();
    } catch (error) {
      toast({
        title: "Error deleting playlist",
        description: error instanceof Error ? error.message : "Failed to delete playlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideoToPlaylist = async (videoId: string, playlistId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add video to playlist');
      }
      
      toast({
        title: "Video added",
        description: "The video has been added to the playlist successfully",
      });
      
      // Refresh the playlist videos
      fetchPlaylistVideos(playlistId);
    } catch (error) {
      toast({
        title: "Error adding video",
        description: error instanceof Error ? error.message : "Failed to add video to playlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveVideoFromPlaylist = async (itemId: string, playlistId: string) => {
    if (!itemId) {
      toast({
        title: "Error",
        description: "Could not remove video - missing playlist item ID",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/social/youtube/playlists/${playlistId}/videos?itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove video from playlist');
      }
      
      // Remove the video from the list
      setVideosInPlaylist(prevVideos => prevVideos.filter(v => v.playlistItemId !== itemId));
      
      // Update the playlist item count
      setPlaylists(prev => prev.map(p =>
        p.id === playlistId ? { ...p, itemCount: Math.max(0, p.itemCount - 1) } : p
      ));
      
      toast({
        title: "Video removed",
        description: "The video has been removed from the playlist successfully",
      });
    } catch (error) {
      toast({
        title: "Error removing video",
        description: error instanceof Error ? error.message : "Failed to remove video from playlist",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">YouTube Playlists</h2>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription>
                Create a new YouTube playlist to organize your reaction videos
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreatePlaylist)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playlist Title</FormLabel>
                      <FormControl>
                        <Input placeholder="My Reaction Videos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="A collection of my best reactions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="privacy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy Setting</FormLabel>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="private" 
                            value="private"
                            checked={field.value === "private"}
                            onChange={() => field.onChange("private")}
                          />
                          <Label htmlFor="private">Private</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="unlisted" 
                            value="unlisted"
                            checked={field.value === "unlisted"}
                            onChange={() => field.onChange("unlisted")}
                          />
                          <Label htmlFor="unlisted">Unlisted</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="public" 
                            value="public"
                            checked={field.value === "public"}
                            onChange={() => field.onChange("public")}
                          />
                          <Label htmlFor="public">Public</Label>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Playlist"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading && playlists.length === 0 ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading playlists...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.length === 0 ? (
            <Card className="col-span-full p-8 text-center">
              <CardContent className="pt-6">
                <div className="mx-auto rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-4">
                  <File className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Playlists Yet</h3>
                <p className="text-muted-foreground mb-4">Create your first YouTube playlist to organize your reactions</p>
              </CardContent>
            </Card>
          ) : (
            playlists.map(playlist => (
              <Card key={playlist.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {playlist.thumbnailUrl ? (
                    <img 
                      src={playlist.thumbnailUrl} 
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                      <File className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-white font-medium truncate">{playlist.title}</p>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {playlist.itemCount} {playlist.itemCount === 1 ? 'video' : 'videos'} • {playlist.visibility}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(playlist.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedPlaylist(playlist);
                          fetchPlaylistVideos(playlist.id);
                          fetchAvailableVideos();
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeletePlaylist(playlist.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {selectedPlaylist && (
        <Dialog open={!!selectedPlaylist} onOpenChange={(open) => !open && setSelectedPlaylist(null)}>
          <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <YouTube className="h-5 w-5 text-red-600" />
                {selectedPlaylist.title}
              </DialogTitle>
              <DialogDescription>
                Manage videos in this playlist
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <h3 className="font-medium">Videos in this playlist ({videosInPlaylist.length})</h3>
              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading videos...</p>
                </div>
              ) : videosInPlaylist.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">
                  This playlist doesn't contain any videos yet
                </p>
              ) : (
                <div className="space-y-3">
                  {videosInPlaylist.map(video => (
                    <div key={video.id} className="flex items-center gap-3 border rounded-md p-2">
                      <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {video.thumbnailUrl ? (
                          <img 
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-200">
                            <Youtube className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        title="Remove from playlist"
                        onClick={() => handleRemoveVideoFromPlaylist(video.playlistItemId || '', selectedPlaylist.id)}
                        disabled={isLoading || !video.playlistItemId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Add videos to this playlist</h3>
                {isLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading available videos...</p>
                  </div>
                ) : availableVideos.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    No videos available to add to this playlist
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {availableVideos
                      .filter(v => !videosInPlaylist.some(pv => pv.id === v.id))
                      .map(video => (
                        <div key={video.id} className="flex items-center gap-3 border rounded-md p-2">
                          <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                            {video.thumbnailUrl ? (
                              <img 
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                <Youtube className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{video.title}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0"
                            onClick={() => handleAddVideoToPlaylist(video.id, selectedPlaylist.id)}
                            disabled={isLoading}
                          >
                            Add
                          </Button>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function YouTube(props: React.ComponentProps<typeof Youtube>) {
  return <Youtube {...props} />;
}