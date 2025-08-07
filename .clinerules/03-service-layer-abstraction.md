# Service Layer Abstraction Rule

## Core Principle
All data operations must go through the service layer. Never access localStorage directly from components. Use the established pattern: Components → Hooks → Services → Storage.

## Architecture Pattern

### Layer Responsibilities
```javascript
// Components: UI and user interaction only
const ProjectList = () => {
  const { projects, loading, createProject } = useProjects()
  // Only UI logic here
}

// Hooks: React-specific state management
const useProjects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  
  const createProject = async (projectData) => {
    setLoading(true)
    const result = await projectService.create(projectData)
    if (result.success) {
      setProjects(prev => [...prev, result.data])
    }
    setLoading(false)
    return result
  }
  
  return { projects, loading, createProject }
}

// Services: Business logic and data operations
const projectService = {
  async create(projectData) {
    try {
      const validatedData = validateProject(projectData)
      const result = await storageService.save('projects', validatedData)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Storage: Data persistence abstraction
const storageService = {
  async save(collection, data) {
    // Current: localStorage implementation
    // Future: API calls to cloud backend
  }
}
```

## Service Implementation Guidelines

### Service Structure
```javascript
// Standard service pattern
const entityService = {
  // CRUD operations
  async create(data) { /* implementation */ },
  async read(id) { /* implementation */ },
  async update(id, updates) { /* implementation */ },
  async delete(id) { /* implementation */ },
  async list(filters = {}) { /* implementation */ },
  
  // Business logic operations
  async validateRelationships(data) { /* implementation */ },
  async calculateMetrics(id) { /* implementation */ },
  async generateReport(options) { /* implementation */ }
}
```

### Error Handling Pattern
```javascript
// Consistent error handling across services
const handleServiceOperation = async (operation, errorContext) => {
  try {
    const result = await operation()
    return { success: true, data: result }
  } catch (error) {
    logger.error(`Service operation failed: ${errorContext}`, error)
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }
  }
}
```

### Data Validation Integration
```javascript
// Integrate Zod validation in services
const projectService = {
  async create(projectData) {
    // Validate before processing
    const validation = projectSchema.safeParse(projectData)
    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.error.issues
      }
    }
    
    // Process validated data
    const result = await storageService.save('projects', validation.data)
    return { success: true, data: result }
  }
}
```

## Storage Abstraction

### Current Implementation (Local Storage)
```javascript
const localStorageAdapter = {
  async save(collection, data) {
    const existing = this.list(collection)
    const updated = [...existing, { ...data, id: generateId() }]
    localStorage.setItem(collection, JSON.stringify(updated))
    return data
  },
  
  async list(collection) {
    const data = localStorage.getItem(collection)
    return data ? JSON.parse(data) : []
  }
}
```

### Future Implementation (Cloud API)
```javascript
const apiStorageAdapter = {
  async save(collection, data) {
    const response = await fetch(`/api/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },
  
  async list(collection) {
    const response = await fetch(`/api/${collection}`)
    return response.json()
  }
}
```

## Migration Strategy

### Storage Adapter Pattern
```javascript
// Configurable storage backend
const storageService = {
  adapter: process.env.NODE_ENV === 'production' 
    ? apiStorageAdapter 
    : localStorageAdapter,
    
  async save(collection, data) {
    return this.adapter.save(collection, data)
  },
  
  async list(collection) {
    return this.adapter.list(collection)
  }
}
```

### Service Testing
```javascript
// Services can be tested independently
describe('ProjectService', () => {
  beforeEach(() => {
    // Mock storage adapter for testing
    storageService.adapter = mockStorageAdapter
  })
  
  it('should create project with proper validation', async () => {
    const projectData = { name: 'Test Project', budget: 10000 }
    const result = await projectService.create(projectData)
    
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Test Project')
  })
})
```

## Quality Checks

### Service Layer Validation
- [ ] No direct localStorage access in components
- [ ] All data operations go through services
- [ ] Services handle validation and business logic
- [ ] Consistent error handling across services
- [ ] Storage adapter abstraction implemented

### Future Migration Readiness
- [ ] Service interfaces are API-ready
- [ ] Data structures support serialization
- [ ] Error handling supports network failures
- [ ] Authentication hooks are prepared
- [ ] Caching strategy is planned

## Anti-Patterns to Avoid
- Direct localStorage access from components
- Business logic in React hooks
- Inconsistent error handling patterns
- Tight coupling between UI and storage
- Missing validation in service layer
- Hardcoded storage implementation details

## Benefits

### Development Benefits
- Clear separation of concerns
- Easy to test business logic
- Consistent data access patterns
- AI tools understand the structure better

### Migration Benefits
- Seamless transition to cloud storage
- No component changes required
- Gradual migration capability
- Rollback safety

### Maintenance Benefits
- Centralized business logic
- Consistent error handling
- Easy to add new features
- Clear debugging path
