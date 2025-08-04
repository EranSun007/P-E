# Test Files Audit and Categorization

## Summary
- **Total Test Files**: 128 files
- **Source Directory Tests**: 125 files  
- **Scripts Directory Tests**: 3 files

## Test File Categories

### 1. API Layer Tests (22 files)
**Location**: `src/api/__tests__/`

#### Core Entity Tests
- `entities.test.js` - Core entity definitions and helpers
- `outOfOffice.test.js` - Out of office functionality
- `peer.test.js` - Peer management
- `employeeGoal.integration.test.js` - Employee goals integration

#### Duty Management Tests (10 files)
- `duty.test.js` - Basic duty functionality
- `duty-comprehensive.test.js` - Comprehensive duty tests
- `duty-calendar-integration.test.js` - Duty-calendar integration
- `duty-calendar-integration-comprehensive.test.js` - **DUPLICATE** comprehensive duty-calendar integration
- `duty-duplication-fixes.test.js` - Duplication prevention fixes
- `duty-duplication-regression.test.js` - Regression tests for duplication
- `duty-requirements-validation.test.js` - Requirements validation
- `duty-rotation-data-models.test.js` - Rotation data models
- `duty-title-validation.test.js` - Title validation
- `sessionDuplicatePrevention.test.js` - Session duplicate prevention

#### Calendar Event Tests (8 files)
- `calendarEvent-deduplication.test.js` - Event deduplication
- `calendarEvent-enhanced.test.js` - Enhanced calendar events
- `calendarEvent-integration.test.js` - Calendar event integration

**OVERLAPPING COVERAGE IDENTIFIED**: Multiple duty-calendar integration tests with similar scope.

### 2. Component Tests (67 files)

#### Agenda Components (13 files)
**Location**: `src/components/agenda/__tests__/`

##### Unit Tests (7 files)
- `AgendaBadge.test.jsx` - Agenda badge component
- `AgendaContextActions.test.jsx` - Context actions
- `AgendaItemCard.test.jsx` - Item card component
- `AgendaItemForm.test.jsx` - Item form component
- `AgendaItemList.test.jsx` - Item list component
- `AgendaSection.test.jsx` - Section component
- `PersonalFileItemForm.test.jsx` - Personal file form

##### Integration Tests (6 files)
- `AgendaDataFlowIntegration.test.jsx` - Agenda data flow integration
- `CompleteWorkflowIntegration.test.jsx` - Complete workflow integration
- `DataFlowIntegration.test.jsx` - **DUPLICATE** data flow integration (simplified)
- `ErrorHandlingAndEdgeCases.test.jsx` - Error handling
- `PersonalFileComponents.test.jsx` - Personal file components
- `PersonalFileDataFlowIntegration.test.jsx` - Personal file data flow

**OVERLAPPING COVERAGE**: `DataFlowIntegration.test.jsx` and `AgendaDataFlowIntegration.test.jsx` have similar scope.

#### Auth Components (5 files)
**Location**: `src/components/auth/__tests__/`
- `AuthErrorHandling.test.jsx` - Auth error handling
- `AuthIntegration.test.jsx` - Auth integration
- `LoginForm.test.jsx` - Login form component
- `ProtectedRoute.test.jsx` - Protected route component
- `SessionPersistence.test.jsx` - Session persistence

#### Calendar Components (4 files)
**Location**: `src/components/calendar/__tests__/`
- `CalendarEmptyState.test.jsx` - Empty state component
- `ViewModeSelector.test.jsx` - View mode selector
- `WeeklyMeetingSidebar.test.jsx` - Weekly meeting sidebar
- `WeeklyMeetingSidebarErrorHandling.test.jsx` - **DUPLICATE** sidebar error handling (should be merged)

#### Duty Components (18 files)
**Location**: `src/components/duty/__tests__/`

##### Core Component Tests (5 files)
- `DutyCard.test.jsx` - Basic duty card tests
- `DutyForm.test.jsx` - Basic duty form tests
- `DutyRotationManager.test.jsx` - Rotation manager
- `RotationStatusIndicator.test.jsx` - Status indicator
- `TeamMemberRotationDisplay.test.jsx` - Rotation display

##### Enhanced/Specialized Tests (13 files)
- `DutyCard.delete-functionality.test.jsx` - **SPECIALIZED** delete functionality
- `DutyCard.rotation.test.jsx` - **SPECIALIZED** rotation functionality
- `DutyCard.ui-improvements.test.jsx` - **SPECIALIZED** UI improvements
- `DutyCard.upcoming-alert.test.jsx` - **SPECIALIZED** upcoming alerts
- `DutyForm.enhanced-workflow.test.jsx` - **SPECIALIZED** enhanced workflow
- `DutyForm.errorHandling.test.jsx` - **SPECIALIZED** error handling
- `DutyForm.sessionDuplicatePrevention.test.jsx` - **SPECIALIZED** session duplicate prevention
- `DutyForm.validation.test.jsx` - **SPECIALIZED** validation
- `DutyRotationManager.errorHandling.test.jsx` - **SPECIALIZED** error handling
- `DuplicatePrevention.test.jsx` - Duplicate prevention
- `DuplicatePreventionIntegration.test.jsx` - **DUPLICATE** duplicate prevention integration
- `DuplicateWarningDialog.test.jsx` - Warning dialog
- `DutyCreationIntegration.test.jsx` - Creation integration

**CONSOLIDATION OPPORTUNITY**: Many specialized tests could be merged into main component tests.

#### Goals Components (5 files)
**Location**: `src/components/goals/__tests__/`
- `GoalForm.test.jsx` - Goal form component
- `GoalImportDialog.test.jsx` - Import dialog
- `GoalsIntegration.test.jsx` - Goals integration
- `GoalsList.test.jsx` - Goals list component
- `GoalStatusManager.test.jsx` - Status manager

#### Team Components (4 files)
**Location**: `src/components/team/__tests__/`
- `OutOfOfficeCounter.test.jsx` - OOO counter
- `OutOfOfficeForm.test.jsx` - OOO form
- `OutOfOfficeManager.test.jsx` - OOO manager
- `OutOfOfficeStatusBadge.test.jsx` - OOO status badge

#### UI Components (3 files)
**Location**: `src/components/ui/__tests__/`
- `ConnectionStatusIndicator.test.jsx` - Connection status
- `error-boundaries.test.jsx` - Error boundaries
- `toast.test.jsx` - Toast notifications

### 3. Service Layer Tests (25 files)
**Location**: `src/services/__tests__/`

#### Core Services (8 files)
- `authService.test.js` - Authentication service
- `employeeGoalsService.test.js` - Employee goals service
- `errorHandlingService.test.js` - Error handling service
- `globalSearchService.test.js` - Global search service
- `goalImportService.test.js` - Goal import service
- `outOfOfficeService.test.js` - Out of office service
- `realTimeUpdateService.test.js` - Real-time updates
- `sessionManagementService.test.js` - Session management

#### Calendar Services (9 files)
- `calendarEventDeduplicationService.test.js` - Event deduplication service
- `calendarEventGenerationService.test.js` - Event generation service
- `calendarSynchronizationService.test.js` - Synchronization service
- `recurringBirthdayService.test.js` - Birthday service
- `viewModeManager.test.js` - View mode manager

##### Calendar Integration Tests (4 files)
- `birthdayEventIntegration.test.js` - Birthday event integration
- `calendarEventDeduplicationIntegration.test.js` - **DUPLICATE** deduplication integration
- `calendarSynchronizationIntegration.test.js` - **DUPLICATE** synchronization integration
- `calendarErrorFixesComprehensive.test.js` - Error fixes comprehensive
- `calendarErrorHandlingEnhanced.test.js` - **DUPLICATE** enhanced error handling
- `calendarErrorHandlingIntegration.test.js` - **DUPLICATE** error handling integration

**OVERLAPPING COVERAGE**: Multiple calendar error handling and integration tests.

#### Duty Services (4 files)
- `dutyRefreshService.test.js` - Duty refresh service
- `dutyRefreshService.performance.test.js` - **SPECIALIZED** performance tests
- `dutyRotationService.test.js` - Rotation service
- `dutyRotationService-comprehensive.test.js` - **DUPLICATE** comprehensive rotation tests

#### Goals Services (2 files)
- `goalsIntegration.test.js` - Goals integration
- `goalsIntegrationService.test.js` - **DUPLICATE** goals integration service

#### Enhanced Services (2 files)
- `enhancedErrorHandlingRetry.test.js` - Enhanced error handling with retry

### 4. Utility Tests (11 files)
**Location**: `src/utils/__tests__/`

#### Calendar Utilities (6 files)
- `calendarService.test.js` - Basic calendar service
- `calendarService.dateValidation.test.js` - **SPECIALIZED** date validation
- `calendarService.dateValidation.integration.test.js` - **SPECIALIZED** date validation integration
- `calendarIntegrationComplete.test.js` - Complete calendar integration
- `calendarWorkflowIntegration.test.jsx` - Calendar workflow integration
- `calendarWorkflowIntegration.simple.test.js` - **DUPLICATE** simplified workflow integration

#### Other Utilities (5 files)
- `dutyTitleMigration.test.js` - Duty title migration
- `dutyValidation.test.js` - Duty validation
- `dutyValidation.enhanced.test.js` - **DUPLICATE** enhanced duty validation
- `eventStylingService.test.js` - Event styling service
- `oneOnOneIntegration.test.js` - One-on-one integration

### 5. Context Tests (1 file)
**Location**: `src/contexts/__tests__/`
- `AuthContext.test.jsx` - Authentication context

### 6. Hook Tests (3 files)
**Location**: `src/hooks/__tests__/`
- `useDutyFormValidation.test.js` - Basic duty form validation hook
- `useDutyFormValidation.comprehensive.test.js` - **DUPLICATE** comprehensive validation tests
- `useDutyFormValidation.performance.test.js` - **SPECIALIZED** performance tests

### 7. Page Tests (10 files)
**Location**: `src/pages/__tests__/`

#### Calendar Page Tests (6 files)
- `Calendar.emptyState.test.jsx` - **SPECIALIZED** empty state
- `Calendar.enhancedDataLoading.test.jsx` - **SPECIALIZED** enhanced data loading
- `Calendar.enhancedDataLoading.simple.test.jsx` - **DUPLICATE** simplified data loading
- `Calendar.errorHandling.test.jsx` - **SPECIALIZED** error handling
- `Calendar.sidebarIntegration.simple.test.jsx` - **SPECIALIZED** sidebar integration
- `Calendar.weeklyMeetingSidebar.test.jsx` - **SPECIALIZED** weekly meeting sidebar

#### Team/Profile Page Tests (4 files)
- `Team.goals.test.jsx` - **SPECIALIZED** team goals
- `TeamMemberProfile.dutyManagement.test.jsx` - **SPECIALIZED** duty management
- `TeamMemberProfile.goals.test.jsx` - **SPECIALIZED** goals
- `TeamMemberProfile.outOfOffice.test.jsx` - **SPECIALIZED** out of office

### 8. End-to-End Tests (5 files)
**Location**: `src/__tests__/`
- `CalendarIntegrationWorkflowSimple.test.jsx` - Simple calendar workflow
- `CalendarWorkflowIntegrationComplete.test.jsx` - **DUPLICATE** complete calendar workflow
- `duty-creation-entry-points.test.jsx` - Duty creation entry points
- `duty-creation-workflow-e2e.test.jsx` - Duty creation E2E
- `duty-rotation-workflow-e2e.test.jsx` - Duty rotation E2E

### 9. Build/Scripts Tests (3 files)
**Location**: `scripts/__tests__/`
- `bundle-analysis.test.js` - Bundle analysis
- `bundle-size-regression.test.js` - Bundle size regression
- `loading-performance.test.js` - Loading performance

## Test Naming Pattern Analysis

### Current Patterns Found:
1. **Standard**: `ComponentName.test.jsx` (preferred)
2. **Specialized**: `ComponentName.feature.test.jsx` (e.g., `DutyCard.rotation.test.jsx`)
3. **Enhanced**: `ComponentName.enhanced.test.jsx`
4. **Integration**: `ComponentName.integration.test.jsx`
5. **Comprehensive**: `ComponentName.comprehensive.test.js`
6. **Performance**: `ComponentName.performance.test.js`
7. **Error Handling**: `ComponentName.errorHandling.test.jsx`

### Inconsistencies:
- Mixed use of `.js` and `.jsx` extensions for React component tests
- Inconsistent capitalization in specialized test names
- Some tests use kebab-case, others use camelCase for multi-word features

## Duplicate and Overlapping Tests Identified

### High Priority Consolidation Candidates:

1. **Calendar Integration Tests**:
   - `CalendarIntegrationWorkflowSimple.test.jsx` vs `CalendarWorkflowIntegrationComplete.test.jsx`
   - `calendarWorkflowIntegration.test.jsx` vs `calendarWorkflowIntegration.simple.test.js`

2. **Duty Calendar Integration**:
   - `duty-calendar-integration.test.js` vs `duty-calendar-integration-comprehensive.test.js`

3. **Calendar Error Handling**:
   - `calendarErrorFixesComprehensive.test.js` vs `calendarErrorHandlingEnhanced.test.js` vs `calendarErrorHandlingIntegration.test.js`

4. **Agenda Data Flow**:
   - `DataFlowIntegration.test.jsx` vs `AgendaDataFlowIntegration.test.jsx`

5. **Goals Integration**:
   - `goalsIntegration.test.js` vs `goalsIntegrationService.test.js`

6. **Duty Validation**:
   - `dutyValidation.test.js` vs `dutyValidation.enhanced.test.js`

7. **Calendar Service Date Validation**:
   - `calendarService.dateValidation.test.js` vs `calendarService.dateValidation.integration.test.js`

### Medium Priority Consolidation Candidates:

1. **DutyCard Specialized Tests**: Multiple `.feature.test.jsx` files could be consolidated
2. **DutyForm Specialized Tests**: Multiple feature-specific tests could be merged
3. **Calendar Page Tests**: Multiple specialized page tests could be consolidated
4. **Duplicate Prevention Tests**: `DuplicatePrevention.test.jsx` vs `DuplicatePreventionIntegration.test.jsx`

## Test Type Classification

### Unit Tests (78 files)
Tests that focus on individual components or functions in isolation.

### Integration Tests (35 files)
Tests that verify interactions between multiple components or services.

### End-to-End Tests (5 files)
Tests that verify complete user workflows across the application.

### Performance Tests (3 files)
Tests that specifically measure performance characteristics.

### Specialized Feature Tests (7 files)
Tests that focus on specific features or edge cases within components.

## Recommendations for Consolidation

### Phase 1: Remove Clear Duplicates (10-15 files)
- Merge calendar workflow integration tests
- Consolidate calendar error handling tests
- Merge goals integration tests
- Consolidate duty validation tests

### Phase 2: Merge Specialized Tests (20-25 files)
- Consolidate DutyCard feature tests into main test file
- Merge DutyForm specialized tests
- Consolidate Calendar page specialized tests
- Merge TeamMemberProfile specialized tests

### Phase 3: Standardize Naming (All remaining files)
- Convert all React component tests to `.test.jsx`
- Standardize to `ComponentName.test.jsx` pattern
- Use `ComponentName.integration.test.jsx` for integration tests
- Use `ComponentName.performance.test.js` for performance tests

### Expected Outcome
- **Target**: Reduce from 128 to ~85-90 test files (30-35% reduction)
- **Maintain**: 100% test coverage
- **Improve**: Test organization and discoverability
- **Standardize**: Consistent naming patterns