import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DuplicateWarningDialog from '../DuplicateWarningDialog';

describe('DuplicateWarningDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const mockFormData = {
    team_member_id: 'tm1',
    type: 'devops',
    title: 'DevOps',
    start_date: '2025-01-15',
    end_date: '2025-01-22'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not open', () => {
    render(
      <DuplicateWarningDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={[]}
        formData={mockFormData}
      />
    );

    expect(screen.queryByText('Duplicate Duty Warning')).not.toBeInTheDocument();
  });

  it('should not render when no warnings provided', () => {
    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={[]}
        formData={mockFormData}
      />
    );

    expect(screen.queryByText('Duplicate Duty Warning')).not.toBeInTheDocument();
  });

  it('should render exact duplicate warning', () => {
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [
          {
            id: 'duty1',
            type: 'devops',
            title: 'DevOps',
            start_date: '2025-01-15',
            end_date: '2025-01-22'
          }
        ],
        details: 'Exact match found: devops - DevOps for the same dates'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
    expect(screen.getByText('Exact Duplicate Detected')).toBeInTheDocument();
    expect(screen.getByText('A duty with identical details already exists')).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
  });

  it('should render overlapping dates warning', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [
          {
            id: 'duty1',
            type: 'on_call',
            title: 'Reporting',
            start_date: '2025-01-18',
            end_date: '2025-01-25'
          }
        ],
        details: 'Multiple duties assigned to the same team member during overlapping periods'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Overlapping Duty Period')).toBeInTheDocument();
    expect(screen.getByText('This duty overlaps with existing duties for the same team member')).toBeInTheDocument();
    expect(screen.getByText('medium priority')).toBeInTheDocument();
  });

  it('should render same type overlap warning', () => {
    const duplicateWarnings = [
      {
        type: 'same_type_overlap',
        severity: 'high',
        message: 'Overlapping duties of the same type detected',
        conflictingDuties: [
          {
            id: 'duty1',
            type: 'devops',
            title: 'Reporting',
            start_date: '2025-01-18',
            end_date: '2025-01-25'
          }
        ],
        details: 'devops duties cannot overlap for the same team member'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Same Type Overlap')).toBeInTheDocument();
    expect(screen.getByText('This duty overlaps with existing duties of the same type')).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
  });

  it('should display new duty assignment details', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Test warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('New Duty Assignment')).toBeInTheDocument();
    expect(screen.getByText('devops')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText('1/15/2025 - 1/22/2025')).toBeInTheDocument();
  });

  it('should display conflicting duties', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [
          {
            id: 'duty1',
            type: 'on_call',
            title: 'Reporting',
            start_date: '2025-01-18',
            end_date: '2025-01-25'
          },
          {
            id: 'duty2',
            type: 'devops',
            title: 'Metering',
            start_date: '2025-01-20',
            end_date: '2025-01-27'
          }
        ],
        details: 'Multiple conflicts detected'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Conflicting Duties:')).toBeInTheDocument();
    expect(screen.getByText('on_call')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
    expect(screen.getAllByText('devops')).toHaveLength(2); // One in new duty, one in conflicting duty
    expect(screen.getByText('Metering')).toBeInTheDocument();
  });

  it('should display resolution suggestions', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Test warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Suggested Actions')).toBeInTheDocument();
    expect(screen.getByText('Adjust the start or end dates to avoid overlap')).toBeInTheDocument();
    expect(screen.getByText('Choose a different team member for this duty')).toBeInTheDocument();
    expect(screen.getByText('Consider if this duty should replace an existing one')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Test warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    fireEvent.click(screen.getByText('Cancel & Review'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onConfirm when create button is clicked', () => {
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Test warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    fireEvent.click(screen.getByText('Create Duty'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should show "Create Anyway" button for high severity warnings', () => {
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [],
        details: 'High severity warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Create Anyway')).toBeInTheDocument();
    expect(screen.getByText('High priority conflicts should be resolved before proceeding')).toBeInTheDocument();
  });

  it('should handle multiple warnings with different severities', () => {
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [],
        details: 'High severity warning'
      },
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Medium severity warning'
      }
    ];

    render(
      <DuplicateWarningDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={mockFormData}
      />
    );

    expect(screen.getByText('Exact Duplicate Detected')).toBeInTheDocument();
    expect(screen.getByText('Overlapping Duty Period')).toBeInTheDocument();
    expect(screen.getByText('Create Anyway')).toBeInTheDocument(); // High severity present
  });
});