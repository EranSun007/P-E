
import React, { useState, useEffect } from "react";
import { TaskAttribute } from "@/api/entities";
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Tag, 
  Flag, 
  CheckSquare, 
  Layers,
  Save,
  Trash2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("priorities");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState(null);

  const [formData, setFormData] = useState({
    type: "priority",
    name: "",
    description: "",
    color: "",
    order: 0,
    default: false
  });

  const typeMapping = {
    priorities: "priority",
    taskTypes: "taskType",
    tags: "tag",
    statuses: "status"
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TaskAttribute.list();
      if (data.length === 0) {
        // Load default attributes if none exist
        await seedDefaultAttributes();
        const seedData = await TaskAttribute.list();
        setAttributes(seedData);
      } else {
        setAttributes(data);
      }
    } catch (err) {
      console.error("Failed to load attributes:", err);
      setError("Failed to load task attributes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultAttributes = async () => {
    const defaultAttributes = [
      // Priorities
      { type: "priority", name: "low", description: "Low priority tasks", color: "blue", order: 1, default: true },
      { type: "priority", name: "medium", description: "Medium priority tasks", color: "yellow", order: 2, default: true },
      { type: "priority", name: "high", description: "High priority tasks", color: "orange", order: 3, default: true },
      { type: "priority", name: "urgent", description: "Urgent priority tasks", color: "red", order: 4, default: true },
      
      // Task Types
      { type: "taskType", name: "generic", description: "Generic tasks", color: "gray", order: 1, default: true },
      { type: "taskType", name: "meeting", description: "Meeting tasks", color: "blue", order: 2, default: true },
      { type: "taskType", name: "metric", description: "Metric tracking tasks", color: "green", order: 3, default: true },
      { type: "taskType", name: "action", description: "Action items", color: "purple", order: 4, default: true },
      
      // Statuses
      { type: "status", name: "backlog", description: "Backlog tasks", color: "gray", order: 1, default: true },
      { type: "status", name: "todo", description: "To-do tasks", color: "blue", order: 2, default: true },
      { type: "status", name: "in_progress", description: "In-progress tasks", color: "yellow", order: 3, default: true },
      { type: "status", name: "blocked", description: "Blocked tasks", color: "red", order: 4, default: true },
      { type: "status", name: "done", description: "Completed tasks", color: "green", order: 5, default: true },
      
      // Tags
      { type: "tag", name: "design", description: "Design-related tasks", color: "purple", order: 1, default: true },
      { type: "tag", name: "development", description: "Development tasks", color: "blue", order: 2, default: true },
      { type: "tag", name: "research", description: "Research tasks", color: "green", order: 3, default: true },
      { type: "tag", name: "planning", description: "Planning tasks", color: "yellow", order: 4, default: true }
    ];
    
    await TaskAttribute.bulkCreate(defaultAttributes);
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      pink: "bg-pink-100 text-pink-800 border-pink-200",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return colorMap[color] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "priority": return <Flag className="h-4 w-4" />;
      case "taskType": return <Layers className="h-4 w-4" />;
      case "tag": return <Tag className="h-4 w-4" />;
      case "status": return <CheckSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const filteredAttributes = attributes.filter(attr => {
    // Filter by tab/type
    if (attr.type !== typeMapping[activeTab]) return false;
    
    // Filter by search
    if (searchQuery) {
      return attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (attr.description && attr.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return true;
  }).sort((a, b) => a.order - b.order);

  const openCreateDialog = () => {
    setFormData({
      type: typeMapping[activeTab],
      name: "",
      description: "",
      color: "blue",
      order: getNextOrder(),
      default: false
    });
    setEditingAttribute(null);
    setShowDialog(true);
  };

  const getNextOrder = () => {
    const currentTypeAttributes = attributes.filter(attr => attr.type === typeMapping[activeTab]);
    if (currentTypeAttributes.length === 0) return 1;
    
    const maxOrder = Math.max(...currentTypeAttributes.map(attr => attr.order || 0));
    return maxOrder + 1;
  };

  const openEditDialog = (attribute) => {
    setFormData({
      type: attribute.type,
      name: attribute.name || "",
      description: attribute.description || "",
      color: attribute.color || "blue",
      order: attribute.order || 0,
      default: attribute.default || false
    });
    setEditingAttribute(attribute);
    setShowDialog(true);
  };

  const confirmDelete = (attribute) => {
    setAttributeToDelete(attribute);
    setConfirmDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!attributeToDelete) return;
    
    try {
      await TaskAttribute.delete(attributeToDelete.id);
      await loadAttributes();
      setConfirmDeleteDialog(false);
      setAttributeToDelete(null);
    } catch (err) {
      console.error("Failed to delete attribute:", err);
      setError("Failed to delete attribute. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingAttribute) {
        await TaskAttribute.update(editingAttribute.id, formData);
      } else {
        await TaskAttribute.create(formData);
      }
      setShowDialog(false);
      await loadAttributes();
    } catch (err) {
      console.error("Failed to save attribute:", err);
      setError("Failed to save attribute. Please try again.");
    }
  };

  const tabConfigs = [
    { id: "priorities", label: "Priorities", icon: Flag },
    { id: "taskTypes", label: "Task Types", icon: Layers },
    { id: "statuses", label: "Statuses", icon: CheckSquare },
    { id: "tags", label: "Tags", icon: Tag }
  ];

  const colorOptions = [
    { id: "blue", name: "Blue" },
    { id: "green", name: "Green" },
    { id: "red", name: "Red" },
    { id: "yellow", name: "Yellow" },
    { id: "purple", name: "Purple" },
    { id: "orange", name: "Orange" },
    { id: "pink", name: "Pink" },
    { id: "indigo", name: "Indigo" },
    { id: "gray", name: "Gray" }
  ];

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="priorities" value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <TabsList className="bg-gray-100">
              {tabConfigs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {tabConfigs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </CardTitle>
                  <CardDescription>
                    Manage {tab.label.toLowerCase()} for your tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center p-8">
                      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading attributes...</p>
                    </div>
                  ) : filteredAttributes.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg">
                      <p className="text-gray-500">
                        {searchQuery 
                          ? `No ${tab.label.toLowerCase()} found matching your search`
                          : `No ${tab.label.toLowerCase()} found. Add your first one!`
                        }
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttributes.map(attr => (
                          <TableRow key={attr.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline"
                                  className={getColorClass(attr.color)}
                                >
                                  {getTypeIcon(attr.type)}
                                  <span className="ml-1">{attr.name}</span>
                                </Badge>
                                {attr.default && (
                                  <Badge variant="outline" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{attr.description || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${attr.color ? `bg-${attr.color}-500` : "bg-gray-300"}`}></div>
                                <span className="capitalize">{attr.color || "None"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{attr.order}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(attr)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => confirmDelete(attr)}
                                  >
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? `Edit ${formData.type}` : `Create new ${formData.type}`}
            </DialogTitle>
            <DialogDescription>
              {editingAttribute
                ? `Edit the details for this ${formData.type}`
                : `Add a new ${formData.type} for your tasks`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={`Enter ${formData.type} name`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map(color => (
                  <Button
                    key={color.id}
                    type="button"
                    variant={formData.color === color.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleInputChange("color", color.id)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-${color.id}-500 mr-2`}></div>
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => handleInputChange("order", parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Lower numbers appear first in lists
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingAttribute ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteDialog} onOpenChange={setConfirmDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {attributeToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
