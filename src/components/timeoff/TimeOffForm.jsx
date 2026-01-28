import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamMember, TimeOff } from '@/api/entities';
import { logger } from '@/utils/logger';
import {
  Palmtree,
  Thermometer,
  User,
  Building,
  Calendar,
  GraduationCap,
  Sword,
} from 'lucide-react';

const TIME_OFF_TYPES = [
  { value: 'vacation', label: 'Vacation', icon: Palmtree, color: 'blue' },
  { value: 'sick', label: 'Sick Leave', icon: Thermometer, color: 'red' },
  { value: 'personal', label: 'Personal Day', icon: User, color: 'purple' },
  { value: 'conference', label: 'Conference', icon: Building, color: 'green' },
  { value: 'learning', label: 'Learning', icon: GraduationCap, color: 'amber' },
  { value: 'army_reserve', label: 'Army Reserve', icon: Sword, color: 'slate' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'orange' },
];

const TimeOffForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  preselectedTeamMemberId = null,
  preselectedDate = null,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    team_member_id: '',
    type: 'other',
    start_date: '',
    end_date: '',
    half_day: null,
    notes: '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errors, setErrors] = useState({});

  // Load team members
  useEffect(() => {
    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          team_member_id: initialData.team_member_id || '',
          type: initialData.type || 'other',
          start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
          end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
          half_day: initialData.half_day || null,
          notes: initialData.notes || '',
        });
      } else {
        const defaultDate = preselectedDate
          ? format(preselectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');

        setFormData({
          team_member_id: preselectedTeamMemberId || '',
          type: 'other',
          start_date: defaultDate,
          end_date: defaultDate,
          half_day: null,
          notes: '',
        });
      }
      setErrors({});
    }
  }, [open, initialData, preselectedTeamMemberId, preselectedDate]);

  const loadTeamMembers = async () => {
    setLoadingMembers(true);
    try {
      const members = await TeamMember.list();
      setTeamMembers(Array.isArray(members) ? members : []);
    } catch (error) {
      logger.error('Failed to load team members', { error: String(error) });
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
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

    if (!formData.team_member_id) {
      newErrors.team_member_id = 'Team member is required';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be on or after start date';
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
      team_member_id: formData.team_member_id,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      half_day: formData.half_day,
      notes: formData.notes.trim() || null,
      status: 'approved',
    };

    await onSubmit(submitData);
  };

  const isEditing = !!initialData;
  const selectedType = TIME_OFF_TYPES.find(t => t.value === formData.type);

  // Calculate duration for display
  const getDuration = () => {
    if (!formData.start_date || !formData.end_date) return null;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    if (formData.half_day) return '0.5 day';
    return days === 1 ? '1 day' : `${days} days`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Time Off' : 'Add Time Off'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the time off details.'
              : 'Record time off for a team member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="team_member">Team Member *</Label>
            <Select
              value={formData.team_member_id}
              onValueChange={(value) => handleInputChange('team_member_id', value)}
              disabled={isLoading || loadingMembers}
            >
              <SelectTrigger className={errors.team_member_id ? 'border-destructive' : ''}>
                <SelectValue placeholder={
                  loadingMembers ? 'Loading...' :
                  teamMembers.length === 0 ? 'No team members found' :
                  'Select team member'
                } />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} {member.department ? `(${member.department})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team_member_id && (
              <p className="text-sm text-destructive">{errors.team_member_id}</p>
            )}
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OFF_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${type.color}-500`} />
                        {type.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
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
                onChange={(e) => {
                  handleInputChange('start_date', e.target.value);
                  // If end date is before start date, update it
                  if (formData.end_date && e.target.value > formData.end_date) {
                    handleInputChange('end_date', e.target.value);
                  }
                }}
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
                min={formData.start_date}
                className={errors.end_date ? 'border-destructive' : ''}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Half Day Option - only show for single day */}
          {formData.start_date === formData.end_date && (
            <div className="space-y-2">
              <Label>Duration</Label>
              <RadioGroup
                value={formData.half_day || 'full'}
                onValueChange={(value) => handleInputChange('half_day', value === 'full' ? null : value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="font-normal">Full Day</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <Label htmlFor="morning" className="font-normal">Morning Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="afternoon" id="afternoon" />
                  <Label htmlFor="afternoon" className="font-normal">Afternoon Only</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Duration Display */}
          {getDuration() && (
            <div className="p-3 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Duration:</span> {getDuration()}
                {selectedType && (
                  <span className={`ml-2 text-${selectedType.color}-600`}>
                    ({selectedType.label})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
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
                ? 'Update'
                : 'Add Time Off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { TIME_OFF_TYPES };
export default TimeOffForm;
