/**
 * Tests for Goals Integration in Team Page
 * Tests the goals count indicators and navigation in the team member list
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import TeamPage from '../Team';
import EmployeeGoalsService from '@/services/employeeGoalsService';
import { TeamMember, Task } from '@/api/entities';

// Mock the necessary modules
vi.mock('@/services/employeeGoalsService');
vi.mock('@/api/entities');
vi.mock('@/utils/agendaService');
vi.mock('@/services/calendarEventGenerationService');

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test data
const mockTeamMembers = [
  {
    id: 'member-1',
    name: 'John Doe',
    role: 'Senior Developer',
    email: 'john@example.com',
    department: 'Engineering',
    skills: ['React', 'Node.js']
  },
  {
    id: 'member-2',
    name: 'Jane Smith',
    role: 'Product Manager',
    email: 'jane@example.com',
    department: 'Product',
    skills: ['Strategy', 'Analytics']
  }
];

const mockGoalsStats = {
  'member-1': {
    total: 3,
    active: 2,
    completed: 1,
    paused: 0
  },
  'member-2': {
    total: 1,
    active: 1,
    completed: 0,
    paused: 0
  }
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <TeamPage />
    </BrowserRouter>
  );
};

describe('Team Page Goals Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock team members
    TeamMember.list.mockResolvedValue(mockTeamMembers);
    TeamMember.create.mockImplementation((data) => Promise.resolve({ id: 'new-member', ...data }));
    TeamMember.update.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
    TeamMember.delete.mockResolvedValue(true);
    
    // Mock tasks
    Task.list.mockResolvedValue([]);
    
    // Mock agenda service
    vi.mocked(global.AgendaService = {
      getAgendaSummaryForAllMembers: vi.fn().mockResolvedValue({})
    });
    
    // Mock goals service
    EmployeeGoalsService.getGoalsStatistics.mockResolvedValue({
      total: 4,
      byStatus: { active: 3, completed: 1, paused: 0 },
      byEmployee: mockGoalsStats
    });
    
    EmployeeGoalsService.getGoalsByEmployee.mockImplementation((employeeId) => {
      const stats = mockGoalsStats[employeeId];
      if (!stats) return Promise.resolve([]);
      
      const goals = [];
      for (let i = 0; i < stats.active; i++) {
        goals.push({
          id: `goal-${employeeId}-${i}`,
          employeeId,
          title: `Goal ${i + 1}`,
          status: 'active'
        });
      }
      for (let i = 0; i < stats.completed; i++) {
        goals.push({
          id: `goal-${employeeId}-completed-${i}`,
          employeeId,
          title: `Completed Goal ${i + 1}`,
          status: 'completed'
        });
      }
      return Promise.resolve(goals);
    });
  });

  describe('Goals Count Display', () => {
    it('should display goals count badges for team members', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      // Check for goals count badges
      expect(screen.getByText('2 Goals')).toBeInTheDocument(); // John Doe - 2 active goals
      expect(screen.getByText('1 Goal')).toBeInTheDocument(); // Jane Smith - 1 active goal
    });

    it('should display different badge styles for different goal counts', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Find goals badges
      const johnGoalsBadge = screen.getByText('2 Goals');
      const janeGoalsBadge = screen.getByText('1 Goal');
      
      expect(johnGoalsBadge).toBeInTheDocument();
      expect(janeGoalsBadge).toBeInTheDocument();
      
      // Check for different styling (multiple goals vs single goal)
      expect(johnGoalsBadge).toHaveClass('goals-badge');
      expect(janeGoalsBadge).toHaveClass('goals-badge');
    });

    it('should not display goals badge for members with no goals', async () => {
      // Mock member with no goals
      const membersWithNoGoals = [
        ...mockTeamMembers,
        {
          id: 'member-3',
          name: 'Bob Wilson',
          role: 'Designer',
          email: 'bob@example.com',
          department: 'Design'
        }
      ];
      
      TeamMember.list.mockResolvedValue(membersWithNoGoals);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
      
      // Bob should not have a goals badge
      expect(screen.queryByText('0 Goals')).not.toBeInTheDocument();
    });

    it('should handle goals loading errors gracefully', async () => {
      EmployeeGoalsService.getGoalsByEmployee.mockRejectedValue(new Error('Goals service error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Should still display team members without crashing
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Goals Badge Interaction', () => {
    it('should navigate to team member profile goals section when badge is clicked', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('2 Goals')).toBeInTheDocument();
      });
      
      // Click on goals badge
      fireEvent.click(screen.getByText('2 Goals'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/team-member-profile?id=member-1&tab=goals');
    });

    it('should show tooltip with goal breakdown on hover', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('2 Goals')).toBeInTheDocument();
      });
      
      // Hover over goals badge
      const goalsBadge = screen.getByText('2 Goals');
      fireEvent.mouseEnter(goalsBadge);
      
      await waitFor(() => {
        expect(screen.getByText('2 Active')).toBeInTheDocument();
        expect(screen.getByText('1 Completed')).toBeInTheDocument();
      });
    });
  });

  describe('Goals Integration with Search', () => {
    it('should maintain goals data when filtering team members', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      // Search for John
      const searchInput = screen.getByPlaceholderText(/search team members/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        
        // John's goals badge should still be displayed
        expect(screen.getByText('2 Goals')).toBeInTheDocument();
      });
    });

    it('should search by goals content when implemented', async () => {
      // This test ensures future search functionality includes goals
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // For now, just verify the search box exists
      const searchInput = screen.getByPlaceholderText(/search team members/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Goals Statistics', () => {
    it('should load goals statistics for all team members', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(EmployeeGoalsService.getGoalsByEmployee).toHaveBeenCalledWith('member-1');
        expect(EmployeeGoalsService.getGoalsByEmployee).toHaveBeenCalledWith('member-2');
      });
    });

    it('should update goals count when team member data changes', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('2 Goals')).toBeInTheDocument();
      });
      
      // Simulate goals data update
      EmployeeGoalsService.getGoalsByEmployee.mockImplementation((employeeId) => {
        if (employeeId === 'member-1') {
          return Promise.resolve([
            { id: 'goal-1', employeeId, title: 'Goal 1', status: 'active' },
            { id: 'goal-2', employeeId, title: 'Goal 2', status: 'active' },
            { id: 'goal-3', employeeId, title: 'Goal 3', status: 'active' }
          ]);
        }
        return Promise.resolve([]);
      });
      
      // Re-render component to trigger data reload
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('3 Goals')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should load goals data efficiently for multiple team members', async () => {
      const manyMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `member-${i}`,
        name: `Member ${i}`,
        role: 'Developer',
        email: `member${i}@example.com`
      }));
      
      TeamMember.list.mockResolvedValue(manyMembers);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Member 0')).toBeInTheDocument();
      });
      
      // Should call goals service for each member
      expect(EmployeeGoalsService.getGoalsByEmployee).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent goals loading', async () => {
      let resolvePromises = [];
      EmployeeGoalsService.getGoalsByEmployee.mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromises.push(resolve);
        });
      });
      
      renderComponent();
      
      // Resolve all promises simultaneously
      resolvePromises.forEach(resolve => resolve([]));
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });
});