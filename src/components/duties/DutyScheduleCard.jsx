import { format, parseISO, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
  Shield,
  Wrench,
  UserCog,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

const DUTY_TYPE_CONFIG = {
  devops: {
    label: 'DevOps',
    icon: Shield,
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-800',
    borderClass: 'border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800',
  },
  dev_on_duty: {
    label: 'Dev On Duty',
    icon: Wrench,
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-800',
    borderClass: 'border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-800',
  },
  replacement: {
    label: 'Replacement',
    icon: UserCog,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
};

const DutyScheduleCard = ({
  duty,
  onEdit,
  onDelete,
  compact = false,
  isLoading = false,
}) => {
  const config = DUTY_TYPE_CONFIG[duty.duty_type] || DUTY_TYPE_CONFIG.devops;
  const Icon = config.icon;

  // Calculate duration
  const getDuration = () => {
    if (duty.start_date && duty.end_date) {
      const start = parseISO(duty.start_date);
      const end = parseISO(duty.end_date);
      return differenceInDays(end, start) + 1;
    }
    return null;
  };

  const duration = getDuration();

  // Format date range
  const formatDateRange = () => {
    if (!duty.start_date) return 'No date';
    const start = format(parseISO(duty.start_date), 'MMM d');
    if (!duty.end_date) return start;
    const end = format(parseISO(duty.end_date), 'MMM d');

    // Include year if different from current year
    const startYear = parseISO(duty.start_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (startYear !== currentYear) {
      return `${start} - ${format(parseISO(duty.end_date), 'MMM d, yyyy')}`;
    }
    return `${start} - ${end}`;
  };

  // Check if duty is currently active
  const isActive = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseISO(duty.start_date);
    const end = parseISO(duty.end_date);
    return today >= start && today <= end;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-md ${config.bgClass} ${config.borderClass} border`}>
        <Icon className={`h-4 w-4 ${config.textClass}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${config.textClass} truncate`}>
            {duty.team_member_name}
          </div>
          <div className="text-xs text-gray-600">
            {formatDateRange()}
          </div>
        </div>
        {isActive() && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border-green-200">
            Active
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`${config.borderClass} border-l-4`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${config.bgClass}`}>
              <Icon className={`h-5 w-5 ${config.textClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{duty.team_member_name}</span>
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
                    ({duration} day{duration !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              {duty.notes && (
                <p className="mt-2 text-sm text-gray-600">{duty.notes}</p>
              )}
            </div>
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(duty)}>
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
                        <AlertDialogTitle>Delete Duty Assignment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the {config.label} duty assignment for {duty.team_member_name}.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(duty.id)}
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
      </CardContent>
    </Card>
  );
};

export { DUTY_TYPE_CONFIG };
export default DutyScheduleCard;
