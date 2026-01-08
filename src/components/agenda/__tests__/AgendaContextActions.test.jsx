import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgendaContextActions from '../AgendaContextActions';
import { toast } from 'sonner';

// Mock the form components
vi.mock('../AgendaItemForm', () => ({
  default: ({ onSubmit, onCancel, sourceItem }) => (
    <div data-testid="agenda-item-form">
      <div>Team Member ID: {sourceItem?.teamMemberId}</div>
      <div>Source Title: {sourceItem?.title}</div>
      <button onClick={() => onSubmit({ id: '1', title: 'Test Agenda Item' })}>
        Submit Agenda Item
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../PersonalFileItemForm', () => ({
  default: ({ onSubmit, onCancel, sourceItem }) => (
    <div data-testid="personal-file-form">
      <div>Team Member ID: {sourceItem?.teamMemberId}</div>
      <div>Source Title: {sourceItem?.title}</div>
      <button onClick={() => onSubmit({ id: '1', title: 'Test Personal File Item' })}>
        Submit Personal File Item
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn()
  }
}));

describe('AgendaContextActions', () => {
  const mockProps = {
    teamMemberId: 'team-member-1',
    teamMemberName: 'John Doe',
    sourceItem: {
      title: 'Source Item Title',
      description: 'Source item description'
    }
  };

  const mockOnActionComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both action buttons by default', () => {
    render(<AgendaContextActions {...mockProps} />);

    expect(screen.getByText('Add to 1:1')).toBeInTheDocument();
    expect(screen.getByText('Save to File')).toBeInTheDocument();
  });

  it('renders only agenda action when showPersonalFileAction is false', () => {
    render(
      <AgendaContextActions 
        {...mockProps} 
        showPersonalFileAction={false}
      />
    );

    expect(screen.getByText('Add to 1:1')).toBeInTheDocument();
    expect(screen.queryByText('Save to File')).not.toBeInTheDocument();
  });

  it('renders only personal file action when showAgendaAction is false', () => {
    render(
      <AgendaContextActions 
        {...mockProps} 
        showAgendaAction={false}
      />
    );

    expect(screen.queryByText('Add to 1:1')).not.toBeInTheDocument();
    expect(screen.getByText('Save to File')).toBeInTheDocument();
  });

  it('renders nothing when both actions are disabled', () => {
    const { container } = render(
      <AgendaContextActions 
        {...mockProps} 
        showAgendaAction={false}
        showPersonalFileAction={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('opens agenda form dialog when Add to 1:1 button is clicked', async () => {
    render(<AgendaContextActions {...mockProps} />);

    const addButton = screen.getByText('Add to 1:1');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Add to John Doe's 1:1 Agenda")).toBeInTheDocument();
      expect(screen.getByTestId('agenda-item-form')).toBeInTheDocument();
    });
  });

  it('opens personal file form dialog when Save to File button is clicked', async () => {
    render(<AgendaContextActions {...mockProps} />);

    const saveButton = screen.getByText('Save to File');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Save to John Doe's Personal File")).toBeInTheDocument();
      expect(screen.getByTestId('personal-file-form')).toBeInTheDocument();
    });
  });

  it('passes source item data to agenda form', async () => {
    render(<AgendaContextActions {...mockProps} />);

    const addButton = screen.getByText('Add to 1:1');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Source Title: Source Item Title')).toBeInTheDocument();
    });
  });

  it('passes source item data to personal file form', async () => {
    render(<AgendaContextActions {...mockProps} />);

    const saveButton = screen.getByText('Save to File');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Source Title: Source Item Title')).toBeInTheDocument();
    });
  });

  it('handles agenda item form submission', async () => {
    render(
      <AgendaContextActions 
        {...mockProps} 
        onActionComplete={mockOnActionComplete}
      />
    );

    // Open agenda form
    const addButton = screen.getByText('Add to 1:1');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('agenda-item-form')).toBeInTheDocument();
    });

    // Submit form
    const submitButton = screen.getByText('Submit Agenda Item');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Item added to John Doe's 1:1 agenda");
      expect(mockOnActionComplete).toHaveBeenCalledWith('agenda', { id: '1', title: 'Test Agenda Item' });
      expect(screen.queryByTestId('agenda-item-form')).not.toBeInTheDocument();
    });
  });

  it('handles personal file item form submission', async () => {
    render(
      <AgendaContextActions 
        {...mockProps} 
        onActionComplete={mockOnActionComplete}
      />
    );

    // Open personal file form
    const saveButton = screen.getByText('Save to File');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('personal-file-form')).toBeInTheDocument();
    });

    // Submit form
    const submitButton = screen.getByText('Submit Personal File Item');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Item saved to John Doe's personal file");
      expect(mockOnActionComplete).toHaveBeenCalledWith('personalFile', { id: '1', title: 'Test Personal File Item' });
      expect(screen.queryByTestId('personal-file-form')).not.toBeInTheDocument();
    });
  });

  it('handles agenda form cancellation', async () => {
    render(<AgendaContextActions {...mockProps} />);

    // Open agenda form
    const addButton = screen.getByText('Add to 1:1');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('agenda-item-form')).toBeInTheDocument();
    });

    // Cancel form
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('agenda-item-form')).not.toBeInTheDocument();
    });
  });

  it('handles personal file form cancellation', async () => {
    render(<AgendaContextActions {...mockProps} />);

    // Open personal file form
    const saveButton = screen.getByText('Save to File');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('personal-file-form')).toBeInTheDocument();
    });

    // Cancel form
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('personal-file-form')).not.toBeInTheDocument();
    });
  });

  it('applies custom button variants and sizes', () => {
    render(
      <AgendaContextActions 
        {...mockProps} 
        variant="ghost"
        size="lg"
      />
    );

    const addButton = screen.getByText('Add to 1:1');
    const saveButton = screen.getByText('Save to File');

    // Buttons should be rendered (specific styling classes would need more detailed testing)
    expect(addButton).toBeInTheDocument();
    expect(saveButton).toBeInTheDocument();
  });

  it('includes proper button titles for accessibility', () => {
    render(<AgendaContextActions {...mockProps} />);

    const addButton = screen.getByText('Add to 1:1');
    const saveButton = screen.getByText('Save to File');

    expect(addButton).toHaveAttribute('title', "Add to John Doe's 1:1 agenda");
    expect(saveButton).toHaveAttribute('title', "Save to John Doe's personal file");
  });

  it('works without onActionComplete callback', async () => {
    render(<AgendaContextActions {...mockProps} />);

    // Open and submit agenda form
    const addButton = screen.getByText('Add to 1:1');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('agenda-item-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Agenda Item');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Item added to John Doe's 1:1 agenda");
      expect(screen.queryByTestId('agenda-item-form')).not.toBeInTheDocument();
    });
  });

  it('works without source item', () => {
    const propsWithoutSource = {
      teamMemberId: 'team-member-1',
      teamMemberName: 'John Doe'
    };

    render(<AgendaContextActions {...propsWithoutSource} />);

    expect(screen.getByText('Add to 1:1')).toBeInTheDocument();
    expect(screen.getByText('Save to File')).toBeInTheDocument();
  });
});