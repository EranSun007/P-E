import express from 'express';
import GitHubService from '../services/GitHubService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ============================================
// Repository Management
// ============================================

// List all tracked repos with summary
router.get('/repos', async (req, res) => {
  try {
    const summary = await GitHubService.getReposSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    console.error('GET /api/github/repos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a repository to track
router.post('/repos', async (req, res) => {
  try {
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Repository full_name is required (e.g., owner/repo)' });
    }

    const repo = await GitHubService.addRepo(req.user.id, full_name);
    res.status(201).json(repo);
  } catch (error) {
    console.error('POST /api/github/repos error:', error);
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Search for repos on GitHub
router.get('/repos/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const results = await GitHubService.searchRepos(req.user.id, q);
    res.json(results);
  } catch (error) {
    console.error('GET /api/github/repos/search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single repo
router.get('/repos/:id', async (req, res) => {
  try {
    const repo = await GitHubService.getRepo(req.user.id, req.params.id);
    res.json(repo);
  } catch (error) {
    console.error(`GET /api/github/repos/${req.params.id} error:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Remove a tracked repo
router.delete('/repos/:id', async (req, res) => {
  try {
    await GitHubService.removeRepo(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/github/repos/${req.params.id} error:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Link repo to a project
router.put('/repos/:id/link', async (req, res) => {
  try {
    const { project_id } = req.body;
    const repo = await GitHubService.linkToProject(req.user.id, req.params.id, project_id);
    res.json(repo);
  } catch (error) {
    console.error(`PUT /api/github/repos/${req.params.id}/link error:`, error);
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// ============================================
// Sync Operations
// ============================================

// Sync a single repo
router.post('/repos/:id/sync', async (req, res) => {
  try {
    const repo = await GitHubService.syncRepo(req.user.id, req.params.id);
    res.json(repo);
  } catch (error) {
    console.error(`POST /api/github/repos/${req.params.id}/sync error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Sync all repos
router.post('/sync', async (req, res) => {
  try {
    const results = await GitHubService.syncAllRepos(req.user.id);
    res.json(results);
  } catch (error) {
    console.error('POST /api/github/sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Repository Data
// ============================================

// Get pull requests for a repo
router.get('/repos/:id/pulls', async (req, res) => {
  try {
    const { state } = req.query;
    const pulls = await GitHubService.getPullRequests(req.user.id, req.params.id, state);
    res.json(pulls);
  } catch (error) {
    console.error(`GET /api/github/repos/${req.params.id}/pulls error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get issues for a repo
router.get('/repos/:id/issues', async (req, res) => {
  try {
    const { state } = req.query;
    const issues = await GitHubService.getIssues(req.user.id, req.params.id, state);
    res.json(issues);
  } catch (error) {
    console.error(`GET /api/github/repos/${req.params.id}/issues error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get commits for a repo
router.get('/repos/:id/commits', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const commits = await GitHubService.getCommits(req.user.id, req.params.id, limit);
    res.json(commits);
  } catch (error) {
    console.error(`GET /api/github/repos/${req.params.id}/commits error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
