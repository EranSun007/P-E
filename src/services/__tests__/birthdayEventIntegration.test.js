// src/services/__tests__/birthdayEventIntegration.test.js
// End-to-end tests for complete birthday event lifecycle integration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEventGenerationService } from '../calendarEventGenerationService.js';
import { RecurringBirthdayService } from '../recurringBirthdayService.js';
import { TeamMember, CalendarEvent } from '../../api/entities.js';

// Mock localStorage with proper data persistence
const mockStorage = {};
const localStorageMock = {
  getItem: vi.fn((key) => mockStorage[key] || null),
  setItem: vi.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
};
global.localStorage = localStorageMock;

describe('Birthday Event Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Initialize empty arrays for entities
    mockStorage['team_members'] = '[]';
    mockStorage['calendar_events'] = '[]';
  });

  describe('Team Member Creation Integration', () => {
    it('should generate birthday events when creating team member with birthday', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const createdMember = await TeamMember.create(teamMemberData);
      
      // Handle team member creation (this should generate birthday events)
      const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberCreation(createdMember);

      // Verify birthday events were created
      expect(birthdayEvents).toBeDefined();
      expect(Array.isArray(birthdayEvents)).toBe(true);
      expect(birthdayEvents.length).toBeGreaterThan(0);

      // Verify events are created for multiple years
      const currentYear = new Date().getFullYear();
      const eventYears = birthdayEvents.map(event => new Date(event.start_date).getFullYear());
      
      expect(eventYears).toContain(currentYear);
      expect(eventYears).toContain(currentYear + 1);
      expect(eventYears).toContain(currentYear + 2);

      // Verify event properties
      birthdayEvents.forEach(event => {
        expect(event.title).toBe(`🎂 ${createdMember.name}'s Birthday`);
        expect(event.event_type).toBe('birthday');
        expect(event.team_member_id).toBe(createdMember.id);
        expect(event.all_day).toBe(true);
        expect(event.recurrence.type).toBe('yearly');
      });
    });

    it('should not generate birthday events when creating team member without birthday', async () => {
      // Create team member without birthday
      const teamMemberData = {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Designer'
        // No birthday field
      };

      const createdMember = await TeamMember.create(teamMemberData);
      
      // Handle team member creation
      const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberCreation(createdMember);

      // Verify no birthday events were created
      expect(birthdayEvents).toBeDefined();
      expect(Array.isArray(birthdayEvents)).toBe(true);
      expect(birthdayEvents.length).toBe(0);
    });

    it('should handle errors gracefully during birthday event generation', async () => {
      // Create team member with invalid birthday
      const teamMemberData = {
        name: 'Invalid Birthday User',
        email: 'invalid@example.com',
        role: 'Tester',
        birthday: 'invalid-date'
      };

      const createdMember = await TeamMember.create(teamMemberData);
      
      // This should not throw an error, but should return empty array
      await expect(
        CalendarEventGenerationService.handleTeamMemberCreation(createdMember)
      ).rejects.toThrow();
    });
  });

  describe('Team Member Update Integration', () => {
    it('should update birthday events when birthday is changed', async () => {
      // Create team member with initial birthday
      const initialData = {
        name: 'Update Test User',
        email: 'update@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const teamMember = await TeamMember.create(initialData);
      
      // Generate initial birthday events
      await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);

      // Update birthday
      const newBirthday = '1990-08-20T00:00:00.000Z';
      const updatedData = { ...teamMember, birthday: newBirthday };
      const previousData = { ...teamMember };

      // Handle birthday update
      const updatedEvents = await CalendarEventGenerationService.handleTeamMemberUpdate(
        teamMember.id,
        updatedData,
        previousData
      );

      // Verify events were updated
      expect(updatedEvents).toBeDefined();
      expect(Array.isArray(updatedEvents)).toBe(true);

      // Verify new birthday date is reflected in events
      if (updatedEvents.length > 0) {
        const eventDate = new Date(updatedEvents[0].start_date);
        expect(eventDate.getMonth()).toBe(7); // August (0-indexed)
        expect(eventDate.getDate()).toBe(20);
      }
    });

    it('should generate birthday events when birthday is added to existing member', async () => {
      // Create team member without birthday
      const initialData = {
        name: 'No Birthday User',
        email: 'nobday@example.com',
        role: 'Developer'
      };

      const teamMember = await TeamMember.create(initialData);

      // Add birthday
      const newBirthday = '1985-12-25T00:00:00.000Z';
      const updatedData = { ...teamMember, birthday: newBirthday };
      const previousData = { ...teamMember };

      // Handle birthday addition
      const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberUpdate(
        teamMember.id,
        updatedData,
        previousData
      );

      // Verify birthday events were created
      expect(birthdayEvents).toBeDefined();
      expect(Array.isArray(birthdayEvents)).toBe(true);
      expect(birthdayEvents.length).toBeGreaterThan(0);
    });

    it('should remove birthday events when birthday is removed', async () => {
      // Create team member with birthday
      const initialData = {
        name: 'Remove Birthday User',
        email: 'remove@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const teamMember = await TeamMember.create(initialData);
      
      // Generate initial birthday events
      await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);

      // Remove birthday
      const updatedData = { ...teamMember, birthday: null };
      const previousData = { ...teamMember };

      // Handle birthday removal
      const result = await CalendarEventGenerationService.handleTeamMemberUpdate(
        teamMember.id,
        updatedData,
        previousData
      );

      // Verify no events returned (they were deleted)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Team Member Deletion Integration', () => {
    it('should clean up all birthday events when team member is deleted', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'Delete Test User',
        email: 'delete@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const teamMember = await TeamMember.create(teamMemberData);
      
      // Generate birthday events
      await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);

      // Handle team member deletion
      const result = await CalendarEventGenerationService.handleTeamMemberDeletion(teamMember.id);

      // Verify deletion was successful
      expect(result).toBe(true);

      // Verify no birthday events remain for this team member
      const remainingEvents = await RecurringBirthdayService.getBirthdayEventsForTeamMember(teamMember.id);
      expect(remainingEvents.length).toBe(0);
    });

    it('should handle deletion gracefully when no events exist', async () => {
      // Create team member without birthday
      const teamMemberData = {
        name: 'No Events User',
        email: 'noevents@example.com',
        role: 'Developer'
      };

      const teamMember = await TeamMember.create(teamMemberData);

      // Handle team member deletion (no events to clean up)
      const result = await CalendarEventGenerationService.handleTeamMemberDeletion(teamMember.id);

      // Should still succeed
      expect(result).toBe(true);
    });
  });

  describe('Synchronization Integration', () => {
    it('should generate birthday events for all team members during synchronization', async () => {
      // Create multiple team members with birthdays
      const teamMembers = [
        {
          name: 'Sync User 1',
          email: 'sync1@example.com',
          role: 'Developer',
          birthday: '1990-01-15T00:00:00.000Z'
        },
        {
          name: 'Sync User 2',
          email: 'sync2@example.com',
          role: 'Designer',
          birthday: '1985-06-20T00:00:00.000Z'
        },
        {
          name: 'Sync User 3',
          email: 'sync3@example.com',
          role: 'Manager'
          // No birthday
        }
      ];

      // Create team members
      const createdMembers = [];
      for (const memberData of teamMembers) {
        const member = await TeamMember.create(memberData);
        createdMembers.push(member);
      }

      // Run synchronization
      const syncResults = await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: false,
        includeOutOfOffice: false
      });

      // Verify synchronization results
      expect(syncResults).toBeDefined();
      expect(syncResults.summary).toBeDefined();
      expect(syncResults.summary.totalCreated).toBeGreaterThan(0);
      expect(syncResults.birthdayEvents).toBeDefined();

      // Should have created events for 2 members (only those with birthdays)
      // Each member should have events for 3 years (current + next 2)
      const expectedEventCount = 2 * 3; // 2 members × 3 years
      expect(syncResults.summary.totalCreated).toBe(expectedEventCount);
    });

    it('should handle mixed success and failure scenarios during synchronization', async () => {
      // Create team members with valid and invalid birthdays
      const teamMembers = [
        {
          name: 'Valid Birthday User',
          email: 'valid@example.com',
          role: 'Developer',
          birthday: '1990-01-15T00:00:00.000Z'
        },
        {
          name: 'Invalid Birthday User',
          email: 'invalid@example.com',
          role: 'Designer',
          birthday: 'invalid-date'
        }
      ];

      // Create team members
      for (const memberData of teamMembers) {
        await TeamMember.create(memberData);
      }

      // Run synchronization
      const syncResults = await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: false,
        includeOutOfOffice: false
      });

      // Should have some successes and some errors
      expect(syncResults.summary.totalCreated).toBeGreaterThan(0);
      expect(syncResults.summary.totalErrors).toBeGreaterThan(0);
      expect(syncResults.errors.length).toBeGreaterThan(0);
    });

    it('should generate events for custom year ranges during synchronization', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'Custom Years User',
        email: 'custom@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      await TeamMember.create(teamMemberData);

      // Run synchronization with custom years
      const customYears = [2025, 2026, 2027, 2028];
      const syncResults = await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: false,
        includeOutOfOffice: false,
        birthdayYears: customYears
      });

      // Should have created events for all custom years
      expect(syncResults.summary.totalCreated).toBe(customYears.length);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle team member with null birthday gracefully', async () => {
      const teamMemberData = {
        name: 'Null Birthday User',
        email: 'null@example.com',
        role: 'Developer',
        birthday: null
      };

      const teamMember = await TeamMember.create(teamMemberData);
      
      // Should not throw error and should return empty array
      const result = await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);
      expect(result).toEqual([]);
    });

    it('should handle team member with undefined birthday gracefully', async () => {
      const teamMemberData = {
        name: 'Undefined Birthday User',
        email: 'undefined@example.com',
        role: 'Developer'
        // birthday is undefined
      };

      const teamMember = await TeamMember.create(teamMemberData);
      
      // Should not throw error and should return empty array
      const result = await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);
      expect(result).toEqual([]);
    });

    it('should prevent duplicate birthday events during multiple synchronizations', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'Duplicate Prevention User',
        email: 'duplicate@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      await TeamMember.create(teamMemberData);

      // Run synchronization multiple times
      const firstSync = await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: false,
        includeOutOfOffice: false
      });

      const secondSync = await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: false,
        includeOutOfOffice: false
      });

      // First sync should create events, second sync should create none (duplicates prevented)
      expect(firstSync.summary.totalCreated).toBeGreaterThan(0);
      expect(secondSync.summary.totalCreated).toBe(0);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency between team member and calendar events', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'Consistency Test User',
        email: 'consistency@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const teamMember = await TeamMember.create(teamMemberData);
      
      // Generate birthday events
      const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);

      // Verify data consistency
      birthdayEvents.forEach(event => {
        expect(event.team_member_id).toBe(teamMember.id);
        expect(event.linked_entity_type).toBe('team_member');
        expect(event.linked_entity_id).toBe(teamMember.id);
        expect(event.title).toContain(teamMember.name);
        
        // Verify birthday date consistency
        const eventDate = new Date(event.start_date);
        const birthdayDate = new Date(teamMember.birthday);
        expect(eventDate.getMonth()).toBe(birthdayDate.getMonth());
        expect(eventDate.getDate()).toBe(birthdayDate.getDate());
      });
    });

    it('should validate birthday event properties', async () => {
      // Create team member with birthday
      const teamMemberData = {
        name: 'Validation Test User',
        email: 'validation@example.com',
        role: 'Developer',
        birthday: '1990-05-15T00:00:00.000Z'
      };

      const teamMember = await TeamMember.create(teamMemberData);
      
      // Generate birthday events
      const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);

      // Validate all required properties
      birthdayEvents.forEach(event => {
        expect(event.id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.start_date).toBeDefined();
        expect(event.end_date).toBeDefined();
        expect(event.all_day).toBe(true);
        expect(event.event_type).toBe('birthday');
        expect(event.team_member_id).toBeDefined();
        expect(event.linked_entity_type).toBe('team_member');
        expect(event.linked_entity_id).toBeDefined();
        expect(event.recurrence).toBeDefined();
        expect(event.recurrence.type).toBe('yearly');
        expect(event.recurrence.interval).toBe(1);
      });
    });
  });
});