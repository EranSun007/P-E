/**
 * Context Indicator Component
 * Shows the current page context in the AI chat panel
 */

import React from 'react';
import { RefreshCw, ChevronDown, ChevronUp, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Map page paths to display names
 */
const PAGE_NAMES = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/projects': 'Projects',
  '/team': 'Team',
  '/stakeholders': 'Stakeholders',
  '/duties': 'Duties',
  '/metrics': 'Metrics',
  '/settings': 'Settings',
  '/peers': 'Peers'
};

/**
 * Get display name for a page path
 */
function getPageName(path) {
  // Handle exact matches
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];

  // Handle parameterized routes like /projects/123
  const basePath = '/' + (path.split('/')[1] || '');
  return PAGE_NAMES[basePath] || 'Page';
}

export function ContextIndicator({
  pageContext,
  contextTimestamp,
  isStale,
  stalenessMinutes,
  expanded,
  onToggleExpanded,
  onRefresh,
  className
}) {
  if (!pageContext) {
    return null;
  }

  const pageName = getPageName(pageContext.page || '/');
  const hasSelection = pageContext.selection?.id;

  return (
    <div
      className={cn(
        'border-b bg-muted/30',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{pageName} context</span>
          {hasSelection && (
            <span className="text-xs text-muted-foreground">
              (item selected)
            </span>
          )}
          {isStale && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">{stalenessMinutes}m ago</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6',
              isStale && 'text-amber-600 hover:text-amber-700'
            )}
            onClick={onRefresh}
            title="Refresh context"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleExpanded}
            title={expanded ? 'Collapse context' : 'Expand context'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && pageContext.summary && (
        <div className="px-3 pb-2">
          <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {pageContext.summary}
          </div>
          {contextTimestamp && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Context captured: {new Date(contextTimestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContextIndicator;
