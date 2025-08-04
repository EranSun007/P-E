# Services Directory

This directory contains business logic services that orchestrate data operations and implement core application functionality. Services act as an intermediary layer between UI components and the data layer.

## Service Categories

### Core Business Services
- **`authService.js`** - Authentication, session management, password handling
- **`employeeGoalsService.js`** - Employee goal management and tracking
- **`dutyRotationService.js`** - Duty assignment and rotation logic
- **`outOfOfficeService.js`** - Out-of-office tracking and management

### Calendar & Event Services
- **`calendarSynchronizationService.js`** - Calendar data synchronization
- **`calendarEventDeduplicationService.js`** - Event deduplication logic
- **`calendarEventGenerationService.js`** - Calendar event creation
- **`recurringBirthdayService.js`** - Birthday event management

### Utility Services
- **`errorHandlingService.js`** - Centralized error handling and logging
- **`globalSearchService.js`** - Cross-application search functionality
- **`realTimeUpdateService.js`** - Real-time data update coordination
- **`sessionManagementService.js`** - Session state management

### UI Services
- **`agendaIndicatorService.js`** - Agenda status indicators
- **`viewModeManager.js`** - UI view mode management
- **`printService.js`** - Print functionality coordination

### Import/Export Services
- **`goalImportService.js`** - Goal data import/export functionality

### Performance Services
- **`dutyRefreshService.js`** - Optimized duty data refresh
- **`calendarSyncStatusService.js`** - Calendar sync status tracking

## Service Architecture

### Design Principles
- **Single Responsibility**: Each service handles one business domain
- **Stateless Operations**: Services don't maintain internal state
- **Promise-based**: All async operations return promises
- **Error Handling**: Consistent error handling patterns
- **Testable**: Pure functions that are easy to test

### Service Patterns
```javascript
// Standard service structure
class ServiceName {
  constructor(dependencies = {}) {
    this.apiClient = dependencies.apiClient || localClient;
    this.errorHandler = dependencies.errorHandler || errorHandlingService;
  }

  async performOperation(data) {
    try {
      // Validate input
      const validatedData = this.validateInput(data);
      
      // Perform business logic
      const result = await this.apiClient.operation(validatedData);
      
      // Transform result if needed
      return this.transformResult(result);
    } catch (error) {
      this.errorHandler.handleError(error, 'ServiceName.performOperation');
      throw error;
    }
  }

  validateInput(data) {
    // Input validation logic
    return data;
  }

  transformResult(result) {
    // Result transformation logic
    return result;
  }
}

export default new ServiceName();
```

### Dependency Injection
Services use dependency injection for:
- API clients (localClient, future cloud clients)
- Other services (composition patterns)
- Configuration objects
- Testing mocks

## Usage Examples

### Authentication Service
```javascript
import authService from '@/services/authService';

// Login user
const user = await authService.login(credentials);

// Check authentication status
const isAuthenticated = authService.isAuthenticated();

// Logout
await authService.logout();
```

### Calendar Services
```javascript
import calendarSynchronizationService from '@/services/calendarSynchronizationService';
import calendarEventGenerationService from '@/services/calendarEventGenerationService';

// Sync calendar data
await calendarSynchronizationService.syncAllEvents();

// Generate calendar events
const events = await calendarEventGenerationService.generateEventsForPeriod(startDate, endDate);
```

### Error Handling
```javascript
import errorHandlingService from '@/services/errorHandlingService';

try {
  await riskyOperation();
} catch (error) {
  errorHandlingService.handleError(error, 'ComponentName.operation');
  // Error is logged and user is notified appropriately
}
```

## Testing Standards

### Service Testing Patterns
```javascript
import ServiceName from '../ServiceName';
import { localClient } from '@/api/localClient';

// Mock dependencies
jest.mock('@/api/localClient');

describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs operation successfully', async () => {
    // Arrange
    const mockData = { id: 1, name: 'test' };
    localClient.operation.mockResolvedValue(mockData);

    // Act
    const result = await ServiceName.performOperation(mockData);

    // Assert
    expect(result).toEqual(mockData);
    expect(localClient.operation).toHaveBeenCalledWith(mockData);
  });

  it('handles errors appropriately', async () => {
    // Test error handling
    localClient.operation.mockRejectedValue(new Error('Test error'));
    
    await expect(ServiceName.performOperation({})).rejects.toThrow('Test error');
  });
});
```

## Development Guidelines

### Adding New Services
1. Identify the business domain and responsibility
2. Create service class with dependency injection
3. Implement consistent error handling
4. Write comprehensive unit tests
5. Document public API and usage examples

### Service Composition
- Services can depend on other services
- Use dependency injection for testability
- Avoid circular dependencies
- Keep service interfaces simple and focused

### Performance Considerations
- Cache expensive operations when appropriate
- Use batch operations for multiple data requests
- Implement proper error recovery mechanisms
- Monitor service performance in production