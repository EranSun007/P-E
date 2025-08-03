// src/__tests__/duty-rotation-workflow-e2e.test.jsx
// End-to-end tests for complete duty rotation workflow

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { localClient } from '../api/localClient.js';
import { DutyRotationService } from '../services/dutyRotationService.js';
import DutyRotationManager from '../components/duty/DutyRotationManager.jsx';
import DutyForm from '../components/duty/DutyForm.jsx';
import DutyCard from '../components/duty/DutyCard.jsx';

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: vi.fn((key) => mockStorage[key] || null),
  setItem: vi.fn((key, value) => {
    mockStorage[key] = value;
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  })
};

describe('Duty Rotation Workflow End-to-End Tests', () => {
  let teamMembers;

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([]));
    localStorage.setItem('duty_rotations', JSON.stringify([]));

    // Create test team members
    teamMembers = await Promise.all([
      localClient.entities.TeamMember.create({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'Senior Developer',
        company: 'Test Company'
      }),
      localClient.entities.TeamMember.create({
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: 'Developer',
        company: 'Test Company'
      }),
      localClient.entities.TeamMember.create({
        name: 'Carol Davis',
        email: 'carol@example.com',
        role: 'DevOps Engineer',
        company: 'Test Company'
      }),
      localClient.entities.TeamMember.create({
        name: 'David Wilson',
        email: 'david@example.com',
        role: 'Developer',
        company: 'Test Company'
      })
    ]);
  });

  describe('Complete Rotation Creation Workflow', () => {
    it('should create rotation from start to finish', async () => {
      const mockOnCreateRotation = vi.fn();
      const mockOnRefresh = vi.fn();

      render(
        <DutyRotationManager
          rotations={[]}
          teamMembers={teamMembers}
          onCreateRotation={mockOnCreateRotation}
          onUpdateRotation={vi.fn()}
          onDeleteRotation={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Step 1: Open create rotation dialog
      fireEvent.click(screen.getByText('Create Rotation'));
      
      await waitFor(() => {
        expect(screen.getByText('Create New Rotation')).toBeInTheDocument();
      });

      // Step 2: Fill rotation details
      fireEvent.change(screen.getByLabelText('Rotation Name *'), {
        target: { value: 'DevOps On-Call Rotation' }
      });

      // Select duty type
      fireEvent.click(screen.getByText('Select duty type'));
      fireEvent.click(screen.getByText('DevOps'));

      // Set cycle duration
      fireEvent.change(screen.getByLabelText('Cycle Duration (weeks) *'), {
        target: { value: '1' }
      });

      // Step 3: Select participants
      fireEvent.click(screen.getByLabelText('Alice Johnson'));
      fireEvent.click(screen.getByLabelText('Bob Smith'));
      fireEvent.click(screen.getByLabelText('Carol Davis'));

      // Step 4: Verify rotation preview appears
      await waitFor(() => {
        expect(screen.getByText('Rotation Preview')).toBeInTheDocument();
        expect(screen.getByText(/Each participant will serve for 1 week/)).toBeInTheDocument();
        expect(screen.getByText(/Complete rotation cycle: 3 weeks/)).toBeInTheDocument();
      });

      // Step 5: Submit rotation creation
      fireEvent.click(screen.getByText('Create Rotation', { selector: 'button' }));

      // Step 6: Verify rotation was created
      await waitFor(() => {
        expect(mockOnCreateRotation).toHaveBeenCalled();
        expect(mockOnRefresh).toHaveBeenCalled();
      });

      // Verify rotation exists in database
      const rotations = await localClient.entities.DutyRotation.list();
      expect(rotations).toHaveLength(1);
      expect(rotations[0].name).toBe('DevOps On-Call Rotation');
      expect(rotations[0].participants).toHaveLength(3);
    });

    it('should generate rotation schedule and create duties', async () => {
      // Create rotation
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id, teamMembers[2].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Generate rotation schedule
      const schedule = await DutyRotationService.generateRotationSchedule(
        rotation.id,
        '2025-01-01',
        2 // 2 cycles
      );

      expect(schedule).toHaveLength(6); // 3 participants × 2 cycles

      // Verify schedule structure
      expect(schedule[0]).toMatchObject({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_sequence: 0
      });

      expect(schedule[1]).toMatchObject({
        team_member_id: teamMembers[1].id,
        start_date: '2025-01-08',
        end_date: '2025-01-14',
        rotation_sequence: 1
      });

      // Create duties from schedule
      const createdDuties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-01',
        1 // 1 cycle
      );

      expect(createdDuties).toHaveLength(3);

      // Verify duties were created in database
      const allDuties = await localClient.entities.Duty.list();
      expect(allDuties).toHaveLength(3);

      // Verify each duty has correct rotation fields
      allDuties.forEach(duty => {
        expect(duty.is_rotation).toBe(true);
        expect(duty.rotation_id).toBe(rotation.id);
        expect(duty.rotation_participants).toBe(3);
        expect(duty.rotation_cycle_weeks).toBe(1);
      });
    });
  });

  describe('Rotation Management Workflow', () => {
    let rotation;

    beforeEach(async () => {
      rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id, teamMembers[2].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        next_rotation_date: '2025-01-08T00:00:00.000Z',
        is_active: true
      });
    });

    it('should advance rotation correctly', async () => {
      // Get current assignee
      const currentAssignee = await DutyRotationService.getCurrentAssignee(rotation.id);
      expect(currentAssignee.assignee_id).toBe(teamMembers[0].id);

      // Get next assignee
      const nextAssignee = await DutyRotationService.getNextAssignee(rotation.id);
      expect(nextAssignee.assignee_id).toBe(teamMembers[1].id);

      // Advance rotation
      const advancedRotation = await DutyRotationService.advanceRotation(rotation.id);
      expect(advancedRotation.current_assignee_index).toBe(1);

      // Verify new current assignee
      const newCurrentAssignee = await DutyRotationService.getCurrentAssignee(rotation.id);
      expect(newCurrentAssignee.assignee_id).toBe(teamMembers[1].id);

      // Verify new next assignee
      const newNextAssignee = await DutyRotationService.getNextAssignee(rotation.id);
      expect(newNextAssignee.assignee_id).toBe(teamMembers[2].id);
    });

    it('should wrap around rotation correctly', async () => {
      // Advance to last participant
      await localClient.entities.DutyRotation.update(rotation.id, {
        current_assignee_index: 2 // Last participant (Carol)
      });

      // Advance rotation (should wrap to first participant)
      const advancedRotation = await DutyRotationService.advanceRotation(rotation.id);
      expect(advancedRotation.current_assignee_index).toBe(0);

      // Verify wrapped to first participant
      const currentAssignee = await DutyRotationService.getCurrentAssignee(rotation.id);
      expect(currentAssignee.assignee_id).toBe(teamMembers[0].id);
    });

    it('should update rotation participants', async () => {
      // Add new participant
      const newParticipants = [
        teamMembers[0].id,
        teamMembers[1].id,
        teamMembers[2].id,
        teamMembers[3].id // Add David
      ];

      const updatedRotation = await DutyRotationService.updateRotationParticipants(
        rotation.id,
        newParticipants
      );

      expect(updatedRotation.participants).toHaveLength(4);
      expect(updatedRotation.participants).toContain(teamMembers[3].id);

      // Remove participant (should adjust current index if needed)
      const reducedParticipants = [teamMembers[0].id, teamMembers[1].id];
      
      // Set current index to 2 (which will be out of bounds after reduction)
      await localClient.entities.DutyRotation.update(rotation.id, {
        current_assignee_index: 2
      });

      const reducedRotation = await DutyRotationService.updateRotationParticipants(
        rotation.id,
        reducedParticipants
      );

      expect(reducedRotation.participants).toHaveLength(2);
      expect(reducedRotation.current_assignee_index).toBe(0); // Should reset to valid index
    });
  });

  describe('Rotation UI Integration', () => {
    it('should display rotation information in DutyCard', async () => {
      // Create rotation and duty
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      render(
        <DutyCard
          duty={duty}
          teamMember={teamMembers[0]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Verify rotation badge is displayed
      await waitFor(() => {
        expect(screen.getByText('Rotation')).toBeInTheDocument();
      });

      // Verify rotation information is shown
      expect(screen.getByText('DevOps')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('should create rotation duty through DutyForm', async () => {
      const mockOnSave = vi.fn();

      render(
        <DutyForm
          duty={null}
          teamMembers={teamMembers}
          onSave={mockOnSave}
          onCancel={vi.fn()}
        />
      );

      // Fill basic duty information
      fireEvent.change(screen.getByLabelText('Title *'), {
        target: { value: 'DevOps' }
      });

      fireEvent.change(screen.getByLabelText('Start Date *'), {
        target: { value: '2025-01-01' }
      });

      fireEvent.change(screen.getByLabelText('End Date *'), {
        target: { value: '2025-01-07' }
      });

      // Select team member
      fireEvent.click(screen.getByText('Select team member'));
      fireEvent.click(screen.getByText('Alice Johnson'));

      // Select duty type
      fireEvent.click(screen.getByText('Select duty type'));
      fireEvent.click(screen.getByText('DevOps'));

      // Enable rotation
      const rotationToggle = screen.getByLabelText('Enable Rotation');
      fireEvent.click(rotationToggle);

      // Set rotation participants
      await waitFor(() => {
        expect(screen.getByLabelText('Number of Participants')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Number of Participants'), {
        target: { value: '3' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Save Duty'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'DevOps',
            type: 'devops',
            is_rotation: true,
            rotation_participants: 3
          })
        );
      });
    });
  });

  describe('Calendar Integration Workflow', () => {
    it('should create calendar events for rotation duties', async () => {
      // Create rotation
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create rotation duties
      const duties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-01',
        1
      );

      expect(duties).toHaveLength(2);

      // Verify calendar events were created
      const { CalendarEvent } = await import('../api/entities.js');
      const allEvents = await CalendarEvent.list();
      
      // Should have one calendar event per duty
      expect(allEvents).toHaveLength(2);

      // Verify calendar events have correct rotation information
      allEvents.forEach(event => {
        expect(event.event_type).toBe('duty');
        expect(event.duty_id).toBeDefined();
        expect(event.title).toContain('DevOps');
      });

      // Verify no duplicate calendar events
      const dutyEventCounts = {};
      allEvents.forEach(event => {
        if (event.duty_id) {
          dutyEventCounts[event.duty_id] = (dutyEventCounts[event.duty_id] || 0) + 1;
        }
      });

      Object.values(dutyEventCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });

    it('should handle rotation advancement with calendar updates', async () => {
      // Create rotation with duties
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create current duty
      const currentDuty = await localClient.entities.Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      // Advance rotation
      await DutyRotationService.advanceRotation(rotation.id);

      // Create next duty
      const nextDuty = await localClient.entities.Duty.create({
        team_member_id: teamMembers[1].id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-08',
        end_date: '2025-01-14',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 1,
        rotation_cycle_weeks: 1
      });

      // Verify both duties have calendar events
      const { CalendarEvent } = await import('../api/entities.js');
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2);

      // Verify calendar events are for correct team members
      const currentDutyEvent = allEvents.find(e => e.duty_id === currentDuty.id);
      const nextDutyEvent = allEvents.find(e => e.duty_id === nextDuty.id);

      expect(currentDutyEvent.team_member_id).toBe(teamMembers[0].id);
      expect(nextDutyEvent.team_member_id).toBe(teamMembers[1].id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rotation with single participant gracefully', async () => {
      // Attempt to create rotation with single participant
      await expect(
        localClient.entities.DutyRotation.create({
          name: 'Single Person Rotation',
          type: 'DevOps',
          participants: [teamMembers[0].id],
          cycle_weeks: 1,
          current_assignee_index: 0,
          is_active: true
        })
      ).rejects.toThrow(/rotation must have at least 2 participants/);
    });

    it('should handle rotation with non-existent participants', async () => {
      await expect(
        localClient.entities.DutyRotation.create({
          name: 'Invalid Rotation',
          type: 'DevOps',
          participants: [teamMembers[0].id, 'non-existent-id'],
          cycle_weeks: 1,
          current_assignee_index: 0,
          is_active: true
        })
      ).rejects.toThrow(/Invalid participants.*do not exist/);
    });

    it('should handle rotation duty creation failures gracefully', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create conflicting duty first
      await localClient.entities.Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'Conflicting Duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Attempt to create rotation duties (should handle conflicts)
      const createdDuties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-01',
        1
      );

      // Should create duties for non-conflicting participants
      expect(createdDuties.length).toBeLessThan(2);
      expect(createdDuties.length).toBeGreaterThan(0);
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Concurrent Test Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id, teamMembers[2].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Simulate concurrent rotation advances
      const advancePromises = Array.from({ length: 5 }, () =>
        DutyRotationService.advanceRotation(rotation.id)
      );

      const results = await Promise.allSettled(advancePromises);

      // At least one should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);

      // Final state should be consistent
      const finalRotation = await localClient.entities.DutyRotation.get(rotation.id);
      expect(finalRotation.current_assignee_index).toBeGreaterThanOrEqual(0);
      expect(finalRotation.current_assignee_index).toBeLessThan(3);
    });
  });
});