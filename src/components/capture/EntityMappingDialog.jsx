// src/components/capture/EntityMappingDialog.jsx
import { useState, useEffect, useMemo } from "react";
import { Project, TeamMember } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Link2,
  Search,
  Sparkles,
  FolderKanban,
  User,
  Server,
} from "lucide-react";

// Entity type configuration
const ENTITY_TYPES = {
  project: {
    label: "Project",
    icon: FolderKanban,
    nameField: "name",
  },
  team_member: {
    label: "Team Member",
    icon: User,
    nameField: "name",
  },
  service: {
    label: "Service",
    icon: Server,
    nameField: "name",
  },
};

// Simple case-insensitive contains matching for auto-suggest
function findBestMatches(searchName, entities, nameField, limit = 3) {
  if (!searchName || !entities?.length) return [];

  const searchLower = searchName.toLowerCase().trim();
  const words = searchLower.split(/\s+/);

  // Score entities by match quality
  const scored = entities.map(entity => {
    const name = (entity[nameField] || "").toLowerCase();
    let score = 0;

    // Exact match gets highest score
    if (name === searchLower) {
      score = 100;
    }
    // Contains full search term
    else if (name.includes(searchLower)) {
      score = 80;
    }
    // Starts with search term
    else if (name.startsWith(searchLower)) {
      score = 70;
    }
    // Contains all words
    else if (words.every(w => name.includes(w))) {
      score = 50 + (words.length * 5);
    }
    // Contains some words
    else {
      const matchingWords = words.filter(w => name.includes(w));
      score = matchingWords.length * 10;
    }

    return { entity, score };
  });

  // Return top matches with score > 0
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entity);
}

export default function EntityMappingDialog({
  open,
  onOpenChange,
  inboxItem,
  onAccept,
}) {
  const [entityType, setEntityType] = useState("project");
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [createMapping, setCreateMapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load entities when dialog opens or type changes
  useEffect(() => {
    if (open && entityType) {
      loadEntities(entityType);
    }
  }, [open, entityType]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEntity(null);
      setSearchQuery("");
      setError(null);
      setCreateMapping(true);
    }
  }, [open]);

  const loadEntities = async (type) => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      switch (type) {
        case "project":
          data = await Project.list();
          break;
        case "team_member":
          data = await TeamMember.list();
          break;
        case "service":
          // Services might use Project with a filter or separate endpoint
          // For now, treat as projects (can be refined)
          data = await Project.list();
          break;
        default:
          data = [];
      }
      setEntities(data || []);
    } catch (err) {
      console.error("Failed to load entities:", err);
      setError("Failed to load entities");
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  // Get the name from captured data for auto-suggest
  const capturedName = useMemo(() => {
    if (!inboxItem?.captured_data) return "";
    const data = typeof inboxItem.captured_data === "string"
      ? JSON.parse(inboxItem.captured_data)
      : inboxItem.captured_data;
    // Try common name fields
    return data.name || data.title || data.summary || inboxItem.source_identifier || "";
  }, [inboxItem]);

  // Auto-suggested entities based on captured name
  const suggestedEntities = useMemo(() => {
    const config = ENTITY_TYPES[entityType];
    if (!config || !capturedName) return [];
    return findBestMatches(capturedName, entities, config.nameField);
  }, [capturedName, entities, entityType]);

  // Filtered entities based on search
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const config = ENTITY_TYPES[entityType];
    const searchLower = searchQuery.toLowerCase();
    return entities.filter(e =>
      (e[config.nameField] || "").toLowerCase().includes(searchLower)
    );
  }, [entities, searchQuery, entityType]);

  const handleAccept = async () => {
    setSaving(true);
    setError(null);
    try {
      await onAccept({
        inboxItemId: inboxItem.id,
        target_entity_type: entityType,
        target_entity_id: selectedEntity?.id,
        create_mapping: createMapping && selectedEntity?.id,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to accept item:", err);
      setError(err.message || "Failed to accept item");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onOpenChange(false);
    }
  };

  const TypeIcon = ENTITY_TYPES[entityType]?.icon || FolderKanban;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Map to Entity
          </DialogTitle>
          <DialogDescription>
            Choose how to map this captured item to a P&E Manager entity.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Captured item info */}
          {capturedName && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Captured: </span>
              <span className="font-medium">{capturedName}</span>
            </div>
          )}

          {/* Entity type selector */}
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENTITY_TYPES).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Entity search and selection */}
          <div className="space-y-2">
            <Label>Select Entity</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${ENTITY_TYPES[entityType]?.label || "entities"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {/* Auto-suggested entities */}
                  {suggestedEntities.length > 0 && !searchQuery && (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500">
                        <Sparkles className="h-3 w-3" />
                        Suggested matches
                      </div>
                      {suggestedEntities.map((entity) => (
                        <button
                          key={`suggested-${entity.id}`}
                          onClick={() => setSelectedEntity(entity)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                            selectedEntity?.id === entity.id
                              ? "bg-blue-100 text-blue-900"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-800"
                          }`}
                        >
                          <TypeIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{entity[ENTITY_TYPES[entityType].nameField]}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Suggested
                          </Badge>
                        </button>
                      ))}
                      <div className="border-t my-2" />
                    </>
                  )}

                  {/* All entities (filtered) */}
                  {filteredEntities.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">
                      No {ENTITY_TYPES[entityType]?.label || "entities"} found
                    </p>
                  ) : (
                    filteredEntities
                      .filter(e => !suggestedEntities.find(s => s.id === e.id) || searchQuery)
                      .map((entity) => (
                        <button
                          key={entity.id}
                          onClick={() => setSelectedEntity(entity)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                            selectedEntity?.id === entity.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <TypeIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{entity[ENTITY_TYPES[entityType].nameField]}</span>
                        </button>
                      ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected entity display */}
          {selectedEntity && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
              <TypeIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-800">
                Selected: <strong>{selectedEntity[ENTITY_TYPES[entityType].nameField]}</strong>
              </span>
            </div>
          )}

          {/* Create mapping checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="create-mapping"
              checked={createMapping}
              onCheckedChange={setCreateMapping}
              disabled={!selectedEntity}
            />
            <Label
              htmlFor="create-mapping"
              className={`text-sm ${!selectedEntity ? "text-gray-400" : ""}`}
            >
              Remember this mapping for future captures
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
