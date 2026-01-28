import React, { useState, useEffect, useContext } from "react";
import { Stakeholder } from "@/api/entities";
import { AppContext } from "@/contexts/AppContext.jsx";
import { useDisplayMode } from "@/contexts/DisplayModeContext.jsx";
import { useAI } from "@/contexts/AIContext";
import { formatStakeholdersContext } from "@/utils/contextFormatter";
import { logger } from "@/utils/logger";
import {
  anonymizeName,
  anonymizeEmail,
  anonymizeNotes
} from "@/utils/anonymize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, Plus, Search, List, Building2, Layers } from "lucide-react";

export default function StakeholdersPage() {
  const { stakeholders: ctxStakeholders, loading, refreshAll } = useContext(AppContext);
  const { isPresentationMode } = useDisplayMode();
  const [stakeholders, setStakeholders] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [viewMode, setViewMode] = useState("flat"); // "flat" | "department" | "group"

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
    tags: [],
    department: "",
    stakeholder_group: ""
  });

  useEffect(() => {
    setStakeholders(Array.isArray(ctxStakeholders) ? ctxStakeholders : []);
  }, [ctxStakeholders]);

  const loadStakeholders = async () => {
    setError(null);
    try {
      await refreshAll();
    } catch (err) {
      logger.error("Failed to refresh stakeholders", { error: String(err) });
      setError("Failed to load stakeholders");
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
      tags: [],
      department: "",
      stakeholder_group: ""
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
      tags: Array.isArray(stakeholder.tags) ? stakeholder.tags : [],
      department: stakeholder.department || "",
      stakeholder_group: stakeholder.stakeholder_group || ""
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
      logger.error(`Failed to ${editingStakeholder ? 'update' : 'create'} stakeholder`, { error: String(err) });
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
    const dept = (item.department || "").toLowerCase();
    const group = (item.stakeholder_group || "").toLowerCase();
    return name.includes(search) || role.includes(search) || company.includes(search) || dept.includes(search) || group.includes(search);
  });

  // Group stakeholders by department
  const groupByDepartment = (items) => {
    const groups = {};
    items.forEach(item => {
      const dept = item.department || "Unassigned";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
    });
    // Sort keys alphabetically with Unassigned at end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map(dept => ({ label: dept, items: groups[dept] }));
  };

  // Group stakeholders by group
  const groupByGroup = (items) => {
    const groups = {};
    items.forEach(item => {
      const grp = item.stakeholder_group || "Unassigned";
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(item);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map(grp => ({ label: grp, items: groups[grp] }));
  };

  const groupedStakeholders = viewMode === "department"
    ? groupByDepartment(filteredStakeholders)
    : viewMode === "group"
    ? groupByGroup(filteredStakeholders)
    : null;

  // Render a single stakeholder card with anonymization support
  const renderStakeholderCard = (stakeholder, index) => {
    // Get display values based on presentation mode
    const displayName = isPresentationMode
      ? anonymizeName(stakeholder.name, index, 'Stakeholder')
      : (stakeholder.name || "Unnamed Stakeholder");
    const displayEmail = isPresentationMode
      ? anonymizeEmail(stakeholder.email)
      : stakeholder.email;
    const displayNotes = isPresentationMode
      ? anonymizeNotes(stakeholder.notes || stakeholder.description)
      : (stakeholder.notes || stakeholder.description);

    return (
      <Card key={stakeholder.id || Math.random()}>
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
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
            <p className="text-sm text-gray-500 mb-1">{stakeholder.company || stakeholder.organization}</p>
          )}
          {stakeholder.department && (
            <p className="text-sm text-gray-500 mb-1">Dept: {stakeholder.department}</p>
          )}
          {stakeholder.stakeholder_group && (
            <p className="text-sm text-gray-500 mb-1">Group: {stakeholder.stakeholder_group}</p>
          )}
          {stakeholder.email && (
            <p className={isPresentationMode ? "text-sm text-gray-400 mb-1" : "text-sm text-blue-600 mb-1"}>
              {displayEmail}
            </p>
          )}
          {(stakeholder.notes || stakeholder.description) && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{displayNotes}</p>
          )}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => openEditDialog(stakeholder)}>
            Edit
          </Button>
        </CardContent>
      </Card>
    );
  };

  // AI Context Registration
  const { updatePageContext } = useAI();

  // Register stakeholders context for AI
  useEffect(() => {
    const contextSummary = formatStakeholdersContext(filteredStakeholders, { search: searchQuery }, editingStakeholder);

    updatePageContext({
      page: '/stakeholders',
      summary: contextSummary,
      selection: editingStakeholder ? { id: editingStakeholder.id, type: 'stakeholder' } : null,
      data: {
        stakeholderCount: filteredStakeholders.length,
        totalCount: stakeholders.length,
        viewMode
      }
    });
  }, [filteredStakeholders, searchQuery, editingStakeholder, stakeholders.length, viewMode, updatePageContext]);

  // Listen for context refresh events
  useEffect(() => {
    const handleRefresh = () => {
      const contextSummary = formatStakeholdersContext(filteredStakeholders, { search: searchQuery }, editingStakeholder);

      updatePageContext({
        page: '/stakeholders',
        summary: contextSummary,
        selection: editingStakeholder ? { id: editingStakeholder.id, type: 'stakeholder' } : null,
        data: {
          stakeholderCount: filteredStakeholders.length,
          totalCount: stakeholders.length,
          viewMode
        }
      });
    };

    window.addEventListener('ai-context-refresh', handleRefresh);
    return () => window.removeEventListener('ai-context-refresh', handleRefresh);
  }, [filteredStakeholders, searchQuery, editingStakeholder, stakeholders.length, viewMode, updatePageContext]);

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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stakeholders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              size="sm"
              variant={viewMode === "flat" ? "default" : "ghost"}
              onClick={() => setViewMode("flat")}
            >
              <List className="h-4 w-4 mr-1" />
              Flat
            </Button>
            <Button
              size="sm"
              variant={viewMode === "department" ? "default" : "ghost"}
              onClick={() => setViewMode("department")}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Dept
            </Button>
            <Button
              size="sm"
              variant={viewMode === "group" ? "default" : "ghost"}
              onClick={() => setViewMode("group")}
            >
              <Layers className="h-4 w-4 mr-1" />
              Group
            </Button>
          </div>
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
        ) : viewMode === "flat" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStakeholders.map((stakeholder, index) => stakeholder && renderStakeholderCard(stakeholder, index))}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={groupedStakeholders.map(g => g.label)} className="space-y-4">
            {groupedStakeholders.map(group => (
              <AccordionItem key={group.label} value={group.label} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{group.label}</span>
                    <Badge variant="secondary">{group.items.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {group.items.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No stakeholders in this {viewMode === "department" ? "department" : "group"}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                      {group.items.map(stakeholder => {
                        // Find original index for consistent anonymization
                        const originalIndex = filteredStakeholders.findIndex(s => s.id === stakeholder.id);
                        return renderStakeholderCard(stakeholder, originalIndex);
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering, Product"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Group</Label>
                  <Input
                    value={formData.stakeholder_group}
                    onChange={(e) => setFormData(prev => ({ ...prev, stakeholder_group: e.target.value }))}
                    placeholder="e.g., Executive, Partner"
                  />
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