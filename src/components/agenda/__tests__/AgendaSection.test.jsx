import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AgendaSection from '../AgendaSection';
import { AgendaItem } from '@/api/oneOnOneAgenda';

// Mock the API
vi.mock('@/api/oneOnOneAgenda', () => ({
  AgendaItem: {
    getByTeamMember: vi.fn(),
    update: vi.fn(),
    create: vi.fn()
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('AgendaSection', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockTeamMemberName = 'John Doe';
  
  const mockAgendaItems = [
    {
      id: '1',
      teamMemberId: mockTeamMemberId,
      title: 'Discuss project progress',
      description: 'Review current sprint status',
      status: 'pending',
      priority: 2,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      tags: ['project', 'sprint']
    },
    {
      id: '2',
      teamMemberId: mockTeamMemberId,
      title: 'Career development',
      description: 'Talk about growth opportunities',
      status: 'discussed',
      priority: 1,
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
      tags: ['career']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AgendaItem.getByTeamMember.mockResolvedValue(mockAgendaItems);
  });

  it('renders the agenda section with header and controls', async () => {
    render(
      <AgendaSection 
        teamMemberId={mockTeamMemberId} 
        teamMemberName={mockTeamMemberName} 
      />
    );

    // Check header
    expect(screen.getByText('1:1 Agenda')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Discussed')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(AgendaItem.getByTeamMember).toHaveBeenCalledWith(mockTeamMemberId);
    });
  });

  it('shows loading state initially', () => {
    AgendaItem.getByTeamMember.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <AgendaSection 
        teamMemberId={mockTeamMemberId} 
        teamMemberName={mockTeamMemberName} 
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});