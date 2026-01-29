import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { calculateHealth, getHealthBorderClass } from '@/utils/healthCalculation';

export function MemberCard({ member, summary }) {
  const [isOpen, setIsOpen] = useState(false);

  // Memoize health calculation
  const health = useMemo(() => calculateHealth(summary), [summary]);
  const borderColor = getHealthBorderClass(health.status);

  // Get member initials from name
  const initials = member?.name
    ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
        <CollapsibleTrigger className="w-full text-left p-4 flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>

          {/* Name and 1-line summary */}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{member?.name || 'Unknown'}</div>
            <div className="text-sm text-muted-foreground truncate">
              {summary.oneLine || 'No updates this week'}
            </div>
          </div>

          {/* Metric badges */}
          <div className="flex gap-2 flex-shrink-0">
            {summary.completedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {summary.completedCount} done
              </Badge>
            )}
            {summary.blockerCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.blockerCount} blocker{summary.blockerCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Expand icon */}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4 space-y-3">
          {/* Full summary with all items */}
          {summary.items && summary.items.length > 0 && (
            <div className="text-sm space-y-2 pl-13">
              {summary.items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground">-</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Health reasoning */}
          <div className="text-xs text-muted-foreground pt-2 border-t pl-13">
            <span className="font-medium">Status:</span> {health.reasoning}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
