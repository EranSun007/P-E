// src/components/sync/TeamDepartmentTabs.jsx
// Team department filter tabs

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAM_DEPARTMENTS } from "@/contexts/SyncContext";

export function TeamDepartmentTabs({ value, onValueChange }) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        {TEAM_DEPARTMENTS.map(dept => (
          <TabsTrigger key={dept.id} value={dept.id}>
            {dept.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
