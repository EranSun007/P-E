import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderPlus,
  Pencil,
  Trash2,
  FolderOpen,
  AlertTriangle,
  Loader2,
  MoreVertical,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Menu items for People mode (from Layout.jsx)
const PEOPLE_MENU_ITEMS = [
  { id: "tasks", name: "Tasks", icon: "CheckSquare" },
  { id: "calendar", name: "Calendar", icon: "Calendar" },
  { id: "duties", name: "Duties", icon: "CalendarDays" },
  { id: "projects", name: "Projects", icon: "Folders" },
  { id: "metrics", name: "Metrics", icon: "BarChart2" },
  { id: "team", name: "Team", icon: "UserPlus" },
  { id: "stakeholders", name: "Stakeholders", icon: "Users" },
  { id: "peers", name: "Peers", icon: "Users" },
  { id: "github", name: "GitHub", icon: "Github" },
  { id: "jira", name: "Jira", icon: "Bug" },
  { id: "capture-inbox", name: "Capture Inbox", icon: "Inbox" },
  { id: "capture-rules", name: "Capture Rules", icon: "FileCode" },
  { id: "bug-dashboard", name: "Bug Dashboard", icon: "Bug" },
  { id: "knowledge-search", name: "Knowledge Search", icon: "Search" },
  { id: "team-sync", name: "Team Sync", icon: "Users" },
  { id: "team-status", name: "Team Status", icon: "Activity" },
];

// Menu items for Product mode (from Layout.jsx)
const PRODUCT_MENU_ITEMS = [
  { id: "services", name: "My Services", icon: "Server" },
  { id: "roadmap", name: "My Roadmap", icon: "Map" },
  { id: "backlog", name: "My Backlog", icon: "ListTodo" },
  { id: "analytics", name: "Usage Analytics", icon: "TrendingUp" },
  { id: "feedback", name: "Customer Feedback", icon: "MessageSquare" },
  { id: "releases", name: "Releases", icon: "Rocket" },
];

// Sortable folder row component
function SortableFolderRow({ folder, getItemsCount, openEditDialog, openDeleteDialog }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
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
  );
}

// Sortable menu item component
function SortableMenuItem({ itemId, menuItems }) {
  const item = menuItems.find(m => m.id === itemId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!item) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-3 bg-white border rounded mb-1"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>
      <span className="text-sm font-medium">{item.name}</span>
    </div>
  );
}

// Droppable container for items
function DroppableContainer({ id, children, label, isEmpty }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-3 rounded-lg border-2 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      {label && (
        <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      )}
      {children}
      {isEmpty && (
        <div className="text-sm text-gray-400 italic text-center py-4">
          Drop items here
        </div>
      )}
    </div>
  );
}

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
    resetToDefaults,
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
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [itemContainers, setItemContainers] = useState({});

  // Get menu items based on current mode
  const menuItems = currentMode === "product" ? PRODUCT_MENU_ITEMS : PEOPLE_MENU_ITEMS;

  // Transform context config to DnD container state
  const buildItemContainers = () => {
    const containers = { root: [] };

    // Initialize folder containers
    folders.forEach(folder => {
      containers[folder.id] = [];
    });

    // Get assigned items per folder
    items.forEach(item => {
      if (item.folderId && containers[item.folderId]) {
        containers[item.folderId].push(item.itemId);
      }
    });

    // Root items are those not assigned to any folder
    const assignedIds = items.filter(i => i.folderId).map(i => i.itemId);
    containers.root = menuItems
      .filter(m => !assignedIds.includes(m.id))
      .map(m => m.id);

    return containers;
  };

  // Find which container an item belongs to
  const findItemContainer = (itemId) => {
    for (const [containerId, itemIds] of Object.entries(itemContainers)) {
      if (itemIds.includes(itemId)) {
        return containerId;
      }
    }
    return null;
  };

  // Sync itemContainers when context changes
  useEffect(() => {
    setItemContainers(buildItemContainers());
  }, [folders, items, menuItems]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px before drag activates
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate items count per folder
  const getItemsCount = (folderId) => {
    return items.filter((item) => item.folderId === folderId).length;
  };

  // Get current folder assignment for a menu item
  const getItemFolder = (itemId) => {
    const item = items.find((i) => i.itemId === itemId);
    return item?.folderId || null;
  };

  // Get root level items (not assigned to any folder)
  const getRootItems = () => {
    const assignedToFolder = items.filter((i) => i.folderId).map((i) => i.itemId);
    return menuItems.filter((m) => !assignedToFolder.includes(m.id));
  };

  // Get items in a specific folder
  const getItemsInFolder = (folderId) => {
    const itemIds = items.filter((i) => i.folderId === folderId).map((i) => i.itemId);
    return menuItems.filter((m) => itemIds.includes(m.id));
  };

  // Handle item folder assignment change
  const handleItemFolderChange = async (itemId, folderId) => {
    setSaving(true);
    setLocalError(null);

    try {
      // Update items array
      let updatedItems;
      const existingItem = items.find((i) => i.itemId === itemId);

      if (folderId === "root" || folderId === "") {
        // Remove item assignment (move to root)
        updatedItems = items.filter((i) => i.itemId !== itemId);
      } else if (existingItem) {
        // Update existing item
        updatedItems = items.map((i) =>
          i.itemId === itemId ? { ...i, folderId } : i
        );
      } else {
        // Add new item assignment
        updatedItems = [...items, { itemId, folderId }];
      }

      const success = await saveConfig({
        ...config,
        items: updatedItems,
      });

      if (!success) {
        setLocalError("Failed to update item assignment. Please try again.");
      }
    } catch (err) {
      console.error("Error updating item assignment:", err);
      setLocalError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = async () => {
    if (window.confirm("Reset navigation to defaults? This will remove all folders and item assignments.")) {
      setSaving(true);
      setLocalError(null);
      try {
        const success = await resetToDefaults();
        if (!success) {
          setLocalError("Failed to reset. Please try again.");
        }
      } catch (err) {
        console.error("Error resetting to defaults:", err);
        setLocalError("An unexpected error occurred. Please try again.");
      } finally {
        setSaving(false);
      }
    }
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

  // Folder drag handlers
  const handleFolderDragStart = ({ active }) => {
    setActiveFolderId(active.id);
  };

  const handleFolderDragEnd = async ({ active, over }) => {
    setActiveFolderId(null);

    if (saving) return; // Don't process if already saving
    if (!over || active.id === over.id) return;

    const oldIndex = folders.findIndex(f => f.id === active.id);
    const newIndex = folders.findIndex(f => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder and recalculate order field
    const reordered = arrayMove(folders, oldIndex, newIndex);
    const foldersWithOrder = reordered.map((folder, index) => ({
      ...folder,
      order: index + 1,
    }));

    setSaving(true);
    setLocalError(null);

    try {
      const success = await saveConfig({
        ...config,
        folders: foldersWithOrder,
      });

      if (!success) {
        setLocalError("Failed to save folder order. Please try again.");
      }
    } catch (err) {
      console.error("Error saving folder order:", err);
      setLocalError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Item drag handlers
  const handleItemDragStart = ({ active }) => {
    setActiveItemId(active.id);
  };

  const handleItemDragOver = ({ active, over }) => {
    if (!over) return;

    const activeContainer = findItemContainer(active.id);
    let overContainer = over.id in itemContainers ? over.id : findItemContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    // Move item to new container in local state (visual feedback only)
    setItemContainers(prev => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];

      const activeIndex = activeItems.indexOf(active.id);
      activeItems.splice(activeIndex, 1);

      // Determine position in new container
      let overIndex = overItems.length;
      if (over.id !== overContainer) {
        overIndex = overItems.indexOf(over.id);
        if (overIndex === -1) overIndex = overItems.length;
      }

      overItems.splice(overIndex, 0, active.id);

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  };

  const handleItemDragEnd = async ({ active, over }) => {
    setActiveItemId(null);

    if (saving) {
      setItemContainers(buildItemContainers());
      return;
    }

    if (!over) {
      // Reset to context state if dropped outside
      setItemContainers(buildItemContainers());
      return;
    }

    const activeContainer = findItemContainer(active.id);
    const overContainer = over.id in itemContainers ? over.id : findItemContainer(over.id);

    if (!activeContainer || !overContainer) {
      setItemContainers(buildItemContainers());
      return;
    }

    // Handle reordering within same container
    if (activeContainer === overContainer && active.id !== over.id) {
      const containerItems = [...itemContainers[activeContainer]];
      const oldIndex = containerItems.indexOf(active.id);
      const newIndex = containerItems.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(containerItems, oldIndex, newIndex);
        setItemContainers(prev => ({
          ...prev,
          [activeContainer]: reordered,
        }));
      }
    }

    // Save to backend
    setSaving(true);
    setLocalError(null);

    try {
      // Convert itemContainers back to items array format
      const updatedItems = [];

      for (const [containerId, itemIds] of Object.entries(itemContainers)) {
        if (containerId === 'root') continue; // Root items have no assignment

        itemIds.forEach(itemId => {
          updatedItems.push({ itemId, folderId: containerId });
        });
      }

      const success = await saveConfig({
        ...config,
        items: updatedItems,
      });

      if (!success) {
        setLocalError("Failed to save item assignment. Please try again.");
        setItemContainers(buildItemContainers()); // Rollback
      }
    } catch (err) {
      console.error("Error saving item assignment:", err);
      setLocalError("An unexpected error occurred. Please try again.");
      setItemContainers(buildItemContainers()); // Rollback
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleFolderDragStart}
              onDragEnd={handleFolderDragEnd}
            >
              <SortableContext
                items={folders.sort((a, b) => (a.order || 0) - (b.order || 0)).map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
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
                        <SortableFolderRow
                          key={folder.id}
                          folder={folder}
                          getItemsCount={getItemsCount}
                          openEditDialog={openEditDialog}
                          openDeleteDialog={openDeleteDialog}
                        />
                      ))}
                  </TableBody>
                </Table>
              </SortableContext>

              <DragOverlay>
                {activeFolderId ? (
                  <div className="bg-white border rounded shadow-lg p-3 flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {folders.find(f => f.id === activeFolderId)?.name}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Menu Items Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>
            Drag items between containers to organize your navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleItemDragStart}
            onDragOver={handleItemDragOver}
            onDragEnd={handleItemDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Root level container */}
              <div>
                <h4 className="text-sm font-medium mb-2">Root Level</h4>
                <DroppableContainer
                  id="root"
                  isEmpty={(itemContainers.root || []).length === 0}
                >
                  <SortableContext
                    items={itemContainers.root || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {(itemContainers.root || []).map(itemId => (
                      <SortableMenuItem
                        key={itemId}
                        itemId={itemId}
                        menuItems={menuItems}
                      />
                    ))}
                  </SortableContext>
                </DroppableContainer>
              </div>

              {/* Folder containers */}
              <div className="space-y-4">
                {folders
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(folder => (
                    <div key={folder.id}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {folder.name}
                      </h4>
                      <DroppableContainer
                        id={folder.id}
                        isEmpty={(itemContainers[folder.id] || []).length === 0}
                      >
                        <SortableContext
                          items={itemContainers[folder.id] || []}
                          strategy={verticalListSortingStrategy}
                        >
                          {(itemContainers[folder.id] || []).map(itemId => (
                            <SortableMenuItem
                              key={itemId}
                              itemId={itemId}
                              menuItems={menuItems}
                            />
                          ))}
                        </SortableContext>
                      </DroppableContainer>
                    </div>
                  ))}
              </div>
            </div>

            <DragOverlay>
              {activeItemId ? (
                <div className="bg-white border-2 border-blue-400 rounded shadow-lg p-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {menuItems.find(m => m.id === activeItemId)?.name}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your navigation will appear
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Root level items */}
            {(itemContainers.root || []).map(itemId => {
              const item = menuItems.find(m => m.id === itemId);
              return item ? (
                <div
                  key={itemId}
                  className="flex items-center gap-2 py-1.5 px-3 rounded bg-gray-50"
                >
                  <span className="text-sm">{item.name}</span>
                </div>
              ) : null;
            })}

            {/* Folders with their items */}
            {folders
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(folder => (
                <div key={folder.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FolderOpen className="h-4 w-4" />
                    {folder.name}
                    <Badge variant="secondary" className="text-xs">
                      {(itemContainers[folder.id] || []).length}
                    </Badge>
                  </div>
                  <div className="ml-6 mt-2 space-y-1">
                    {(itemContainers[folder.id] || []).map(itemId => {
                      const item = menuItems.find(m => m.id === itemId);
                      return item ? (
                        <div key={itemId} className="text-sm text-gray-600 py-0.5">
                          {item.name}
                        </div>
                      ) : null;
                    })}
                    {(itemContainers[folder.id] || []).length === 0 && (
                      <div className="text-sm text-gray-400 italic">No items</div>
                    )}
                  </div>
                </div>
              ))}

            {/* Empty state */}
            {(itemContainers.root || []).length === 0 && folders.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No items to display
              </div>
            )}
          </div>
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
