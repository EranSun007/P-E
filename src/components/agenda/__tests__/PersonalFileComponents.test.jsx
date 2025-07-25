import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalFileList from '../PersonalFileList';
import PersonalFileItemCard from '../PersonalFileItemCard';
import PersonalFileSection from '../PersonalFileSection';

// Mock the API
vi.mock('@/api/oneOnOneAgenda', () => ({
  PersonalFileItem: {
    getByTeamMember: vi.fn().mockResolvedValue([])
  }
}));

describe('PersonalFileList', () => {
  it('renders empty state when no items provided', () => {
    render(<PersonalFileList items={[]} loading={false} />);
    expect(screen.getByText('No personal file items found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<PersonalFileList items={[]} loading={true} />);
    expect(screen.getByText('Loading personal file items...')).toBeInTheDocument();
  });

  it('renders items when provided', () => {
    const mockItems = [
      {
        id: '1',
        title: 'Test Item',
        notes: 'Test notes',
        category: 'achievement',
        importance: 3,
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];

    render(<PersonalFileList items={mockItems} loading={false} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
});

describe('PersonalFileItemCard', () => {
  const mockItem = {
    id: '1',
    title: 'Test Achievement',
    notes: 'Great work on the project',
    category: 'achievement',
    importance: 4,
    tags: ['leadership', 'project-x'],
    sourceType: 'manual',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  it('renders item details correctly', () => {
    render(<PersonalFileItemCard item={mockItem} />);
    
    expect(screen.getByText('Test Achievement')).toBeInTheDocument();
    expect(screen.getByText('Great work on the project')).toBeInTheDocument();
    expect(screen.getByText('Achievement')).toBeInTheDocument();
    expect(screen.getByText('Medium-High')).toBeInTheDocument();
    expect(screen.getByText('leadership')).toBeInTheDocument();
    expect(screen.getByText('project-x')).toBeInTheDocument();
  });

  it('renders action buttons when showActions is true', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <PersonalFileItemCard 
        item={mockItem} 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
      />
    );
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not render action buttons when showActions is false', () => {
    render(<PersonalFileItemCard item={mockItem} showActions={false} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});

describe('PersonalFileSection', () => {
  it('renders section header and add button', async () => {
    render(<PersonalFileSection teamMemberId="team-1" teamMemberName="John Doe" />);
    
    expect(screen.getByText('Personal File')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });
});