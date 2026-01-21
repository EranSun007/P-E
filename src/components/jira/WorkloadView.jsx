import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User } from "lucide-react";

export default function WorkloadView({ issues, mappings = {}, teamMembers = [] }) {
  // Group issues by assignee
  const workloadByAssignee = useMemo(() => {
    const groups = {};

    issues.forEach(issue => {
      const assigneeId = issue.jira_assignee_id || 'unassigned';
      const assigneeName = issue.assignee_name || 'Unassigned';

      if (!groups[assigneeId]) {
        // Check if this assignee is mapped to a team member
        const mapping = mappings[assigneeId];
        const teamMember = mapping ? teamMembers.find(m => m.id === mapping.team_member_id) : null;

        groups[assigneeId] = {
          assigneeId,
          assigneeName,
          teamMember,
          issues: [],
          totalPoints: 0,
          byStatus: { todo: 0, inProgress: 0, done: 0 }
        };
      }

      groups[assigneeId].issues.push(issue);
      groups[assigneeId].totalPoints += parseFloat(issue.story_points) || 0;

      // Categorize by status
      const status = (issue.status || '').toLowerCase();
      if (status.includes('done') || status.includes('closed')) {
        groups[assigneeId].byStatus.done++;
      } else if (status.includes('progress') || status.includes('review')) {
        groups[assigneeId].byStatus.inProgress++;
      } else {
        groups[assigneeId].byStatus.todo++;
      }
    });

    // Sort by total points descending
    return Object.values(groups).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [issues, mappings, teamMembers]);

  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No issues to display workload</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workloadByAssignee.map(group => (
        <Card key={group.assigneeId}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{group.teamMember?.name || group.assigneeName}</span>
              </div>
              <Badge variant="secondary" className="text-lg">
                {group.totalPoints} pts
              </Badge>
            </CardTitle>
            {group.teamMember && group.teamMember.name !== group.assigneeName && (
              <p className="text-xs text-gray-400">Jira: {group.assigneeName}</p>
            )}
          </CardHeader>
          <CardContent>
            {/* Status breakdown */}
            <div className="flex gap-2 mb-3 text-xs">
              <Badge variant="outline" className="bg-gray-100">
                {group.byStatus.todo} To Do
              </Badge>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {group.byStatus.inProgress} In Progress
              </Badge>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {group.byStatus.done} Done
              </Badge>
            </div>

            {/* Issue list (show first 5) */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {group.issues.slice(0, 5).map(issue => (
                <div key={issue.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {issue.issue_key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-gray-500 truncate text-xs">{issue.summary}</p>
                  </div>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {issue.story_points || 0}
                  </Badge>
                </div>
              ))}
              {group.issues.length > 5 && (
                <p className="text-xs text-gray-400 pt-1">
                  +{group.issues.length - 5} more issues
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
