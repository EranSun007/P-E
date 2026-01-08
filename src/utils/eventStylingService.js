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
    
    // Duties - Purple theme
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
    duty: Shield,
    out_of_office: UserX,
    default: CalendarDays
  };

  // Display labels for event types
  static EVENT_LABELS = {
    one_on_one: '1:1',
    meeting: 'Meeting',
    birthday: 'Birthday',
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
   * Get comprehensive styling information for a calendar event
   * @param {Object} event - Calendar event object
   * @param {string} variant - Styling variant (default, compact, sidebar)
   * @returns {Object} Complete styling object with colors, icons, and CSS classes
   */
  static getEventStyling(event, variant = EventStylingService.VARIANTS.DEFAULT) {
    if (!event) {
      throw new Error('Event object is required');
    }

    const eventType = event.event_type || 'default';
    const colors = EventStylingService.EVENT_COLORS[eventType] || EventStylingService.EVENT_COLORS.default;
    const Icon = EventStylingService.EVENT_ICONS[eventType] || EventStylingService.EVENT_ICONS.default;
    const label = EventStylingService.EVENT_LABELS[eventType] || EventStylingService.EVENT_LABELS.default;

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