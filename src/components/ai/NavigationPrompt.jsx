/**
 * Navigation Prompt Component
 * Shows when user navigates to a different page while chat is open
 */

import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

function getPageName(path) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const basePath = '/' + (path.split('/')[1] || '');
  return PAGE_NAMES[basePath] || 'Page';
}

export function NavigationPrompt({
  currentPath,
  onRefresh,
  onDismiss
}) {
  const pageName = getPageName(currentPath);

  return (
    <div className="mx-3 my-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Page changed
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            You navigated to {pageName}. Refresh context?
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Context
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
          onClick={onDismiss}
        >
          Keep Current
        </Button>
      </div>
    </div>
  );
}

export default NavigationPrompt;
