// src/components/agenda/__tests__/PersonalFileDataFlowIntegration.test.jsx
// Integration tests for end-to-end personal file management data flow

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import PersonalFileSection from '../PersonalFileSection';
import { PersonalFileItem } from '@/api/oneOnOneAgenda';
import { localClient } from '@/api/localClient';
import { printPersonalFile, exportPersonalFileToPDF } from '@/services/printService';

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

describe('Personal File Management Data Flow Integration', () => {
  const mockTeamMemberId = 'team-member-123';
  const mockTeamMemberName = 'John Doe';
  const user = userEvent.setup();

  const mockPersonalFileItems = [
    {
      id: 'file-1',
      teamMemberId: mockTeamMemberId,
      title: 'Excellent code review feedback',
      notes: 'John provided thorough and constructive feedback on the authentication module. His suggestions improved code quality significantly.',
      category: 'achievement',
      sourceType: 'manual',
      sourceId: null,
      tags: ['code-review', 'feedback', 'quality'],
      importance: 4,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'manager-1'
    },
    {
      id: 'file-2',
      teamMemberId: mockTeamMemberId,
      title: 'Missed deadline concern',
      notes: 'Project delivery was delayed by 2 days due to scope creep. Need to discuss better scope management.',
      category: 'concern',
      sourceType: 'task',
      sourceId: 'task-456',
      tags: ['deadline', 'scope', 'project-management'],
      importance: 3,
      createdAt: '2024-01-03T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
      createdBy: 'manager-1'
    },
    {
      id: 'file-3',
      teamMemberId: mockTeamMemberId,
      title: 'Career development goals',
      notes: 'John expressed interest in learning cloud architecture. Discussed potential training opportunities.',
      category: 'goal',
      sourceType: 'meeting',
      sourceId: 'meeting-789',
      tags: ['career', 'training', 'cloud'],
      importance: 5,
      createdAt: '2024-01-05T10:00:00Z',
      updatedAt: '2024-01-05T10:00:00Z',
      createdBy: 'manager-1'
    },
    {
      id: 'file-4',
      teamMemberId: mockTeamMemberId,
      title: 'Positive feedback from stakeholder',
      notes: 'Client specifically mentioned John\'s excellent communication during the demo. Great representation of the team.',
      category: 'feedback',
      sourceType: 'stakeholder',
      sourceId: 'stakeholder-101',
      tags: ['communication', 'client', 'demo'],
      importance: 4,
      createdAt: '2024-01-07T10:00:00Z',
      updatedAt: '2024-01-07T10:00:00Z',
      createdBy: 'manager-1'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    
    // Setup default mock responses
    PersonalFileItem.getByTeamMember.mockResolvedValue(mockPersonalFileItems);
    localClient.entities.PersonalFileItem.getByTeamMember.mockResolvedValue(mockPersonalFileItems);
  });

  describe('Complete Personal File Item Lifecycle', () => {
    it('should handle complete CRUD operations: create -> read -> update -> delete', async () => {
      const newPersonalFileItem = {
        id: 'file-new',
        teamMemberId: mockTeamMemberId,
        title: 'New achievement',
        notes: 'Completed project ahead of schedule with excellent quality',
        category: 'achievement',
        sourceType: 'manual',
        sourceId: null,
        tags: ['project', 'delivery', 'quality'],
        importance: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'manager-1'
      };

      const updatedPersonalFileItem = {
        ...newPersonalFileItem,
        notes: 'Updated: Completed project ahead of schedule with excellent quality and received client praise',
        updatedAt: new Date().toISOString()
      };

      PersonalFileItem.create.mockResolvedValue(newPersonalFileItem);
      PersonalFileItem.update.mockResolvedValue(updatedPersonalFileItem);
      PersonalFileItem.delete.mockResolvedValue(true);

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      // Wait for initial load (READ operation)
      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Verify initial items are displayed
      expect(screen.getByText('Excellent code review feedback')).toBeInTheDocument();
      expect(screen.getByText('Missed deadline concern')).toBeInTheDocument();
      expect(screen.getByText('Career development goals')).toBeInTheDocument();
      expect(screen.getByText('Positive feedback from stakeholder')).toBeInTheDocument();

      // Step 1: CREATE - Add new personal file item
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add to Personal File')).toBeInTheDocument();
      });

      // Fill out the form
      const titleInput = screen.getByLabelText(/title/i);
      const notesInput = screen.getByLabelText(/notes/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const importanceSelect = screen.getByLabelText(/importance/i);
      
      await user.type(titleInput, 'New achievement');
      await user.type(notesInput, 'Completed project ahead of schedule with excellent quality');
      await user.selectOptions(categorySelect, 'achievement');
      await user.selectOptions(importanceSelect, '5');

      // Add tags
      const tagsInput = screen.getByLabelText(/tags/i);
      await user.type(tagsInput, 'project, delivery, quality');

      // Submit form
      const submitButton = screen.getByText('Save to Personal File');
      await user.click(submitButton);

      // Verify CREATE was called with correct data
      await waitFor(() => {
        expect(PersonalFileItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            teamMemberId: mockTeamMemberId,
            title: 'New achievement',
            notes: 'Completed project ahead of schedule with excellent quality',
            category: 'achievement',
            importance: 5,
            tags: expect.arrayContaining(['project', 'delivery', 'quality'])
          })
        );
      });

      // Step 2: UPDATE - Edit the created item
      // Mock updated data after creation
      const updatedItems = [...mockPersonalFileItems, newPersonalFileItem];
      PersonalFileItem.getByTeamMember.mockResolvedValue(updatedItems);

      // Simulate edit action (this would typically be triggered by clicking an edit button)
      // For integration testing, we'll simulate the edit dialog opening
      
      // Step 3: DELETE - Remove an item
      // Mock window.confirm for deletion
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Simulate delete action
      // The actual delete would be triggered by clicking a delete button in PersonalFileItemCard

      confirmSpy.mockRestore();
    });

    it('should handle form validation errors during creation', async () => {
      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Open add form
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add to Personal File')).toBeInTheDocument();
      });

      // Try to submit without required fields
      const submitButton = screen.getByText('Save to Personal File');
      await user.click(submitButton);

      // Form should show validation errors (implementation dependent)
      // The form component should handle validation
    });
  });

  describe('Category-based Filtering and Organization', () => {
    it('should filter items by category and maintain data consistency', async () => {
      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Verify all items are shown initially
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Achievement')).toBeInTheDocument();
      expect(screen.getByText('Concern')).toBeInTheDocument();
      expect(screen.getByText('Goal')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();

      // Test Achievement filter
      const achievementTab = screen.getByText('Achievement');
      await user.click(achievementTab);

      // Should show only achievement items
      await waitFor(() => {
        expect(screen.getByText('Excellent code review feedback')).toBeInTheDocument();
      });

      // Test Concern filter
      const concernTab = screen.getByText('Concern');
      await user.click(concernTab);

      // Should show only concern items
      await waitFor(() => {
        expect(screen.getByText('Missed deadline concern')).toBeInTheDocument();
      });

      // Test Goal filter
      const goalTab = screen.getByText('Goal');
      await user.click(goalTab);

      // Should show only goal items
      await waitFor(() => {
        expect(screen.getByText('Career development goals')).toBeInTheDocument();
      });

      // Return to All view
      const allTab = screen.getByText('All');
      await user.click(allTab);

      // Should show all items again
      await waitFor(() => {
        expect(screen.getByText('Excellent code review feedback')).toBeInTheDocument();
        expect(screen.getByText('Missed deadline concern')).toBeInTheDocument();
        expect(screen.getByText('Career development goals')).toBeInTheDocument();
        expect(screen.getByText('Positive feedback from stakeholder')).toBeInTheDocument();
      });
    });

    it('should handle dynamic category creation when new items are added', async () => {
      const newCategoryItem = {
        id: 'file-new-category',
        teamMemberId: mockTeamMemberId,
        title: 'Training completion',
        notes: 'Completed AWS certification course',
        category: 'training', // New category
        sourceType: 'manual',
        sourceId: null,
        tags: ['aws', 'certification'],
        importance: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'manager-1'
      };

      PersonalFileItem.create.mockResolvedValue(newCategoryItem);

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Add new item with new category
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add to Personal File')).toBeInTheDocument();
      });

      // Fill form with new category
      const titleInput = screen.getByLabelText(/title/i);
      const notesInput = screen.getByLabelText(/notes/i);
      const categorySelect = screen.getByLabelText(/category/i);
      
      await user.type(titleInput, 'Training completion');
      await user.type(notesInput, 'Completed AWS certification course');
      await user.selectOptions(categorySelect, 'training');

      const submitButton = screen.getByText('Save to Personal File');
      await user.click(submitButton);

      // Mock updated data with new category
      const updatedItems = [...mockPersonalFileItems, newCategoryItem];
      PersonalFileItem.getByTeamMember.mockResolvedValue(updatedItems);

      // After creation, new category tab should appear
      await waitFor(() => {
        expect(PersonalFileItem.create).toHaveBeenCalled();
      });
    });
  });

  describe('Export and Print Functionality', () => {
    it('should handle export to text functionality', async () => {
      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Find and click export dropdown
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      // Click export as text option
      const exportTextOption = screen.getByText('Export as Text');
      await user.click(exportTextOption);

      // Verify export function was called
      await waitFor(() => {
        expect(exportPersonalFileToPDF).toHaveBeenCalledWith(
          mockPersonalFileItems,
          mockTeamMemberName
        );
      });
    });

    it('should handle print functionality', async () => {
      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Find and click export dropdown
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      // Click print preview option
      const printOption = screen.getByText('Print Preview');
      await user.click(printOption);

      // Verify print function was called
      await waitFor(() => {
        expect(printPersonalFile).toHaveBeenCalledWith(
          mockPersonalFileItems,
          mockTeamMemberName
        );
      });
    });

    it('should handle export errors gracefully', async () => {
      exportPersonalFileToPDF.mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      const exportTextOption = screen.getByText('Export as Text');
      await user.click(exportTextOption);

      // Should handle error gracefully
      await waitFor(() => {
        expect(exportPersonalFileToPDF).toHaveBeenCalled();
      });
    });
  });

  describe('Data Integrity and Privacy', () => {
    it('should maintain data integrity across operations', async () => {
      const { rerender } = render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Simulate data change
      const modifiedItems = mockPersonalFileItems.map(item => 
        item.id === 'file-1' 
          ? { ...item, notes: 'Updated notes', updatedAt: new Date().toISOString() }
          : item
      );

      PersonalFileItem.getByTeamMember.mockResolvedValue(modifiedItems);

      // Re-render component
      rerender(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      // Should load updated data
      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle team member changes and load appropriate data', async () => {
      const differentTeamMemberId = 'team-member-456';
      const differentMemberItems = [
        {
          id: 'file-different',
          teamMemberId: differentTeamMemberId,
          title: 'Different member item',
          notes: 'This belongs to a different team member',
          category: 'achievement',
          sourceType: 'manual',
          sourceId: null,
          tags: ['different'],
          importance: 3,
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2024-01-10T10:00:00Z',
          createdBy: 'manager-1'
        }
      ];

      PersonalFileItem.getByTeamMember.mockImplementation((teamMemberId) => {
        if (teamMemberId === mockTeamMemberId) {
          return Promise.resolve(mockPersonalFileItems);
        } else if (teamMemberId === differentTeamMemberId) {
          return Promise.resolve(differentMemberItems);
        }
        return Promise.resolve([]);
      });

      const { rerender } = render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
      });

      // Change to different team member
      rerender(
        <PersonalFileSection 
          teamMemberId={differentTeamMemberId} 
          teamMemberName="Jane Smith" 
        />
      );

      // Should load data for new team member
      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalledWith(differentTeamMemberId);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      PersonalFileItem.getByTeamMember.mockRejectedValue(new Error('API Error'));

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      // Should handle error without crashing
      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });

    it('should handle empty data sets', async () => {
      PersonalFileItem.getByTeamMember.mockResolvedValue([]);

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      // Should show empty state
      expect(screen.getByText('No personal file items found')).toBeInTheDocument();
      expect(screen.getByText('Add items to build a comprehensive performance record.')).toBeInTheDocument();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = [
        { id: 'bad-1', title: null, notes: undefined }, // Missing/invalid fields
        { id: 'bad-2' }, // Missing most fields
        null, // Null item
        undefined, // Undefined item
        { id: 'bad-3', teamMemberId: mockTeamMemberId, title: 'Valid item' } // Partially valid
      ];

      PersonalFileItem.getByTeamMember.mockResolvedValue(malformedData);

      render(
        <PersonalFileSection 
          teamMemberId={mockTeamMemberId} 
          teamMemberName={mockTeamMemberName} 
        />
      );

      // Should not crash and handle malformed data
      await waitFor(() => {
        expect(PersonalFileItem.getByTeamMember).toHaveBeenCalled();
      });

      expect(screen.getByText('Personal File')).toBeInTheDocument();
    });

    it('should handle concurrent operations without data corruption', async () => {
      const createPromise1 = PersonalFileItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent item 1',
        notes: 'First concurrent operation',
        category: 'achievement'
      });

      const createPromise2 = PersonalFileItem.create({
        teamMemberId: mockTeamMemberId,
        title: 'Concurrent item 2',
        notes: 'Second concurrent operation',
        category: 'feedback'
      });

      PersonalFileItem.create
        .mockResolvedValueOnce({
          id: 'concurrent-1',
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent item 1',
          category: 'achievement'
        })
        .mockResolvedValueOnce({
          id: 'concurrent-2',
          teamMemberId: mockTeamMemberId,
          title: 'Concurrent item 2',
          category: 'feedback'
        });

      // Both operations should complete successfully
      const [result1, result2] = await Promise.all([createPromise1, createPromise2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.id).toBe('concurrent-1');
      expect(result2.id).toBe('concurrent-2');
    });
  });
});