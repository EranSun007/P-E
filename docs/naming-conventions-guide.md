# Naming Conventions and File Organization Standards

This document establishes the naming conventions and file organization standards for P&E Manager, ensuring consistency across the codebase.

## File Naming Conventions

### Components
**Pattern**: PascalCase with `.jsx` extension
```
✅ TaskCard.jsx
✅ DutyForm.jsx
✅ CalendarEventDialog.jsx
✅ TeamMemberProfile.jsx

❌ taskCard.jsx
❌ duty-form.jsx
❌ calendar_event_dialog.jsx
❌ TeamMemberProfile.js
```

### Utilities and Services
**Pattern**: camelCase with `.js` extension
```
✅ calendarService.js
✅ authUtils.js
✅ dutyValidation.js
✅ errorHandlingService.js

❌ CalendarService.js
❌ auth-utils.js
❌ duty_validation.js
❌ ErrorHandlingService.js
```

### Test Files
**Pattern**: `ComponentName.test.jsx` or `utilityName.test.js`
```
✅ TaskCard.test.jsx
✅ calendarService.test.js
✅ DutyForm.integration.test.jsx
✅ authUtils.test.js

❌ TaskCard.spec.jsx
❌ test-calendar-service.js
❌ DutyForm.enhanced.test.jsx
❌ auth-utils.test.js
```

### Constants and Configuration
**Pattern**: UPPER_SNAKE_CASE or camelCase for files
```
✅ API_ENDPOINTS
✅ TASK_STATUS
✅ DEFAULT_CONFIG
✅ config.js
✅ constants.js

❌ apiEndpoints
❌ taskStatus
❌ defaultConfig
❌ Config.js
❌ CONSTANTS.js
```

### Directories
**Pattern**: camelCase or kebab-case (consistent within project)
```
✅ components/
✅ services/
✅ utils/
✅ __tests__/
✅ api/

❌ Components/
❌ Services/
❌ Utils/
❌ Tests/
❌ API/
```

## Directory Organization Standards

### Feature-Based Organization
Organize code by business domain rather than technical type:

```
src/components/
├── ui/                 # Base UI components
├── auth/              # Authentication features
├── calendar/          # Calendar features
├── duty/              # Duty management
├── task/              # Task management
└── team/              # Team management
```

### Co-located Tests
Place tests close to the code they test:

```
src/components/task/
├── __tests__/
│   ├── TaskCard.test.jsx
│   ├── TaskForm.test.jsx
│   └── TaskList.test.jsx
├── TaskCard.jsx
├── TaskForm.jsx
└── TaskList.jsx
```

### Service Layer Organization
Group services by business domain:

```
src/services/
├── authService.js
├── calendarSynchronizationService.js
├── dutyRotationService.js
├── employeeGoalsService.js
└── __tests__/
    ├── authService.test.js
    └── dutyRotationService.test.js
```

## Import Conventions

### Import Order
1. React imports
2. Third-party library imports
3. Internal imports (using @/ alias)
4. Relative imports
5. CSS/style imports

```javascript
// ✅ Correct import order
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { validateTask } from './utils';
import './TaskCard.css';

// ❌ Incorrect import order
import './TaskCard.css';
import { validateTask } from './utils';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
```

### Path Aliases
Use the `@/` alias for src imports:

```javascript
// ✅ Use path alias
import { Button } from '@/components/ui/button';
import { localClient } from '@/api/localClient';
import { formatDate } from '@/utils/calendarService';

// ❌ Avoid relative paths for src imports
import { Button } from '../../../components/ui/button';
import { localClient } from '../../api/localClient';
import { formatDate } from '../utils/calendarService';
```

### Named vs Default Exports
- **Default exports**: For main component/service/utility
- **Named exports**: For helper functions and utilities

```javascript
// ✅ Component with default export
export default function TaskCard({ task }) {
  // Component implementation
}

// ✅ Named exports for utilities
export const validateTask = (task) => {
  // Validation logic
};

export const formatTaskTitle = (title) => {
  // Formatting logic
};
```

## Variable and Function Naming

### Variables
**Pattern**: camelCase
```javascript
// ✅ Correct variable naming
const taskList = [];
const isAuthenticated = false;
const userProfile = {};
const currentDate = new Date();

// ❌ Incorrect variable naming
const TaskList = [];
const is_authenticated = false;
const user_profile = {};
const current_date = new Date();
```

### Functions
**Pattern**: camelCase with descriptive verbs
```javascript
// ✅ Correct function naming
function createTask(data) { }
function validateUserInput(input) { }
function handleFormSubmit(event) { }
function getUserById(id) { }

// ❌ Incorrect function naming
function CreateTask(data) { }
function validate_user_input(input) { }
function HandleFormSubmit(event) { }
function get_user_by_id(id) { }
```

### React Component Props
**Pattern**: camelCase
```javascript
// ✅ Correct prop naming
function TaskCard({ 
  taskData, 
  onTaskUpdate, 
  isEditable, 
  showActions 
}) {
  // Component implementation
}

// ❌ Incorrect prop naming
function TaskCard({ 
  task_data, 
  OnTaskUpdate, 
  is_editable, 
  show_actions 
}) {
  // Component implementation
}
```

### Event Handlers
**Pattern**: `handle` + `Action` + `Target` (optional)
```javascript
// ✅ Correct event handler naming
const handleSubmit = () => { };
const handleTaskDelete = () => { };
const handleFormChange = () => { };
const handleButtonClick = () => { };

// ❌ Incorrect event handler naming
const onSubmit = () => { };
const deleteTask = () => { };
const formChange = () => { };
const clickButton = () => { };
```

## CSS and Styling Conventions

### TailwindCSS Classes
**Pattern**: Use semantic class names and group related classes
```javascript
// ✅ Well-organized Tailwind classes
<div className="
  flex items-center justify-between
  p-4 mb-4
  bg-white border border-gray-200 rounded-lg
  hover:shadow-md transition-shadow
">

// ❌ Disorganized classes
<div className="flex bg-white p-4 hover:shadow-md items-center border-gray-200 mb-4 justify-between border rounded-lg transition-shadow">
```

### Custom CSS Classes
**Pattern**: kebab-case with BEM methodology when needed
```css
/* ✅ Correct CSS class naming */
.task-card { }
.task-card__header { }
.task-card__content { }
.task-card--highlighted { }

/* ❌ Incorrect CSS class naming */
.TaskCard { }
.task_card_header { }
.taskCardContent { }
.taskCardHighlighted { }
```

## API and Data Naming

### API Endpoints
**Pattern**: RESTful conventions with kebab-case
```javascript
// ✅ Correct API naming
GET /api/tasks
POST /api/tasks
PUT /api/tasks/:id
DELETE /api/tasks/:id
GET /api/team-members
POST /api/duty-assignments

// ❌ Incorrect API naming
GET /api/getTasks
POST /api/createTask
PUT /api/updateTask
DELETE /api/removeTask
GET /api/teamMembers
POST /api/dutyAssignments
```

### Database/Storage Keys
**Pattern**: camelCase for consistency with JavaScript
```javascript
// ✅ Correct storage key naming
const STORAGE_KEYS = {
  tasks: 'tasks',
  userProfile: 'userProfile',
  teamMembers: 'teamMembers',
  dutyAssignments: 'dutyAssignments'
};

// ❌ Incorrect storage key naming
const STORAGE_KEYS = {
  Tasks: 'Tasks',
  user_profile: 'user_profile',
  'team-members': 'team-members',
  DutyAssignments: 'DutyAssignments'
};
```

## Documentation Standards

### README Files
**Pattern**: `README.md` in each major directory
- Purpose and overview
- File/component descriptions
- Usage examples
- Development guidelines

### Code Comments
**Pattern**: JSDoc-style for functions, inline for complex logic
```javascript
/**
 * Validates task data according to business rules
 * @param {Object} task - The task object to validate
 * @param {string} task.title - Task title (required)
 * @param {string} task.priority - Task priority level
 * @returns {Object} Validation result with isValid and errors
 */
function validateTask(task) {
  // Complex validation logic here
  const errors = [];
  
  // Check required fields
  if (!task.title?.trim()) {
    errors.push('Title is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Enforcement

### Automated Tools
- **ESLint**: Enforces naming conventions and code style
- **Prettier**: Consistent code formatting
- **Git hooks**: Pre-commit validation

### Code Review Guidelines
- Verify naming conventions are followed
- Check import organization
- Ensure proper file organization
- Validate documentation standards

### Migration Strategy
When updating existing code:
1. Update file names to match conventions
2. Fix import statements
3. Update variable and function names
4. Add proper documentation
5. Update tests to match new naming

## Examples

### Complete Component Example
```javascript
// src/components/task/TaskCard.jsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { validateTask, formatTaskPriority } from './utils';

/**
 * TaskCard component displays individual task information
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {Function} props.onTaskUpdate - Callback for task updates
 * @param {boolean} props.isEditable - Whether task can be edited
 */
export default function TaskCard({ 
  task, 
  onTaskUpdate, 
  isEditable = true 
}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleTaskComplete = async () => {
    setIsLoading(true);
    try {
      await onTaskUpdate(task.id, { completed: true });
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDueDate = task.dueDate 
    ? format(new Date(task.dueDate), 'MMM dd, yyyy')
    : 'No due date';

  return (
    <Card className="task-card">
      <CardHeader>
        <h3 className="text-lg font-semibold">{task.title}</h3>
        <span className="text-sm text-gray-500">
          {formatTaskPriority(task.priority)}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{task.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{formattedDueDate}</span>
          {isEditable && (
            <Button 
              onClick={handleTaskComplete}
              disabled={isLoading}
              className="ml-2"
            >
              {isLoading ? 'Completing...' : 'Complete'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Named exports for utilities
export const formatTaskPriority = (priority) => {
  const priorityMap = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority'
  };
  return priorityMap[priority] || 'Unknown Priority';
};
```

This comprehensive naming convention guide ensures consistency across the P&E Manager codebase and provides clear guidelines for all developers.