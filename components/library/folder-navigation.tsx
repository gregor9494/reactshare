"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Folder as FolderType, SourceVideo } from "@/lib/types";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderNavigationProps {
  folders: FolderType[];
  currentFolderId: string | null;
  onFolderCreated?: (folder: FolderType) => void;
  onFolderDeleted?: (folderId: string) => void;
}

export function FolderNavigation({ folders, currentFolderId, onFolderCreated, onFolderDeleted }: FolderNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigateToFolder = (folderId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (folderId) {
      params.set("folderId", folderId);
    } else {
      params.delete("folderId");
    }
    
    router.push(`/dashboard/library?${params.toString()}`);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Check if the error is related to the folders table not existing
        if (error.details && error.details.includes("folders table does not exist")) {
          setErrorMessage("The folders feature is not yet available. Please run the database migration first.");
        }
        throw new Error(error.error || "Failed to create folder");
      }

      const data = await response.json();
      toast.success("Folder created successfully");
      setNewFolderName("");
      setNewFolderDescription("");
      setIsCreateDialogOpen(false);
      
      if (onFolderCreated) {
        onFolderCreated(data.folder);
      }
      
      // Navigate to the new folder
      navigateToFolder(data.folder.id);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(`Failed to create folder: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Check if the error is related to the folders table not existing
        if (error.details && error.details.includes("folders table does not exist")) {
          setErrorMessage("The folders feature is not yet available. Please run the database migration first.");
        }
        throw new Error(error.error || "Failed to update folder");
      }

      const data = await response.json();
      toast.success("Folder updated successfully");
      setIsEditDialogOpen(false);
      
      // Refresh the page to show updated folder
      router.refresh();
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast.error(`Failed to update folder: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/folders/${deletingFolder.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        // Check if the error is related to the folders table not existing
        if (error.details && error.details.includes("folders table does not exist")) {
          setErrorMessage("The folders feature is not yet available. Please run the database migration first.");
        }
        throw new Error(error.error || "Failed to delete folder");
      }

      toast.success("Folder deleted successfully");
      setIsDeleteDialogOpen(false);
      
      if (onFolderDeleted) {
        onFolderDeleted(deletingFolder.id);
      }
      
      // Navigate to all videos if we were in the deleted folder
      if (currentFolderId === deletingFolder.id) {
        navigateToFolder(null);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      toast.error(`Failed to delete folder: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (folder: FolderType) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderDescription(folder.description || "");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (folder: FolderType) => {
    setDeletingFolder(folder);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="mb-6">
      {errorMessage && (
        <div className="mb-4 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
          <p className="font-medium">{errorMessage}</p>
          <p className="text-sm mt-1">To enable folders, run the SQL migration in migrations/add_folders_table.sql</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Folders</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="folderName" className="text-sm font-medium">
                  Folder Name
                </label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="folderDescription" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Input
                  id="folderDescription"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!currentFolderId ? "default" : "outline"}
          size="sm"
          className="flex items-center"
          onClick={() => navigateToFolder(null)}
        >
          <span className="mr-2">🏠</span>
          All Videos
        </Button>
        
        <Button
          variant={currentFolderId === "null" ? "default" : "outline"}
          size="sm"
          className="flex items-center"
          onClick={() => navigateToFolder("null")}
        >
          <span className="mr-2">📁</span>
          Unfiled
        </Button>
        
        {folders.map((folder) => (
          <div key={folder.id} className="relative group">
            <Button
              variant={currentFolderId === folder.id ? "default" : "outline"}
              size="sm"
              className="flex items-center pr-8"
              onClick={() => navigateToFolder(folder.id)}
            >
              <span className="mr-2">📁</span>
              {folder.name}
            </Button>
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Folder Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => openDeleteDialog(folder)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editFolderName" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="editFolderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editFolderDescription" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="editFolderDescription"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFolder} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the folder "{deletingFolder?.name}"? 
              Videos in this folder will not be deleted, but they will be moved out of this folder.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}