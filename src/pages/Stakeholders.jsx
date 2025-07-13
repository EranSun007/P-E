import React, { useState, useEffect } from "react";
import { Stakeholder } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search } from "lucide-react";

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [editingStakeholder, setEditingStakeholder] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    influence: "medium",
    description: ""
  });

  useEffect(() => {
    loadStakeholders();
  }, []);

  const loadStakeholders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await Stakeholder.list();
      console.log("Stakeholder response:", response); // Debug log
      
      // Ensure we have a valid array
      if (!response) {
        setStakeholders([]);
        return;
      }

      const data = Array.isArray(response) ? response : [];
      setStakeholders(data);
    } catch (err) {
      console.error("Failed to load stakeholders:", err);
      setError("Failed to load stakeholders");
      setStakeholders([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: "",
      department: "",
      influence: "medium",
      description: ""
    });
    setEditingStakeholder(null);
    setShowDialog(true);
  };

  const openEditDialog = (stakeholder) => {
    setFormData({
      name: stakeholder.name || "",
      department: stakeholder.department || "",
      influence: stakeholder.influence || "medium",
      description: stakeholder.description || ""
    });
    setEditingStakeholder(stakeholder);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingStakeholder) {
        await Stakeholder.update(editingStakeholder.id, formData);
      } else {
        await Stakeholder.create(formData);
      }
      setShowDialog(false);
      loadStakeholders();
    } catch (err) {
      console.error(`Failed to ${editingStakeholder ? 'update' : 'create'} stakeholder:`, err);
      setError(`Failed to ${editingStakeholder ? 'update' : 'create'} stakeholder`);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stakeholders...</p>
        </div>
      </div>
    );
  }

  // Safe filtering function
  const filteredStakeholders = (stakeholders || []).filter(item => {
    if (!item) return false;
    const search = (searchQuery || "").toLowerCase();
    const name = (item.name || "").toLowerCase();
    const dept = (item.department || "").toLowerCase();
    return name.includes(search) || dept.includes(search);
  });

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Stakeholders</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Stakeholder
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search stakeholders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}

        {stakeholders.length === 0 ? (
          <Card className="text-center p-12">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No stakeholders yet</h3>
            <p className="text-gray-500 mb-4">Create your first stakeholder to get started</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Stakeholder
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStakeholders.map(stakeholder => stakeholder && (
              <Card key={stakeholder.id || Math.random()}>
                <CardHeader>
                  <CardTitle>{stakeholder.name || "Unnamed Stakeholder"}</CardTitle>
                  <Badge className={
                    stakeholder.influence === "high" ? "bg-red-100 text-red-800" :
                    stakeholder.influence === "medium" ? "bg-yellow-100 text-yellow-800" :
                    "bg-blue-100 text-blue-800"
                  }>
                    {stakeholder.influence || "medium"} influence
                  </Badge>
                </CardHeader>
                <CardContent>
                  {stakeholder.department && (
                    <p className="text-sm text-gray-500 mb-2">{stakeholder.department}</p>
                  )}
                  {stakeholder.description && (
                    <p className="text-sm text-gray-600">{stakeholder.description}</p>
                  )}
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => openEditDialog(stakeholder)}>
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStakeholder ? "Edit Stakeholder" : "Add New Stakeholder"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                />
              </div>

              <div className="space-y-2">
                <Label>Influence</Label>
                <Select
                  value={formData.influence}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, influence: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select influence level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingStakeholder ? "Update Stakeholder" : "Create Stakeholder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}