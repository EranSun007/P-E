import express from 'express';
import MCPService from '../services/MCPService.js';
import TeamSummaryService from '../services/TeamSummaryService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ============================================
// Code Search
// ============================================

/**
 * POST /search/code - Semantic code search
 * Body: { query, limit, threshold, repoName, language, artifactType, ownership }
 */
router.post('/search/code', async (req, res) => {
  try {
    const { query, limit, threshold, repoName, language, artifactType, ownership } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await MCPService.searchCode({
      query,
      limit: limit || 10,
      threshold,
      repoName,
      language,
      artifactType,
      ownership
    });

    res.json(results);
  } catch (error) {
    console.error('POST /api/knowledge/search/code error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Documentation Search
// ============================================

/**
 * POST /search/docs - Documentation search
 * Body: { query, limit, threshold, domain, category }
 */
router.post('/search/docs', async (req, res) => {
  try {
    const { query, limit, threshold, domain, category } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await MCPService.searchDocs({
      query,
      limit: limit || 10,
      threshold,
      domain,
      category
    });

    res.json(results);
  } catch (error) {
    console.error('POST /api/knowledge/search/docs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Insight Storage
// ============================================

/**
 * POST /insights - Store a learning
 * Body: { insight, category, tags, relatedFiles }
 */
router.post('/insights', async (req, res) => {
  try {
    const { insight, category, tags, relatedFiles } = req.body;

    if (!insight) {
      return res.status(400).json({ error: 'Insight is required' });
    }

    const result = await MCPService.storeInsight({
      insight,
      category,
      tags,
      relatedFiles
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('POST /api/knowledge/insights error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /insights - Retrieve team summaries from PostgreSQL
 * Query: { startDate, endDate, teamDepartment, limit }
 *
 * NOTE: This endpoint was changed from MCP semantic search to PostgreSQL team_summaries
 * to provide structured data matching UI component expectations (MetricsBanner, MemberCard).
 * The frontend (TeamStatusContext.jsx) calls this via apiClient.knowledge.searchInsights()
 * and expects structured summary objects with completedCount, blockerCount, items[], etc.
 */
router.get('/insights', async (req, res) => {
  try {
    const { startDate, endDate, teamDepartment, limit } = req.query;

    // Validate dates if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return res.status(400).json({ error: 'Invalid startDate format' });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({ error: 'Invalid endDate format' });
    }

    // Read from PostgreSQL team_summaries table (REPLACES MCPService.getInsights)
    const summaryService = new TeamSummaryService();
    const summaries = await summaryService.list(req.user.id, {
      teamDepartment,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({ summaries, total: summaries.length });
  } catch (error) {
    console.error('GET /api/knowledge/insights error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Repository Statistics
// ============================================

/**
 * GET /stats - Repository statistics
 * Query: { repoName, statsType }
 */
router.get('/stats', async (req, res) => {
  try {
    const { repoName, statsType } = req.query;

    const stats = await MCPService.getStats({
      repoName,
      statsType: statsType || 'overall'
    });

    res.json(stats);
  } catch (error) {
    console.error('GET /api/knowledge/stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Health Check
// ============================================

/**
 * GET /health - MCP server health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await MCPService.getHealth();
    res.json(health);
  } catch (error) {
    console.error('GET /api/knowledge/health error:', error);
    res.status(500).json({ error: error.message, healthy: false });
  }
});

export default router;
