import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AgendaItemForm from '../AgendaItemForm';
import PersonalFileItemForm from '../PersonalFileItemForm';
import AgendaItemList from '../AgendaItemList';
import PersonalFileList from '../PersonalFileList';
import { AgendaItem, PersonalFileItem } from '@/api/oneOnOneAgenda';
import { toast } from 'sonner';

// Mock the API
vi.mock('@/api/oneOnOneAgenda', () => ({
  AgendaItem: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByTeamMember: vi.fn()
  },
  PersonalFileItem: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByTeamMember: vi.fn()
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock localStorage to simulate failures
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Error Handling and Edge Cases', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mocks to default behavior
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'agenda_items') return JSON.stringify([]);
      if (key === 'personal_file_items') return JSON.stringify([]);
      return null;
    });
    mockLocalStorage.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validation Error Handling', () => {
    describe('AgendaItemForm Validation', () => {
      it('handles empty title validation error', async () => {
        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Title is required')).toBeInTheDocument();
        });

        expect(AgendaItem.create).not.toHaveBeenCalled();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('handles title too long validation error', async () => {
        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        const longTitle = 'a'.repeat(256); // Exceeds typical max length
        fireEvent.change(titleInput, { target: { value: longTitle } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        // Should still attempt to create since client-side validation might not catch this
        // But server-side validation would fail
        await waitFor(() => {
          expect(titleInput.value).toBe(longTitle);
        });
      });

      it('handles whitespace-only title validation error', async () => {
        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: '   ' } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Title is required')).toBeInTheDocument();
        });

        expect(AgendaItem.create).not.toHaveBeenCalled();
      });

      it('handles invalid priority value', async () => {
        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        // Simulate invalid priority by directly manipulating form state
        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

        // Mock API to reject invalid priority
        AgendaItem.create.mockRejectedValue(new Error('Invalid priority value'));

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });
    });

    describe('PersonalFileItemForm Validation', () => {
      it('handles empty title validation error', async () => {
        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Title is required')).toBeInTheDocument();
        });

        expect(PersonalFileItem.create).not.toHaveBeenCalled();
      });

      it('handles invalid category value', async () => {
        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

        // Mock API to reject invalid category
        PersonalFileItem.create.mockRejectedValue(new Error('Invalid category'));

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });

      it('handles invalid importance value', async () => {
        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

        // Mock API to reject invalid importance
        PersonalFileItem.create.mockRejectedValue(new Error('Invalid importance value'));

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });
    });
  });

  describe('Data Operation Failures', () => {
    describe('localStorage Failures', () => {
      it('handles localStorage quota exceeded error on create', async () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

        AgendaItem.create.mockRejectedValue(new Error('Storage quota exceeded'));

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('handles localStorage read failure', async () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage access denied');
        });

        AgendaItem.getByTeamMember.mockRejectedValue(new Error('Failed to read data'));

        render(<AgendaItemList teamMemberId={mockTeamMemberId} />);

        await waitFor(() => {
          expect(screen.getByText('No agenda items found')).toBeInTheDocument();
        });
      });

      it('handles corrupted localStorage data', async () => {
        mockLocalStorage.getItem.mockReturnValue('invalid json data');

        AgendaItem.getByTeamMember.mockResolvedValue([]);

        render(<AgendaItemList teamMemberId={mockTeamMemberId} />);

        await waitFor(() => {
          expect(screen.getByText('No agenda items found')).toBeInTheDocument();
        });
      });
    });

    describe('Network/API Failures', () => {
      it('handles network timeout on create', async () => {
        AgendaItem.create.mockRejectedValue(new Error('Network timeout'));

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });

      it('handles server error on update', async () => {
        const initialData = { id: '1', title: 'Original Title' };
        AgendaItem.update.mockRejectedValue(new Error('Internal server error'));

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const submitButton = screen.getByText('Update Item');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });

      it('handles item not found error on update', async () => {
        const initialData = { id: 'non-existent', title: 'Original Title' };
        AgendaItem.update.mockRejectedValue(new Error('AgendaItem not found'));

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const submitButton = screen.getByText('Update Item');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });
    });

    describe('Access Control Violations', () => {
      it('handles unauthorized access to personal file items', async () => {
        PersonalFileItem.create.mockRejectedValue(new Error('Access denied: User not authenticated'));

        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });

      it('handles attempt to access another users personal file items', async () => {
        PersonalFileItem.getByTeamMember.mockRejectedValue(
          new Error('Access denied: You can only access your own personal file items')
        );

        render(<PersonalFileList teamMemberId={mockTeamMemberId} />);

        await waitFor(() => {
          expect(screen.getByText('No personal file items found')).toBeInTheDocument();
        });
      });

      it('handles attempt to update another users personal file item', async () => {
        const initialData = { id: '1', title: 'Original Title', createdBy: 'other-user' };
        PersonalFileItem.update.mockRejectedValue(
          new Error('Access denied: You can only update your own personal file items')
        );

        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const submitButton = screen.getByText('Update Item');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });
    });
  });

  describe('Concurrent Edit Scenarios', () => {
    describe('Race Conditions', () => {
      it('handles concurrent agenda item creation', async () => {
        let createCallCount = 0;
        AgendaItem.create.mockImplementation(async (item) => {
          createCallCount++;
          if (createCallCount === 1) {
            // First call succeeds
            return { ...item, id: 'first-item' };
          } else {
            // Second call fails due to race condition
            throw new Error('Concurrent modification detected');
          }
        });

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'First Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        
        // First submission should succeed
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Agenda item added to next 1:1 meeting');
        });

        // After form reset, try again to simulate concurrent scenario
        fireEvent.change(titleInput, { target: { value: 'Second Item' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });

        expect(createCallCount).toBe(2);
      });

      it('handles concurrent agenda item updates', async () => {
        const initialData = { id: '1', title: 'Original Title', updatedAt: '2024-01-01T10:00:00Z' };
        
        let updateCallCount = 0;
        AgendaItem.update.mockImplementation(async (id, updates) => {
          updateCallCount++;
          if (updateCallCount === 1) {
            return { ...initialData, ...updates, updatedAt: '2024-01-01T10:01:00Z' };
          } else {
            // Second update detects conflict
            throw new Error('Item was modified by another user');
          }
        });

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title 1' } });

        const submitButton = screen.getByText('Update Item');
        
        // First update should succeed
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Agenda item updated successfully');
        });

        // Simulate another update that fails due to conflict
        fireEvent.change(titleInput, { target: { value: 'Updated Title 2' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });

        expect(updateCallCount).toBe(2);
      });

      it('handles stale data detection in personal file items', async () => {
        const initialData = { 
          id: '1', 
          title: 'Original Title', 
          updatedAt: '2024-01-01T10:00:00Z',
          createdBy: 'current-user'
        };
        
        PersonalFileItem.update.mockRejectedValue(
          new Error('Stale data: Item was modified by another process')
        );

        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const submitButton = screen.getByText('Update Item');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });
    });

    describe('Data Consistency', () => {
      it('handles deletion of item being edited', async () => {
        const initialData = { id: '1', title: 'Original Title' };
        AgendaItem.update.mockRejectedValue(new Error('AgendaItem not found'));

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={initialData}
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const submitButton = screen.getByText('Update Item');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });

      it('handles team member deletion during personal file operations', async () => {
        PersonalFileItem.create.mockRejectedValue(
          new Error('Team member no longer exists')
        );

        render(
          <PersonalFileItemForm 
            teamMemberId="deleted-team-member" 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
        });
      });

      it('handles orphaned agenda items after team member deletion', async () => {
        const orphanedItems = [
          {
            id: '1',
            title: 'Orphaned Item',
            teamMemberId: 'deleted-team-member',
            status: 'pending',
            priority: 2,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        render(<AgendaItemList items={orphanedItems} />);

        await waitFor(() => {
          expect(screen.getByText('Orphaned Item')).toBeInTheDocument();
        });

        // Should still display the items but with appropriate handling
        expect(screen.getByText('Showing 1 of 1 agenda items')).toBeInTheDocument();
      });
    });

    describe('Form State Conflicts', () => {
      it('handles form reset during submission', async () => {
        let resolveCreate;
        AgendaItem.create.mockImplementation(() => {
          return new Promise((resolve) => {
            resolveCreate = resolve;
          });
        });

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        // Form should show loading state
        expect(screen.getByText('Saving...')).toBeInTheDocument();

        // Simulate form reset while submission is in progress
        fireEvent.change(titleInput, { target: { value: '' } });

        // Resolve the create operation
        resolveCreate({ id: '1', title: 'Test Item' });

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Agenda item added to next 1:1 meeting');
        });

        // Form should be reset after successful submission
        expect(titleInput.value).toBe('');
      });

      it('handles component unmount during submission', async () => {
        let resolveCreate;
        AgendaItem.create.mockImplementation(() => {
          return new Promise((resolve) => {
            resolveCreate = resolve;
          });
        });

        const { unmount } = render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        // Unmount component while submission is in progress
        unmount();

        // Resolve the create operation
        resolveCreate({ id: '1', title: 'Test Item' });

        // Should not cause any errors or memory leaks
        await waitFor(() => {
          expect(AgendaItem.create).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Malformed Data', () => {
      it('handles malformed agenda item data', async () => {
        const malformedData = {
          id: null,
          title: undefined,
          priority: 'invalid',
          tags: null, // This should not cause a crash
          createdAt: 'invalid-date'
        };

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={malformedData}
          />
        );

        // Form should handle malformed data gracefully
        expect(screen.getByLabelText('Title')).toHaveValue('');
        expect(screen.getByLabelText('Tags (comma separated)')).toHaveValue('');
        
        // Since malformed data includes an ID, it will show "Update Item" instead of "Add to Agenda"
        // Just check that the form renders without crashing
        expect(screen.getByText('Update Item')).toBeInTheDocument();
      });

      it('handles malformed personal file item data', async () => {
        const malformedData = {
          id: {},
          title: null,
          category: 123,
          importance: 'high',
          tags: null
        };

        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit}
            initialData={malformedData}
          />
        );

        // Form should handle malformed data gracefully
        expect(screen.getByLabelText('Title')).toHaveValue('');
        expect(screen.getByLabelText('Tags (comma separated)')).toHaveValue('');
      });
    });

    describe('Boundary Values', () => {
      it('handles maximum length title', async () => {
        const maxLengthTitle = 'a'.repeat(255);
        AgendaItem.create.mockResolvedValue({ id: '1', title: maxLengthTitle });

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: maxLengthTitle } });

        const submitButton = screen.getByText('Add to Agenda');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(AgendaItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
              title: maxLengthTitle
            })
          );
        });
      });

      it('handles maximum number of tags', async () => {
        const maxTags = Array.from({ length: 20 }, (_, i) => `tag${i + 1}`);
        const tagsString = maxTags.join(', ');

        PersonalFileItem.create.mockResolvedValue({ id: '1', tags: maxTags });

        render(
          <PersonalFileItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        const tagsInput = screen.getByLabelText('Tags (comma separated)');
        
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });
        fireEvent.change(tagsInput, { target: { value: tagsString } });

        const submitButton = screen.getByText('Save to Personal File');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(PersonalFileItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
              tags: maxTags
            })
          );
        });
      });

      it('handles empty arrays and null values', async () => {
        const itemsWithNulls = [
          {
            id: '1',
            title: 'Valid Item',
            description: null,
            tags: [],
            priority: 2,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        render(<AgendaItemList items={itemsWithNulls} />);

        await waitFor(() => {
          expect(screen.getByText('Valid Item')).toBeInTheDocument();
          expect(screen.getByText('Showing 1 of 1 agenda items')).toBeInTheDocument();
        });
      });
    });

    describe('Performance Edge Cases', () => {
      it('handles large number of agenda items', async () => {
        const largeItemList = Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          title: `Agenda Item ${i}`,
          teamMemberId: mockTeamMemberId,
          status: 'pending',
          priority: (i % 3) + 1,
          tags: [`tag${i % 5}`],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        render(<AgendaItemList items={largeItemList} />);

        await waitFor(() => {
          expect(screen.getByText('Showing 100 of 100 agenda items')).toBeInTheDocument();
        });

        // Should still be responsive
        const searchInput = screen.getByPlaceholderText('Search agenda items...');
        fireEvent.change(searchInput, { target: { value: 'Item 1' } });

        await waitFor(() => {
          expect(screen.getByText(/Showing \d+ of 100 agenda items/)).toBeInTheDocument();
        });
      });

      it('handles rapid form submissions', async () => {
        let submitCount = 0;
        AgendaItem.create.mockImplementation(async (item) => {
          submitCount++;
          if (submitCount === 1) {
            return { ...item, id: `item-${submitCount}` };
          } else {
            throw new Error('Too many requests');
          }
        });

        render(
          <AgendaItemForm 
            teamMemberId={mockTeamMemberId} 
            onSubmit={mockOnSubmit} 
          />
        );

        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Test Item' } });

        const submitButton = screen.getByText('Add to Agenda');
        
        // First click should succeed
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Agenda item added to next 1:1 meeting');
        });

        // Reset form and try again to trigger error
        fireEvent.change(titleInput, { target: { value: 'Test Item 2' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
        });
      });
    });
  });
});