# Zod Schema Validation Rule

## Core Principle
All forms and data operations must use Zod schemas for validation. Maintain centralized schemas for consistent data integrity and error handling across the P&E Manager application.

## Schema Organization

### Centralized Schema Structure
```javascript
// schemas/entities.js
export const personSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["developer", "manager", "designer", "qa"]),
  projects: z.array(z.string().uuid()).default([]),
  goals: z.array(z.string().uuid()).default([])
})

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  budget: z.number().positive("Budget must be positive"),
  deadline: z.date().min(new Date(), "Deadline must be in future"),
  team: z.array(z.string().uuid()).min(1, "At least one team member required"),
  stakeholders: z.array(z.string().uuid()).default([]),
  status: z.enum(["planning", "active", "on-hold", "completed"])
})

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assignee: z.string().uuid("Assignee is required"),
  project: z.string().uuid("Project is required"),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["todo", "in-progress", "review", "done"]).default("todo"),
  estimatedHours: z.number().positive().optional()
})
```

### Form-Specific Schemas
```javascript
// schemas/forms.js
export const createProjectFormSchema = projectSchema.omit({ id: true })

export const updateProjectFormSchema = projectSchema.partial().required({ id: true })

export const oneOnOneFormSchema = z.object({
  id: z.string().uuid().optional(),
  personId: z.string().uuid("Team member is required"),
  date: z.date("Meeting date is required"),
  agenda: z.array(z.string()).min(1, "At least one agenda item required"),
  notes: z.string().optional(),
  goals: z.array(z.string().uuid()).default([]),
  projects: z.array(z.string().uuid()).default([]),
  actionItems: z.array(z.object({
    description: z.string().min(1, "Action item description required"),
    dueDate: z.date().optional(),
    completed: z.boolean().default(false)
  })).default([])
})
```

## Integration with React Hook Form

### Form Setup Pattern
```javascript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema } from '../schemas/entities'

const ProjectForm = ({ onSubmit, initialData }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData || {}
  })

  const onFormSubmit = async (data) => {
    const result = await onSubmit(data)
    if (!result.success) {
      // Handle server-side validation errors
      setError('root', { message: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <input
        {...register('name')}
        placeholder="Project name"
        className={errors.name ? 'border-red-500' : ''}
      />
      {errors.name && (
        <span className="text-red-500 text-sm">{errors.name.message}</span>
      )}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Project'}
      </button>
    </form>
  )
}
```

## Service Layer Integration

### Validation in Services
```javascript
// services/projectService.js
import { projectSchema, updateProjectFormSchema } from '../schemas/entities'

export const projectService = {
  async create(projectData) {
    try {
      // Validate input data
      const validation = projectSchema.safeParse({
        ...projectData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      })

      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
