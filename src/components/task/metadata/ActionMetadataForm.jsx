import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function ActionMetadataForm({ metadata = {}, onChange }) {
  const updateField = (field, value) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };
  
  const handleDependenciesChange = (value) => {
    updateField("dependencies", 
      value.split(',').map(item => item.trim()).filter(Boolean)
    );
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-medium text-lg mb-4">Action Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Expected Outcome</label>
          <Textarea
            value={metadata.outcome || ""}
            onChange={(e) => updateField("outcome", e.target.value)}
            placeholder="What should be accomplished by this action item"
            className="h-24"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dependencies</label>
          <Input
            value={metadata.dependencies?.join(", ") || ""}
            onChange={(e) => handleDependenciesChange(e.target.value)}
            placeholder="Comma-separated list of dependencies"
          />
        </div>
      </div>
    </div>
  );
}