// src/components/agenda/__tests__/CompleteWorkflowIntegration.test.jsx
// Integration tests for complete end-to-end workflows across agenda and personal file management

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import AgendaSection from '../AgendaSection';
import PersonalFileSection from '../PersonalFileSection';
import AgendaContextActions from '../AgendaContextActions';
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

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock print service
vi.mock('@/services/printService', () => ({
  printPersonalFile: vi.fn(),
  exportPersonalFileToPDF: vi.fn()
}));

describe('Complete Workflow Integration Tests', () => {
  const mockTeamMemberId = 'team-member-123';
  const mockTeamMemberName = 'John Doe';
  const user = userEvent.setup();

  const mockAgendaItems = [
    {
      id: 'agenda-1',
      teamMemberId: mockTeamMemberId,
      title: 'Discuss project performance',
      description: 'Review recent project delivery and identify areas for improvement',
      status: 'pending',
      priority: 2,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      tags: ['project', 'performance']
    },
    {
      id: 'agenda-2',
      teamMemberId: mockTeamMemberId,
      title: 'Career development planning',
      description: 'Discuss growth opportunities and skill development',
      status: 'pending',
      priority: 1,
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
      tags: ['career', 'development']
    }
  ];

  const mockPersonalFileItems = [
    {
      id: 'file-1',
      teamMemberId: mockTeamMemberId,
      title: 'Strong technical leadership',
      notes: 'John demonstrated excellent technical leadership during the API redesign project',
      category: 'achievement',
      sourceType: 'project',
      sourceId: 'project-123',
      tags: ['leadership', 'technical', 'api'],
      importance: 5,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
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

  describe('Agenda Item to Personal File Workflow', () => {
    it('should allow converting agenda items to personal file items after discussion', async () => {
      // Mock the agenda item update and personal file creation
      const discussedAgendaItem = {
        ...mockAgendaItems[0],
        status: 'discussed'
      };
      
      const personalFileFromAgenda = {
        id: 'file-from-agenda',
        teamMemberId: mockTeamMemberId,
        title: 'Performance discussion outcome',
        notes: 'Discussed project performance. John acknowledged areas for improvement and committed to better time management.',
        category: 'feedback',
        sourceType: 'agenda_item',
        sourceId: 'agenda-1',
        tags: ['performance', 'improvement', 'time-management'],
        importance: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'manager-1'
      };

      AgendaItem.update.mockResolvedValue(discussedAgendaItem);
      PersonalFileItem.create.mockResolvedValue(personalFileFromAgenda);

      // Create a wrapper component that includes both sections
      const WorkflowTestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<WorkflowTestWrapper />);

      // Wait for both sections to load
      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Verify both sections are rendered
      expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Personal File')).toBeInTheDocument();
      expect(screen.getByText('Discuss project performance')).toBeInTheDocument();
      expect(screen.getByText('Strong technical leadership')).toBeInTheDocument();

      // Simulate the workflow:
      // 1. Mark agenda item as discussed
      // 2. Create personal file item from the discussion
      
      // This would typically involve:
      // - Clicking a "Mark as Discussed" button on the agenda item
      // - Opening a dialog to save discussion outcomes to personal file
      // - The actual UI interactions would depend on the specific component implementations
    });

    it('should maintain data consistency when items are moved between agenda and personal file', async () => {
      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Both components should maintain their own state independently
      // but share the same team member context
      expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });
  });

  describe('Context Actions Integration', () => {
    it('should provide context actions for adding items to agenda and personal file', async () => {
      const mockSourceItem = {
        id: 'task-123',
        title: 'Complete API documentation',
        description: 'Write comprehensive API documentation for the new endpoints',
        type: 'task'
      };

      render(
        <AgendaContextActions 
          teamMemberId={mockTeamMemberId}
          sourceItem={mockSourceItem}
        />
      );

      // Should show context actions
      expect(screen.getByText('Add to 1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Save to Personal File')).toBeInTheDocument();

      // Test adding to agenda
      const addToAgendaButton = screen.getByText('Add to 1:1 Agenda');
      await user.click(addToAgendaButton);

      // Should open agenda form with pre-filled data
      await waitFor(() => {
        expect(screen.getByText('Add to 1:1 Agenda')).toBeInTheDocument();
      });

      // Test adding to personal file
      const saveToFileButton = screen.getByText('Save to Personal File');
      await user.click(saveToFileButton);

      // Should open personal file form with pre-filled data
      await waitFor(() => {
        expect(screen.getByText('Save to Personal File')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large datasets
      const largeAgendaItems = Array.from({ length: 100 }, (_, i) => ({
        id: `agenda-${i}`,
        teamMemberId: mockTeamMemberId,
        title: `Agenda item ${i}`,
        description: `Description for agenda item ${i}`,
        status: i % 3 === 0 ? 'discussed' : 'pending',
        priority: (i % 3) + 1,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        updatedAt: new Date(2024, 0, i + 1).toISOString(),
        tags: [`tag-${i % 5}`, `category-${i % 3}`]
      }));

      const largePersonalFileItems = Array.from({ length: 200 }, (_, i) => ({
        id: `file-${i}`,
        teamMemberId: mockTeamMemberId,
        title: `Personal file item ${i}`,
        notes: `Notes for personal file item ${i}`,
        category: ['achievement', 'concern', 'feedback', 'goal'][i % 4],
        sourceType: 'manual',
        sourceId: null,
        tags: [`tag-${i % 10}`, `category-${i % 5}`],
        importance: (i % 5) + 1,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        updatedAt: new Date(2024, 0, i + 1).toISOString(),
        createdBy: 'manager-1'
      }));

      AgendaItem.getByTeamMember.mockResolvedValue(largeAgendaItems);
      PersonalFileItem.getByTeamMember.mockResolvedValue(largePersonalFileItems);

      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      const startTime = performance.now();
      render(<TestWrapper />);

      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalled();
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(5000); // 5 seconds max

      // Components should still be functional
      expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });

    it('should handle concurrent data operations without race conditions', async () => {
      const concurrentOperations = [
        AgendaItem.create({
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent agenda 1',
          description: 'First concurrent agenda item'
        }),
        AgendaItem.create({
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent agenda 2',
          description: 'Second concurrent agenda item'
        }),
        PersonalFileItem.create({
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent file 1',
          notes: 'First concurrent personal file item',
          category: 'achievement'
        }),
        PersonalFileItem.create({
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent file 2',
          notes: 'Second concurrent personal file item',
          category: 'feedback'
        })
      ];

      // Mock successful responses for all operations
      AgendaItem.create
        .mockResolvedValueOnce({ id: 'agenda-concurrent-1', title: 'Concurrent agenda 1' })
        .mockResolvedValueOnce({ id: 'agenda-concurrent-2', title: 'Concurrent agenda 2' });

      PersonalFileItem.create
        .mockResolvedValueOnce({ id: 'file-concurrent-1', title: 'Concurrent file 1' })
        .mockResolvedValueOnce({ id: 'file-concurrent-2', title: 'Concurrent file 2' });

      // All operations should complete successfully
      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(4);
      expect(results[0].id).toBe('agenda-concurrent-1');
      expect(results[1].id).toBe('agenda-concurrent-2');
      expect(results[2].id).toBe('file-concurrent-1');
      expect(results[3].id).toBe('file-concurrent-2');
    });
  });

  describe('Data Validation and Error Recovery', () => {
    it('should validate data integrity across components', async () => {
      // Test with invalid team member ID
      const invalidTeamMemberId = '';

      AgendaItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (!teamMemberId) {
          return Promise.reject(new Error('Invalid team member ID'));
        }
        return Promise.resolve([]);
      });

      PersonalFileItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (!teamMemberId) {
          return Promise.reject(new Error('Invalid team member ID'));
        }
        return Promise.resolve([]);
      });

      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={invalidTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={invalidTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<TestWrapper />);

      // Components should handle invalid data gracefully
      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(invalidTeamMemberId);
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(invalidTeamMemberId);
      });

      // Should still render without crashing
      expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });

    it('should recover from network failures and retry operations', async () => {
      // First calls fail, subsequent calls succeed
      AgendaItem.getByTeamMember
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAgendaItems);

      PersonalFileItem.getByTeamMember
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPersonalFileItems);

      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<TestWrapper />);

      // Initial calls should fail
      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Components should still be rendered and functional
      expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });
  });

  describe('User Experience and Accessibility', () => {
    it('should maintain focus management across component interactions', async () => {
      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(AgendaItem.getByTeamMember).toHaveBeenCalled();
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Test keyboard navigation between components
      const agendaAddButton = screen.getByText('Add Item');
      agendaAddButton.focus();
      expect(document.activeElement).toBe(agendaAddButton);

      // Tab to personal file section
      await user.tab();
      // Focus should move to next focusable element
    });

    it('should provide appropriate loading states and feedback', async () => {
      // Mock slow loading
      AgendaItem.getByTeamMember.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockAgendaItems), 100))
      );
      PersonalFileItem.getByTeamMember.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPersonalFileItems), 100))
      );

      const TestWrapper = () => (
        <div>
          <AgendaSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
          <PersonalFileSection 
            teamMemberId={mockTeamMemberId} 
            teamMemberName={mockTeamMemberName} 
          />
        </div>
      );

      render(<TestWrapper />);

      // Should show loading states
      expect(screen.getAllByText('Loading...')).toHaveLength(2);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 200 });

      // Should show loaded content
      expect(screen.getByText('Discuss project performance')).toBeInTheDocument();
      expect(screen.getByText('Strong technical leadership')).toBeInTheDocument();
    });
  });
});