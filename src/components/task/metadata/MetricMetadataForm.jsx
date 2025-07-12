import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MetricMetadataForm({ metadata = {}, onChange }) {
  const updateField = (field, value) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-medium text-lg mb-4">Metric Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">KPI Name</label>
          <Input
            value={metadata.kpi_name || ""}
            onChange={(e) => updateField("kpi_name", e.target.value)}
            placeholder="e.g. Monthly Active Users"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Value</label>
            <Input
              value={metadata.current_value || ""}
              onChange={(e) => updateField("current_value", e.target.value)}
              placeholder="Current metric value"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Target Value</label>
            <Input
              value={metadata.target_value || ""}
              onChange={(e) => updateField("target_value", e.target.value)}
              placeholder="Target metric value"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Measurement Frequency</label>
          <Select
            value={metadata.measurement_frequency || ""}
            onValueChange={(value) => updateField("measurement_frequency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}