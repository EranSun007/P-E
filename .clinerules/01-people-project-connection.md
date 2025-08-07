# People-Project Connection Rule

## Core Principle
Always maintain explicit relationships between people, projects, tasks, meetings, and goals. The unified data model is the foundation of the P&E Manager's value proposition.

## Implementation Guidelines

### Entity Relationships
- **Person**: Must link to projects, tasks, meetings, and goals
- **Project**: Must connect to team members, tasks, stakeholders, and meetings
- **Task**: Must reference assignee (person) and project
- **Meeting**: Must include attendees, related projects, and agenda items
- **OneOnOne**: Must connect to person, goals, projects, and notes

### Data Model Validation
```javascript
// Example: When creating a task
const task = {
  id: generateId(),
  title: "Implement user authentication",
  assignee: personId, // Required connection
  project: projectId, // Required connection
  dueDate: "2024-02-15",
  status: "in-progress"
}

// Validate relationships exist
await validatePersonExists(task.assignee)
await validateProjectExists(task.project)
```

### Context Building
- Before any meeting, gather related projects, previous discussions, and goal progress
- When updating project status, check impact on team member goals
- Link task completion to personal development objectives
- Connect stakeholder feedback to team member growth areas

### Reporting and Insights
- Enable cross-dimensional reporting (people × projects)
- Support capacity analysis based on current assignments
- Track goal progress across multiple projects
- Generate unified context for management decisions

## Quality Checks
- [ ] All entities have proper relationship fields
- [ ] Relationship validation is implemented
- [ ] Context queries work across entities
- [ ] Reports can aggregate people and project data
- [ ] Meeting preparation includes related context

## Anti-Patterns to Avoid
- Creating isolated entities without relationships
- Storing duplicate data instead of using references
- Breaking relationships during data updates
- Ignoring cascade effects of relationship changes
