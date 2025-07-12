import React from "react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2,
  Filter, 
  Search, 
  SlidersHorizontal,
  Tag, 
  X, 
  Clock, 
  LineChart, 
  ListFilter
} from "lucide-react";

export default function TaskFilterBar({
  filters = {
    status: [],
    priority: [],
    type: [],
    search: "",
    tags: [],
    strategic: null,
    groupBy: "none"
  }, 
  setFilters,
  availableTags = []
}) {
  // Ensure filters has all required properties with default values
  const safeFilters = {
    status: [],
    priority: [],
    type: [],
    search: "",
    tags: [],
    strategic: null,
    groupBy: "none",
    ...filters
  };

  // Ensure all array properties are arrays
  safeFilters.status = Array.isArray(safeFilters.status) ? safeFilters.status : [];
  safeFilters.priority = Array.isArray(safeFilters.priority) ? safeFilters.priority : [];
  safeFilters.type = Array.isArray(safeFilters.type) ? safeFilters.type : [];
  safeFilters.tags = Array.isArray(safeFilters.tags) ? safeFilters.tags : [];

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      type: [],
      search: "",
      tags: [],
      strategic: null,
      groupBy: "none"
    });
  };

  const filtersActive = safeFilters.status.length > 0 || 
                         safeFilters.priority.length > 0 || 
                         safeFilters.type.length > 0 || 
                         safeFilters.tags.length > 0 ||
                         safeFilters.strategic !== null ||
                         safeFilters.search;

  const toggleFilter = (filterType, value) => {
    const currentFilters = safeFilters[filterType] || [];
    setFilters(prev => {
      if (currentFilters.includes(value)) {
        return {
          ...prev,
          [filterType]: currentFilters.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [filterType]: [...currentFilters, value]
        };
      }
    });
  };

  const toggleTagFilter = (tag) => {
    toggleFilter("tags", tag);
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  const handleStrategicChange = (value) => {
    setFilters(prev => ({
      ...prev,
      strategic: value === "all" ? null : value === "strategic"
    }));
  };
  
  const handleGroupingChange = (value) => {
    setFilters(prev => ({
      ...prev,
      groupBy: value
    }));
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search tasks..." 
            value={safeFilters.search} 
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {filtersActive && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center">
                    {safeFilters.status.length + safeFilters.type.length + safeFilters.priority.length + safeFilters.tags.length + (safeFilters.strategic !== null ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="p-2">
                <h4 className="mb-2 font-medium text-sm">Status</h4>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.status.includes('todo')}
                    onCheckedChange={() => toggleFilter('status', 'todo')}
                  >
                    Todo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.status.includes('in_progress')}
                    onCheckedChange={() => toggleFilter('status', 'in_progress')}
                  >
                    In Progress
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.status.includes('blocked')}
                    onCheckedChange={() => toggleFilter('status', 'blocked')}
                  >
                    Blocked
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.status.includes('done')}
                    onCheckedChange={() => toggleFilter('status', 'done')}
                  >
                    Done
                  </DropdownMenuCheckboxItem>
                </div>
              </div>
              
              <hr className="my-2" />
              
              <div className="p-2">
                <h4 className="mb-2 font-medium text-sm">Type</h4>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.type.includes('generic')}
                    onCheckedChange={() => toggleFilter('type', 'generic')}
                  >
                    Generic
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.type.includes('meeting')}
                    onCheckedChange={() => toggleFilter('type', 'meeting')}
                  >
                    Meeting
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.type.includes('metric')}
                    onCheckedChange={() => toggleFilter('type', 'metric')}
                  >
                    Metric
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.type.includes('action')}
                    onCheckedChange={() => toggleFilter('type', 'action')}
                  >
                    Action
                  </DropdownMenuCheckboxItem>
                </div>
              </div>
              
              <hr className="my-2" />
              
              <div className="p-2">
                <h4 className="mb-2 font-medium text-sm">Priority</h4>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.priority.includes('low')}
                    onCheckedChange={() => toggleFilter('priority', 'low')}
                  >
                    Low
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.priority.includes('medium')}
                    onCheckedChange={() => toggleFilter('priority', 'medium')}
                  >
                    Medium
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.priority.includes('high')}
                    onCheckedChange={() => toggleFilter('priority', 'high')}
                  >
                    High
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={safeFilters.priority.includes('urgent')}
                    onCheckedChange={() => toggleFilter('priority', 'urgent')}
                  >
                    Urgent
                  </DropdownMenuCheckboxItem>
                </div>
              </div>
              
              {filtersActive && (
                <div className="border-t p-2">
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm h-8 text-blue-600" 
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Clear filters
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={safeFilters.strategic === null ? "all" : safeFilters.strategic ? "strategic" : "tactical"} onValueChange={handleStrategicChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="tactical">Tactical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(safeFilters.tags.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="h-4 w-4 text-gray-500" />
          {safeFilters.tags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="flex gap-1 items-center cursor-pointer"
              onClick={() => toggleTagFilter(tag)}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-blue-600"
            onClick={() => setFilters(prev => ({ ...prev, tags: [] }))}
          >
            Clear tags
          </Button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          {(availableTags.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-3.5 w-3.5 mr-1" /> Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="grid grid-cols-2 gap-1 p-1">
                  {availableTags.slice(0, 10).map(tag => (
                    <Button 
                      key={tag} 
                      variant="ghost" 
                      size="sm"
                      className={`text-xs justify-start ${
                        safeFilters.tags.includes(tag) ? "bg-slate-100" : ""
                      }`}
                      onClick={() => toggleTagFilter(tag)}
                    >
                      {safeFilters.tags.includes(tag) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {tag}
                    </Button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <div>
            <Select value={safeFilters.groupBy} onValueChange={handleGroupingChange}>
              <SelectTrigger className="text-sm h-9">
                <div className="flex items-center">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
                  Group by
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="strategic">Strategic/Tactical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {filtersActive && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-sm text-blue-600"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear all filters
          </Button>
        )}
      </div>
    </div>
  );
}