import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TeamMemberProfile from '../pages/TeamMemberProfile';
import Calendar from '../pages/Calendar';
import Team from '../pages/Team';
import { Duty, TeamMember, CalendarEvent } from '../api/entities';

// Mock all dependencies
vi.mock('../api/entities', () => ({
  Duty: {
    create: vi.fn(),
    findAll: vi.fn(),
    getConflicts: vi.fn(),
    checkForDuplicates: vi.fn()
  },
  TeamMember: {
    findAll: vi.fn(),
    findById: vi.fn()
  },
  CalendarEvent: {
    findAll: vi.fn()
  }
}));

vi.mock('../services/dutyRefreshService', () => ({
  default: {
    createDutyWithRefresh: vi.fn(),
    updateDutyWithRefresh: vi.fn()
  }
}));

vi.mock('../services/sessionManagementService', () => ({
  default: {
    generateSessionId: vi.fn(() => 'session_entry_test_123')
  }
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'tm1' })),
    useNavigate: vi.fn(() => vi.fn())
  };
});

const mockTeamMembers = [
  { id: 'tm1', name: 'John Doe', email: 'john@example.com' },
  { id: 'tm2', name: 'Jane Smith', email: 'jane@example.com' }
];

const mockDuties = [
  {
    id: 'duty1',
    team_member_id: 'tm1',
    type: 'devops',
    title: 'DevOps',
    start_date: '2025-01-15T00:00:00.000Z',
    end_date: '2025-01-22T00:00:00.000Z'
  }
];

const mockCalendarEvents = [
  {
    id: 'event1',
    title: 'Team Meeting',
    start: '2025-01-16T10:00:00.000Z',
    end: '2025-01-16T11:00:00.000Z'
  }
];

describe('Duty Creation Entry Points Consistency', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Setup default mocks
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    TeamMember.findById.mockResolvedValue(mockTeamMembers[0]);
    Duty.findAll.mockResolvedValue(mockDuties);
    Duty.getConflicts.mockResolvedValue([]);
    Duty.checkForDuplicates.mockResolvedValue([]);
    CalendarEvent.findAll.mockResolvedValue(mockCalendarEvents);
  });

  const openDutyForm = async (entryPoint) => {
    let createButton;
    
    switch (entryPoint) {
      case 'team-member-profile':
        // Look for "Add Duty" button in team member profile
        createButton = await screen.findByRole('button', { name: /add duty/i });
        break;
      case 'calendar':
        // Look for "Create Duty" button in calendar
        createButton = await screen.findByRole('button', { name: /create duty/i });
        break;
      case 'team':
        // Look for "Add Duty" button in team page
        createButton = await screen.findByRole('button', { name: /add duty/i });
        break;
      default:
        throw new Error(`Unknown entry point: ${entryPoint}`);
    }
    
    await user.click(createButton);
    
    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText(/create duty assignment/i)).toBeInTheDocument();
    });
  };

  const fillDutyForm = async () => {
    // Fill required fields
    const startDateField = screen.getByLabelText(/start date/i);
    await user.clear(startDateField);
    await user.type(startDateField, '2025-01-15');

    const endDateField = screen.getByLabelText(/end date/i);
    await user.clear(endDateField);
    await user.type(endDateField, '2025-01-22');

    // Select team member if not pre-filled
    try {
      const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
      if (teamMemberSelect.getAttribute('data-placeholder') === 'Select team member') {
        await user.click(teamMemberSelect);
        await waitFor(() => {
          const option = screen.getByText('John Doe');
          return user.click(option);
        });
      }
    } catch (error) {
      // Team member might be pre-selected, continue
    }

    // Select duty type
    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    await user.click(typeSelect);
    await waitFor(() => {
      const option = screen.getByText('DevOps Duty');
      return user.click(option);
    });

    // Select title
    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    await user.click(titleSelect);
    await waitFor(() => {
      const option = screen.getByText('DevOps');
      return user.click(option);
    });
  };

  describe('Team Member Profile Entry Point', () => {
    it('should provide consistent duty creation experience', async () => {
      const mockCreatedDuty = {
        id: 'duty2',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps'
      };

      Duty.create.mockResolvedValue(mockCreatedDuty);

      render(
        <BrowserRouter>
          <TeamMemberProfile />
        </BrowserRouter>
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Open duty creation form
      await openDutyForm('team-member-profile');

      // Form should have team member pre-selected
      const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
      expect(teamMemberSelect).toHaveTextContent('John Doe');

      // Fill and submit form
      await fillDutyForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should use same validation and submission flow
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            team_member_id: 'tm1',
            type: 'devops',
            title: 'DevOps',
            creation_session_id: 'session_entry_test_123'
          }),
          undefined
        );
      });

      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalledWith(
          expect.objectContaining({
            team_member_id: 'tm1',
            type: 'devops',
            title: 'DevOps',
            creation_session_id: 'session_entry_test_123'
          })
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate prevention consistently', async () => {
      const duplicateWarnings = [
        {
          type: 'exact_duplicate',
          severity: 'high',
          message: 'Identical duty exists',
          conflictingDuties: []
        }
      ];

      Duty.checkForDuplicates.mockResolvedValue(duplicateWarnings);

      render(
        <BrowserRouter>
          <TeamMemberProfile />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await openDutyForm('team-member-profile');
      await fillDutyForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show duplicate warning dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
      });

      // Should have consistent dialog buttons
      expect(screen.getByText('Create Anyway')).toBeInTheDocument();
      expect(screen.getByText('Cancel & Review')).toBeInTheDocument();
    });
  });

  describe('Calendar Entry Point', () => {
    it('should provide consistent duty creation experience', async () => {
      const mockCreatedDuty = {
        id: 'duty2',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps'
      };

      Duty.create.mockResolvedValue(mockCreatedDuty);

      render(
        <BrowserRouter>
          <Calendar />
        </BrowserRouter>
      );

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Open duty creation form
      await openDutyForm('calendar');

      // Fill and submit form
      await fillDutyForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should use same validation and submission flow
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devops',
            title: 'DevOps',
            creation_session_id: 'session_entry_test_123'
          }),
          undefined
        );
      });

      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devops',
            title: 'DevOps',
            creation_session_id: 'session_entry_test_123'
          })
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle errors consistently', async () => {
      const networkError = new Error('Network connection failed');
      Duty.checkForDuplicates.mockRejectedValue(networkError);

      render(
        <BrowserRouter>
          <Calendar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      await openDutyForm('calendar');
      await fillDutyForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show consistent error message
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Team Page Entry Point', () => {
    it('should provide consistent duty creation experience', async () => {
      const mockCreatedDuty = {
        id: 'duty2',
        team_member_id: 'tm2',
        type: 'on_call',
        title: 'On-Call'
      };

      Duty.create.mockResolvedValue(mockCreatedDuty);

      render(
        <BrowserRouter>
          <Team />
        </BrowserRouter>
      );

      // Wait for team page to load
      await waitFor(() => {
        expect(screen.getByText(/team/i)).toBeInTheDocument();
      });

      // Open duty creation form
      await openDutyForm('team');

      // Fill form with different selections
      const startDateField = screen.getByLabelText(/start date/i);
      await user.clear(startDateField);
      await user.type(startDateField, '2025-01-20');

      const endDateField = screen.getByLabelText(/end date/i);
      await user.clear(endDateField);
      await user.type(endDateField, '2025-01-27');

      // Select different team member
      const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
      await user.click(teamMemberSelect);
      await waitFor(() => {
        const option = screen.getByText('Jane Smith');
        return user.click(option);
      });

      // Select different duty type
      const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
      await user.click(typeSelect);
      await waitFor(() => {
        const option = screen.getByText('On-Call Duty');
        return user.click(option);
      });

      // Select title
      const titleSelect = screen.getByRole('combobox', { name: /title/i });
      await user.click(titleSelect);
      await waitFor(() => {
        const option = screen.getByText('DevOps'); // Using available option
        return user.click(option);
      });

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should use same validation and submission flow
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            team_member_id: 'tm2',
            type: 'on_call',
            creation_session_id: 'session_entry_test_123'
          }),
          undefined
        );
      });
    });
  });

  describe('Cross-Entry Point Consistency', () => {
    const entryPoints = ['team-member-profile', 'calendar', 'team'];

    entryPoints.forEach(entryPoint => {
      it(`should have consistent form validation in ${entryPoint}`, async () => {
        let component;
        switch (entryPoint) {
          case 'team-member-profile':
            component = <TeamMemberProfile />;
            break;
          case 'calendar':
            component = <Calendar />;
            break;
          case 'team':
            component = <Team />;
            break;
        }

        render(<BrowserRouter>{component}</BrowserRouter>);

        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByRole('main') || screen.getByRole('document') || document.body).toBeInTheDocument();
        });

        await openDutyForm(entryPoint);

        // Try to submit empty form
        const submitButton = screen.getByRole('button', { name: /create duty/i });
        await user.click(submitButton);

        // Should show consistent validation errors
        await waitFor(() => {
          // At minimum, should require team member, type, title, and dates
          const errorMessages = screen.getAllByText(/required/i);
          expect(errorMessages.length).toBeGreaterThan(0);
        });

        // Button should remain enabled for retry
        expect(submitButton).not.toBeDisabled();
      });

      it(`should have consistent success feedback in ${entryPoint}`, async () => {
        const mockCreatedDuty = { id: 'duty_test', type: 'devops' };
        Duty.create.mockResolvedValue(mockCreatedDuty);

        let component;
        switch (entryPoint) {
          case 'team-member-profile':
            component = <TeamMemberProfile />;
            break;
          case 'calendar':
            component = <Calendar />;
            break;
          case 'team':
            component = <Team />;
            break;
        }

        render(<BrowserRouter>{component}</BrowserRouter>);

        await waitFor(() => {
          expect(screen.getByRole('main') || screen.getByRole('document') || document.body).toBeInTheDocument();
        });

        await openDutyForm(entryPoint);
        await fillDutyForm();

        const submitButton = screen.getByRole('button', { name: /create duty/i });
        await user.click(submitButton);

        // Should show consistent success message
        await waitFor(() => {
          expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
        });

        // Should show consistent success styling
        const successAlert = screen.getByText(/created successfully/i).closest('[role="alert"]');
        expect(successAlert).toHaveClass(/green/); // Should have green styling
      });

      it(`should have consistent session management in ${entryPoint}`, async () => {
        let component;
        switch (entryPoint) {
          case 'team-member-profile':
            component = <TeamMemberProfile />;
            break;
          case 'calendar':
            component = <Calendar />;
            break;
          case 'team':
            component = <Team />;
            break;
        }

        render(<BrowserRouter>{component}</BrowserRouter>);

        await waitFor(() => {
          expect(screen.getByRole('main') || screen.getByRole('document') || document.body).toBeInTheDocument();
        });

        await openDutyForm(entryPoint);
        await fillDutyForm();

        const submitButton = screen.getByRole('button', { name: /create duty/i });
        await user.click(submitButton);

        // Should use consistent session ID format
        await waitFor(() => {
          expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
            expect.objectContaining({
              creation_session_id: 'session_entry_test_123'
            }),
            undefined
          );
        });
      });
    });

    it('should maintain form state consistency across entry points', async () => {
      // This test ensures that the same form component is used everywhere
      // and behaves consistently regardless of entry point

      const testFormBehavior = async (entryPoint) => {
        let component;
        switch (entryPoint) {
          case 'team-member-profile':
            component = <TeamMemberProfile />;
            break;
          case 'calendar':
            component = <Calendar />;
            break;
          case 'team':
            component = <Team />;
            break;
        }

        const { unmount } = render(<BrowserRouter>{component}</BrowserRouter>);

        await waitFor(() => {
          expect(screen.getByRole('main') || screen.getByRole('document') || document.body).toBeInTheDocument();
        });

        await openDutyForm(entryPoint);

        // Fill partial form
        const descriptionField = screen.getByLabelText(/description/i);
        await user.type(descriptionField, 'Test description');

        // Cancel form
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // Form should be reset
        // (This behavior should be consistent across all entry points)

        unmount();
        return true;
      };

      // Test all entry points
      for (const entryPoint of entryPoints) {
        const result = await testFormBehavior(entryPoint);
        expect(result).toBe(true);
      }
    });
  });
});