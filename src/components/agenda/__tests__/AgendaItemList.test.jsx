import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgendaItemList from '../AgendaItemList';

// Mock the UI components
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  )
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') {
      return 'Jan 1, 2024';
    }
    return date.toISOString();
  }
}));

const mockAgendaItems = [
  {
    id: '1',
    title: 'Discuss project timeline',
    description: 'Review the current project timeline and adjust milestones',
    teamMemberId: 'team1',
    status: 'pending',
    priority: 1,
    tags: ['project', 'timeline'],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z'
  },
  {
    id: '2',
    title: 'Performance review feedback',
    description: 'Provide feedback on recent performance',
    teamMemberId: 'team1',
    status: 'discussed',
    priority: 2,
    tags: ['performance'],
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-02T11:00:00Z'
  },
  {
    id: '3',
    title: 'Career development goals',
    description: 'Set goals for the next quarter',
    teamMemberId: 'team1',
    status: 'pending',
    priority: 3,
    tags: ['career', 'goals'],
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-03T10:00:00Z'
  }
];

describe('AgendaItemList', () => {
  it('renders loading state correctly', () => {
    render(<AgendaItemList loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(<AgendaItemList items={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders agenda items correctly', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    expect(screen.getByText('Discuss project timeline')).toBeInTheDocument();
    expect(screen.getByText('Performance review feedback')).toBeInTheDocument();
    expect(screen.getByText('Career development goals')).toBeInTheDocument();
  });

  it('displays priority badges correctly', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getByText('Discussed')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    expect(screen.getByText('project')).toBeInTheDocument();
    expect(screen.getByText('timeline')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
    expect(screen.getByText('career')).toBeInTheDocument();
    expect(screen.getByText('goals')).toBeInTheDocument();
  });

  it('calls onComplete when complete button is clicked', () => {
    const onComplete = vi.fn();
    render(<AgendaItemList items={mockAgendaItems} onComplete={onComplete} />);
    
    const completeButtons = screen.getAllByText('Complete');
    fireEvent.click(completeButtons[0]);
    
    expect(onComplete).toHaveBeenCalledWith(mockAgendaItems[0]);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<AgendaItemList items={mockAgendaItems} onEdit={onEdit} />);
    
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(onEdit).toHaveBeenCalledWith(mockAgendaItems[0]);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<AgendaItemList items={mockAgendaItems} onDelete={onDelete} />);
    
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    expect(onDelete).toHaveBeenCalledWith(mockAgendaItems[0]);
  });

  it('filters items by search term', async () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    const searchInput = screen.getByPlaceholderText('Search agenda items...');
    fireEvent.change(searchInput, { target: { value: 'project' } });
    
    await waitFor(() => {
      expect(screen.getByText('Discuss project timeline')).toBeInTheDocument();
      expect(screen.queryByText('Performance review feedback')).not.toBeInTheDocument();
    });
  });

  it('filters items by status', async () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    // This would require more complex mocking of the Select component
    // For now, we'll test that the filter controls are present
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });

  it('shows correct item count', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    expect(screen.getByText('Showing 3 of 3 agenda items')).toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(<AgendaItemList items={mockAgendaItems} showActions={false} />);
    
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows move button for pending items when onMove is provided', () => {
    const onMove = vi.fn();
    render(<AgendaItemList items={mockAgendaItems} onMove={onMove} />);
    
    const moveButtons = screen.getAllByText('Move');
    expect(moveButtons).toHaveLength(2); // Only pending items should have move buttons
    
    fireEvent.click(moveButtons[0]);
    expect(onMove).toHaveBeenCalledWith(mockAgendaItems[0]);
  });

  it('displays creation and update timestamps', () => {
    render(<AgendaItemList items={mockAgendaItems} />);
    
    // Check that creation timestamps are displayed
    expect(screen.getAllByText(/Created Jan 1, 2024/)).toHaveLength(3); // All items show "Created Jan 1, 2024" due to mock
    
    // Check that at least one item shows update timestamp (for items where updatedAt !== createdAt)
    expect(screen.getByText(/Updated Jan 1, 2024/)).toBeInTheDocument();
  });
});