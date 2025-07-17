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
    role: "",
    email: "",
    phone: "",
    company: "",
    influence_level: "medium",
    engagement_level: "active",
    contact_info: "",
    notes: "",
    tags: []
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
      role: "",
      email: "",
      phone: "",
      company: "",
      influence_level: "medium",
      engagement_level: "active",
      contact_info: "",
      notes: "",
      tags: []
    });
    setEditingStakeholder(null);
    setShowDialog(true);
  };

  const openEditDialog = (stakeholder) => {
    setFormData({
      name: stakeholder.name || "",
      role: stakeholder.role || "",
      email: stakeholder.email || "",
      phone: stakeholder.phone || "",
      company: stakeholder.company || stakeholder.organization || "",
      influence_level: stakeholder.influence_level || stakeholder.influence || "medium",
      engagement_level: stakeholder.engagement_level || "active",
      contact_info: stakeholder.contact_info || "",
      notes: stakeholder.notes || stakeholder.description || "",
      tags: Array.isArray(stakeholder.tags) ? stakeholder.tags : []
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
    const role = (item.role || "").toLowerCase();
    const company = (item.company || item.organization || "").toLowerCase();
    return name.includes(search) || role.includes(search) || company.includes(search);
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
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={
                      (stakeholder.influence_level || stakeholder.influence) === "high" ? "bg-red-100 text-red-800" :
                        (stakeholder.influence_level || stakeholder.influence) === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-blue-100 text-blue-800"
                    }>
                      {(stakeholder.influence_level || stakeholder.influence) || "medium"} influence
                    </Badge>
                    <Badge className={
                      stakeholder.engagement_level === "active" ? "bg-green-100 text-green-800" :
                        stakeholder.engagement_level === "passive" ? "bg-gray-100 text-gray-800" :
                          "bg-orange-100 text-orange-800"
                    }>
                      {stakeholder.engagement_level || "active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {stakeholder.role && (
                    <p className="text-sm text-gray-500 mb-1">{stakeholder.role}</p>
                  )}
                  {(stakeholder.company || stakeholder.organization) && (
                    <p className="text-sm text-gray-500 mb-2">{stakeholder.company || stakeholder.organization}</p>
                  )}
                  {stakeholder.email && (
                    <p className="text-sm text-blue-600 mb-1">{stakeholder.email}</p>
                  )}
                  {(stakeholder.notes || stakeholder.description) && (
                    <p className="text-sm text-gray-600 mb-2">{stakeholder.notes || stakeholder.description}</p>
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
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Job title or role"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Influence Level</Label>
                  <Select
                    value={formData.influence_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, influence_level: value }))}
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
                  <Label>Engagement Level</Label>
                  <Select
                    value={formData.engagement_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, engagement_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="passive">Passive</SelectItem>
                      <SelectItem value="resistant">Resistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contact Info</Label>
                <Input
                  value={formData.contact_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder="Additional contact information"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this stakeholder"
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