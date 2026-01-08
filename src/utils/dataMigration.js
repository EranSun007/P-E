// Data migration utility for P&E Manager
// Handles migration from old schema to new schema with additional fields

import { logger } from './logger.js';

export class DataMigration {
  static MIGRATION_VERSION = '1.0.0';
  static MIGRATION_KEY = 'pe_manager_migration_version';

  static async runMigrations() {
    const currentVersion = localStorage.getItem(this.MIGRATION_KEY);
    
    if (currentVersion !== this.MIGRATION_VERSION) {
      logger.info('Running data migrations...');
      
      await this.migrateTasksSchema();
      await this.migrateProjectsSchema();
      await this.migrateStakeholdersSchema();
      await this.migrateTeamMembersSchema();
      await this.migrateOneOnOnesSchema();
      await this.migrateTaskAttributesSchema();
      
      localStorage.setItem(this.MIGRATION_KEY, this.MIGRATION_VERSION);
      logger.info('Data migration completed successfully');
    }
  }

  static async migrateTasksSchema() {
    const tasks = this.getData('tasks');
    if (!tasks.length) return;

    const migratedTasks = tasks.map(task => ({
      ...task,
      // Add new fields with defaults if they don't exist
      due_date: task.due_date || null,
      assignee: task.assignee || null,
      estimated_hours: task.estimated_hours || null,
      actual_hours: task.actual_hours || null,
      completion_date: task.completion_date || (task.status === 'done' ? task.updated_date : null)
    }));

    this.setData('tasks', migratedTasks);
    logger.info('Migrated tasks', { count: migratedTasks.length });
  }

  static async migrateProjectsSchema() {
    const projects = this.getData('projects');
    if (!projects.length) return;

    const migratedProjects = projects.map(project => ({
      ...project,
      // Add new fields with defaults if they don't exist
      deadline: project.deadline || null,
      budget: project.budget || null,
      cost: project.cost || null,
      priority_level: project.priority_level || 'medium',
      progress_percentage: project.progress_percentage || 0
    }));

    this.setData('projects', migratedProjects);
    logger.info('Migrated projects', { count: migratedProjects.length });
  }

  static async migrateStakeholdersSchema() {
    const stakeholders = this.getData('stakeholders');
    if (!stakeholders.length) return;

    const migratedStakeholders = stakeholders.map(stakeholder => {
      const migrated = {
        ...stakeholder,
        // Add new fields with defaults if they don't exist
        phone: stakeholder.phone || null,
        contact_info: stakeholder.contact_info || null,
        // Migrate organization to company
        company: stakeholder.company || stakeholder.organization || null
      };
      
      // Remove old organization field
      delete migrated.organization;
      return migrated;
    });

    this.setData('stakeholders', migratedStakeholders);
    logger.info('Migrated stakeholders', { count: migratedStakeholders.length });
  }

  static async migrateTeamMembersSchema() {
    const teamMembers = this.getData('team_members');
    if (!teamMembers.length) return;

    const migratedMembers = teamMembers.map(member => ({
      ...member,
      // Add new fields with defaults if they don't exist
      phone: member.phone || null,
      company: member.company || null,
      // Backfill leave fields for existing members
      leave_from: member.leave_from || null,
      leave_to: member.leave_to || null,
      leave_title: member.leave_title || null,
      last_activity: member.last_activity || null
    }));

    this.setData('team_members', migratedMembers);
    logger.info('Migrated team members', { count: migratedMembers.length });
  }

  static async migrateOneOnOnesSchema() {
    const oneOnOnes = this.getData('one_on_ones');
    if (!oneOnOnes.length) return;

    const migratedOneOnOnes = oneOnOnes.map(oneOnOne => {
      const migrated = {
        ...oneOnOne,
        // Add new fields with defaults if they don't exist
        updated_date: oneOnOne.updated_date || oneOnOne.created_date,
        status: oneOnOne.status || 'scheduled',
        location: oneOnOne.location || null,
        // Migrate participant_id to team_member_id
        team_member_id: oneOnOne.team_member_id || oneOnOne.participant_id || null
      };
      
      // Remove old participant_id field
      delete migrated.participant_id;
      return migrated;
    });

    this.setData('one_on_ones', migratedOneOnOnes);
    logger.info('Migrated one-on-ones', { count: migratedOneOnOnes.length });
  }

  static async migrateTaskAttributesSchema() {
    const taskAttributes = this.getData('task_attributes');
    if (!taskAttributes.length) return;

    const migratedAttributes = taskAttributes.map(attr => ({
      ...attr,
      // Add updated_date if it doesn't exist
      updated_date: attr.updated_date || attr.created_date
    }));

    this.setData('task_attributes', migratedAttributes);
    logger.info('Migrated task attributes', { count: migratedAttributes.length });
  }

  // Helper methods
  static getData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error reading data from localStorage', { key, error: String(error) });
      return [];
    }
  }

  static setData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      logger.error('Error saving data to localStorage', { key, error: String(error) });
      throw error;
    }
  }

  // Utility method to calculate last_activity for team members
  static async calculateLastActivity() {
    const teamMembers = this.getData('team_members');
    const tasks = this.getData('tasks');
    const meetings = this.getData('meetings');
    
    const updatedMembers = teamMembers.map(member => {
      let lastActivity = null;
      
      // Check tasks where member is mentioned in meeting participants
      const memberTasks = tasks.filter(task => 
        task.metadata?.meeting?.participants?.includes(member.name)
      );
      
      // Check meetings where member is a participant
      const memberMeetings = meetings.filter(meeting =>
        meeting.participants?.includes(member.id) || meeting.participants?.includes(member.name)
      );
      
      // Find the most recent activity
      const allActivities = [
        ...memberTasks.map(t => ({ date: t.updated_date || t.created_date, type: 'task' })),
        ...memberMeetings.map(m => ({ date: m.updated_date || m.created_date, type: 'meeting' }))
      ];
      
      if (allActivities.length > 0) {
        const sortedActivities = allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
        lastActivity = sortedActivities[0].date;
      }
      
      return {
        ...member,
        last_activity: lastActivity
      };
    });
    
    this.setData('team_members', updatedMembers);
    logger.info('Updated last_activity for all team members');
  }
}