# Design Document

## Overview

This design outlines a comprehensive codebase organization and cleanup strategy for the P&E Manager application. The current codebase has accumulated technical debt during the discovery phase, including duplicate implementations, unused dependencies, inconsistent naming patterns, and unclear file organization. This cleanup will establish a clean, maintainable foundation for future development.

## Architecture

### Current State Analysis

**Identified Issues:**
1. **Duplicate Components**: `TaskCard.jsx` and `TaskCard.refactored.jsx` exist with similar functionality
2. **Legacy Dependencies**: `@base44/sdk` is unused but still in package.json
3. **Test File Proliferation**: Multiple test files with overlapping coverage and unclear naming
4. **Inconsistent Patterns**: Mixed naming conventions and component structures
5. **Dead Code**: Commented code, unused imports, and experimental features left in place
6. **Directory Bloat**: Deep nesting and unclear organization in some areas

**Current Structure Issues:**
- 180+ test files with potential duplication
- Multiple `.test.js`, `.enhanced.test.js`, `.integration.test.js` variants
- Unclear separation between core and experimental features
- Bundle optimization scripts scattered across multiple locations

### Target Architecture

**Clean Structure Principles:**
1. **Single Source of Truth**: One implementation per feature
2. **Clear Separation**: Core vs experimental vs utility code
3. **Consistent Patterns**: Standardized naming and organization
4. **Minimal Dependencies**: Remove unused packages and imports
5. **Comprehensive Documentation**: Clear purpose for every directory and major file

## Components and Interfaces

### Directory Reorganization

```
src/
├── api/                    # Data layer (cleaned)
│   ├── __tests__/         # Consolidated API tests
│   ├── entities.js        # Core entity definitions
│   ├── localClient.js     # Primary data client
│   └── schemas/           # Data validation schemas
├── components/            # UI components (organized by domain)
│   ├── ui/               # Base components (shadcn/ui)
│   ├── core/             # Core business components
│   │   ├── task/         # Task management
│   │   ├── calendar/     # Calendar functionality
│   │   ├── team/         # Team management
│   │   └── auth/         # Authentication
│   ├── shared/           # Shared utility components
│   └── experimental/     # Experimental features (clearly marked)
├── hooks/                # Custom React hooks
├── services/             # Business logic services
├── utils/                # Utility functions
├── pages/                # Page components
├── contexts/             # React contexts
└── test/                 # Test utilities and setup
```

### Component Consolidation Strategy

**Task Components:**
- **Keep**: `TaskCard.jsx` (primary implementation)
- **Remove**: `TaskCard.refactored.jsx` (merge improvements into primary)
- **Consolidate**: Task-related utilities into single files

**Test Organization:**
- **Pattern**: `ComponentName.test.jsx` for unit tests
- **Pattern**: `ComponentName.integration.test.jsx` for integration tests
- **Remove**: Duplicate test files with unclear naming
- **Consolidate**: Related test utilities

### Dependency Cleanup

**Remove Unused Dependencies:**
- `@base44/sdk` - Legacy dependency, no longer used
- Any unused Radix UI components
- Development dependencies not referenced in scripts

**Consolidate Similar Dependencies:**
- Review date manipulation libraries for duplication
- Consolidate testing utilities

## Data Models

### File Classification System

**Core Files** (Production-ready, stable):
- Primary component implementations
- Core business logic
- Essential utilities
- Main API clients

**Experimental Files** (Under development):
- Features marked with clear experimental indicators
- Prototype implementations
- Research and development code

**Legacy Files** (To be removed):
- Duplicate implementations
- Unused components
- Commented-out code
- Obsolete utilities

### Naming Convention Standards

**Components**: PascalCase
- `TaskCard.jsx` ✓
- `DutyForm.jsx` ✓
- `task-card.jsx` ✗

**Utilities**: camelCase
- `calendarService.js` ✓
- `authUtils.js` ✓
- `CalendarService.js` ✗

**Tests**: Component name + `.test.jsx`
- `TaskCard.test.jsx` ✓
- `TaskCard.enhanced.test.jsx` ✗ (merge into main test)

**Constants**: UPPER_SNAKE_CASE
- `TASK_STATUS` ✓
- `taskStatus` ✗

## Error Handling

### Cleanup Error Prevention

**Automated Checks:**
1. **Import Analysis**: Detect unused imports before removal
2. **Dependency Scanning**: Identify truly unused packages
3. **Reference Checking**: Ensure no components reference deleted files
4. **Test Coverage**: Maintain test coverage during consolidation

**Rollback Strategy:**
1. **Git Branching**: Create feature branch for cleanup
2. **Incremental Changes**: Small, reviewable commits
3. **Testing Gates**: Run full test suite after each major change
4. **Documentation**: Track all changes for potential rollback

### Runtime Error Improvements

**Component Error Boundaries:**
- Ensure all major components have error boundaries
- Standardize error fallback components
- Improve error logging and reporting

## Testing Strategy

### Test Consolidation Plan

**Current Test Issues:**
- 180+ test files with potential overlap
- Inconsistent naming patterns
- Multiple integration test approaches
- Unclear test categorization

**Consolidation Strategy:**

1. **Audit Phase**: Catalog all test files and their coverage
2. **Categorization**: Group tests by component and type
3. **Merge Phase**: Combine duplicate or overlapping tests
4. **Standardization**: Apply consistent naming and structure
5. **Coverage Verification**: Ensure no functionality is lost

**Target Test Structure:**
```
src/components/task/__tests__/
├── TaskCard.test.jsx           # Unit tests
├── TaskForm.test.jsx           # Unit tests
├── TaskList.test.jsx           # Unit tests
└── task-integration.test.jsx   # Integration tests

src/services/__tests__/
├── taskService.test.js         # Service unit tests
└── service-integration.test.js # Service integration tests
```

### Bundle Optimization

**Script Consolidation:**
- Merge similar bundle analysis scripts
- Standardize performance testing approach
- Consolidate monitoring and alerting

**Performance Testing:**
- Maintain bundle size regression tests
- Consolidate loading performance tests
- Standardize optimization validation

## Implementation Phases

### Phase 1: Analysis and Planning
1. **Dependency Analysis**: Identify unused packages and imports
2. **Component Mapping**: Create comprehensive component usage map
3. **Test Audit**: Catalog all test files and their coverage
4. **Documentation Review**: Identify outdated or incorrect documentation

### Phase 2: Safe Removals
1. **Unused Dependencies**: Remove confirmed unused packages
2. **Dead Code**: Remove commented code and unused imports
3. **Duplicate Files**: Remove clear duplicates (keeping better implementation)
4. **Legacy Components**: Remove obsolete implementations

### Phase 3: Consolidation
1. **Component Merging**: Merge improvements from refactored versions
2. **Test Consolidation**: Combine overlapping test files
3. **Utility Organization**: Consolidate similar utility functions
4. **Service Cleanup**: Organize and deduplicate service layer

### Phase 4: Standardization
1. **Naming Conventions**: Apply consistent naming patterns
2. **Directory Structure**: Reorganize files into logical groupings
3. **Import Patterns**: Standardize import statements and aliases
4. **Documentation**: Update all documentation to reflect changes

### Phase 5: Validation and Documentation
1. **Comprehensive Testing**: Run full test suite
2. **Bundle Analysis**: Verify bundle size improvements
3. **Performance Testing**: Ensure no performance regressions
4. **Architecture Documentation**: Create comprehensive structure guide

## Success Metrics

### Quantitative Goals
- **Reduce file count by 20-30%** through consolidation
- **Remove 5-10 unused dependencies** from package.json
- **Maintain 100% test coverage** during cleanup
- **Reduce bundle size by 10-15%** through dead code elimination
- **Improve build time by 15-20%** through dependency cleanup

### Qualitative Goals
- **Clear component ownership**: Every component has single, clear implementation
- **Predictable structure**: Developers can quickly locate relevant code
- **Consistent patterns**: All similar functionality follows same patterns
- **Comprehensive documentation**: Every major directory and component is documented
- **Future-ready foundation**: Clean base for continued development

### Validation Criteria
- All tests pass after cleanup
- No broken imports or missing dependencies
- Bundle builds successfully
- Performance metrics maintained or improved
- Code review approval from team
- Documentation completeness verified