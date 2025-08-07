import { z } from 'zod';

/**
 * Schema for task extraction from natural language input
 * Used to validate AI responses when processing task creation
 */
export const taskExtractionSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  type: z.enum(['meeting', 'metric', 'action', 'generic']).default('generic'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(), // ISO date string
  stakeholders: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  strategic: z.boolean().default(false),
  metadata: z.object({
    meeting: z.object({
      participants: z.array(z.string()).default([]),
      agenda: z.array(z.string()).default([]),
      location: z.string().optional()
    }).optional(),
    metric: z.object({
      kpi_name: z.string().optional(),
      current_value: z.string().optional(),
      target_value: z.string().optional(),
      measurement_frequency: z.string().optional()
    }).optional(),
    action: z.object({
      outcome: z.string().optional(),
      dependencies: z.array(z.string()).default([])
    }).optional()
  }).optional()
});

/**
 * Schema for project risk analysis results
 * Used to validate AI responses from project analysis
 */
export const projectAnalysisSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  keyRisks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    probability: z.enum(['low', 'medium', 'high']),
    mitigation: z.string().optional()
  })),
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high']),
    action: z.string(),
    rationale: z.string(),
    estimatedImpact: z.string(),
    timeframe: z.string().optional()
  })),
  timelinePredictions: z.object({
    estimatedCompletion: z.string(), // ISO date string
    confidenceLevel: z.number().min(0).max(100),
    potentialDelays: z.array(z.string()),
    criticalPath: z.array(z.string()).optional()
  }),
  resourceAnalysis: z.object({
    currentUtilization: z.number().min(0).max(100).optional(),
    recommendedAdjustments: z.array(z.string()).default([]),
    skillGaps: z.array(z.string()).default([])
  }).optional(),
  summary: z.string()
});

/**
 * Schema for available AI models configuration
 */
export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  maxTokens: z.number().optional(),
  costPerToken: z.number().optional(),
  responseTime: z.string().optional(), // e.g., "fast", "medium", "slow"
  isAvailable: z.boolean().default(true)
});

/**
 * Schema for AI service configuration
 */
export const aiConfigSchema = z.object({
  selectedModel: z.string().default('claude-4-sonnet'),
  enableCaching: z.boolean().default(true),
  cacheTimeout: z.number().default(3600), // seconds
  maxRetries: z.number().min(0).max(5).default(3),
  timeout: z.number().min(1000).max(30000).default(10000), // milliseconds
  enableFallback: z.boolean().default(true),
  fallbackModel: z.string().optional()
});

/**
 * Schema for AI service response wrapper
 */
export const aiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  model: z.string().optional(),
  tokens: z.number().optional(),
  responseTime: z.number().optional(), // milliseconds
  cached: z.boolean().default(false)
});

/**
 * Schema for AI service health check
 */
export const aiHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  models: z.array(z.object({
    id: z.string(),
    status: z.enum(['available', 'unavailable', 'limited']),
    responseTime: z.number().optional(),
    lastChecked: z.string() // ISO date string
  })),
  lastUpdated: z.string() // ISO date string
});

/**
 * Schema for task suggestions based on goals
 */
export const taskSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    estimatedHours: z.number().optional(),
    relatedGoals: z.array(z.string()),
    rationale: z.string()
  })),
  confidence: z.number().min(0).max(100),
  basedOn: z.array(z.string()) // goal IDs or other context
});

/**
 * Schema for smart stakeholder suggestions
 */
export const stakeholderSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    role: z.string(),
    relevance: z.enum(['high', 'medium', 'low']),
    reason: z.string()
  })),
  confidence: z.number().min(0).max(100)
});

// Export all schemas for easy importing
export const aiSchemas = {
  taskExtraction: taskExtractionSchema,
  projectAnalysis: projectAnalysisSchema,
  aiModel: aiModelSchema,
  aiConfig: aiConfigSchema,
  aiResponse: aiResponseSchema,
  aiHealth: aiHealthSchema,
  taskSuggestion: taskSuggestionSchema,
  stakeholderSuggestion: stakeholderSuggestionSchema
};
