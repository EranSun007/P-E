// src/components/sync/ArchivedItemCard.jsx
// Card component for displaying archived sync items with restore action

import { format, parseISO } from 'date-fns';
import { ArchiveRestore } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, TEAM_DEPARTMENTS } from '@/contexts/SyncContext';

// Find label for a category or team
function findLabel(options, value) {
  const option = options.find(opt => opt.id === value);
  return option?.label || value || 'Unknown';
}

export function ArchivedItemCard({ item, onRestore }) {
  // Format archived date
  const archivedDate = item.archived_at
    ? format(parseISO(item.archived_at), 'MMM d, yyyy')
    : 'Unknown date';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium line-clamp-1">
            {item.name}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(item.id)}
            className="shrink-0"
          >
            <ArchiveRestore className="h-4 w-4 mr-1" />
            Restore
          </Button>
        </div>
        {item.description && (
          <CardDescription className="line-clamp-2">
            {item.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {findLabel(CATEGORIES, item.category)}
          </Badge>
          <Badge variant="outline">
            {findLabel(TEAM_DEPARTMENTS, item.team_department)}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            Archived: {archivedDate}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ArchivedItemCard;
