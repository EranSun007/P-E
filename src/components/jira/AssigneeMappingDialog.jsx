import { useState, useEffect } from "react";
import { JiraMapping, TeamMember } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AssigneeMappingDialog({
  open,
  onOpenChange,
  jiraAssignees = [],
  onMappingsUpdated
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load team members and existing mappings when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [members, existingMappings] = await Promise.all([
        TeamMember.list(),
        JiraMapping.list()
      ]);

      setTeamMembers(members);

      // Convert mappings array to object keyed by jira_assignee_id
      const mappingsObj = {};
      existingMappings.forEach(m => {
        mappingsObj[m.jira_assignee_id] = m;
      });
      setMappings(mappingsObj);
    } catch (err) {
      console.error('Failed to load mapping data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = async (jiraAssigneeId, jiraAssigneeName, teamMemberId) => {
    setSaving(true);
    setError(null);

    try {
      const existingMapping = mappings[jiraAssigneeId];

      if (teamMemberId === 'none') {
        // Remove mapping
        if (existingMapping) {
          await JiraMapping.delete(existingMapping.id);
          const newMappings = { ...mappings };
          delete newMappings[jiraAssigneeId];
          setMappings(newMappings);
        }
      } else if (existingMapping) {
        // Update existing mapping
        const updated = await JiraMapping.update(existingMapping.id, {
          team_member_id: teamMemberId
        });
        setMappings(prev => ({
          ...prev,
          [jiraAssigneeId]: updated
        }));
      } else {
        // Create new mapping
        const created = await JiraMapping.create({
          jira_assignee_id: jiraAssigneeId,
          jira_assignee_name: jiraAssigneeName,
          team_member_id: teamMemberId
        });
        setMappings(prev => ({
          ...prev,
          [jiraAssigneeId]: created
        }));
      }
    } catch (err) {
      console.error('Failed to save mapping:', err);
      setError('Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (onMappingsUpdated) {
      onMappingsUpdated(mappings);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Jira Assignees to Team Members
          </DialogTitle>
          <DialogDescription>
            Map Jira users to your P&E Manager team members for better workload tracking.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {jiraAssignees.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No Jira assignees found. Sync some issues first.
              </p>
            ) : (
              jiraAssignees.map(assignee => (
                <div
                  key={assignee.id}
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {assignee.name}
                    </span>
                  </div>
                  <Select
                    value={mappings[assignee.id]?.team_member_id || 'none'}
                    onValueChange={(value) => handleMappingChange(assignee.id, assignee.name, value)}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Not linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Done'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
