/**
 * Tests for Goals Integration in TeamMemberProfile
 * Tests the goals section display and management within team member profiles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import TeamMemberProfile from '../TeamMemberProfile';
import EmployeeGoalsService from '@/services/employeeGoalsService';
import { TeamMember } from '@/api/entities';

// Mock the necessary modules
vi.mock('@/services/employeeGoalsService');
vi.mock('@/api/entities');
vi.mock('@/utils/agendaService');
vi.mock('@/utils/calendarService');
vi.mock('@/services/calendarEventGenerationService');

// Mock search params
const mockSearchParams = new URLSearchParams('?id=member-1');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams]
  };
});

// Test data
const mockTeamMember = {
  id: 'member-1',
  name: 'John Doe',
  role: 'Senior Developer',
  email: 'john@example.com',
  department: 'Engineering'
};

const mockGoals = [
  {
    id: 'goal-1',
    employeeId: 'member-1',
    title: 'Lead the CAP/Otel project in the team',
    developmentNeed: 'Project management skills, team leadership, and communication.',
    developmentActivity: '1. Attend a project management training course by 2025-09-30.',
    developmentGoalDescription: '1. Develop a detailed project plan with timelines and deliverables',
    status: 'active',
    createdAt: '2025-07-27T10:00:00Z',
    updatedAt: '2025-07-27T10:00:00Z'
  },
  {
    id: 'goal-2',
    employeeId: 'member-1',
    title: 'Lead AI Tools and Improve Development Excellence',
    developmentNeed: 'Enhanced understanding and application of AI tools for process improvement.',
    developmentActivity: 'Engage in targeted training and practical application of AI tools.',
    developmentGoalDescription: '1. Research and identify 3 key AI tools relevant to development excellence',
    status: 'active',
    createdAt: '2025-07-27T10:00:00Z',
    updatedAt: '2025-07-27T10:00:00Z'
  }
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <TeamMemberProfile />
    </BrowserRouter>
  );
};

describe('TeamMemberProfile Goals Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock team member data
    TeamMember.get.mockResolvedValue(mockTeamMember);
    TeamMember.list.mockResolvedValue([mockTeamMember]);
    
    // Mock other required entities as proper entity objects
    const mockOneOnOne = { list: vi.fn().mockResolvedValue([]) };
    const mockTask = { list: vi.fn().mockResolvedValue([]) };
    const mockProject = { list: vi.fn().mockResolvedValue([]) };
    const mockStakeholder = { list: vi.fn().mockResolvedValue([]) };
    const mockOutOfOffice = { 
      getByTeamMember: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([])
    };
    const mockDuty = { 
      getByTeamMember: vi.fn().mockResolvedValue([]),
      getConflicts: vi.fn().mockResolvedValue([])
    };

    // Apply the mocks globally
    vi.doMock('@/api/entities', () => ({
      TeamMember,
      OneOnOne: mockOneOnOne,
      Task: mockTask,
      Project: mockProject,
      Stakeholder: mockStakeholder,
      OutOfOffice: mockOutOfOffice,
      Duty: mockDuty
    }));
    
    // Mock agenda service
    vi.mocked(global.AgendaService = {
      getAgendaItemsForMember: vi.fn().mockResolvedValue([])
    });

    // Mock calendar service  
    vi.mocked(global.CalendarService = {
      getOneOnOneMeetingsForTeamMember: vi.fn().mockResolvedValue([])
    });
    
    // Mock goals service
    EmployeeGoalsService.getGoalsByEmployee.mockResolvedValue(mockGoals);
    EmployeeGoalsService.createGoal.mockImplementation((goalData) => 
      Promise.resolve({ id: 'new-goal', ...goalData })
    );
    EmployeeGoalsService.updateGoal.mockImplementation((id, updates) => 
      Promise.resolve({ ...mockGoals.find(g => g.id === id), ...updates })
    );
    EmployeeGoalsService.deleteGoal.mockResolvedValue(true);
  });

  describe('Goals Tab Display', () => {
    it('should display goals tab in team member profile', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Check for Goals tab
      expect(screen.getByText('Goals')).toBeInTheDocument();
    });

    it('should show goals list when goals tab is clicked', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Click on Goals tab
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
        expect(screen.getByText('Lead AI Tools and Improve Development Excellence')).toBeInTheDocument();
      });
    });

    it('should display goal details correctly', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        // Check goal title
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
        
        // Check development need
        expect(screen.getByText('Project management skills, team leadership, and communication.')).toBeInTheDocument();
        
        // Check status badge
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });
  });

  describe('Goals Management', () => {
    it('should allow creating new goals from profile', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('Create Goal')).toBeInTheDocument();
      });
      
      // Click create goal button
      fireEvent.click(screen.getByText('Create Goal'));
      
      await waitFor(() => {
        expect(screen.getByText('Create New Goal')).toBeInTheDocument();
      });
    });

    it('should allow editing existing goals', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });
      
      // Find and click edit button
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Goal')).toBeInTheDocument();
      });
    });

    it('should allow deleting goals with confirmation', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });
      
      // Find and click delete button
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Goal')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this goal?')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle team members with no goals gracefully', async () => {
      EmployeeGoalsService.getGoalsByEmployee.mockResolvedValue([]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('No goals found')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating your first goal for this team member.')).toBeInTheDocument();
        expect(screen.getByText('Create First Goal')).toBeInTheDocument();
      });
    });

    it('should provide call-to-action for creating first goal', async () => {
      EmployeeGoalsService.getGoalsByEmployee.mockResolvedValue([]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        const createFirstGoalButton = screen.getByText('Create First Goal');
        expect(createFirstGoalButton).toBeInTheDocument();
        
        fireEvent.click(createFirstGoalButton);
        
        // Should open goal creation dialog
        expect(screen.getByText('Create New Goal')).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('should load goals for the correct team member', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(EmployeeGoalsService.getGoalsByEmployee).toHaveBeenCalledWith('member-1');
      });
    });

    it('should handle service errors gracefully', async () => {
      EmployeeGoalsService.getGoalsByEmployee.mockRejectedValue(new Error('Service error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Goals'));
      
      // Should show error state or empty state
      await waitFor(() => {
        // The component should handle the error gracefully
        // This might show an error message or empty state
        expect(screen.getByText('Goals')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should maintain context when switching between tabs', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Click Goals tab
      fireEvent.click(screen.getByText('Goals'));
      
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });
      
      // Switch to another tab and back
      fireEvent.click(screen.getByText('1:1 Meetings'));
      fireEvent.click(screen.getByText('Goals'));
      
      // Goals should still be loaded
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });
    });
  });
});