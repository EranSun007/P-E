import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration with debugging
const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || 'https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com'
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('🔧 CORS Configuration:', {
  nodeEnv: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
  corsOrigin: corsOrigin
});

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
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
