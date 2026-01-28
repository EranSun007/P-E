import { query } from '../db/connection.js';
import UserSettingsService from './UserSettingsService.js';

// Support both public GitHub and GitHub Enterprise (e.g., SAP's github.tools.sap)
const GITHUB_CONFIGS = {
  public: {
    apiBase: 'https://api.github.com',
    webBase: 'https://github.com'
  },
  sap: {
    apiBase: 'https://github.tools.sap/api/v3',
    webBase: 'https://github.tools.sap'
  }
};

class GitHubService {
  /**
   * Get the API base URL for a user (checks which GitHub instance their token works with)
   */
  async _getApiBase(userId) {
    // Check if user has a saved GitHub instance preference
    const instance = await UserSettingsService.get(userId, 'github_instance');
    if (instance && GITHUB_CONFIGS[instance]) {
      return GITHUB_CONFIGS[instance].apiBase;
    }
    // Default to public GitHub
    return GITHUB_CONFIGS.public.apiBase;
  }

  /**
   * Make authenticated request to GitHub API
   */
  async _fetch(userId, endpoint, options = {}, apiBase = null) {
    const token = await UserSettingsService.getGitHubToken(userId);
    if (!token) {
      throw new Error('GitHub token not configured. Please add your Personal Access Token in Settings.');
    }

    const base = apiBase || await this._getApiBase(userId);
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate GitHub token by fetching user info
   * Tries both public GitHub and SAP GitHub Enterprise
   */
  async validateToken(userId) {
    // Try each GitHub instance until one works
    for (const [instanceName, config] of Object.entries(GITHUB_CONFIGS)) {
      try {
        const user = await this._fetch(userId, '/user', {}, config.apiBase);
        // Token works with this instance - save the preference
        await UserSettingsService.set(userId, 'github_instance', instanceName);
        return {
          valid: true,
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          instance: instanceName,
          instanceUrl: config.webBase
        };
      } catch (error) {
        // Try next instance
        continue;
      }
    }

    // None worked
    return {
      valid: false,
      error: 'Token not valid for GitHub.com or SAP GitHub Enterprise'
    };
  }

  // ============================================
  // Repository Management
  // ============================================

  /**
   * Add a repository to track
   */
  async addRepo(userId, repoFullName) {
    // Parse owner/repo format
    const [owner, name] = repoFullName.split('/');
    if (!owner || !name) {
      throw new Error('Invalid repository format. Use owner/repo (e.g., facebook/react)');
    }

    // Fetch repo info from GitHub
    const repoData = await this._fetch(userId, `/repos/${owner}/${name}`);

    // Insert into database
    const sql = `
      INSERT INTO github_repos (
        user_id, owner, name, full_name, description, html_url,
        default_branch, is_private, stars_count, forks_count, open_issues_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, full_name)
      DO UPDATE SET
        description = $5,
        html_url = $6,
        default_branch = $7,
        is_private = $8,
        stars_count = $9,
        forks_count = $10,
        open_issues_count = $11,
        updated_date = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      repoData.owner.login,
      repoData.name,
      repoData.full_name,
      repoData.description,
      repoData.html_url,
      repoData.default_branch,
      repoData.private,
      repoData.stargazers_count,
      repoData.forks_count,
      repoData.open_issues_count
    ]);

    // Sync the repo data after adding
    await this.syncRepo(userId, result.rows[0].id);

    return result.rows[0];
  }

  /**
   * List tracked repositories
   */
  async listRepos(userId) {
    const sql = `
      SELECT * FROM github_repos
      WHERE user_id = $1
      ORDER BY full_name
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Get a single repository with metrics
   */
  async getRepo(userId, repoId) {
    const sql = `
      SELECT * FROM github_repos
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [repoId, userId]);
    if (result.rows.length === 0) {
      throw new Error('Repository not found');
    }
    return result.rows[0];
  }

  /**
   * Remove a tracked repository
   */
  async removeRepo(userId, repoId) {
    const sql = 'DELETE FROM github_repos WHERE id = $1 AND user_id = $2';
    const result = await query(sql, [repoId, userId]);
    if (result.rowCount === 0) {
      throw new Error('Repository not found');
    }
    return true;
  }

  /**
   * Link a repo to a P&E project
   */
  async linkToProject(userId, repoId, projectId) {
    const sql = `
      UPDATE github_repos
      SET project_id = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await query(sql, [projectId, repoId, userId]);
    if (result.rows.length === 0) {
      throw new Error('Repository not found');
    }
    return result.rows[0];
  }

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Sync all data for a repository
   */
  async syncRepo(userId, repoId) {
    const repo = await this.getRepo(userId, repoId);
    const fullName = repo.full_name;

    try {
      // Sync in parallel where possible
      await Promise.all([
        this._syncRepoMetrics(userId, repoId, fullName),
        this._syncPullRequests(userId, repoId, fullName),
        this._syncIssues(userId, repoId, fullName),
        this._syncCommits(userId, repoId, fullName)
      ]);

      // Update last synced timestamp
      await query(
        'UPDATE github_repos SET last_synced_at = CURRENT_TIMESTAMP, sync_error = NULL WHERE id = $1',
        [repoId]
      );

      return this.getRepo(userId, repoId);
    } catch (error) {
      // Record sync error
      await query(
        'UPDATE github_repos SET sync_error = $1 WHERE id = $2',
        [error.message, repoId]
      );
      throw error;
    }
  }

  /**
   * Sync all repos for a user
   */
  async syncAllRepos(userId) {
    const repos = await this.listRepos(userId);
    const results = [];

    for (const repo of repos) {
      try {
        await this.syncRepo(userId, repo.id);
        results.push({ id: repo.id, full_name: repo.full_name, success: true });
      } catch (error) {
        results.push({ id: repo.id, full_name: repo.full_name, success: false, error: error.message });
      }
    }

    return results;
  }

  async _syncRepoMetrics(userId, repoId, fullName) {
    // Fetch fresh repo data
    const repoData = await this._fetch(userId, `/repos/${fullName}`);

    // Calculate additional metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get contributors count
    let contributorsCount = 0;
    try {
      const contributors = await this._fetch(userId, `/repos/${fullName}/contributors?per_page=1`);
      contributorsCount = Array.isArray(contributors) ? contributors.length : 0;
    } catch {
      // Contributors endpoint may fail for some repos
    }

    // Get open PRs count
    let openPRsCount = 0;
    try {
      const prs = await this._fetch(userId, `/repos/${fullName}/pulls?state=open&per_page=1`);
      openPRsCount = Array.isArray(prs) ? prs.length : 0;
    } catch {
      // Ignore
    }

    // Update repo record
    await query(`
      UPDATE github_repos SET
        description = $1,
        stars_count = $2,
        forks_count = $3,
        open_issues_count = $4,
        contributors_count = $5,
        open_prs_count = $6,
        is_private = $7
      WHERE id = $8
    `, [
      repoData.description,
      repoData.stargazers_count,
      repoData.forks_count,
      repoData.open_issues_count,
      contributorsCount,
      openPRsCount,
      repoData.private,
      repoId
    ]);
  }

  async _syncPullRequests(userId, repoId, fullName) {
    // Fetch recent PRs (last 50 in any state)
    const prs = await this._fetch(userId, `/repos/${fullName}/pulls?state=all&per_page=50&sort=updated&direction=desc`);

    // Clear old PRs and insert new ones
    await query('DELETE FROM github_pull_requests WHERE repo_id = $1', [repoId]);

    for (const pr of prs) {
      await query(`
        INSERT INTO github_pull_requests (
          repo_id, pr_number, title, state, author, author_avatar_url,
          html_url, created_at, updated_at, merged_at, closed_at,
          additions, deletions, changed_files, labels
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (repo_id, pr_number) DO UPDATE SET
          title = $3, state = $4, updated_at = $9, merged_at = $10, closed_at = $11,
          additions = $12, deletions = $13, changed_files = $14, labels = $15
      `, [
        repoId,
        pr.number,
        pr.title,
        pr.merged_at ? 'merged' : pr.state,
        pr.user?.login,
        pr.user?.avatar_url,
        pr.html_url,
        pr.created_at,
        pr.updated_at,
        pr.merged_at,
        pr.closed_at,
        pr.additions || 0,
        pr.deletions || 0,
        pr.changed_files || 0,
        JSON.stringify(pr.labels?.map(l => ({ name: l.name, color: l.color })) || [])
      ]);
    }

    // Update merged PRs count for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const mergedResult = await query(`
      SELECT COUNT(*) as count FROM github_pull_requests
      WHERE repo_id = $1 AND state = 'merged' AND merged_at > $2
    `, [repoId, thirtyDaysAgo.toISOString()]);

    await query(
      'UPDATE github_repos SET merged_prs_last_30_days = $1 WHERE id = $2',
      [parseInt(mergedResult.rows[0].count), repoId]
    );
  }

  async _syncIssues(userId, repoId, fullName) {
    // Fetch recent issues (excluding PRs, last 50)
    const issues = await this._fetch(userId, `/repos/${fullName}/issues?state=all&per_page=50&sort=updated&direction=desc`);

    // Clear old issues and insert new ones (filter out PRs)
    await query('DELETE FROM github_issues WHERE repo_id = $1', [repoId]);

    for (const issue of issues) {
      // Skip pull requests (GitHub API includes them in issues endpoint)
      if (issue.pull_request) continue;

      await query(`
        INSERT INTO github_issues (
          repo_id, issue_number, title, state, author, author_avatar_url,
          html_url, created_at, updated_at, closed_at, labels, milestone,
          assignees, comments_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (repo_id, issue_number) DO UPDATE SET
          title = $3, state = $4, updated_at = $9, closed_at = $10,
          labels = $11, assignees = $13, comments_count = $14
      `, [
        repoId,
        issue.number,
        issue.title,
        issue.state,
        issue.user?.login,
        issue.user?.avatar_url,
        issue.html_url,
        issue.created_at,
        issue.updated_at,
        issue.closed_at,
        JSON.stringify(issue.labels?.map(l => ({ name: l.name, color: l.color })) || []),
        issue.milestone?.title,
        JSON.stringify(issue.assignees?.map(a => ({ login: a.login, avatar_url: a.avatar_url })) || []),
        issue.comments
      ]);
    }
  }

  async _syncCommits(userId, repoId, fullName) {
    // Fetch recent commits (last 50)
    const commits = await this._fetch(userId, `/repos/${fullName}/commits?per_page=50`);

    // Clear old commits and insert new ones
    await query('DELETE FROM github_commits WHERE repo_id = $1', [repoId]);

    for (const commit of commits) {
      await query(`
        INSERT INTO github_commits (
          repo_id, sha, message, author_name, author_email, author_avatar_url,
          committed_at, html_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (repo_id, sha) DO NOTHING
      `, [
        repoId,
        commit.sha,
        commit.commit?.message,
        commit.commit?.author?.name,
        commit.commit?.author?.email,
        commit.author?.avatar_url,
        commit.commit?.author?.date,
        commit.html_url
      ]);
    }

    // Update commits count for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const commitResult = await query(`
      SELECT COUNT(*) as count FROM github_commits
      WHERE repo_id = $1 AND committed_at > $2
    `, [repoId, thirtyDaysAgo.toISOString()]);

    await query(
      'UPDATE github_repos SET commits_last_30_days = $1 WHERE id = $2',
      [parseInt(commitResult.rows[0].count), repoId]
    );
  }

  // ============================================
  // Data Retrieval
  // ============================================

  /**
   * Get pull requests for a repo
   */
  async getPullRequests(_userId, repoId, state = null) {
    let sql = `
      SELECT * FROM github_pull_requests
      WHERE repo_id = $1
    `;
    const params = [repoId];

    if (state) {
      sql += ' AND state = $2';
      params.push(state);
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get issues for a repo
   */
  async getIssues(_userId, repoId, state = null) {
    let sql = `
      SELECT * FROM github_issues
      WHERE repo_id = $1
    `;
    const params = [repoId];

    if (state) {
      sql += ' AND state = $2';
      params.push(state);
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get commits for a repo
   */
  async getCommits(_userId, repoId, limit = 50) {
    const sql = `
      SELECT * FROM github_commits
      WHERE repo_id = $1
      ORDER BY committed_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [repoId, limit]);
    return result.rows;
  }

  /**
   * Get summary metrics for all repos
   */
  async getReposSummary(userId) {
    const repos = await this.listRepos(userId);

    return {
      total_repos: repos.length,
      total_stars: repos.reduce((sum, r) => sum + (r.stars_count || 0), 0),
      total_open_prs: repos.reduce((sum, r) => sum + (r.open_prs_count || 0), 0),
      total_open_issues: repos.reduce((sum, r) => sum + (r.open_issues_count || 0), 0),
      merged_prs_last_30_days: repos.reduce((sum, r) => sum + (r.merged_prs_last_30_days || 0), 0),
      commits_last_30_days: repos.reduce((sum, r) => sum + (r.commits_last_30_days || 0), 0),
      repos
    };
  }

  /**
   * Search user's accessible repos on GitHub
   */
  async searchRepos(userId, searchQuery) {
    const results = await this._fetch(
      userId,
      `/search/repositories?q=${encodeURIComponent(searchQuery)}+in:name&per_page=10&sort=stars`
    );
    return results.items?.map(repo => ({
      full_name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      html_url: repo.html_url,
      is_private: repo.private
    })) || [];
  }
}

export default new GitHubService();
