import { query, getClient } from '../db/connection.js';

class BackupService {
  // Export all user data (sequential queries for BTP connection stability)
  async exportAll(userId) {
    try {
      // Execute queries sequentially to avoid connection pool exhaustion
      const tasks = await query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
      const projects = await query('SELECT * FROM projects WHERE user_id = $1', [userId]);
      const stakeholders = await query('SELECT * FROM stakeholders WHERE user_id = $1', [userId]);
      const teamMembers = await query('SELECT * FROM team_members WHERE user_id = $1', [userId]);
      const oneOnOnes = await query('SELECT * FROM one_on_ones WHERE user_id = $1', [userId]);
      const meetings = await query('SELECT * FROM meetings WHERE user_id = $1', [userId]);
      const calendarEvents = await query('SELECT * FROM calendar_events WHERE user_id = $1', [userId]);
      const workItems = await query('SELECT * FROM work_items WHERE user_id = $1', [userId]);
      const developerGoals = await query('SELECT * FROM developer_goals WHERE user_id = $1', [userId]);
      const performanceEvaluations = await query('SELECT * FROM performance_evaluations WHERE user_id = $1', [userId]);

      return {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          tasks: tasks.rows,
          projects: projects.rows,
          stakeholders: stakeholders.rows,
          teamMembers: teamMembers.rows,
          oneOnOnes: oneOnOnes.rows,
          meetings: meetings.rows,
          calendarEvents: calendarEvents.rows,
          workItems: workItems.rows,
          developerGoals: developerGoals.rows,
          performanceEvaluations: performanceEvaluations.rows
        }
      };
    } catch (error) {
      console.error('BackupService.exportAll error:', error);
      throw new Error('Failed to export data');
    }
  }

  // Validate import data structure
  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup data format');
    }

    if (!data.version || !data.data) {
      throw new Error('Missing version or data in backup');
    }

    const requiredEntities = [
      'tasks', 'projects', 'stakeholders', 'teamMembers',
      'oneOnOnes', 'meetings', 'calendarEvents'
    ];

    for (const entity of requiredEntities) {
      if (data.data[entity] && !Array.isArray(data.data[entity])) {
        throw new Error(`Invalid format for ${entity}: expected array`);
      }
    }

    return true;
  }

  // Import all user data
  async importAll(userId, backupData, mode = 'merge') {
    this.validateImportData(backupData);

    const client = await getClient();
    const summary = {
      stakeholders: 0,
      teamMembers: 0,
      projects: 0,
      tasks: 0,
      oneOnOnes: 0,
      meetings: 0,
      calendarEvents: 0,
      workItems: 0,
      developerGoals: 0,
      performanceEvaluations: 0
    };

    // Maps to track old ID -> new ID for foreign key relationships
    const idMaps = {
      stakeholders: new Map(),
      teamMembers: new Map(),
      projects: new Map()
    };

    try {
      await client.query('BEGIN');

      // If replace mode, delete all existing data (in reverse dependency order)
      if (mode === 'replace') {
        await client.query('DELETE FROM performance_evaluations WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM developer_goals WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM work_items WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM one_on_ones WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM meetings WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM calendar_events WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM comments WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM task_attributes WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM tasks WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM projects WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM team_members WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM stakeholders WHERE user_id = $1', [userId]);
      }

      const { data } = backupData;

      // 1. Import stakeholders (no dependencies)
      if (data.stakeholders?.length) {
        for (const item of data.stakeholders) {
          const result = await client.query(`
            INSERT INTO stakeholders (user_id, name, email, role, phone, contact_info, company,
              influence_level, engagement_level, notes, tags, department, stakeholder_group, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
          `, [
            userId, item.name, item.email, item.role, item.phone, item.contact_info, item.company,
            item.influence_level || 'medium', item.engagement_level || 'active', item.notes,
            item.tags || [], item.department, item.stakeholder_group, item.created_date || new Date()
          ]);
          idMaps.stakeholders.set(item.id, result.rows[0].id);
          summary.stakeholders++;
        }
      }

      // 2. Import team members (no dependencies)
      if (data.teamMembers?.length) {
        for (const item of data.teamMembers) {
          const result = await client.query(`
            INSERT INTO team_members (user_id, name, email, role, department, skills, phone, company,
              notes, leave_from, leave_to, leave_title, last_activity, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
          `, [
            userId, item.name, item.email, item.role, item.department, item.skills || [],
            item.phone, item.company, item.notes, item.leave_from, item.leave_to,
            item.leave_title, item.last_activity, item.created_date || new Date()
          ]);
          idMaps.teamMembers.set(item.id, result.rows[0].id);
          summary.teamMembers++;
        }
      }

      // 3. Import projects (depends on stakeholders)
      if (data.projects?.length) {
        for (const item of data.projects) {
          const newStakeholderId = item.stakeholder_id ? idMaps.stakeholders.get(item.stakeholder_id) : null;
          const result = await client.query(`
            INSERT INTO projects (user_id, name, description, status, start_date, deadline,
              budget, cost, priority_level, progress_percentage, tags, stakeholder_id, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
          `, [
            userId, item.name, item.description, item.status, item.start_date, item.deadline,
            item.budget, item.cost, item.priority_level || 'medium', item.progress_percentage || 0,
            item.tags || [], newStakeholderId, item.created_date || new Date()
          ]);
          idMaps.projects.set(item.id, result.rows[0].id);
          summary.projects++;
        }
      }

      // 4. Import tasks (no dependencies)
      if (data.tasks?.length) {
        for (const item of data.tasks) {
          await client.query(`
            INSERT INTO tasks (user_id, title, description, type, status, priority, tags,
              stakeholders, due_date, assignee, estimated_hours, actual_hours, completion_date,
              metadata, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            userId, item.title, item.description, item.type, item.status, item.priority,
            item.tags || [], item.stakeholders || [], item.due_date, item.assignee,
            item.estimated_hours, item.actual_hours, item.completion_date,
            item.metadata || {}, item.created_date || new Date()
          ]);
          summary.tasks++;
        }
      }

      // 5. Import one-on-ones (depends on team members)
      if (data.oneOnOnes?.length) {
        for (const item of data.oneOnOnes) {
          const newTeamMemberId = item.team_member_id ? idMaps.teamMembers.get(item.team_member_id) : null;
          if (newTeamMemberId) {
            await client.query(`
              INSERT INTO one_on_ones (user_id, team_member_id, date, notes, status, location,
                mood, topics, next_meeting_date, action_items, created_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              userId, newTeamMemberId, item.date, item.notes, item.status || 'scheduled',
              item.location, item.mood, item.topics || [], item.next_meeting_date,
              item.action_items || [], item.created_date || new Date()
            ]);
            summary.oneOnOnes++;
          }
        }
      }

      // 6. Import meetings (no dependencies)
      if (data.meetings?.length) {
        for (const item of data.meetings) {
          await client.query(`
            INSERT INTO meetings (user_id, title, date, notes, status, participants,
              agenda_items, action_items, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId, item.title, item.date, item.notes, item.status || 'scheduled',
            item.participants || [], item.agenda_items || [], item.action_items || [],
            item.created_date || new Date()
          ]);
          summary.meetings++;
        }
      }

      // 7. Import calendar events (no dependencies)
      if (data.calendarEvents?.length) {
        for (const item of data.calendarEvents) {
          await client.query(`
            INSERT INTO calendar_events (user_id, title, date, start_time, end_time,
              all_day, recurrence_rule, created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            userId, item.title, item.date, item.start_time, item.end_time,
            item.all_day || false, item.recurrence_rule, item.created_date || new Date()
          ]);
          summary.calendarEvents++;
        }
      }

      // 8. Import work items (depends on team members, projects)
      if (data.workItems?.length) {
        for (const item of data.workItems) {
          const newTeamMemberId = item.team_member_id ? idMaps.teamMembers.get(item.team_member_id) : null;
          const newProjectId = item.project_id ? idMaps.projects.get(item.project_id) : null;
          if (newTeamMemberId) {
            await client.query(`
              INSERT INTO work_items (user_id, team_member_id, name, project_id, effort_estimation,
                status, insights, sprint_name, created_date, completed_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              userId, newTeamMemberId, item.name, newProjectId, item.effort_estimation,
              item.status || 'active', item.insights || [], item.sprint_name,
              item.created_date || new Date(), item.completed_date
            ]);
            summary.workItems++;
          }
        }
      }

      // 9. Import developer goals (depends on team members)
      if (data.developerGoals?.length) {
        for (const item of data.developerGoals) {
          const newTeamMemberId = item.team_member_id ? idMaps.teamMembers.get(item.team_member_id) : null;
          if (newTeamMemberId) {
            await client.query(`
              INSERT INTO developer_goals (user_id, team_member_id, year, title, description,
                status, progress, category, due_date, created_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              userId, newTeamMemberId, item.year, item.title, item.description,
              item.status || 'not_started', item.progress || 0, item.category,
              item.due_date, item.created_date || new Date()
            ]);
            summary.developerGoals++;
          }
        }
      }

      // 10. Import performance evaluations (depends on team members)
      if (data.performanceEvaluations?.length) {
        for (const item of data.performanceEvaluations) {
          const newTeamMemberId = item.team_member_id ? idMaps.teamMembers.get(item.team_member_id) : null;
          if (newTeamMemberId) {
            await client.query(`
              INSERT INTO performance_evaluations (user_id, team_member_id, year, overall_rating,
                strengths, areas_for_improvement, goals_met, manager_comments, status,
                self_rating, self_strengths, self_areas_for_improvement, self_goals_met, self_comments,
                created_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
              userId, newTeamMemberId, item.year, item.overall_rating, item.strengths,
              item.areas_for_improvement, item.goals_met, item.manager_comments,
              item.status || 'draft', item.self_rating, item.self_strengths,
              item.self_areas_for_improvement, item.self_goals_met, item.self_comments,
              item.created_date || new Date()
            ]);
            summary.performanceEvaluations++;
          }
        }
      }

      await client.query('COMMIT');
      return summary;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('BackupService.importAll error:', error);
      throw new Error(`Failed to import data: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

export default new BackupService();
