import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, UserX, Shield, Cake, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewModeManager } from '@/services/viewModeManager';

/**
 * ViewModeSelector - Tab-style interface for switching calendar view modes
 * 
 * Features:
 * - Tab-style interface with event count badges
 * - Keyboard navigation support (arrow keys, Enter, Space)
 * - Accessibility compliant with ARIA labels and roles
 * - Visual feedback for active/hover states
 * - Event count display for each view mode
 */
export default function ViewModeSelector({ 
  currentViewMode, 
  onViewModeChange, 
  eventCounts = {},
  className = '',
  disabled = false 
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tabsRef = useRef([]);
  
  // Icon mapping for each view mode
  const getViewModeIcon = (viewMode) => {
    switch (viewMode) {
      case ViewModeManager.VIEW_MODES.MEETINGS:
        return Calendar;
      case ViewModeManager.VIEW_MODES.OUT_OF_OFFICE:
        return UserX;
      case ViewModeManager.VIEW_MODES.DUTIES:
        return Shield;
      case ViewModeManager.VIEW_MODES.BIRTHDAYS:
        return Cake;
      case ViewModeManager.VIEW_MODES.ALL_EVENTS:
        return CalendarDays;
      default:
        return Calendar;
    }
  };

  // Get available view modes from ViewModeManager
  const viewModes = ViewModeManager.prototype.getAvailableViewModes();

  // Handle keyboard navigation
  const handleKeyDown = (event, index) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = index > 0 ? index - 1 : viewModes.length - 1;
        setFocusedIndex(prevIndex);
        tabsRef.current[prevIndex]?.focus();
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = index < viewModes.length - 1 ? index + 1 : 0;
        setFocusedIndex(nextIndex);
        tabsRef.current[nextIndex]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!disabled) {
          onViewModeChange(viewModes[index].id);
        }
        break;
        
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        tabsRef.current[0]?.focus();
        break;
        
      case 'End':
        event.preventDefault();
        const lastIndex = viewModes.length - 1;
        setFocusedIndex(lastIndex);
        tabsRef.current[lastIndex]?.focus();
        break;
    }
  };

  // Handle click events
  const handleClick = (viewMode) => {
    if (!disabled) {
      onViewModeChange(viewMode);
    }
  };

  // Reset focus when view mode changes externally
  useEffect(() => {
    setFocusedIndex(-1);
  }, [currentViewMode]);

  return (
    <div 
      className={cn(
        "flex items-center space-x-1 bg-gray-100 rounded-lg p-1",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="tablist"
      aria-label="Calendar view modes"
    >
      {viewModes.map((viewMode, index) => {
        const Icon = getViewModeIcon(viewMode.id);
        const isActive = currentViewMode === viewMode.id;
        const eventCount = eventCounts[viewMode.id] || 0;
        
        return (
          <Button
            key={viewMode.id}
            ref={(el) => (tabsRef.current[index] = el)}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "relative flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              isActive && "bg-white shadow-sm text-blue-600",
              !isActive && "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              disabled && "cursor-not-allowed opacity-50"
            )}
            onClick={() => handleClick(viewMode.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            role="tab"
            aria-selected={isActive}
            aria-controls={`calendar-panel-${viewMode.id}`}
            tabIndex={focusedIndex === index ? 0 : -1}
            title={viewMode.description}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{viewMode.label}</span>
            
            {/* Event count badge */}
            {eventCount > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "outline"}
                className={cn(
                  "ml-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center",
                  isActive && "bg-blue-100 text-blue-700 border-blue-200",
                  !isActive && "bg-gray-200 text-gray-600 border-gray-300"
                )}
                aria-label={`${eventCount} ${viewMode.label.toLowerCase()}`}
              >
                {eventCount > 99 ? '99+' : eventCount}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}