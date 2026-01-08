import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Filter, ArrowUpDown, Star } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import PersonalFileItemCard from './PersonalFileItemCard';

/**
 * PersonalFileList - Component to display and manage a list of personal file items
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of personal file item objects
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onEdit - Callback when editing an item
 * @param {Function} props.onDelete - Callback when deleting an item
 * @param {boolean} props.showActions - Whether to show action buttons
 * @param {string} props.emptyMessage - Message to show when no items exist
 * @param {string} props.emptyDescription - Description for empty state
 */
const PersonalFileList = ({
  items = [],
  loading = false,
  onEdit,
  onDelete,
  showActions = true,
  emptyMessage = "No personal file items found",
  emptyDescription = "Personal file items will appear here once they are added."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterImportance, setFilterImportance] = useState('all');

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    // Apply importance filter
    if (filterImportance !== 'all') {
      filtered = filtered.filter(item => item.importance === parseInt(filterImportance));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'importance':
          aValue = a.importance;
          bValue = b.importance;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [items, searchTerm, sortBy, sortOrder, filterCategory, filterImportance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Loading personal file items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search personal file items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="achievement">Achievement</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="concern">Concern</SelectItem>
              <SelectItem value="goal">Goal</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterImportance} onValueChange={setFilterImportance}>
            <SelectTrigger className="w-36">
              <Star className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Importance</SelectItem>
              <SelectItem value="5">High</SelectItem>
              <SelectItem value="4">Medium-High</SelectItem>
              <SelectItem value="3">Medium</SelectItem>
              <SelectItem value="2">Medium-Low</SelectItem>
              <SelectItem value="1">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field);
            setSortOrder(order);
          }}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
              <SelectItem value="importance-desc">Importance: High to Low</SelectItem>
              <SelectItem value="importance-asc">Importance: Low to High</SelectItem>
              <SelectItem value="title-asc">Title: A to Z</SelectItem>
              <SelectItem value="title-desc">Title: Z to A</SelectItem>
              <SelectItem value="category-asc">Category: A to Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      {items.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedItems.length} of {items.length} personal file items
        </div>
      )}

      {/* Items list */}
      {filteredAndSortedItems.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={items.length === 0 ? emptyMessage : "No matching items"}
          description={items.length === 0 ? emptyDescription : "Try adjusting your search or filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredAndSortedItems.map((item) => (
            <PersonalFileItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalFileList;