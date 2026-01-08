import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgendaItemForm from '../AgendaItemForm';
import { AgendaItem } from '@/api/oneOnOneAgenda';
import { toast } from 'sonner';

// Mock the API
vi.mock('@/api/oneOnOneAgenda', () => ({
  AgendaItem: {
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

describe('AgendaItemForm', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('High')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Low')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags (comma separated)')).toBeInTheDocument();
    expect(screen.getByText('Add to Agenda')).toBeInTheDocument();
  });

  it('initializes with default values', () => {
    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Medium')).toBeChecked(); // Default priority
  });

  it('populates form with initial data when editing', () => {
    const initialData = {
      id: '1',
      title: 'Test Agenda Item',
      description: 'Test description',
      priority: 1,
      tags: ['test', 'meeting']
    };

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Test Agenda Item')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByLabelText('High')).toBeChecked();
    expect(screen.getByDisplayValue('test, meeting')).toBeInTheDocument();
    expect(screen.getByText('Update Item')).toBeInTheDocument();
  });

  it('populates form with source item data', () => {
    const sourceItem = {
      title: 'Source Title',
      description: 'Source description'
    };

    render(
      <AgendaItemForm 
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
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const descriptionInput = screen.getByLabelText('Description');
    const tagsInput = screen.getByLabelText('Tags (comma separated)');

    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });

    expect(titleInput.value).toBe('New Title');
    expect(descriptionInput.value).toBe('New Description');
    expect(tagsInput.value).toBe('tag1, tag2');
  });

  it('handles priority selection', () => {
    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    const highPriorityRadio = screen.getByLabelText('High');
    fireEvent.click(highPriorityRadio);

    expect(highPriorityRadio).toBeChecked();
    expect(screen.getByLabelText('Medium')).not.toBeChecked();
    expect(screen.getByLabelText('Low')).not.toBeChecked();
  });

  it('validates required fields', async () => {
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
  });

  it('clears validation errors when field is edited', async () => {
    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Trigger validation error
    const submitButton = screen.getByText('Add to Agenda');
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

  it('creates new agenda item successfully', async () => {
    const mockResult = { id: '1', title: 'Test Item' };
    AgendaItem.create.mockResolvedValue(mockResult);

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } });
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), { target: { value: 'tag1, tag2' } });
    fireEvent.click(screen.getByLabelText('High'));

    // Submit form
    fireEvent.click(screen.getByText('Add to Agenda'));

    await waitFor(() => {
      expect(AgendaItem.create).toHaveBeenCalledWith({
        teamMemberId: mockTeamMemberId,
        title: 'Test Item',
        description: 'Test description',
        priority: 1,
        tags: ['tag1', 'tag2'],
        status: 'pending'
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Agenda item added to next 1:1 meeting');
    expect(mockOnSubmit).toHaveBeenCalledWith(mockResult);
  });

  it('updates existing agenda item successfully', async () => {
    const initialData = { id: '1', title: 'Original Title' };
    const mockResult = { id: '1', title: 'Updated Title' };
    AgendaItem.update.mockResolvedValue(mockResult);

    render(
      <AgendaItemForm 
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
      expect(AgendaItem.update).toHaveBeenCalledWith('1', {
        teamMemberId: mockTeamMemberId,
        title: 'Updated Title',
        description: '',
        priority: 2,
        tags: [],
        status: 'pending'
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Agenda item updated successfully');
    expect(mockOnSubmit).toHaveBeenCalledWith(mockResult);
  });

  it('handles API errors gracefully', async () => {
    AgendaItem.create.mockRejectedValue(new Error('API Error'));

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.click(screen.getByText('Add to Agenda'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save agenda item');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    AgendaItem.create.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.click(screen.getByText('Add to Agenda'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('renders cancel button when onCancel is provided', () => {
    render(
      <AgendaItemForm 
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
    AgendaItem.create.mockResolvedValue({ id: '1' });

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Test various tag formats
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), { 
      target: { value: ' tag1 , tag2,  tag3  , ' } 
    });

    fireEvent.click(screen.getByText('Add to Agenda'));

    await waitFor(() => {
      expect(AgendaItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag1', 'tag2', 'tag3']
        })
      );
    });
  });

  it('resets form after successful creation', async () => {
    AgendaItem.create.mockResolvedValue({ id: '1' });

    render(
      <AgendaItemForm 
        teamMemberId={mockTeamMemberId} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Fill form
    const titleInput = screen.getByLabelText('Title');
    const descriptionInput = screen.getByLabelText('Description');
    const tagsInput = screen.getByLabelText('Tags (comma separated)');

    fireEvent.change(titleInput, { target: { value: 'Test Item' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });

    // Submit form
    fireEvent.click(screen.getByText('Add to Agenda'));

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
      expect(tagsInput.value).toBe('');
      expect(screen.getByLabelText('Medium')).toBeChecked();
    });
  });
});