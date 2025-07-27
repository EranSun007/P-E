// src/services/globalSearchService.js
// Global search service that aggregates results from all data sources

import { Task, TeamMember, Project, Stakeholder, Peer } from '@/api/entities.js';
import EmployeeGoalsService from './employeeGoalsService.js';

class GlobalSearchService {
  /**
   * Perform a comprehensive search across all data sources
   * @param {string} searchTerm - The search term
   * @param {Object} options - Search options
   * @param {Array} options.types - Types to search in (default: all)
   * @param {number} options.limit - Maximum results per type
   * @returns {Promise<Object>} Categorized search results
   */
  static async search(searchTerm, options = {}) {
    const { types = ['tasks', 'goals', 'team_members', 'projects', 'stakeholders', 'peers'], limit = 10 } = options;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        results: {},
        totalCount: 0,
        searchTerm
      };
    }

    const searchPromises = [];
    const resultCategories = {};

    try {
      // Tasks search
      if (types.includes('tasks')) {
        searchPromises.push(
          this.searchTasks(searchTerm, limit).then(results => {
            resultCategories.tasks = results;
          })
        );
      }

      // Goals search
      if (types.includes('goals')) {
        searchPromises.push(
          this.searchGoals(searchTerm, limit).then(results => {
            resultCategories.goals = results;
          })
        );
      }

      // Team members search
      if (types.includes('team_members')) {
        searchPromises.push(
          this.searchTeamMembers(searchTerm, limit).then(results => {
            resultCategories.team_members = results;
          })
        );
      }

      // Projects search
      if (types.includes('projects')) {
        searchPromises.push(
          this.searchProjects(searchTerm, limit).then(results => {
            resultCategories.projects = results;
          })
        );
      }

      // Stakeholders search
      if (types.includes('stakeholders')) {
        searchPromises.push(
          this.searchStakeholders(searchTerm, limit).then(results => {
            resultCategories.stakeholders = results;
          })
        );
      }

      // Peers search
      if (types.includes('peers')) {
        searchPromises.push(
          this.searchPeers(searchTerm, limit).then(results => {
            resultCategories.peers = results;
          })
        );
      }

      await Promise.all(searchPromises);

      const totalCount = Object.values(resultCategories).reduce((sum, results) => sum + results.length, 0);

      return {
        results: resultCategories,
        totalCount,
        searchTerm
      };
    } catch (error) {
      console.error('Global search error:', error);
      return {
        results: {},
        totalCount: 0,
        searchTerm,
        error: 'Search failed'
      };
    }
  }

  /**
   * Search tasks
   */
  static async searchTasks(searchTerm, limit = 10) {
    try {
      const tasks = await Task.list();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return tasks
        .filter(task => 
          task.title.toLowerCase().includes(lowerSearchTerm) ||
          (task.description && task.description.toLowerCase().includes(lowerSearchTerm)) ||
          (task.tags && task.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
        )
        .map(task => ({
          type: 'task',
          id: task.id,
          title: task.title,
          description: task.description || 'No description',
          priority: task.priority,
          status: task.status,
          relevanceScore: this.calculateTaskRelevance(task, lowerSearchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  /**
   * Search goals using the EmployeeGoalsService
   */
  static async searchGoals(searchTerm, limit = 10) {
    try {
      return await EmployeeGoalsService.searchGoalsForGlobalResults(searchTerm);
    } catch (error) {
      console.error('Error searching goals:', error);
      return [];
    }
  }

  /**
   * Search team members
   */
  static async searchTeamMembers(searchTerm, limit = 10) {
    try {
      const members = await TeamMember.list();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return members
        .filter(member => 
          member.name.toLowerCase().includes(lowerSearchTerm) ||
          (member.email && member.email.toLowerCase().includes(lowerSearchTerm)) ||
          (member.role && member.role.toLowerCase().includes(lowerSearchTerm)) ||
          (member.department && member.department.toLowerCase().includes(lowerSearchTerm))
        )
        .map(member => ({
          type: 'team_member',
          id: member.id,
          title: member.name,
          description: `${member.role || 'Team Member'}${member.department ? ` - ${member.department}` : ''}`,
          email: member.email,
          relevanceScore: this.calculateMemberRelevance(member, lowerSearchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching team members:', error);
      return [];
    }
  }

  /**
   * Search projects
   */
  static async searchProjects(searchTerm, limit = 10) {
    try {
      const projects = await Project.list();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return projects
        .filter(project => 
          project.name.toLowerCase().includes(lowerSearchTerm) ||
          (project.description && project.description.toLowerCase().includes(lowerSearchTerm)) ||
          project.status.toLowerCase().includes(lowerSearchTerm)
        )
        .map(project => ({
          type: 'project',
          id: project.id,
          title: project.name,
          description: project.description || 'No description',
          status: project.status,
          budget: project.budget,
          relevanceScore: this.calculateProjectRelevance(project, lowerSearchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }

  /**
   * Search stakeholders
   */
  static async searchStakeholders(searchTerm, limit = 10) {
    try {
      const stakeholders = await Stakeholder.list();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return stakeholders
        .filter(stakeholder => 
          stakeholder.name.toLowerCase().includes(lowerSearchTerm) ||
          (stakeholder.role && stakeholder.role.toLowerCase().includes(lowerSearchTerm)) ||
          (stakeholder.organization && stakeholder.organization.toLowerCase().includes(lowerSearchTerm))
        )
        .map(stakeholder => ({
          type: 'stakeholder',
          id: stakeholder.id,
          title: stakeholder.name,
          description: `${stakeholder.role || 'Stakeholder'}${stakeholder.organization ? ` at ${stakeholder.organization}` : ''}`,
          organization: stakeholder.organization,
          relevanceScore: this.calculateStakeholderRelevance(stakeholder, lowerSearchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching stakeholders:', error);
      return [];
    }
  }

  /**
   * Search peers
   */
  static async searchPeers(searchTerm, limit = 10) {
    try {
      const peers = await Peer.list();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return peers
        .filter(peer => 
          peer.name.toLowerCase().includes(lowerSearchTerm) ||
          (peer.role && peer.role.toLowerCase().includes(lowerSearchTerm)) ||
          (peer.organization && peer.organization.toLowerCase().includes(lowerSearchTerm)) ||
          (peer.context && peer.context.toLowerCase().includes(lowerSearchTerm))
        )
        .map(peer => ({
          type: 'peer',
          id: peer.id,
          title: peer.name,
          description: `${peer.role || 'Peer'}${peer.organization ? ` at ${peer.organization}` : ''}`,
          organization: peer.organization,
          context: peer.context,
          relevanceScore: this.calculatePeerRelevance(peer, lowerSearchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching peers:', error);
      return [];
    }
  }

  // Relevance calculation helpers
  static calculateTaskRelevance(task, searchTerm) {
    let score = 0;
    if (task.title.toLowerCase().includes(searchTerm)) score += 3;
    if (task.description && task.description.toLowerCase().includes(searchTerm)) score += 2;
    if (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm))) score += 1;
    return score;
  }

  static calculateMemberRelevance(member, searchTerm) {
    let score = 0;
    if (member.name.toLowerCase().includes(searchTerm)) score += 3;
    if (member.email && member.email.toLowerCase().includes(searchTerm)) score += 2;
    if (member.role && member.role.toLowerCase().includes(searchTerm)) score += 1;
    if (member.department && member.department.toLowerCase().includes(searchTerm)) score += 1;
    return score;
  }

  static calculateProjectRelevance(project, searchTerm) {
    let score = 0;
    if (project.name.toLowerCase().includes(searchTerm)) score += 3;
    if (project.description && project.description.toLowerCase().includes(searchTerm)) score += 2;
    if (project.status.toLowerCase().includes(searchTerm)) score += 1;
    return score;
  }

  static calculateStakeholderRelevance(stakeholder, searchTerm) {
    let score = 0;
    if (stakeholder.name.toLowerCase().includes(searchTerm)) score += 3;
    if (stakeholder.role && stakeholder.role.toLowerCase().includes(searchTerm)) score += 2;
    if (stakeholder.organization && stakeholder.organization.toLowerCase().includes(searchTerm)) score += 1;
    return score;
  }

  static calculatePeerRelevance(peer, searchTerm) {
    let score = 0;
    if (peer.name.toLowerCase().includes(searchTerm)) score += 3;
    if (peer.role && peer.role.toLowerCase().includes(searchTerm)) score += 2;
    if (peer.organization && peer.organization.toLowerCase().includes(searchTerm)) score += 1;
    if (peer.context && peer.context.toLowerCase().includes(searchTerm)) score += 1;
    return score;
  }

  /**
   * Get search suggestions based on popular terms
   * @returns {Promise<Array>} Array of suggested search terms
   */
  static async getSearchSuggestions() {
    try {
      const [tasks, goals, projects] = await Promise.all([
        Task.list(),
        EmployeeGoalsService.getAllGoals(),
        Project.list()
      ]);

      const suggestions = new Set();

      // Add popular task titles and tags
      tasks.forEach(task => {
        if (task.title) suggestions.add(task.title);
        if (task.tags) task.tags.forEach(tag => suggestions.add(tag));
      });

      // Add goal titles and development needs
      goals.forEach(goal => {
        if (goal.title) suggestions.add(goal.title);
        if (goal.developmentNeed) suggestions.add(goal.developmentNeed);
      });

      // Add project names
      projects.forEach(project => {
        if (project.name) suggestions.add(project.name);
      });

      return Array.from(suggestions).slice(0, 20);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

export default GlobalSearchService;