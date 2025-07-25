import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgendaItemCard from '../AgendaItemCard';

const mockAgendaItem = {
  id: '1',
  title: 'Test Agenda Item',
  description: 'This is a test description',
  priority: 2,
  status: 'pending',
  tags: ['test', 'meeting'],
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z'
};

describe('AgendaItemCard', () => {
  it('renders agenda item information correctly', () => {
    render(<AgendaItemCard item={mockAgendaItem} />);
    
    expect(screen.getByText('Test Agenda Item')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('meeting')).toBeInTheDocument();
  });

  it('calls onComplete when Complete button is clicked', () => {
    const onComplete = vi.fn();
    render(<AgendaItemCard item={mockAgendaItem} onComplete={onComplete} />);
    
    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);
    
    expect(onComplete).toHaveBeenCalledWith(mockAgendaItem);
  });

  it('calls onMove when Move button is clicked', () => {
    const onMove = vi.fn();
    render(<AgendaItemCard item={mockAgendaItem} onMove={onMove} />);
    
    const moveButton = screen.getByText('Move');
    fireEvent.click(moveButton);
    
    expect(onMove).toHaveBeenCalledWith(mockAgendaItem);
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<AgendaItemCard item={mockAgendaItem} onEdit={onEdit} />);
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockAgendaItem);
  });

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<AgendaItemCard item={mockAgendaItem} onDelete={onDelete} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith(mockAgendaItem);
  });

  it('hides action buttons when showActions is false', () => {
    render(<AgendaItemCard item={mockAgendaItem} showActions={false} />);
    
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Move')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows correct priority colors and labels', () => {
    const highPriorityItem = { ...mockAgendaItem, priority: 1 };
    const { rerender } = render(<AgendaItemCard item={highPriorityItem} />);
    expect(screen.getByText('High')).toBeInTheDocument();

    const lowPriorityItem = { ...mockAgendaItem, priority: 3 };
    rerender(<AgendaItemCard item={lowPriorityItem} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('shows correct status for discussed items', () => {
    const discussedItem = { ...mockAgendaItem, status: 'discussed' };
    render(<AgendaItemCard item={discussedItem} />);
    
    expect(screen.getByText('Discussed')).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Move')).not.toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    const itemWithoutDescription = { ...mockAgendaItem, description: '' };
    render(<AgendaItemCard item={itemWithoutDescription} />);
    
    expect(screen.getByText('Test Agenda Item')).toBeInTheDocument();
    expect(screen.queryByText('This is a test description')).not.toBeInTheDocument();
  });

  it('renders without tags when not provided', () => {
    const itemWithoutTags = { ...mockAgendaItem, tags: [] };
    render(<AgendaItemCard item={itemWithoutTags} />);
    
    expect(screen.getByText('Test Agenda Item')).toBeInTheDocument();
    expect(screen.queryByText('test')).not.toBeInTheDocument();
    expect(screen.queryByText('meeting')).not.toBeInTheDocument();
  });
});