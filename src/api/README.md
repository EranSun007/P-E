# API Layer

This directory contains the data access layer and API clients for P&E Manager. It provides a clean abstraction between the UI components and data storage.

## Files Overview

### Core Files
- **`localClient.js`** - Primary data access layer using browser localStorage
- **`entities.js`** - Entity definitions, validation helpers, and data models
- **`integrations.js`** - External service integrations and API connections

### Legacy Files
- **`base44Client.js`** - Legacy Base44 SDK client (deprecated, kept for reference)

### Specialized Files
- **`oneOnOneAgenda.js`** - Specialized API functions for agenda management
- **`schemas/`** - Data validation schemas using Zod

## Architecture

### Data Storage Strategy
Currently using browser localStorage for rapid development iteration. The system is designed with a migration-ready architecture for future cloud database integration.

### Entity Management
All data entities are defined in `entities.js` with:
- Consistent ID generation
- Validation helpers
- CRUD operation patterns
- Data migration support

### API Patterns
- **Consistent interface**: All API functions return promises
- **Error handling**: Standardized error responses
- **Data validation**: Input validation using Zod schemas
- **Migration support**: Built-in versioning for data evolution

## Usage Examples

```javascript
// Import the main client
import { localClient } from '@/api/localClient';

// Basic CRUD operations
const tasks = await localClient.getTasks();
const newTask = await localClient.createTask(taskData);
const updated = await localClient.updateTask(id, updates);
await localClient.deleteTask(id);

// Entity helpers
import { createTask, validateTaskData } from '@/api/entities';
const task = createTask({ title: 'New Task', priority: 'high' });
```

## Testing
- **Integration tests**: Test complete data workflows
- **Entity validation**: Test data model constraints
- **Migration tests**: Ensure data evolution works correctly

## Future Migration
The API layer is designed to support future migration to:
- PostgreSQL/SAP HANA Cloud for production data storage
- Real-time synchronization capabilities
- Multi-user data access patterns