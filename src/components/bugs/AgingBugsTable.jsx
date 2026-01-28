// src/components/bugs/AgingBugsTable.jsx
// Table showing open VH/High priority bugs sorted by age with JIRA links

import { useState, useMemo } from 'react';
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
import { ExternalLink, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { differenceInDays } from 'date-fns';

// Age threshold colors (softer muted palette)
const AGE_COLORS = {
  critical: '#E07A5F', // coral - >14 days
  warning: '#D4A574',  // amber - 7-14 days
  healthy: '#81B29A',  // sage - <7 days
};

/**
 * AgeIndicator - Shows colored dot based on bug age
 * @param {Object} props
 * @param {number} props.daysOld - Number of days since bug creation
 */
function AgeIndicator({ daysOld }) {
  const getColor = () => {
    if (daysOld > 14) return AGE_COLORS.critical;
    if (daysOld >= 7) return AGE_COLORS.warning;
    return AGE_COLORS.healthy;
  };

  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: getColor() }}
      />
      <span>{daysOld} days</span>
    </span>
  );
}

/**
 * SortableHeader - Clickable table header with sort indicators
 * @param {Object} props
 * @param {string} props.column - Column key for sorting
 * @param {string} props.label - Display label
 * @param {string} props.sortBy - Currently active sort column
 * @param {string} props.sortOrder - Current sort direction ('asc' | 'desc')
 * @param {Function} props.onSort - Callback when header is clicked
 * @param {string} props.className - Optional additional classes
 */
function SortableHeader({ column, label, sortBy, sortOrder, onSort, className = '' }) {
  const isActive = sortBy === column;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(column);
    }
  };

  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
      onClick={() => onSort(column)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}

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
  // Sorting state - default to age descending (oldest bugs first)
  const [sortBy, setSortBy] = useState('age');
  const [sortOrder, setSortOrder] = useState('desc');

  // Handle column header click for sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Switch to new column, default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filter to VH/High priority bugs that are still open, then sort
  const sortedBugs = useMemo(() => {
    // First filter to VH/High priority bugs that are still open
    const filtered = bugs
      .filter(
        (bug) =>
          ['Very High', 'High'].includes(bug.priority) &&
          OPEN_STATUSES.includes(bug.status)
      )
      .slice(0, 20); // Limit to top 20

    // Then sort based on current sort state
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'key':
          aVal = a.bug_key.toLowerCase();
          bVal = b.bug_key.toLowerCase();
          break;
        case 'summary':
          aVal = a.summary.toLowerCase();
          bVal = b.summary.toLowerCase();
          break;
        case 'priority':
          // "Very High" should sort before "High"
          aVal = a.priority === 'Very High' ? 0 : 1;
          bVal = b.priority === 'Very High' ? 0 : 1;
          break;
        case 'component':
          aVal = (a.component || '').toLowerCase();
          bVal = (b.component || '').toLowerCase();
          break;
        case 'age':
          // Older bugs (earlier created_date) should have higher age value
          aVal = new Date(a.created_date);
          bVal = new Date(b.created_date);
          // Invert for age: earlier date = older = should be "larger" for desc
          [aVal, bVal] = [bVal, aVal];
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'assignee':
          aVal = (a.assignee || 'zzz').toLowerCase(); // Unassigned last
          bVal = (b.assignee || 'zzz').toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [bugs, sortBy, sortOrder]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aging High-Priority Bugs</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({sortedBugs.length} open VH/High bugs)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedBugs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No open VH/High bugs - great job!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="key" label="Key" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[120px]" />
                <SortableHeader column="summary" label="Summary" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader column="priority" label="Priority" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[100px]" />
                <SortableHeader column="component" label="Component" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[140px]" />
                <SortableHeader column="age" label="Age" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[100px]" />
                <SortableHeader column="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[120px]" />
                <SortableHeader column="assignee" label="Assignee" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="w-[150px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBugs.map((bug) => {
                const daysOld = differenceInDays(new Date(), new Date(bug.created_date));
                return (
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

                    {/* Component Badge */}
                    <TableCell>
                      {bug.component ? (
                        <Badge variant="secondary">{bug.component}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>

                    {/* Age - colored indicator based on thresholds */}
                    <TableCell>
                      <AgeIndicator daysOld={daysOld} />
                    </TableCell>

                    {/* Status */}
                    <TableCell>{bug.status}</TableCell>

                    {/* Assignee */}
                    <TableCell className="text-muted-foreground">
                      {bug.assignee || 'Unassigned'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default AgingBugsTable;
