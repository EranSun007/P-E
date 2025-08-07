# AI-First Development Rule

## Core Principle
Optimize code organization and development practices for maximum AI tool effectiveness while maintaining high code quality and rapid iteration.

## Code Structure Guidelines

### File Size and Complexity
- Keep components under 150 lines for optimal AI comprehension
- Break large components into smaller, focused sub-components
- Separate business logic into custom hooks or services
- Use clear file and function naming that describes purpose

### AI-Friendly Patterns
```javascript
// Good: Clear, descriptive naming
const useProjectCapacityAnalysis = (projectId, timeframe) => {
  // Implementation
}

// Good: Small, focused components
const ProjectStatusIndicator = ({ project, showDetails = false }) => {
  // Component logic under 150 lines
}

// Good: Comprehensive JSDoc for AI context
/**
 * Calculates team capacity based on current assignments and availability
 * @param {Array} teamMembers - Array of team member objects
 * @param {string} timeframe - Time period for capacity calculation
 * @returns {Object} Capacity analysis with utilization metrics
 */
const calculateTeamCapacity = (teamMembers, timeframe) => {
  // Implementation
}
```

### Documentation Standards
- Add comprehensive JSDoc comments for all functions
- Include usage examples in component documentation
- Document complex business logic with inline comments
- Maintain README files for each major directory

## AI-Assisted Development Workflow

### Code Generation
- Use AI for boilerplate component generation
- Generate comprehensive test cases with AI assistance
- Create form validation schemas using AI suggestions
- Generate TypeScript interfaces and types

### Code Review Process
```javascript
// Before committing, use AI to review:
// 1. Code quality and best practices
// 2. Potential bugs and edge cases
// 3. Performance optimization opportunities
// 4. Accessibility and UX improvements
```

### Test Generation
- Generate unit tests for all business logic
- Create integration tests for people-project workflows
- Use AI to identify edge cases and error scenarios
- Generate mock data for comprehensive testing

## AI Tool Integration

### Development Environment
- Configure IDE with AI coding assistants
- Use AI for code completion and suggestions
- Leverage AI for refactoring and optimization
- Employ AI for documentation generation

### Quality Assurance
- AI-assisted code review before commits
- Automated pattern consistency checking
- AI-generated test case validation
- Performance optimization suggestions

## Best Practices

### Naming Conventions
```javascript
// Use descriptive, searchable names
const useOneOnOneMeetingPreparation = () => {} // Good
const useMtgPrep = () => {} // Bad

// Clear component hierarchy
const ProjectManagement = () => {}
const ProjectManagementHeader = () => {}
const ProjectManagementTaskList = () => {}
```

### Code Organization
- Group related functionality in logical directories
- Use index files for clean imports
- Separate concerns (UI, business logic, data)
- Maintain consistent file structure across features

### Error Handling
```javascript
// AI-friendly error handling patterns
const handleProjectCreation = async (projectData) => {
  try {
    const validatedData = await validateProjectData(projectData)
    const result = await projectService.create(validatedData)
    return { success: true, data: result }
  } catch (error) {
    logger.error('Project creation failed', { error, projectData })
    return { success: false, error: error.message }
  }
}
```

## Quality Metrics

### Code Quality Indicators
- [ ] All functions have descriptive names
- [ ] Components are under 150 lines
- [ ] Business logic is separated from UI
- [ ] Comprehensive JSDoc documentation
- [ ] AI-generated tests cover edge cases

### AI Effectiveness Metrics
- [ ] AI suggestions are relevant and helpful
- [ ] Generated code follows project patterns
- [ ] AI-assisted refactoring improves code quality
- [ ] Documentation is AI-readable and comprehensive

## Anti-Patterns to Avoid
- Overly complex components that confuse AI tools
- Unclear naming that requires context to understand
- Missing documentation for complex business logic
- Ignoring AI suggestions without consideration
- Over-relying on AI without code review
