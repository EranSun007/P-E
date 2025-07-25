import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PersonalFileItemForm from '../PersonalFileItemForm';
import { PersonalFileItem } from '@/api/oneOnOneAgenda';
import { toast } from 'sonner';

// Mock the API
vi.mock('@/api/oneOnOneAgenda', () => ({
  PersonalFileItem: {
    create: vi.fn(),
    update: vi.fn()
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('PersonalFileItemForm', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Importance')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags (comma separated)')).toBeInTheDocument();
    expect(screen.getByText('Save to Personal File')).toBeInTheDocument();
  });

  it('initializes with default values', () => {
    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('');
    // Default category and importance are set via Select components
  });

  it('populates form with initial data when editing', () => {
    const initialData = {
      id: '1',
      title: 'Test Personal File Item',
      notes: 'Test notes',
      category: 'feedback',
      importance: 4,
      tags: ['performance', 'review']
    };

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Test Personal File Item')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('performance, review')).toBeInTheDocument();
    expect(screen.getByText('Update Item')).toBeInTheDocument();
  });

  it('populates form with source item data', () => {
    const sourceItem = {
      title: 'Source Title',
      description: 'Source description',
      type: 'task',
      id: 'source-1'
    };

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        sourceItem={sourceItem}
      />
    );

    expect(screen.getByDisplayValue('Source Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Source description')).toBeInTheDocument();
  });

  it('handles form input changes', () => {
    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const notesInput = screen.getByLabelText('Notes');
    const tagsInput = screen.getByLabelText('Tags (comma separated)');

    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.change(notesInput, { target: { value: 'New Notes' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });

    expect(titleInput.value).toBe('New Title');
    expect(notesInput.value).toBe('New Notes');
    expect(tagsInput.value).toBe('tag1, tag2');
  });

  it('validates required fields', async () => {
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

  it('clears validation errors when field is edited', async () => {
    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Trigger validation error
    const submitButton = screen.getByText('Save to Personal File');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Edit the field to clear error
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('creates new personal file item successfully', async () => {
    const mockResult = { id: '1', title: 'Test Item' };
    PersonalFileItem.create.mockResolvedValue(mockResult);

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Test notes' } });
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), { target: { value: 'tag1, tag2' } });

    // Submit form
    fireEvent.click(screen.getByText('Save to Personal File'));

    await waitFor(() => {
      expect(PersonalFileItem.create).toHaveBeenCalledWith({
        teamMemberId: mockTeamMemberId,
        title: 'Test Item',
        notes: 'Test notes',
        category: 'achievement',
        tags: ['tag1', 'tag2'],
        importance: 3,
        sourceType: 'manual',
        sourceId: null
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Item saved to personal file');
    expect(mockOnSubmit).toHaveBeenCalledWith(mockResult);
  });

  it('updates existing personal file item successfully', async () => {
    const initialData = { id: '1', title: 'Original Title' };
    const mockResult = { id: '1', title: 'Updated Title' };
    PersonalFileItem.update.mockResolvedValue(mockResult);

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    // Update title
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });

    // Submit form
    fireEvent.click(screen.getByText('Update Item'));

    await waitFor(() => {
      expect(PersonalFileItem.update).toHaveBeenCalledWith('1', {
        teamMemberId: mockTeamMemberId,
        title: 'Updated Title',
        notes: '',
        category: 'achievement',
        tags: [],
        importance: 3,
        sourceType: 'manual',
        sourceId: null
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Personal file item updated successfully');
    expect(mockOnSubmit).toHaveBeenCalledWith(mockResult);
  });

  it('handles API errors gracefully', async () => {
    PersonalFileItem.create.mockRejectedValue(new Error('API Error'));

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.click(screen.getByText('Save to Personal File'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save personal file item');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    PersonalFileItem.create.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.click(screen.getByText('Save to Personal File'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('renders cancel button when onCancel is provided', () => {
    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('processes tags correctly', async () => {
    PersonalFileItem.create.mockResolvedValue({ id: '1' });

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Test various tag formats
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), { 
      target: { value: ' tag1 , tag2,  tag3  , ' } 
    });

    fireEvent.click(screen.getByText('Save to Personal File'));

    await waitFor(() => {
      expect(PersonalFileItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag1', 'tag2', 'tag3']
        })
      );
    });
  });

  it('resets form after successful creation', async () => {
    PersonalFileItem.create.mockResolvedValue({ id: '1' });

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill form
    const titleInput = screen.getByLabelText('Title');
    const notesInput = screen.getByLabelText('Notes');
    const tagsInput = screen.getByLabelText('Tags (comma separated)');

    fireEvent.change(titleInput, { target: { value: 'Test Item' } });
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });

    // Submit form
    fireEvent.click(screen.getByText('Save to Personal File'));

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(notesInput.value).toBe('');
      expect(tagsInput.value).toBe('');
    });
  });

  it('uses source item data for sourceType and sourceId', async () => {
    const sourceItem = {
      type: 'task',
      id: 'task-123'
    };

    PersonalFileItem.create.mockResolvedValue({ id: '1' });

    render(
      <PersonalFileItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        sourceItem={sourceItem}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.click(screen.getByText('Save to Personal File'));

    await waitFor(() => {
      expect(PersonalFileItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'task',
          sourceId: 'task-123'
        })
      );
    });
  });
});