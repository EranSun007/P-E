// src/components/sync/ArchiveModal.jsx
// Modal for viewing and restoring archived sync items with date filtering

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import { ArchivedItemCard } from './ArchivedItemCard';

export function ArchiveModal({ open, onOpenChange }) {
  const { loadArchivedItems, archivedItems, restoreItem } = useSync();

  // Filter state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Lazy-load archived items when modal opens or filters change
  useEffect(() => {
    if (open) {
      setLoading(true);
      loadArchivedItems({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }).finally(() => setLoading(false));
    }
  }, [open, fromDate, toDate, loadArchivedItems]);

  // Handle restore
  const handleRestore = useCallback(async (id) => {
    try {
      await restoreItem(id);
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
  }, [restoreItem]);

  // Clear filters when modal closes
  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setFromDate('');
      setToDate('');
    }
    onOpenChange(newOpen);
  };

  const itemCount = archivedItems?.length || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Archived Items</DialogTitle>
          <DialogDescription>
            {loading
              ? 'Loading archived items...'
              : itemCount === 0
                ? 'No archived items found'
                : `Showing ${itemCount} archived item${itemCount === 1 ? '' : 's'}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Date filters */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="from_date">From Date</Label>
            <Input
              id="from_date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_date">To Date</Label>
            <Input
              id="to_date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* Archived items list */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : itemCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No archived items match the selected filters.
            </div>
          ) : (
            archivedItems.map((item) => (
              <ArchivedItemCard
                key={item.id}
                item={item}
                onRestore={handleRestore}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ArchiveModal;
