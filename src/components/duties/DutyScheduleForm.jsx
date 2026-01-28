import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DutySchedule } from '@/api/entities';
import { logger } from '@/utils/logger';
import {
  listSprints,
  getSprintById,
  formatDateRange,
  findSprintForDate,
  getCurrentCycle,
} from '@/utils/releaseCycles';

const DUTY_TYPES = [
  { value: 'devops', label: 'DevOps', duration: 14, color: 'indigo' },
  { value: 'dev_on_duty', label: 'Dev On Duty', duration: 7, color: 'teal' },
  { value: 'replacement', label: 'Replacement (SM Cover)', duration: null, color: 'amber' },
];

const TEAMS = ['Metering', 'Reporting'];

const DutyScheduleForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  preselectedTeam = null,
  currentCycleId = null,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    team: '',
    team_member_id: '',
    duty_type: '',
    sprint_id: '',
    week: '', // For dev_on_duty (1 week duties): '1' or '2'
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errors, setErrors] = useState({});

  // Get available sprints (6 sprints = 3 cycles)
  const availableSprints = useMemo(() => {
    const startCycle = currentCycleId || getCurrentCycle().id;
    return listSprints(startCycle, 3);
  }, [currentCycleId]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        // When editing, try to find the sprint from the start date
        const startDate = initialData.start_date ? new Date(initialData.start_date) : null;
        const sprintId = startDate ? findSprintForDate(startDate) : '';

        setFormData({
          team: initialData.team || '',
          team_member_id: initialData.team_member_id || '',
          duty_type: initialData.duty_type || '',
          sprint_id: sprintId || '',
          week: '', // Will be determined if editing a 1-week duty
          start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
          end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
          notes: initialData.notes || '',
        });
      } else {
        // Default to first available sprint
        const defaultSprintId = availableSprints.length > 0 ? availableSprints[0].id : '';

        setFormData({
          team: preselectedTeam || '',
          team_member_id: '',
          duty_type: '',
          sprint_id: defaultSprintId,
          week: '1',
          start_date: '',
          end_date: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [open, initialData, preselectedTeam, availableSprints]);

  // Load team members when team changes
  useEffect(() => {
    if (formData.team && open) {
      loadTeamMembers(formData.team);
    } else {
      setTeamMembers([]);
    }
  }, [formData.team, open]);

  const loadTeamMembers = async (team) => {
    setLoadingMembers(true);
    try {
      const members = await DutySchedule.getTeamMembers(team);
      setTeamMembers(members);
    } catch (error) {
      logger.error('Failed to load team members', { error: String(error), team });
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Calculate dates based on sprint and duty type
  const calculateDatesFromSprint = (sprintId, dutyType, week) => {
    if (!sprintId) return { start_date: '', end_date: '' };

    const sprint = getSprintById(sprintId);
    if (!sprint) return { start_date: '', end_date: '' };

    // DevOps (2 weeks) = full sprint
    if (dutyType === 'devops') {
      return {
        start_date: format(sprint.startDate, 'yyyy-MM-dd'),
        end_date: format(sprint.endDate, 'yyyy-MM-dd'),
      };
    }

    // Dev On Duty (1 week) = specific week within sprint
    if (dutyType === 'dev_on_duty' && week) {
      const weekData = sprint.weeks.find(w => w.week === parseInt(week));
      if (weekData) {
        return {
          start_date: format(weekData.startDate, 'yyyy-MM-dd'),
          end_date: format(weekData.endDate, 'yyyy-MM-dd'),
        };
      }
    }

    // Replacement - use full sprint by default (can be customized)
    return {
      start_date: format(sprint.startDate, 'yyyy-MM-dd'),
      end_date: format(sprint.endDate, 'yyyy-MM-dd'),
    };
  };

  // Handle duty type change - recalculate dates
  const handleDutyTypeChange = (dutyType) => {
    setFormData(prev => {
      const dates = calculateDatesFromSprint(prev.sprint_id, dutyType, prev.week || '1');
      return {
        ...prev,
        duty_type: dutyType,
        week: dutyType === 'dev_on_duty' ? (prev.week || '1') : '',
        ...dates,
      };
    });
  };

  // Handle sprint change - recalculate dates
  const handleSprintChange = (sprintId) => {
    setFormData(prev => {
      const dates = calculateDatesFromSprint(sprintId, prev.duty_type, prev.week);
      return {
        ...prev,
        sprint_id: sprintId,
        ...dates,
      };
    });
  };

  // Handle week change (for dev_on_duty) - recalculate dates
  const handleWeekChange = (week) => {
    setFormData(prev => {
      const dates = calculateDatesFromSprint(prev.sprint_id, prev.duty_type, week);
      return {
        ...prev,
        week,
        ...dates,
      };
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.team) {
      newErrors.team = 'Team is required';
    }
    if (!formData.team_member_id) {
      newErrors.team_member_id = 'Team member is required';
    }
    if (!formData.duty_type) {
      newErrors.duty_type = 'Duty type is required';
    }
    if (!formData.sprint_id) {
      newErrors.sprint_id = 'Sprint is required';
    }
    if (formData.duty_type === 'dev_on_duty' && !formData.week) {
      newErrors.week = 'Week is required for Dev On Duty';
    }
    if (!formData.start_date || !formData.end_date) {
      newErrors.sprint_id = 'Please select a valid sprint';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      team: formData.team,
      team_member_id: formData.team_member_id,
      duty_type: formData.duty_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      notes: formData.notes.trim() || null,
    };

    await onSubmit(submitData);
  };

  const isEditing = !!initialData;
  const selectedDutyType = DUTY_TYPES.find(d => d.value === formData.duty_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Duty Assignment' : 'Add Duty Assignment'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the duty assignment details.'
              : 'Schedule a duty rotation assignment for a team member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="team">Team *</Label>
            <Select
              value={formData.team}
              onValueChange={(value) => {
                handleInputChange('team', value);
                handleInputChange('team_member_id', ''); // Reset member when team changes
              }}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.team ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team && (
              <p className="text-sm text-destructive">{errors.team}</p>
            )}
          </div>

          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="team_member">Team Member *</Label>
            <Select
              value={formData.team_member_id}
              onValueChange={(value) => handleInputChange('team_member_id', value)}
              disabled={isLoading || !formData.team || loadingMembers}
            >
              <SelectTrigger className={errors.team_member_id ? 'border-destructive' : ''}>
                <SelectValue placeholder={
                  loadingMembers ? 'Loading...' :
                  !formData.team ? 'Select a team first' :
                  teamMembers.length === 0 ? 'No members in this team' :
                  'Select team member'
                } />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} {member.role ? `(${member.role})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team_member_id && (
              <p className="text-sm text-destructive">{errors.team_member_id}</p>
            )}
          </div>

          {/* Duty Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="duty_type">Duty Type *</Label>
            <Select
              value={formData.duty_type}
              onValueChange={handleDutyTypeChange}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.duty_type ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select duty type" />
              </SelectTrigger>
              <SelectContent>
                {DUTY_TYPES.map(duty => (
                  <SelectItem key={duty.value} value={duty.value}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-${duty.color}-500`} />
                      {duty.label}
                      {duty.duration && (
                        <span className="text-xs text-gray-500">
                          ({duty.duration === 7 ? '1 week' : '2 weeks'})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.duty_type && (
              <p className="text-sm text-destructive">{errors.duty_type}</p>
            )}
          </div>

          {/* Sprint Selection */}
          <div className="space-y-2">
            <Label htmlFor="sprint">Sprint *</Label>
            <Select
              value={formData.sprint_id}
              onValueChange={handleSprintChange}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.sprint_id ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {availableSprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{sprint.id}</span>
                      <span className="text-xs text-gray-500">
                        ({formatDateRange(sprint.startDate, sprint.endDate)})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sprint_id && (
              <p className="text-sm text-destructive">{errors.sprint_id}</p>
            )}
          </div>

          {/* Week Selection (only for Dev On Duty - 1 week duties) */}
          {formData.duty_type === 'dev_on_duty' && (
            <div className="space-y-2">
              <Label htmlFor="week">Week *</Label>
              <Select
                value={formData.week}
                onValueChange={handleWeekChange}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.week ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Week 1 (First week of sprint)</SelectItem>
                  <SelectItem value="2">Week 2 (Second week of sprint)</SelectItem>
                </SelectContent>
              </Select>
              {errors.week && (
                <p className="text-sm text-destructive">{errors.week}</p>
              )}
            </div>
          )}

          {/* Calculated Date Display */}
          {formData.start_date && formData.end_date && (
            <div className="p-3 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Scheduled:</span>{' '}
                {format(new Date(formData.start_date), 'MMM d, yyyy')} -{' '}
                {format(new Date(formData.end_date), 'MMM d, yyyy')}
                <span className="text-xs text-gray-500 ml-2">
                  ({selectedDutyType?.duration === 7 ? '1 week' : '2 weeks'})
                </span>
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this duty assignment..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Duty'
                : 'Create Duty'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DutyScheduleForm;
