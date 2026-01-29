import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getSprintById } from '@/utils/releaseCycles';
import { format } from 'date-fns';

export function TimelineNav({ currentWeek, availableSprints = [], onWeekChange }) {
  const sprint = currentWeek ? getSprintById(currentWeek) : null;

  // Find current position in available sprints
  const currentIndex = availableSprints.findIndex(s => s.id === currentWeek);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < availableSprints.length - 1;

  const goPrev = () => {
    if (hasPrev) onWeekChange(availableSprints[currentIndex - 1].id);
  };

  const goNext = () => {
    if (hasNext) onWeekChange(availableSprints[currentIndex + 1].id);
  };

  if (!sprint) {
    return (
      <div className="flex items-center gap-4 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Select a week</span>
      </div>
    );
  }

  // Calculate week label (relative within cycle)
  // Sprint 'a' = Weeks 1-2, Sprint 'b' = Weeks 3-4
  const sprintLabel = sprint.label; // 'a' or 'b'
  const weekRange = sprintLabel === 'a' ? '1-2' : '3-4';

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={goPrev}
        disabled={!hasPrev}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-center min-w-[220px]">
        <div className="font-medium flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Weeks {weekRange} - Sprint {sprint.id}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(sprint.startDate, 'MMM d')} - {format(sprint.endDate, 'MMM d, yyyy')}
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={!hasNext}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
