/**
 * Unit tests for EventStylingService
 * 
 * Tests cover:
 * - Color assignment for each event type
 * - Icon mapping correctness
 * - CSS class generation for different variants
 * - Multi-day event styling
 * - Accessibility compliance
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import EventStylingService from '../eventStylingService.js';
import { Calendar, User, UserX, Shield, Cake, CalendarDays } from 'lucide-react';

describe('EventStylingService', () => {
  describe('Color Constants', () => {
    it('should have correct color schemes for all event types', () => {
      const colors = EventStylingService.EVENT_COLORS;
      
      // Test 1:1 meetings - Orange theme
      expect(colors.one_on_one.primary).toBe('#f97316');
      expect(colors.one_on_one.text).toBe('#ea580c');
      expect(colors.one_on_one.background).toBe('#fed7aa');
      expect(colors.one_on_one.light).toBe('#fef3c7');
      expect(colors.one_on_one.border).toBe('#fb923c');
      expect(colors.one_on_one.hover).toBe('#fdba74');
      
      // Test regular meetings - Blue theme
      expect(colors.meeting.primary).toBe('#3b82f6');
      expect(colors.meeting.text).toBe('#2563eb');
      expect(colors.meeting.background).toBe('#bfdbfe');
      expect(colors.meeting.light).toBe('#dbeafe');
      expect(colors.meeting.border).toBe('#60a5fa');
      expect(colors.meeting.hover).toBe('#93c5fd');
      
      // Test birthdays - Pink theme
      expect(colors.birthday.primary).toBe('#ec4899');
      expect(colors.birthday.text).toBe('#db2777');
      expect(colors.birthday.background).toBe('#f9a8d4');
      expect(colors.birthday.light).toBe('#fce7f3');
      expect(colors.birthday.border).toBe('#f472b6');
      expect(colors.birthday.hover).toBe('#f8bbd9');
      
      // Test duties - Purple theme
      expect(colors.duty.primary).toBe('#8b5cf6');
      expect(colors.duty.text).toBe('#7c3aed');
      expect(colors.duty.background).toBe('#c4b5fd');
      expect(colors.duty.light).toBe('#ede9fe');
      expect(colors.duty.border).toBe('#a78bfa');
      expect(colors.duty.hover).toBe('#ddd6fe');
      
      // Test out of office - Orange theme (same as 1:1)
      expect(colors.out_of_office.primary).toBe('#f97316');
      expect(colors.out_of_office.text).toBe('#ea580c');
      expect(colors.out_of_office.background).toBe('#fed7aa');
      expect(colors.out_of_office.light).toBe('#fef3c7');
      expect(colors.out_of_office.border).toBe('#fb923c');
      expect(colors.out_of_office.hover).toBe('#fdba74');
      
      // Test default - Indigo theme
      expect(colors.default.primary).toBe('#6366f1');
      expect(colors.default.text).toBe('#4f46e5');
      expect(colors.default.background).toBe('#c7d2fe');
      expect(colors.default.light).toBe('#e0e7ff');
      expect(colors.default.border).toBe('#818cf8');
      expect(colors.default.hover).toBe('#a5b4fc');
    });
  });

  describe('Icon Mapping', () => {
    it('should map correct icons to each event type', () => {
      const icons = EventStylingService.EVENT_ICONS;
      
      expect(icons.one_on_one).toBe(User);
      expect(icons.meeting).toBe(Calendar);
      expect(icons.birthday).toBe(Cake);
      expect(icons.duty).toBe(Shield);
      expect(icons.out_of_office).toBe(UserX);
      expect(icons.default).toBe(CalendarDays);
    });

    it('should return correct icon in getEventStyling', () => {
      const oneOnOneEvent = { event_type: 'one_on_one', title: 'Test 1:1' };
      const meetingEvent = { event_type: 'meeting', title: 'Test Meeting' };
      const birthdayEvent = { event_type: 'birthday', title: 'Test Birthday' };
      const dutyEvent = { event_type: 'duty', title: 'Test Duty' };
      const oooEvent = { event_type: 'out_of_office', title: 'Test OOO' };
      const defaultEvent = { event_type: 'unknown', title: 'Test Default' };

      expect(EventStylingService.getEventStyling(oneOnOneEvent).icon).toBe(User);
      expect(EventStylingService.getEventStyling(meetingEvent).icon).toBe(Calendar);
      expect(EventStylingService.getEventStyling(birthdayEvent).icon).toBe(Cake);
      expect(EventStylingService.getEventStyling(dutyEvent).icon).toBe(Shield);
      expect(EventStylingService.getEventStyling(oooEvent).icon).toBe(UserX);
      expect(EventStylingService.getEventStyling(defaultEvent).icon).toBe(CalendarDays);
    });
  });

  describe('Event Labels', () => {
    it('should have correct display labels for all event types', () => {
      const labels = EventStylingService.EVENT_LABELS;
      
      expect(labels.one_on_one).toBe('1:1');
      expect(labels.meeting).toBe('Meeting');
      expect(labels.birthday).toBe('Birthday');
      expect(labels.duty).toBe('Duty');
      expect(labels.out_of_office).toBe('OOO');
      expect(labels.default).toBe('Event');
    });
  });

  describe('getEventStyling', () => {
    it('should return complete styling object for each event type', () => {
      const testEvents = [
        { event_type: 'one_on_one', title: 'Test 1:1' },
        { event_type: 'meeting', title: 'Test Meeting' },
        { event_type: 'birthday', title: 'Test Birthday' },
        { event_type: 'duty', title: 'Test Duty' },
        { event_type: 'out_of_office', title: 'Test OOO' }
      ];

      testEvents.forEach(event => {
        const styling = EventStylingService.getEventStyling(event);
        
        // Check required properties exist
        expect(styling).toHaveProperty('colors');
        expect(styling).toHaveProperty('icon');
        expect(styling).toHaveProperty('label');
        expect(styling).toHaveProperty('className');
        expect(styling).toHaveProperty('style');
        expect(styling).toHaveProperty('badgeStyle');
        expect(styling).toHaveProperty('hoverStyle');
        
        // Check colors object structure
        expect(styling.colors).toHaveProperty('primary');
        expect(styling.colors).toHaveProperty('background');
        expect(styling.colors).toHaveProperty('light');
        expect(styling.colors).toHaveProperty('border');
        expect(styling.colors).toHaveProperty('text');
        expect(styling.colors).toHaveProperty('hover');
        
        // Check style object structure
        expect(styling.style).toHaveProperty('color');
        expect(styling.style).toHaveProperty('backgroundColor');
        expect(styling.style).toHaveProperty('borderColor');
        
        // Check that className is a non-empty string
        expect(typeof styling.className).toBe('string');
        expect(styling.className.length).toBeGreaterThan(0);
      });
    });

    it('should handle events without event_type (default styling)', () => {
      const eventWithoutType = { title: 'Test Event' };
      const styling = EventStylingService.getEventStyling(eventWithoutType);
      
      expect(styling.colors).toEqual(EventStylingService.EVENT_COLORS.default);
      expect(styling.icon).toBe(CalendarDays);
      expect(styling.label).toBe('Event');
    });

    it('should handle unknown event types (default styling)', () => {
      const unknownEvent = { event_type: 'unknown_type', title: 'Test Event' };
      const styling = EventStylingService.getEventStyling(unknownEvent);
      
      expect(styling.colors).toEqual(EventStylingService.EVENT_COLORS.default);
      expect(styling.icon).toBe(CalendarDays);
      expect(styling.label).toBe('Event');
    });

    it('should throw error when event is null or undefined', () => {
      expect(() => EventStylingService.getEventStyling(null)).toThrow('Event object is required');
      expect(() => EventStylingService.getEventStyling(undefined)).toThrow('Event object is required');
    });
  });

  describe('generateEventClassName', () => {
    it('should generate correct CSS classes for default variant', () => {
      const oneOnOneClass = EventStylingService.generateEventClassName('one_on_one');
      const meetingClass = EventStylingService.generateEventClassName('meeting');
      const birthdayClass = EventStylingService.generateEventClassName('birthday');
      const dutyClass = EventStylingService.generateEventClassName('duty');
      const oooClass = EventStylingService.generateEventClassName('out_of_office');
      const defaultClass = EventStylingService.generateEventClassName('unknown');

      // Check base classes are included
      expect(oneOnOneClass).toContain('transition-all duration-200 cursor-pointer');
      expect(oneOnOneClass).toContain('text-xs p-1 rounded truncate');
      expect(oneOnOneClass).toContain('border-l-2');
      
      // Check event-specific classes
      expect(oneOnOneClass).toContain('bg-orange-100 text-orange-800 border-orange-400');
      expect(meetingClass).toContain('bg-blue-100 text-blue-800 border-blue-400');
      expect(birthdayClass).toContain('bg-pink-100 text-pink-800 border-pink-400');
      expect(dutyClass).toContain('bg-purple-100 text-purple-800 border-purple-400');
      expect(oooClass).toContain('bg-orange-100 text-orange-800 border-orange-400');
      expect(defaultClass).toContain('bg-indigo-100 text-indigo-800 border-indigo-400');
      
      // Check hover classes
      expect(oneOnOneClass).toContain('hover:bg-orange-200 hover:shadow-sm');
      expect(meetingClass).toContain('hover:bg-blue-200 hover:shadow-sm');
      expect(birthdayClass).toContain('hover:bg-pink-200 hover:shadow-sm');
      expect(dutyClass).toContain('hover:bg-purple-200 hover:shadow-sm');
      expect(oooClass).toContain('hover:bg-orange-200 hover:shadow-sm');
      expect(defaultClass).toContain('hover:bg-indigo-200 hover:shadow-sm');
    });

    it('should generate correct CSS classes for compact variant', () => {
      const compactClass = EventStylingService.generateEventClassName('meeting', 'compact');
      
      expect(compactClass).toContain('text-xs p-1 rounded truncate');
      expect(compactClass).toContain('transition-all duration-200 cursor-pointer');
      expect(compactClass).toContain('border-l-2');
      expect(compactClass).toContain('bg-blue-100 text-blue-800 border-blue-400');
    });

    it('should generate correct CSS classes for sidebar variant', () => {
      const sidebarClass = EventStylingService.generateEventClassName('meeting', 'sidebar');
      
      expect(sidebarClass).toContain('text-sm p-2 rounded-md truncate');
      expect(sidebarClass).toContain('transition-all duration-200 cursor-pointer');
      expect(sidebarClass).toContain('border-l-2');
      expect(sidebarClass).toContain('bg-blue-100 text-blue-800 border-blue-400');
    });

    it('should default to default variant when invalid variant provided', () => {
      const invalidVariantClass = EventStylingService.generateEventClassName('meeting', 'invalid');
      const defaultVariantClass = EventStylingService.generateEventClassName('meeting', 'default');
      
      expect(invalidVariantClass).toBe(defaultVariantClass);
    });
  });

  describe('getEventCardStyling', () => {
    it('should return correct card styling for each event type', () => {
      const testEvents = [
        { event_type: 'birthday', title: 'Birthday' },
        { event_type: 'one_on_one', title: '1:1' },
        { event_type: 'meeting', title: 'Meeting' },
        { event_type: 'out_of_office', title: 'OOO' },
        { event_type: 'duty', title: 'Duty' }
      ];

      testEvents.forEach(event => {
        const cardStyling = EventStylingService.getEventCardStyling(event);
        
        expect(cardStyling).toHaveProperty('className');
        expect(cardStyling).toHaveProperty('colors');
        expect(cardStyling).toHaveProperty('icon');
        
        expect(cardStyling.className).toContain('p-3 border rounded-md cursor-pointer transition-colors');
        
        // Check event-specific card classes
        switch (event.event_type) {
          case 'birthday':
            expect(cardStyling.className).toContain('border-pink-200 bg-pink-50 hover:bg-pink-100');
            break;
          case 'one_on_one':
            expect(cardStyling.className).toContain('border-orange-200 bg-orange-50 hover:bg-orange-100');
            break;
          case 'meeting':
            expect(cardStyling.className).toContain('border-blue-200 bg-blue-50 hover:bg-blue-100');
            break;
          case 'out_of_office':
            expect(cardStyling.className).toContain('border-orange-200 bg-orange-50 hover:bg-orange-100');
            break;
          case 'duty':
            expect(cardStyling.className).toContain('border-purple-200 bg-purple-50 hover:bg-purple-100');
            break;
        }
      });
    });

    it('should throw error when event is null or undefined', () => {
      expect(() => EventStylingService.getEventCardStyling(null)).toThrow('Event object is required');
      expect(() => EventStylingService.getEventCardStyling(undefined)).toThrow('Event object is required');
    });
  });

  describe('getMultiDayEventStyling', () => {
    const testEvent = { event_type: 'meeting', title: 'Multi-day Meeting' };

    it('should return correct styling for start position', () => {
      const styling = EventStylingService.getMultiDayEventStyling(testEvent, 'start');
      
      expect(styling.className).toContain('rounded-r-none border-r-0');
      expect(styling.titlePrefix).toBe('▶ ');
      expect(styling.isMultiDay).toBe(true);
      expect(styling.position).toBe('start');
    });

    it('should return correct styling for middle position', () => {
      const styling = EventStylingService.getMultiDayEventStyling(testEvent, 'middle');
      
      expect(styling.className).toContain('rounded-none border-r-0 border-l-0');
      expect(styling.titlePrefix).toBe('─ ');
      expect(styling.isMultiDay).toBe(true);
      expect(styling.position).toBe('middle');
    });

    it('should return correct styling for end position', () => {
      const styling = EventStylingService.getMultiDayEventStyling(testEvent, 'end');
      
      expect(styling.className).toContain('rounded-l-none border-l-0');
      expect(styling.titlePrefix).toBe('◀ ');
      expect(styling.isMultiDay).toBe(true);
      expect(styling.position).toBe('end');
    });

    it('should return correct styling for single position', () => {
      const styling = EventStylingService.getMultiDayEventStyling(testEvent, 'single');
      
      expect(styling.className).not.toContain('rounded-r-none');
      expect(styling.className).not.toContain('rounded-l-none');
      expect(styling.className).not.toContain('rounded-none');
      expect(styling.titlePrefix).toBe('');
      expect(styling.isMultiDay).toBe(false);
      expect(styling.position).toBe('single');
    });

    it('should include all base styling properties', () => {
      const styling = EventStylingService.getMultiDayEventStyling(testEvent, 'start');
      
      expect(styling).toHaveProperty('colors');
      expect(styling).toHaveProperty('icon');
      expect(styling).toHaveProperty('label');
      expect(styling).toHaveProperty('className');
      expect(styling).toHaveProperty('style');
      expect(styling).toHaveProperty('titlePrefix');
      expect(styling).toHaveProperty('isMultiDay');
      expect(styling).toHaveProperty('position');
    });
  });

  describe('Validation Methods', () => {
    it('should validate event types correctly', () => {
      expect(EventStylingService.isValidEventType('one_on_one')).toBe(true);
      expect(EventStylingService.isValidEventType('meeting')).toBe(true);
      expect(EventStylingService.isValidEventType('birthday')).toBe(true);
      expect(EventStylingService.isValidEventType('duty')).toBe(true);
      expect(EventStylingService.isValidEventType('out_of_office')).toBe(true);
      expect(EventStylingService.isValidEventType('default')).toBe(true);
      
      expect(EventStylingService.isValidEventType('invalid_type')).toBe(false);
      expect(EventStylingService.isValidEventType('')).toBe(false);
      expect(EventStylingService.isValidEventType(null)).toBe(false);
      expect(EventStylingService.isValidEventType(undefined)).toBe(false);
    });

    it('should validate styling variants correctly', () => {
      expect(EventStylingService.isValidVariant('default')).toBe(true);
      expect(EventStylingService.isValidVariant('compact')).toBe(true);
      expect(EventStylingService.isValidVariant('sidebar')).toBe(true);
      
      expect(EventStylingService.isValidVariant('invalid_variant')).toBe(false);
      expect(EventStylingService.isValidVariant('')).toBe(false);
      expect(EventStylingService.isValidVariant(null)).toBe(false);
      expect(EventStylingService.isValidVariant(undefined)).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should provide accessibility information for all event types', () => {
      const eventTypes = ['one_on_one', 'meeting', 'birthday', 'duty', 'out_of_office', 'default'];
      
      eventTypes.forEach(eventType => {
        const accessibilityInfo = EventStylingService.getAccessibilityInfo(eventType);
        
        expect(accessibilityInfo).toHaveProperty('hasGoodContrast');
        expect(accessibilityInfo).toHaveProperty('backgroundColor');
        expect(accessibilityInfo).toHaveProperty('textColor');
        expect(accessibilityInfo).toHaveProperty('borderColor');
        expect(accessibilityInfo).toHaveProperty('ariaLabel');
        
        expect(accessibilityInfo.hasGoodContrast).toBe(true);
        expect(typeof accessibilityInfo.backgroundColor).toBe('string');
        expect(typeof accessibilityInfo.textColor).toBe('string');
        expect(typeof accessibilityInfo.borderColor).toBe('string');
        expect(typeof accessibilityInfo.ariaLabel).toBe('string');
        expect(accessibilityInfo.ariaLabel).toContain('calendar event');
      });
    });
  });

  describe('Getter Methods', () => {
    it('should return all event type colors', () => {
      const colors = EventStylingService.getEventTypeColors();
      
      expect(colors).toHaveProperty('one_on_one');
      expect(colors).toHaveProperty('meeting');
      expect(colors).toHaveProperty('birthday');
      expect(colors).toHaveProperty('duty');
      expect(colors).toHaveProperty('out_of_office');
      expect(colors).toHaveProperty('default');
      
      // Should be a copy, not the original object
      expect(colors).not.toBe(EventStylingService.EVENT_COLORS);
    });

    it('should return all event type icons', () => {
      const icons = EventStylingService.getEventTypeIcons();
      
      expect(icons).toHaveProperty('one_on_one');
      expect(icons).toHaveProperty('meeting');
      expect(icons).toHaveProperty('birthday');
      expect(icons).toHaveProperty('duty');
      expect(icons).toHaveProperty('out_of_office');
      expect(icons).toHaveProperty('default');
      
      // Should be a copy, not the original object
      expect(icons).not.toBe(EventStylingService.EVENT_ICONS);
    });

    it('should return all event type labels', () => {
      const labels = EventStylingService.getEventTypeLabels();
      
      expect(labels).toHaveProperty('one_on_one');
      expect(labels).toHaveProperty('meeting');
      expect(labels).toHaveProperty('birthday');
      expect(labels).toHaveProperty('duty');
      expect(labels).toHaveProperty('out_of_office');
      expect(labels).toHaveProperty('default');
      
      // Should be a copy, not the original object
      expect(labels).not.toBe(EventStylingService.EVENT_LABELS);
    });
  });

  describe('Styling Variants', () => {
    it('should have correct variant constants', () => {
      expect(EventStylingService.VARIANTS.DEFAULT).toBe('default');
      expect(EventStylingService.VARIANTS.COMPACT).toBe('compact');
      expect(EventStylingService.VARIANTS.SIDEBAR).toBe('sidebar');
    });

    it('should apply different styling for each variant', () => {
      const testEvent = { event_type: 'meeting', title: 'Test Meeting' };
      
      const defaultStyling = EventStylingService.getEventStyling(testEvent, 'default');
      const compactStyling = EventStylingService.getEventStyling(testEvent, 'compact');
      const sidebarStyling = EventStylingService.getEventStyling(testEvent, 'sidebar');
      
      // All should have same colors and icon
      expect(defaultStyling.colors).toEqual(compactStyling.colors);
      expect(defaultStyling.colors).toEqual(sidebarStyling.colors);
      expect(defaultStyling.icon).toBe(compactStyling.icon);
      expect(defaultStyling.icon).toBe(sidebarStyling.icon);
      
      // But different class names based on variant
      expect(defaultStyling.className).toContain('text-xs p-1 rounded truncate');
      expect(compactStyling.className).toContain('text-xs p-1 rounded truncate');
      expect(sidebarStyling.className).toContain('text-sm p-2 rounded-md truncate');
    });
  });
});