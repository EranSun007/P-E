import { useState, useEffect } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  preselectedDate = null,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    team: '',
    team_member_id: '',
    duty_type: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          team: initialData.team || '',
          team_member_id: initialData.team_member_id || '',
          duty_type: initialData.duty_type || '',
          start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
          end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
          notes: initialData.notes || '',
        });
      } else {
        const defaultDate = preselectedDate
          ? format(preselectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');

        setFormData({
          team: preselectedTeam || '',
          team_member_id: '',
          duty_type: '',
          start_date: defaultDate,
          end_date: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [open, initialData, preselectedTeam, preselectedDate]);

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

  // Auto-calculate end date based on duty type
  const handleDutyTypeChange = (dutyType) => {
    setFormData(prev => {
      const updated = { ...prev, duty_type: dutyType };

      const dutyConfig = DUTY_TYPES.find(d => d.value === dutyType);
      if (dutyConfig?.duration && prev.start_date) {
        const startDate = new Date(prev.start_date);
        const endDate = addDays(startDate, dutyConfig.duration - 1);
        updated.end_date = format(endDate, 'yyyy-MM-dd');
      }

      return updated;
    });
  };

  const handleStartDateChange = (startDate) => {
    setFormData(prev => {
      const updated = { ...prev, start_date: startDate };

      // Auto-calculate end date if duty type has fixed duration
      const dutyConfig = DUTY_TYPES.find(d => d.value === prev.duty_type);
      if (dutyConfig?.duration && startDate) {
        const start = new Date(startDate);
        const endDate = addDays(start, dutyConfig.duration - 1);
        updated.end_date = format(endDate, 'yyyy-MM-dd');
      }

      return updated;
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
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                disabled={isLoading}
                className={errors.start_date ? 'border-destructive' : ''}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                disabled={isLoading}
                className={errors.end_date ? 'border-destructive' : ''}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date}</p>
              )}
              {selectedDutyType?.duration && (
                <p className="text-xs text-gray-500">
                  Auto-calculated for {selectedDutyType.duration} days
                </p>
              )}
            </div>
          </div>

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
