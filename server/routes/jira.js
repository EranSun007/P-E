import express from 'express';
import JiraService from '../services/JiraService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// Issue Sync Operations (API-01)
// ============================================

/**
 * POST /api/jira-issues/sync
 * Sync batch of Jira issues from extension
 * Body: { issues: Array<IssueData> }
 * Returns: { created, updated, total }
 */
router.post('/sync', async (req, res) => {
  try {
    const { issues } = req.body;

    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'issues array is required'
      });
    }

    if (issues.length === 0) {
      return res.json({ created: 0, updated: 0, total: 0 });
    }

    // Validate each issue has required fields
    for (const issue of issues) {
      if (!issue.issue_key) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Each issue must have an issue_key'
        });
      }
    }

    const result = await JiraService.syncIssues(req.user.id, issues);
    res.json(result);
  } catch (error) {
    console.error('POST /api/jira-issues/sync error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Issue CRUD Operations (API-02)
// ============================================

/**
 * GET /api/jira-issues
 * List all synced Jira issues with optional filtering
 * Query params: status, assignee_id, sprint_name
 */
router.get('/', async (req, res) => {
  try {
    const { status, assignee_id, sprint_name } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (assignee_id) filters.assignee_id = assignee_id;
    if (sprint_name) filters.sprint_name = sprint_name;

    const issues = await JiraService.listIssues(req.user.id, filters);
    res.json(issues);
  } catch (error) {
    console.error('GET /api/jira-issues error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/jira-issues/filters
 * Get unique filter options for UI dropdowns
 * Returns: { statuses: [], assignees: [], sprints: [] }
 */
router.get('/filters', async (req, res) => {
  try {
    const filterOptions = await JiraService.getFilterOptions(req.user.id);
    res.json(filterOptions);
  } catch (error) {
    console.error('GET /api/jira-issues/filters error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/jira-issues/status
 * Get sync status (last sync time, issue count)
 */
router.get('/status', async (req, res) => {
  try {
    const status = await JiraService.getSyncStatus(req.user.id);
    res.json(status);
  } catch (error) {
    console.error('GET /api/jira-issues/status error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/jira-issues/workload
 * Get team workload summary (grouped by assignee)
 */
router.get('/workload', async (req, res) => {
  try {
    const workload = await JiraService.getTeamWorkload(req.user.id);
    res.json(workload);
  } catch (error) {
    console.error('GET /api/jira-issues/workload error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/jira-issues/unmapped
 * Get Jira assignees without team member mappings
 */
router.get('/unmapped', async (req, res) => {
  try {
    const unmapped = await JiraService.getUnmappedAssignees(req.user.id);
    res.json(unmapped);
  } catch (error) {
    console.error('GET /api/jira-issues/unmapped error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Team Member Mapping Operations (API-03)
// Note: Place BEFORE /:id to avoid route conflicts
// ============================================

/**
 * GET /api/jira-issues/mappings
 * List all Jira-to-team-member mappings
 */
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await JiraService.listMappings(req.user.id);
    res.json(mappings);
  } catch (error) {
    console.error('GET /api/jira-issues/mappings error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/jira-issues/mappings
 * Create or update a Jira-to-team-member mapping
 * Body: { jira_assignee_id, jira_assignee_name, team_member_id }
 */
router.post('/mappings', async (req, res) => {
  try {
    const { jira_assignee_id, jira_assignee_name, team_member_id } = req.body;

    if (!jira_assignee_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'jira_assignee_id is required'
      });
    }

    if (!team_member_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'team_member_id is required'
      });
    }

    const mapping = await JiraService.createMapping(
      req.user.id,
      jira_assignee_id,
      jira_assignee_name || null,
      team_member_id
    );

    res.status(201).json(mapping);
  } catch (error) {
    console.error('POST /api/jira-issues/mappings error:', error);

    // Handle foreign key violation (invalid team_member_id)
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid team_member_id - team member does not exist'
      });
    }

    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * DELETE /api/jira-issues/mappings/:id
 * Delete a Jira-to-team-member mapping
 */
router.delete('/mappings/:id', async (req, res) => {
  try {
    const deleted = await JiraService.deleteMapping(req.user.id, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Mapping not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/jira-issues/mappings/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Single Issue Operations
// Note: Place AFTER specific routes to avoid conflicts
// ============================================

/**
 * GET /api/jira-issues/:id
 * Get a single Jira issue by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const issue = await JiraService.getIssue(req.user.id, req.params.id);

    if (!issue) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Issue not found'
      });
    }

    res.json(issue);
  } catch (error) {
    console.error(`GET /api/jira-issues/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * DELETE /api/jira-issues/:id
 * Delete a single Jira issue
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await JiraService.deleteIssue(req.user.id, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Issue not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/jira-issues/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * DELETE /api/jira-issues
 * Delete all Jira issues for current user (for re-sync)
 */
router.delete('/', async (req, res) => {
  try {
    const count = await JiraService.deleteAllIssues(req.user.id);
    res.json({ deleted: count });
  } catch (error) {
    console.error('DELETE /api/jira-issues error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
