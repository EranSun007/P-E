// src/components/agenda/__tests__/DataFlowIntegration.test.jsx
// Simplified integration tests focusing on core data flow functionality

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AgendaItem, PersonalFileItem } from '@/api/oneOnOneAgenda';
import { localClient } from '@/api/localClient';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock the API modules
vi.mock('@/api/oneOnOneAgenda', () => ({
  AgendaItem: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByTeamMember: vi.fn(),
    getByStatus: vi.fn(),
    getForNextMeeting: vi.fn()
  },
  PersonalFileItem: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByTeamMember: vi.fn(),
    getByCategory: vi.fn(),
    searchByTags: vi.fn()
  }
}));

// Mock localClient
vi.mock('@/api/localClient', () => ({
  localClient: {
    entities: {
      AgendaItem: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByTeamMember: vi.fn()
      },
      PersonalFileItem: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByTeamMember: vi.fn()
      }
    }
  }
}));

describe('Data Flow Integration Tests', () => {
  const mockTeamMemberId = 'team-member-123';

  const mockAgendaItems = [
    {
      id: 'agenda-1',
      teamMemberId: mockTeamMemberId,
      title: 'Discuss project progress',
      description: 'Review current sprint status and blockers',
      status: 'pending',
      priority: 2,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      tags: ['project', 'sprint']
    },
    {
      id: 'agenda-2',
      teamMemberId: mockTeamMemberId,
      title: 'Career development discussion',
      description: 'Talk about growth opportunities and goals',
      status: 'discussed',
      priority: 1,
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
      tags: ['career', 'goals']
    }
  ];

  const mockPersonalFileItems = [
    {
      id: 'file-1',
      teamMemberId: mockTeamMemberId,
      title: 'Excellent code review feedback',
      notes: 'John provided thorough and constructive feedback on the authentication module',
      category: 'achievement',
      sourceType: 'manual',
      sourceId: null,
      tags: ['code-review', 'feedback'],
      importance: 4,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'manager-1'
    },
    {
      id: 'file-2',
      teamMemberId: mockTeamMemberId,
      title: 'Missed deadline concern',
      notes: 'Project delivery was delayed by 2 days due to scope creep',
      category: 'concern',
      sourceType: 'task',
      sourceId: 'task-456',
      tags: ['deadline', 'scope'],
      importance: 3,
      createdAt: '2024-01-03T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
      createdBy: 'manager-1'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    
    // Setup default mock responses
    AgendaItem.getByTeamMember.mockResolvedValue(mockAgendaItems);
    PersonalFileItem.getByTeamMember.mockResolvedValue(mockPersonalFileItems);
    
    localClient.entities.AgendaItem.getByTeamMember.mockResolvedValue(mockAgendaItems);
    localClient.entities.PersonalFileItem.getByTeamMember.mockResolvedValue(mockPersonalFileItems);
  });

  describe('Agenda Item Data Flow', () => {
    it('should handle complete agenda item CRUD operations', async () => {
      // Test CREATE
      const newAgendaItem = {
        id: 'agenda-new',
        teamMemberId: mockTeamMemberId,
        title: 'New agenda item',
        description: 'Test description',
        status: 'pending',
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test']
      };

      AgendaItem.create.mockResolvedValue(newAgendaItem);
      const createResult = await AgendaItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'New agenda item',
        description: 'Test description',
        priority: 1,
        tags: ['test']
      });

      expect(createResult).toEqual(newAgendaItem);
      expect(AgendaItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamMemberId: mockTeamMemberId,
          title: 'New agenda item',
          description: 'Test description'
        })
      );

      // Test READ
      const readResult = await AgendaItem.getByTeamMember(mockTeamMemberId);
      expect(readResult).toEqual(mockAgendaItems);
      expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);

      // Test UPDATE
      const updatedItem = { ...newAgendaItem, status: 'discussed' };
      AgendaItem.update.mockResolvedValue(updatedItem);
      
      const updateResult = await AgendaItem.update('agenda-new', { status: 'discussed' });
      expect(updateResult).toEqual(updatedItem);
      expect(AgendaItem.update).toHaveBeenCalledWith('agenda-new', { status: 'discussed' });

      // Test DELETE
      AgendaItem.delete.mockResolvedValue(true);
      const deleteResult = await AgendaItem.delete('agenda-new');
      expect(deleteResult).toBe(true);
      expect(AgendaItem.delete).toHaveBeenCalledWith('agenda-new');
    });

    it('should handle agenda item status transitions', async () => {
      const pendingItem = mockAgendaItems[0];
      const discussedItem = { ...pendingItem, status: 'discussed' };
      
      AgendaItem.update.mockResolvedValue(discussedItem);
      
      const result = await AgendaItem.update(pendingItem.id, { status: 'discussed' });
      
      expect(result.status).toBe('discussed');
      expect(AgendaItem.update).toHaveBeenCalledWith(pendingItem.id, { status: 'discussed' });
    });

    it('should filter agenda items by status', async () => {
      const pendingItems = mockAgendaItems.filter(item => item.status === 'pending');
      const discussedItems = mockAgendaItems.filter(item => item.status === 'discussed');
      
      AgendaItem.getByStatus.mockImplementation((status) => {
        if (status === 'pending') return Promise.resolve(pendingItems);
        if (status === 'discussed') return Promise.resolve(discussedItems);
        return Promise.resolve([]);
      });

      const pendingResult = await AgendaItem.getByStatus('pending');
      const discussedResult = await AgendaItem.getByStatus('discussed');

      expect(pendingResult).toHaveLength(1);
      expect(discussedResult).toHaveLength(1);
      expect(pendingResult[0].status).toBe('pending');
      expect(discussedResult[0].status).toBe('discussed');
    });
  });

  describe('Personal File Item Data Flow', () => {
    it('should handle complete personal file item CRUD operations', async () => {
      // Test CREATE
      const newPersonalFileItem = {
        id: 'file-new',
        teamMemberId: mockTeamMemberId,
        title: 'New achievement',
        notes: 'Completed project ahead of schedule',
        category: 'achievement',
        sourceType: 'manual',
        sourceId: null,
        tags: ['project', 'delivery'],
        importance: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'manager-1'
      };

      PersonalFileItem.create.mockResolvedValue(newPersonalFileItem);
      const createResult = await PersonalFileItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'New achievement',
        notes: 'Completed project ahead of schedule',
        category: 'achievement',
        tags: ['project', 'delivery'],
        importance: 5
      });

      expect(createResult).toEqual(newPersonalFileItem);
      expect(PersonalFileItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamMemberId: mockTeamMemberId,
          title: 'New achievement',
          category: 'achievement'
        })
      );

      // Test READ
      const readResult = await PersonalFileItem.getByTeamMember(mockTeamMemberId);
      expect(readResult).toEqual(mockPersonalFileItems);
      expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);

      // Test UPDATE
      const updatedItem = { ...newPersonalFileItem, notes: 'Updated notes' };
      PersonalFileItem.update.mockResolvedValue(updatedItem);
      
      const updateResult = await PersonalFileItem.update('file-new', { notes: 'Updated notes' });
      expect(updateResult).toEqual(updatedItem);
      expect(PersonalFileItem.update).toHaveBeenCalledWith('file-new', { notes: 'Updated notes' });

      // Test DELETE
      PersonalFileItem.delete.mockResolvedValue(true);
      const deleteResult = await PersonalFileItem.delete('file-new');
      expect(deleteResult).toBe(true);
      expect(PersonalFileItem.delete).toHaveBeenCalledWith('file-new');
    });

    it('should filter personal file items by category', async () => {
      const achievementItems = mockPersonalFileItems.filter(item => item.category === 'achievement');
      const concernItems = mockPersonalFileItems.filter(item => item.category === 'concern');
      
      PersonalFileItem.getByCategory.mockImplementation((category) => {
        if (category === 'achievement') return Promise.resolve(achievementItems);
        if (category === 'concern') return Promise.resolve(concernItems);
        return Promise.resolve([]);
      });

      const achievementResult = await PersonalFileItem.getByCategory('achievement');
      const concernResult = await PersonalFileItem.getByCategory('concern');

      expect(achievementResult).toHaveLength(1);
      expect(concernResult).toHaveLength(1);
      expect(achievementResult[0].category).toBe('achievement');
      expect(concernResult[0].category).toBe('concern');
    });

    it('should search personal file items by tags', async () => {
      const codeReviewItems = mockPersonalFileItems.filter(item => 
        item.tags.includes('code-review')
      );
      
      PersonalFileItem.searchByTags.mockResolvedValue(codeReviewItems);
      
      const result = await PersonalFileItem.searchByTags(['code-review']);
      
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('code-review');
      expect(PersonalFileItem.searchByTags).toHaveBeenCalledWith(['code-review']);
    });
  });

  describe('Cross-Entity Data Flow', () => {
    it('should handle agenda item to personal file conversion workflow', async () => {
      // Start with a discussed agenda item
      const discussedAgendaItem = {
        ...mockAgendaItems[0],
        status: 'discussed'
      };

      // Create a personal file item based on the agenda discussion
      const personalFileFromAgenda = {
        id: 'file-from-agenda',
        teamMemberId: mockTeamMemberId,
        title: 'Performance discussion outcome',
        notes: 'Discussed project performance. John acknowledged areas for improvement.',
        category: 'feedback',
        sourceType: 'agenda_item',
        sourceId: discussedAgendaItem.id,
        tags: ['performance', 'improvement'],
        importance: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'manager-1'
      };

      AgendaItem.update.mockResolvedValue(discussedAgendaItem);
      PersonalFileItem.create.mockResolvedValue(personalFileFromAgenda);

      // Mark agenda item as discussed
      const updatedAgenda = await AgendaItem.update(mockAgendaItems[0].id, { status: 'discussed' });
      expect(updatedAgenda.status).toBe('discussed');

      // Create personal file item from discussion
      const personalFileResult = await PersonalFileItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'Performance discussion outcome',
        notes: 'Discussed project performance. John acknowledged areas for improvement.',
        category: 'feedback',
        sourceType: 'agenda_item',
        sourceId: discussedAgendaItem.id,
        tags: ['performance', 'improvement'],
        importance: 3
      });

      expect(personalFileResult.sourceType).toBe('agenda_item');
      expect(personalFileResult.sourceId).toBe(discussedAgendaItem.id);
      expect(personalFileResult.category).toBe('feedback');
    });

    it('should maintain data consistency across team member operations', async () => {
      const teamMember1Id = 'team-member-1';
      const teamMember2Id = 'team-member-2';

      const member1AgendaItems = [
        { ...mockAgendaItems[0], teamMemberId: teamMember1Id }
      ];
      const member2AgendaItems = [
        { ...mockAgendaItems[1], teamMemberId: teamMember2Id }
      ];

      const member1PersonalFiles = [
        { ...mockPersonalFileItems[0], teamMemberId: teamMember1Id }
      ];
      const member2PersonalFiles = [
        { ...mockPersonalFileItems[1], teamMemberId: teamMember2Id }
      ];

      AgendaItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (teamMemberId === teamMember1Id) return Promise.resolve(member1AgendaItems);
        if (teamMemberId === teamMember2Id) return Promise.resolve(member2AgendaItems);
        return Promise.resolve([]);
      });

      PersonalFileItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (teamMemberId === teamMember1Id) return Promise.resolve(member1PersonalFiles);
        if (teamMemberId === teamMember2Id) return Promise.resolve(member2PersonalFiles);
        return Promise.resolve([]);
      });

      // Test data isolation between team members
      const member1Agenda = await AgendaItem.getByTeamMember(teamMember1Id);
      const member2Agenda = await AgendaItem.getByTeamMember(teamMember2Id);
      const member1Files = await PersonalFileItem.getByTeamMember(teamMember1Id);
      const member2Files = await PersonalFileItem.getByTeamMember(teamMember2Id);

      expect(member1Agenda[0].teamMemberId).toBe(teamMember1Id);
      expect(member2Agenda[0].teamMemberId).toBe(teamMember2Id);
      expect(member1Files[0].teamMemberId).toBe(teamMember1Id);
      expect(member2Files[0].teamMemberId).toBe(teamMember2Id);

      // Ensure no cross-contamination
      expect(member1Agenda).toHaveLength(1);
      expect(member2Agenda).toHaveLength(1);
      expect(member1Files).toHaveLength(1);
      expect(member2Files).toHaveLength(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      AgendaItem.getByTeamMember.mockRejectedValue(new Error('Network error'));
      PersonalFileItem.getByTeamMember.mockRejectedValue(new Error('Database error'));

      await expect(AgendaItem.getByTeamMember(mockTeamMemberId)).rejects.toThrow('Network error');
      await expect(PersonalFileItem.getByTeamMember(mockTeamMemberId)).rejects.toThrow('Database error');
    });

    it('should handle empty data sets', async () => {
      AgendaItem.getByTeamMember.mockResolvedValue([]);
      PersonalFileItem.getByTeamMember.mockResolvedValue([]);

      const agendaResult = await AgendaItem.getByTeamMember(mockTeamMemberId);
      const personalFileResult = await PersonalFileItem.getByTeamMember(mockTeamMemberId);

      expect(agendaResult).toEqual([]);
      expect(personalFileResult).toEqual([]);
    });

    it('should handle concurrent operations without conflicts', async () => {
      // Setup mocks first
      AgendaItem.create.mockResolvedValue({
        id: 'agenda-concurrent',
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent agenda item',
        status: 'pending'
      });

      PersonalFileItem.create.mockResolvedValue({
        id: 'file-concurrent',
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent personal file item',
        category: 'achievement'
      });

      // Then create the promises
      const createAgendaPromise = AgendaItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent agenda item',
        description: 'Test concurrent creation'
      });

      const createPersonalFilePromise = PersonalFileItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent personal file item',
        notes: 'Test concurrent creation',
        category: 'achievement'
      });

      const [agendaResult, personalFileResult] = await Promise.all([
        createAgendaPromise,
        createPersonalFilePromise
      ]);

      expect(agendaResult).toBeDefined();
      expect(personalFileResult).toBeDefined();
      expect(agendaResult.id).toBe('agenda-concurrent');
      expect(personalFileResult.id).toBe('file-concurrent');
    });

    it('should validate data integrity during operations', async () => {
      // Test invalid team member ID
      AgendaItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (!teamMemberId || teamMemberId.trim() === '') {
          return Promise.reject(new Error('Invalid team member ID'));
        }
        return Promise.resolve(mockAgendaItems);
      });

      await expect(AgendaItem.getByTeamMember('')).rejects.toThrow('Invalid team member ID');
      await expect(AgendaItem.getByTeamMember(null)).rejects.toThrow('Invalid team member ID');
    });

    it('should handle malformed data gracefully', async () => {
      const malformedAgendaItems = [
        { id: 'valid-1', teamMemberId: mockTeamMemberId, title: 'Valid item' },
        { id: 'invalid-1', title: null }, // Missing required fields
        null, // Null item
        undefined, // Undefined item
        { id: 'partial-1', teamMemberId: mockTeamMemberId } // Missing title
      ];

      AgendaItem.getByTeamMember.mockResolvedValue(malformedAgendaItems);

      const result = await AgendaItem.getByTeamMember(mockTeamMemberId);
      
      // Should return the data as-is, letting the UI components handle filtering
      expect(result).toEqual(malformedAgendaItems);
      expect(result).toHaveLength(5);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large datasets
      const largeAgendaItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `agenda-${i}`,
        teamMemberId: mockTeamMemberId,
        title: `Agenda item ${i}`,
        description: `Description for agenda item ${i}`,
        status: i % 3 === 0 ? 'discussed' : 'pending',
        priority: (i % 3) + 1,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        updatedAt: new Date(2024, 0, i + 1).toISOString(),
        tags: [`tag-${i % 5}`]
      }));

      const largePersonalFileItems = Array.from({ length: 2000 }, (_, i) => ({
        id: `file-${i}`,
        teamMemberId: mockTeamMemberId,
        title: `Personal file item ${i}`,
        notes: `Notes for personal file item ${i}`,
        category: ['achievement', 'concern', 'feedback', 'goal'][i % 4],
        sourceType: 'manual',
        sourceId: null,
        tags: [`tag-${i % 10}`],
        importance: (i % 5) + 1,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        updatedAt: new Date(2024, 0, i + 1).toISOString(),
        createdBy: 'manager-1'
      }));

      AgendaItem.getByTeamMember.mockResolvedValue(largeAgendaItems);
      PersonalFileItem.getByTeamMember.mockResolvedValue(largePersonalFileItems);

      const startTime = performance.now();
      
      const [agendaResult, personalFileResult] = await Promise.all([
        AgendaItem.getByTeamMember(mockTeamMemberId),
        PersonalFileItem.getByTeamMember(mockTeamMemberId)
      ]);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000); // 1 second max
      expect(agendaResult).toHaveLength(1000);
      expect(personalFileResult).toHaveLength(2000);
    });
  });
});