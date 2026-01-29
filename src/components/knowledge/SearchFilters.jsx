// src/components/knowledge/SearchFilters.jsx
import PropTypes from 'prop-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Common languages for filter dropdown
const LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

// Artifact types based on MCP knowledge base
const ARTIFACT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'component', label: 'Components' },
  { value: 'service', label: 'Services' },
  { value: 'utility', label: 'Utilities' },
  { value: 'model', label: 'Models' },
  { value: 'hook', label: 'Hooks' },
  { value: 'api', label: 'API Routes' },
];

export function SearchFilters({ filters, setFilters, repositories = [] }) {
  const handleRepoChange = (value) => {
    setFilters({ ...filters, repoName: value === 'all' ? '' : value });
  };

  const handleLanguageChange = (value) => {
    setFilters({ ...filters, language: value === 'all' ? '' : value });
  };

  const handleArtifactTypeChange = (value) => {
    setFilters({ ...filters, artifactType: value === 'all' ? '' : value });
  };

  const clearFilters = () => {
    setFilters({ repoName: '', language: '', artifactType: '' });
  };

  const hasActiveFilters = filters.repoName || filters.language || filters.artifactType;

  // Generate repo options from provided repositories list
  const repoOptions = [
    { value: 'all', label: 'All Repositories' },
    ...repositories.map(repo => ({ value: repo, label: repo })),
  ];

  return (
    <div className="space-y-3">
      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {/* Repository Filter */}
        <Select
          value={filters.repoName || 'all'}
          onValueChange={handleRepoChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Repository" />
          </SelectTrigger>
          <SelectContent>
            {repoOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language Filter */}
        <Select
          value={filters.language || 'all'}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Artifact Type Filter */}
        <Select
          value={filters.artifactType || 'all'}
          onValueChange={handleArtifactTypeChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Artifact Type" />
          </SelectTrigger>
          <SelectContent>
            {ARTIFACT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.repoName && (
            <Badge variant="secondary" className="text-xs">
              Repo: {filters.repoName}
              <button
                onClick={() => setFilters({ ...filters, repoName: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.language && (
            <Badge variant="secondary" className="text-xs">
              Lang: {filters.language}
              <button
                onClick={() => setFilters({ ...filters, language: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.artifactType && (
            <Badge variant="secondary" className="text-xs">
              Type: {filters.artifactType}
              <button
                onClick={() => setFilters({ ...filters, artifactType: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

SearchFilters.propTypes = {
  filters: PropTypes.shape({
    repoName: PropTypes.string,
    language: PropTypes.string,
    artifactType: PropTypes.string,
  }).isRequired,
  setFilters: PropTypes.func.isRequired,
  repositories: PropTypes.arrayOf(PropTypes.string),
};
