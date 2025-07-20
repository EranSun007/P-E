import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TagInput from "@/components/ui/tag-input";

export default function PeerForm({ initialData = {}, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    role: initialData.role || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    department: initialData.department || "",
    organization: initialData.organization || "",
    collaboration_context: initialData.collaboration_context || "",
    relationship_type: initialData.relationship_type || "cross_team",
    availability: initialData.availability || "full_time",
    skills: Array.isArray(initialData.skills) ? initialData.skills : [],
    notes: initialData.notes || "",
    avatar: initialData.avatar || ""
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={formData.name} onChange={e => handleInputChange("name", e.target.value)} required placeholder="Full name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role / Position</Label>
          <Input id="role" value={formData.role} onChange={e => handleInputChange("role", e.target.value)} placeholder="e.g. Product Manager" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input id="department" value={formData.department} onChange={e => handleInputChange("department", e.target.value)} placeholder="e.g. Engineering" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="organization">Organization / Company</Label>
          <Input id="organization" value={formData.organization} onChange={e => handleInputChange("organization", e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder="Email address" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={e => handleInputChange("phone", e.target.value)} placeholder="Phone number" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship_type">Relationship Type</Label>
          <Select value={formData.relationship_type} onValueChange={value => handleInputChange("relationship_type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select relationship type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cross_team">Cross-team</SelectItem>
              <SelectItem value="external_partner">External Partner</SelectItem>
              <SelectItem value="client_contact">Client Contact</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="collaboration_context">Collaboration Context</Label>
        <Input id="collaboration_context" value={formData.collaboration_context} onChange={e => handleInputChange("collaboration_context", e.target.value)} placeholder="e.g. Project Apollo, Vendor Management" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="availability">Availability</Label>
        <Select value={formData.availability} onValueChange={value => handleInputChange("availability", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full_time">Full-time</SelectItem>
            <SelectItem value="part_time">Part-time</SelectItem>
            <SelectItem value="contractor">Contractor</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="skills">Skills</Label>
        <TagInput value={formData.skills || []} onChange={skills => handleInputChange("skills", skills)} placeholder="Enter skills, press Enter or comma to add" />
        <p className="text-xs text-gray-500">Press Enter or comma after each skill</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar URL (optional)</Label>
        <Input id="avatar" value={formData.avatar} onChange={e => handleInputChange("avatar", e.target.value)} placeholder="https://example.com/avatar.jpg" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={e => handleInputChange("notes", e.target.value)} placeholder="Additional information about this peer" rows={3} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData.id ? "Update" : "Add"}</Button>
      </div>
    </form>
  );
}
