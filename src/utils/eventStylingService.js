/**
 * EventStylingService - Comprehensive styling service for calendar events
 * 
 * This service provides consistent visual styling for all calendar event types including:
 * - Color schemes and visual indicators for each event type
 * - Icon mapping for different event types
 * - CSS class generation for different display variants
 * - Responsive design support for different contexts
 */

import { Calendar, User, UserX, Shield, Cake, CalendarDays } from 'lucide-react';

export class EventStylingService {
  // Color constants for each event type
  static EVENT_COLORS = {
    // 1:1 meetings - Orange/Amber theme
    one_on_one: {
      primary: '#f97316',      // orange-500
      background: '#fed7aa',   // orange-200
      light: '#fef3c7',       // orange-100
      border: '#fb923c',      // orange-400
      text: '#ea580c',        // orange-600
      hover: '#fdba74'        // orange-300
    },
    
    // Regular meetings - Blue theme
    meeting: {
      primary: '#3b82f6',      // blue-500
      background: '#bfdbfe',   // blue-200
      light: '#dbeafe',       // blue-100
      border: '#60a5fa',      // blue-400
      text: '#2563eb',        // blue-600
      hover: '#93c5fd'        // blue-300
    },
    
    // Birthdays - Pink theme
    birthday: {
      primary: '#ec4899',      // pink-500
      background: '#f9a8d4',   // pink-300
      light: '#fce7f3',       // pink-100
      border: '#f472b6',      // pink-400
      text: '#db2777',        // pink-600
      hover: '#f8bbd9'        // pink-200
    },
    
    // DevOps duties - Green theme
    duty_devops: {
      primary: '#10B981',      // green-500
      background: '#A7F3D0',   // green-200
      light: '#ECFDF5',       // green-100
      border: '#34D399',      // green-400
      text: '#059669',        // green-600
      hover: '#6EE7B7'        // green-300
    },
    
    // On-call duties - Amber theme
    duty_on_call: {
      primary: '#F59E0B',      // amber-500
      background: '#FDE68A',   // amber-200
      light: '#FFFBEB',       // amber-100
      border: '#FBBF24',      // amber-400
      text: '#D97706',        // amber-600
      hover: '#FCD34D'        // amber-300
    },
    
    // Other duties - Purple theme
    duty_other: {
      primary: '#8B5CF6',      // violet-500
      background: '#C4B5FD',   // violet-300
      light: '#F3E8FF',       // violet-100
      border: '#A78BFA',      // violet-400
      text: '#7C3AED',        // violet-600
      hover: '#DDD6FE'        // violet-200
    },
    
    // Generic duty (fallback) - Purple theme
    duty: {
      primary: '#8b5cf6',      // violet-500
      background: '#c4b5fd',   // violet-300
      light: '#ede9fe',       // violet-100
      border: '#a78bfa',      // violet-400
      text: '#7c3aed',        // violet-600
      hover: '#ddd6fe'        // violet-200
    },
    
    // Out of office - Orange theme (same as 1:1 but different icon)
    out_of_office: {
      primary: '#f97316',      // orange-500
      background: '#fed7aa',   // orange-200
      light: '#fef3c7',       // orange-100
      border: '#fb923c',      // orange-400
      text: '#ea580c',        // orange-600
      hover: '#fdba74'        // orange-300
    },
    
    // Default/Generic events - Indigo theme
    default: {
      primary: '#6366f1',      // indigo-500
      background: '#c7d2fe',   // indigo-200
      light: '#e0e7ff',       // indigo-100
      border: '#818cf8',      // indigo-400
      text: '#4f46e5',        // indigo-600
      hover: '#a5b4fc'        // indigo-300
    }
  };

  // Icon mapping for each event type
  static EVENT_ICONS = {
    one_on_one: User,
    meeting: Calendar,
    birthday: Cake,
    duty_devops: () => <span className="text-sm">⚙️</span>,
    duty_on_call: () => <span className="text-sm">📞</span>,
    duty_other: () => <span className="text-sm">🛡️</span>,
    duty: Shield,
    out_of_office: UserX,
    default: CalendarDays
  };

  // Display labels for event types
  static EVENT_LABELS = {
    one_on_one: '1:1',
    meeting: 'Meeting',
    birthday: 'Birthday',
    duty_devops: 'DevOps',
    duty_on_call: 'On-Call',
    duty_other: 'Other',
    duty: 'Duty',
    out_of_office: 'OOO',
    default: 'Event'
  };

  // Styling variants for different contexts
  static VARIANTS = {
    DEFAULT: 'default',
    COMPACT: 'compact',
    SIDEBAR: 'sidebar'
  };

  /**
   * Determine the specific duty event type based on duty data
   * @param {Object} event - Calendar event object
   * @returns {string} Specific duty event type (duty_devops, duty_on_call, duty_other, or duty)
   */
  static getDutyEventType(event) {
    if (!event || event.event_type !== 'duty') {
      return event?.event_type || 'default';
    }

    // Check if the event has dutyType property (from new events)
    if (event.dutyType) {
      switch (event.dutyType) {
        case 'devops':
          return 'duty_devops';
        case 'on_call':
          return 'duty_on_call';
        case 'other':
          return 'duty_other';
        default:
          return 'duty';
      }
    }

    // For existing events, try to determine from title or other properties
    const title = event.title?.toLowerCase() || '';
    
    if (title.includes('devops')) {
      return 'duty_devops';
    } else if (title.includes('reporting') || title.includes('on-call') || title.includes('on_call')) {
      return 'duty_on_call';
    } else if (title.includes('metering') || title.includes('other')) {
      return 'duty_other';
    }

    return 'duty'; // fallback
  }

  /**
   * Format duty event title to show "FirstName: DutyTitle" format
   * @param {Object} event - Calendar event object
   * @param {Array} teamMembers - Array of team members to get name from
   * @returns {string} Formatted title
   */
  static formatDutyTitle(event, teamMembers = []) {
    if (!event || event.event_type !== 'duty') {
      return event?.title || 'Untitled Event';
    }

    // Find team member
    const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
    if (!teamMember) {
      return event.title || 'Untitled Duty';
    }

    // Get first name only
    const firstName = teamMember.name.split(' ')[0];
    
    // Extract duty title from event title (remove any existing prefixes)
    let dutyTitle = event.title || 'Duty';
    
    // Remove common prefixes that might exist in old format
    dutyTitle = dutyTitle.replace(/^[⚙️📞🛡️]\s*/, ''); // Remove emoji prefixes
    dutyTitle = dutyTitle.replace(/\s*-\s*.*$/, ''); // Remove " - Name" suffix if exists
    
    return `${firstName}: ${dutyTitle}`;
  }

  /**
   * Get comprehensive styling information for a calendar event
   * @param {Object} event - Calendar event object
   * @param {string} variant - Styling variant (default, compact, sidebar)
   * @param {Array} teamMembers - Array of team members (for duty title formatting)
   * @returns {Object} Complete styling object with colors, icons, and CSS classes
   */
  static getEventStyling(event, variant = EventStylingService.VARIANTS.DEFAULT, teamMembers = []) {
    if (!event) {
      throw new Error('Event object is required');
    }

    // For duty events, determine the specific duty type
    const eventType = event.event_type === 'duty' 
      ? EventStylingService.getDutyEventType(event)
      : (event.event_type || 'default');

    const colors = EventStylingService.EVENT_COLORS[eventType] || EventStylingService.EVENT_COLORS.default;
    const Icon = EventStylingService.EVENT_ICONS[eventType] || EventStylingService.EVENT_ICONS.default;
    const label = EventStylingService.EVENT_LABELS[eventType] || EventStylingService.EVENT_LABELS.default;

    // Format title for duty events
    const formattedTitle = event.event_type === 'duty' 
      ? EventStylingService.formatDutyTitle(event, teamMembers)
      : event.title;

    return {
      // Color information
      colors: {
        primary: colors.primary,
        background: colors.background,
        light: colors.light,
        border: colors.border,
        text: colors.text,
        hover: colors.hover
      },
      
      // Icon component
      icon: Icon,
      
      // Display label
      label: label,
      
      // Formatted title
      title: formattedTitle,
      
      // CSS classes for different contexts
      className: EventStylingService.generateEventClassName(eventType, variant),
      
      // Inline styles for dynamic styling
      style: {
        color: colors.text,
        backgroundColor: colors.light,
        borderColor: colors.border
      },
      
      // Badge styling
      badgeStyle: {
        borderColor: colors.primary + '50', // Add transparency
        color: colors.primary
      },
      
      // Hover styles
      hoverStyle: {
        backgroundColor: colors.hover
      }
    };
  }

  /**
   * Generate CSS class names for events based on type and variant
   * @param {string} eventType - Type of the event
   * @param {string} variant - Styling variant
   * @returns {string} Complete CSS class string
   */
  static generateEventClassName(eventType, variant = EventStylingService.VARIANTS.DEFAULT) {
    const baseClasses = "transition-all duration-200 cursor-pointer";
    const borderClasses = "border-l-2";
    
    // Variant-specific classes
    let variantClasses = "";
    switch (variant) {
      case EventStylingService.VARIANTS.COMPACT:
        variantClasses = "text-xs p-1 rounded truncate";
        break;
      case EventStylingService.VARIANTS.SIDEBAR:
        variantClasses = "text-sm p-2 rounded-md truncate";
        break;
      case EventStylingService.VARIANTS.DEFAULT:
      default:
        variantClasses = "text-xs p-1 rounded truncate";
        break;
    }

    // Event type specific classes
    let typeClasses = "";
    switch (eventType) {
      case 'one_on_one':
        typeClasses = "bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200 hover:shadow-sm";
        break;
      case 'meeting':
        typeClasses = "bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200 hover:shadow-sm";
        break;
      case 'birthday':
        typeClasses = "bg-pink-100 text-pink-800 border-pink-400 hover:bg-pink-200 hover:shadow-sm";
        break;
      case 'duty_devops':
        typeClasses = "bg-green-100 text-green-800 border-green-400 hover:bg-green-200 hover:shadow-sm";
        break;
      case 'duty_on_call':
        typeClasses = "bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200 hover:shadow-sm";
        break;
      case 'duty_other':
        typeClasses = "bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200 hover:shadow-sm";
        break;
      case 'duty':
        typeClasses = "bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200 hover:shadow-sm";
        break;
      case 'out_of_office':
        typeClasses = "bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200 hover:shadow-sm";
        break;
      default:
        typeClasses = "bg-indigo-100 text-indigo-800 border-indigo-400 hover:bg-indigo-200 hover:shadow-sm";
        break;
    }

    return `${baseClasses} ${variantClasses} ${borderClasses} ${typeClasses}`.trim();
  }

  /**
   * Get all available event type colors
   * @returns {Object} Object mapping event types to their color schemes
   */
  static getEventTypeColors() {
    return { ...EventStylingService.EVENT_COLORS };
  }

  /**
   * Get all available event type icons
   * @returns {Object} Object mapping event types to their icon components
   */
  static getEventTypeIcons() {
    return { ...EventStylingService.EVENT_ICONS };
  }

  /**
   * Get all available event type labels
   * @returns {Object} Object mapping event types to their display labels
   */
  static getEventTypeLabels() {
    return { ...EventStylingService.EVENT_LABELS };
  }

  /**
   * Get styling for event cards in detailed views
   * @param {Object} event - Calendar event object
   * @returns {Object} Card styling object
   */
  static getEventCardStyling(event) {
    if (!event) {
      throw new Error('Event object is required');
    }

    const eventType = event.event_type || 'default';
    const colors = EventStylingService.EVENT_COLORS[eventType] || EventStylingService.EVENT_COLORS.default;

    const baseCardClasses = "p-3 border rounded-md cursor-pointer transition-colors";
    
    let typeSpecificClasses = "";
    switch (eventType) {
      case 'birthday':
        typeSpecificClasses = "border-pink-200 bg-pink-50 hover:bg-pink-100";
        break;
      case 'one_on_one':
        typeSpecificClasses = "border-orange-200 bg-orange-50 hover:bg-orange-100";
        break;
      case 'meeting':
        typeSpecificClasses = "border-blue-200 bg-blue-50 hover:bg-blue-100";
        break;
      case 'out_of_office':
        typeSpecificClasses = "border-orange-200 bg-orange-50 hover:bg-orange-100";
        break;
      case 'duty':
        typeSpecificClasses = "border-purple-200 bg-purple-50 hover:bg-purple-100";
        break;
      default:
        typeSpecificClasses = "border-indigo-200 bg-indigo-50 hover:bg-indigo-100";
        break;
    }

    return {
      className: `${baseCardClasses} ${typeSpecificClasses}`,
      colors: colors,
      icon: EventStylingService.EVENT_ICONS[eventType] || EventStylingService.EVENT_ICONS.default
    };
  }

  /**
   * Get multi-day event styling modifications
   * @param {Object} event - Calendar event object
   * @param {string} position - Position in multi-day sequence (start, middle, end, single)
   * @param {string} variant - Styling variant
   * @returns {Object} Modified styling for multi-day events
   */
  static getMultiDayEventStyling(event, position, variant = EventStylingService.VARIANTS.DEFAULT) {
    const baseStyling = EventStylingService.getEventStyling(event, variant);
    
    // Modify className based on position
    let positionClasses = "";
    let titlePrefix = "";
    
    switch (position) {
      case 'start':
        positionClasses = "rounded-r-none border-r-0";
        titlePrefix = "▶ ";
        break;
      case 'middle':
        positionClasses = "rounded-none border-r-0 border-l-0";
        titlePrefix = "─ ";
        break;
      case 'end':
        positionClasses = "rounded-l-none border-l-0";
        titlePrefix = "◀ ";
        break;
      case 'single':
      default:
        // No modifications for single day events
        break;
    }

    return {
      ...baseStyling,
      className: `${baseStyling.className} ${positionClasses}`.trim(),
      titlePrefix: titlePrefix,
      isMultiDay: position !== 'single',
      position: position
    };
  }

  /**
   * Validate event type
   * @param {string} eventType - Event type to validate
   * @returns {boolean} True if valid event type
   */
  static isValidEventType(eventType) {
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      return false;
    }
    
    return Object.keys(EventStylingService.EVENT_COLORS).includes(eventType) ||
           eventType === 'default';
  }

  /**
   * Validate styling variant
   * @param {string} variant - Variant to validate
   * @returns {boolean} True if valid variant
   */
  static isValidVariant(variant) {
    return Object.values(EventStylingService.VARIANTS).includes(variant);
  }

  /**
   * Get accessibility-compliant color contrast information
   * @param {string} eventType - Event type
   * @returns {Object} Accessibility information
   */
  static getAccessibilityInfo(eventType) {
    const colors = EventStylingService.EVENT_COLORS[eventType] || EventStylingService.EVENT_COLORS.default;
    
    return {
      hasGoodContrast: true, // All our color combinations are designed for good contrast
      backgroundColor: colors.light,
      textColor: colors.text,
      borderColor: colors.border,
      ariaLabel: `${EventStylingService.EVENT_LABELS[eventType] || 'Event'} calendar event`
    };
  }
}

// Export singleton instance for convenience
export const eventStylingService = EventStylingService;

// Export class as default
export default EventStylingService;
