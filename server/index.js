import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config({ path: '.env.development' });

// Import routes
import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import stakeholdersRouter from './routes/stakeholders.js';
import teamMembersRouter from './routes/teamMembers.js';
import oneOnOnesRouter from './routes/oneOnOnes.js';
import meetingsRouter from './routes/meetings.js';
import calendarEventsRouter from './routes/calendarEvents.js';
import notificationsRouter from './routes/notifications.js';
import remindersRouter from './routes/reminders.js';
import commentsRouter from './routes/comments.js';
import taskAttributesRouter from './routes/taskAttributes.js';
import workItemsRouter from './routes/workItems.js';
import developerGoalsRouter from './routes/developerGoals.js';
import performanceEvaluationsRouter from './routes/performanceEvaluations.js';
import backupRouter from './routes/backup.js';
import usersRouter from './routes/users.js';
import peersRouter from './routes/peers.js';
import devopsDutiesRouter from './routes/devopsDuties.js';
import dutyScheduleRouter from './routes/dutySchedule.js';
import timeOffRouter from './routes/timeOff.js';
import userSettingsRouter from './routes/userSettings.js';
import githubRouter from './routes/github.js';
import aiRouter from './routes/ai.js';
import jiraRouter from './routes/jira.js';
import knowledgeRouter from './routes/knowledge.js';
import metricsRouter from './routes/metrics.js';
import captureRulesRouter from './routes/captureRules.js';
import captureInboxRouter from './routes/captureInbox.js';
import entityMappingsRouter from './routes/entityMappings.js';
import bugsRouter from './routes/bugs.js';
import emailPreferencesRouter from './routes/emailPreferences.js';
import syncRouter from './routes/sync.js';
import teamSummariesRouter from './routes/teamSummaries.js';
import menuConfigRouter from './routes/menuConfig.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration with debugging
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com',
      process.env.FRONTEND_URL
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('🔧 CORS Configuration:', {
  nodeEnv: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
  allowedOrigins: allowedOrigins
});

// Handle preflight OPTIONS requests explicitly FIRST
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.status(204).end();
});

// CORS middleware for actual requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Migration endpoint - runs migrations via HTTP (useful when cf run-task fails)
app.post('/api/admin/migrate', async (req, res) => {
  try {
    const { runMigrations } = await import('./db/migrate.js');
    console.log('Starting HTTP-triggered migration...');
    const result = await runMigrations(false); // false = don't exit process
    res.json({ status: 'ok', message: 'Migrations completed successfully', ...result });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', message: error.message });
  }
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/stakeholders', stakeholdersRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/one-on-ones', oneOnOnesRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/calendar-events', calendarEventsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/task-attributes', taskAttributesRouter);
app.use('/api/work-items', workItemsRouter);
app.use('/api/developer-goals', developerGoalsRouter);
app.use('/api/performance-evaluations', performanceEvaluationsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/users', usersRouter);
app.use('/api/peers', peersRouter);
app.use('/api/devops-duties', devopsDutiesRouter);
app.use('/api/duty-schedule', dutyScheduleRouter);
app.use('/api/time-off', timeOffRouter);
app.use('/api/user-settings', userSettingsRouter);
app.use('/api/github', githubRouter);
app.use('/api/ai', aiRouter);
app.use('/api/jira-issues', jiraRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/capture-rules', captureRulesRouter);
app.use('/api/capture-inbox', captureInboxRouter);
app.use('/api/entity-mappings', entityMappingsRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/email-preferences', emailPreferencesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/team-summaries', teamSummariesRouter);
app.use('/api/menu-config', menuConfigRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
