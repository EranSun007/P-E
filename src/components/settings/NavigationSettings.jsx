import { useState } from "react";
import { useNavigation } from "@/contexts/NavigationContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderPlus,
  Pencil,
  Trash2,
  FolderOpen,
  AlertTriangle,
  Loader2,
  MoreVertical,
} from "lucide-react";

/**
 * NavigationSettings component
 * Manages folder CRUD operations for sidebar navigation organization
 */
export default function NavigationSettings() {
  const {
    folders,
    items,
    config,
    saveConfig,
    loading,
    error: contextError,
    currentMode,
  } = useNavigation();

  // Local state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Calculate items count per folder
  const getItemsCount = (folderId) => {
    return items.filter((item) => item.folderId === folderId).length;
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingFolder(null);
    setFolderName("");
    setShowFolderDialog(true);
    setLocalError(null);
  };

  // Open edit dialog
  const openEditDialog = (folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowFolderDialog(true);
    setLocalError(null);
  };

  // Open delete confirmation
  const openDeleteDialog = (folder) => {
    setFolderToDelete(folder);
    setShowDeleteDialog(true);
    setLocalError(null);
  };

  // Handle create/update folder
  const handleSaveFolder = async () => {
    // Validation
    if (!folderName.trim()) {
      setLocalError("Folder name is required.");
      return;
    }

    if (folderName.trim().length > 50) {
      setLocalError("Folder name must be 50 characters or less.");
      return;
    }

    setSaving(true);
    setLocalError(null);

    try {
      let updatedFolders;

      if (editingFolder) {
        // Update existing folder
        updatedFolders = folders.map((f) =>
          f.id === editingFolder.id ? { ...f, name: folderName.trim() } : f
        );
      } else {
        // Create new folder
        const maxOrder = folders.length > 0
          ? Math.max(...folders.map((f) => f.order || 0))
          : 0;

        const newFolder = {
          id: crypto.randomUUID(),
          name: folderName.trim(),
          order: maxOrder + 1,
        };

        updatedFolders = [...folders, newFolder];
      }

      const success = await saveConfig({
        ...config,
        folders: updatedFolders,
      });

      if (success) {
        setShowFolderDialog(false);
        setFolderName("");
        setEditingFolder(null);
      } else {
        setLocalError("Failed to save folder. Please try again.");
      }
    } catch (err) {
      console.error("Error saving folder:", err);
      setLocalError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete folder
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    setSaving(true);
    setLocalError(null);

    try {
      // Remove folder from folders array
      const updatedFolders = folders.filter((f) => f.id !== folderToDelete.id);

      // Move items from deleted folder to root (set folderId to null)
      const updatedItems = items.map((item) =>
        item.folderId === folderToDelete.id
          ? { ...item, folderId: null }
          : item
      );

      const success = await saveConfig({
        ...config,
        folders: updatedFolders,
        items: updatedItems,
      });

      if (success) {
        setShowDeleteDialog(false);
        setFolderToDelete(null);
      } else {
        setLocalError("Failed to delete folder. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting folder:", err);
      setLocalError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading navigation settings...</span>
        </CardContent>
      </Card>
    );
  }

  const displayError = localError || contextError;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Navigation Folders
              </CardTitle>
              <CardDescription>
                Create folders to organize your sidebar menu items
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-4">
              {currentMode === "product" ? "Product Mode" : "People Mode"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={openCreateDialog}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Folder
            </Button>
          </div>

          {folders.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                No folders. Create your first folder to organize navigation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((folder) => (
                    <TableRow key={folder.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{folder.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getItemsCount(folder.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => openDeleteDialog(folder)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "Edit Folder" : "Create Folder"}
            </DialogTitle>
            <DialogDescription>
              {editingFolder
                ? "Update the folder name."
                : "Enter a name for your new folder."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                {folderName.length}/50 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFolderDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFolder} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingFolder ? (
                "Save"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{folderToDelete?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <Alert variant="warning" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Items in this folder will be moved to the root level.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
