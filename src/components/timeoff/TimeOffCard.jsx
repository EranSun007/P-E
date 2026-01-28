import { format, parseISO, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Palmtree,
  Thermometer,
  User,
  Building,
  Calendar,
  GraduationCap,
  Sword,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useDisplayMode } from '@/contexts/DisplayModeContext.jsx';
import { anonymizeName } from '@/utils/anonymize';

const TIME_OFF_TYPE_CONFIG = {
  vacation: {
    label: 'Vacation',
    icon: Palmtree,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  sick: {
    label: 'Sick Leave',
    icon: Thermometer,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-800',
  },
  personal: {
    label: 'Personal Day',
    icon: User,
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
  conference: {
    label: 'Conference',
    icon: Building,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
  },
  learning: {
    label: 'Learning',
    icon: GraduationCap,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  army_reserve: {
    label: 'Army Reserve',
    icon: Sword,
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-300',
    badgeClass: 'bg-slate-100 text-slate-800',
  },
  other: {
    label: 'Other',
    icon: Calendar,
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
};

const TimeOffCard = ({
  timeOff,
  onEdit,
  onDelete,
  compact = false,
  showTeamMember = true,
  isLoading = false,
  index = 0,
}) => {
  const { isPresentationMode } = useDisplayMode();
  const config = TIME_OFF_TYPE_CONFIG[timeOff.type] || TIME_OFF_TYPE_CONFIG.other;
  const Icon = config.icon;

  // Get display name based on presentation mode
  const displayName = isPresentationMode
    ? anonymizeName(timeOff.team_member_name, index, 'Team Member')
    : timeOff.team_member_name;

  // Calculate duration
  const getDuration = () => {
    if (timeOff.half_day) return '½ day';
    if (timeOff.start_date && timeOff.end_date) {
      const days = differenceInDays(parseISO(timeOff.end_date), parseISO(timeOff.start_date)) + 1;
      return days === 1 ? '1 day' : `${days} days`;
    }
    return null;
  };

  const duration = getDuration();

  // Format date range
  const formatDateRange = () => {
    if (!timeOff.start_date) return 'No date';
    const start = format(parseISO(timeOff.start_date), 'MMM d');
    if (!timeOff.end_date || timeOff.start_date === timeOff.end_date) {
      if (timeOff.half_day) {
        return `${start} (${timeOff.half_day === 'morning' ? 'AM' : 'PM'})`;
      }
      return start;
    }
    const end = format(parseISO(timeOff.end_date), 'MMM d');
    return `${start} - ${end}`;
  };

  // Check if time off is currently active
  const isActive = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseISO(timeOff.start_date);
    const end = parseISO(timeOff.end_date);
    return today >= start && today <= end;
  };

  // Check if time off is in the past
  const isPast = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseISO(timeOff.end_date);
    return today > end;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-md ${config.bgClass} ${config.borderClass} border ${isPast() ? 'opacity-60' : ''}`}>
        <Icon className={`h-4 w-4 ${config.textClass}`} />
        <div className="flex-1 min-w-0">
          {showTeamMember && (
            <div className={`text-sm font-medium ${config.textClass} truncate`}>
              {displayName}
            </div>
          )}
          <div className="text-xs text-gray-600">
            {config.label} · {formatDateRange()}
          </div>
        </div>
        {isActive() && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border-green-200">
            Now
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${config.borderClass} ${isPast() ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${config.bgClass}`}>
            <Icon className={`h-5 w-5 ${config.textClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {showTeamMember && (
                <span className="font-medium">{displayName}</span>
              )}
              <Badge variant="outline" className={config.badgeClass}>
                {config.label}
              </Badge>
              {isActive() && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange()}
              </span>
              {duration && (
                <span className="text-xs">
                  ({duration})
                </span>
              )}
            </div>
            {timeOff.notes && !isPresentationMode && (
              <p className="mt-2 text-sm text-gray-600">{timeOff.notes}</p>
            )}
          </div>
        </div>

        {!isPresentationMode && (onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(timeOff)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Time Off?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the {config.label.toLowerCase()} entry
                        {showTeamMember && displayName ? ` for ${displayName}` : ''}.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(timeOff.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export { TIME_OFF_TYPE_CONFIG };
export default TimeOffCard;
