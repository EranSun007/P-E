// src/components/bugs/AgingBugsTable.jsx
// Table showing open VH/High priority bugs sorted by age with JIRA links

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// JIRA base URL - configurable via environment variable
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL || 'https://jira.tools.sap/browse/';

// Statuses considered "open" for aging calculation
const OPEN_STATUSES = ['Open', 'Author Action', 'In Progress', 'Reopened'];

/**
 * AgingBugsTable Component
 *
 * Displays a table of open VH/High priority bugs sorted by age.
 * Each bug key links directly to JIRA for quick access.
 *
 * @param {Object} props
 * @param {Array} props.bugs - Array of bug objects from the API
 */
export function AgingBugsTable({ bugs = [] }) {
  // Filter to VH/High priority bugs that are still open
  // API returns bugs sorted by priority and created_date, so we just filter and slice
  const agingBugs = bugs
    .filter(
      (bug) =>
        ['Very High', 'High'].includes(bug.priority) &&
        OPEN_STATUSES.includes(bug.status)
    )
    .slice(0, 20); // Limit to top 20

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aging High-Priority Bugs</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({agingBugs.length} open VH/High bugs)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agingBugs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No open VH/High bugs - great job!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Key</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[100px]">Age</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingBugs.map((bug) => (
                <TableRow key={bug.id}>
                  {/* Bug Key - clickable link to JIRA */}
                  <TableCell>
                    <a
                      href={`${JIRA_BASE_URL}${bug.bug_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {bug.bug_key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>

                  {/* Summary - truncated for long text */}
                  <TableCell className="max-w-[300px] truncate" title={bug.summary}>
                    {bug.summary}
                  </TableCell>

                  {/* Priority Badge */}
                  <TableCell>
                    <Badge
                      variant={bug.priority === 'Very High' ? 'destructive' : 'secondary'}
                    >
                      {bug.priority}
                    </Badge>
                  </TableCell>

                  {/* Age - human-readable duration */}
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(bug.created_date), { addSuffix: false })}
                  </TableCell>

                  {/* Status */}
                  <TableCell>{bug.status}</TableCell>

                  {/* Assignee */}
                  <TableCell className="text-muted-foreground">
                    {bug.assignee || 'Unassigned'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default AgingBugsTable;
