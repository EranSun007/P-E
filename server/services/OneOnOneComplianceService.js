import { query } from '../db/connection.js';

/**
 * OneOnOneComplianceService
 *
 * Calculates 1:1 meeting compliance based on role-specific cadences.
 *
 * Cadence rules (days between meetings):
 * - Scrum Master: 14 days (every 2 weeks)
 * - Senior Software Developer: 28 days (every 4 weeks)
 * - Specialist Software Developer: 35 days (every 5 weeks)
 * - Product Manager: 14 days (every 2 weeks)
 * - Default: 28 days (every 4 weeks)
 */

// Role-based cadence configuration (in days)
const CADENCE_RULES = {
  'Scrum Master': 14,
  'Senior Software Developer': 28,
  'Specialist Software Developer': 35,
  'Product Manager': 14,
  'default': 28
};

class OneOnOneComplianceService {
  /**
   * Get cadence (days) for a given role
   */
  getCadenceForRole(role) {
    return CADENCE_RULES[role] || CADENCE_RULES['default'];
  }

  /**
   * Get all cadence rules
   */
  getCadenceRules() {
    return { ...CADENCE_RULES };
  }

  /**
   * Calculate compliance for all team members
   * @param {string} userId - The manager's user ID
   * @param {number} rollingDays - Rolling window in days (30, 60, or 90)
   * @returns {Object} Compliance summary and per-member details
   */
  async getCompliance(userId, rollingDays = 30) {
    try {
      // Get all team members
      const teamMembersResult = await query(
        'SELECT id, name, role FROM team_members WHERE user_id = $1',
        [userId]
      );
      const teamMembers = teamMembersResult.rows;

      if (teamMembers.length === 0) {
        return {
          summary: {
            total: 0,
            onTrack: 0,
            overdue: 0,
            excluded: 0,
            compliancePercent: 100
          },
          members: [],
          cadenceRules: this.getCadenceRules()
        };
      }

      // Get current date for calculations
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - rollingDays);

      // Get team members currently on leave (to exclude from compliance)
      const onLeaveResult = await query(`
        SELECT DISTINCT team_member_id
        FROM time_off
        WHERE user_id = $1
          AND start_date <= $2
          AND end_date >= $2
      `, [userId, now.toISOString().split('T')[0]]);

      const onLeaveIds = new Set(onLeaveResult.rows.map(r => r.team_member_id));

      // Get most recent 1:1 for each team member
      const oneOnOnesResult = await query(`
        SELECT DISTINCT ON (team_member_id)
          team_member_id,
          date,
          id
        FROM one_on_ones
        WHERE user_id = $1
        ORDER BY team_member_id, date DESC
      `, [userId]);

      // Create lookup map for most recent 1:1
      const lastOneOnOneMap = new Map();
      for (const row of oneOnOnesResult.rows) {
        lastOneOnOneMap.set(row.team_member_id, {
          date: row.date,
          id: row.id
        });
      }

      // Calculate compliance for each team member
      const memberDetails = [];
      let onTrackCount = 0;
      let overdueCount = 0;
      let excludedCount = 0;

      for (const member of teamMembers) {
        const isOnLeave = onLeaveIds.has(member.id);
        const cadenceDays = this.getCadenceForRole(member.role);
        const lastOneOnOne = lastOneOnOneMap.get(member.id);

        let status;
        let daysSinceLastMeeting = null;
        let daysUntilDue = null;
        let lastMeetingDate = null;

        if (isOnLeave) {
          status = 'excluded';
          excludedCount++;
        } else if (!lastOneOnOne) {
          // Never had a 1:1 - overdue
          status = 'overdue';
          overdueCount++;
        } else {
          lastMeetingDate = new Date(lastOneOnOne.date);
          daysSinceLastMeeting = Math.floor((now - lastMeetingDate) / (1000 * 60 * 60 * 24));
          daysUntilDue = cadenceDays - daysSinceLastMeeting;

          if (daysSinceLastMeeting <= cadenceDays) {
            status = 'on_track';
            onTrackCount++;
          } else {
            status = 'overdue';
            overdueCount++;
          }
        }

        memberDetails.push({
          id: member.id,
          name: member.name,
          role: member.role,
          status,
          cadenceDays,
          daysSinceLastMeeting,
          daysUntilDue,
          lastMeetingDate: lastMeetingDate ? lastMeetingDate.toISOString().split('T')[0] : null,
          isOnLeave
        });
      }

      // Calculate compliance percentage (excluding members on leave)
      const eligibleCount = teamMembers.length - excludedCount;
      const compliancePercent = eligibleCount > 0
        ? Math.round((onTrackCount / eligibleCount) * 100)
        : 100;

      // Sort: overdue first, then by days until due
      memberDetails.sort((a, b) => {
        if (a.status === 'excluded') return 1;
        if (b.status === 'excluded') return -1;
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        // Both same status - sort by days until due (ascending)
        return (a.daysUntilDue || 999) - (b.daysUntilDue || 999);
      });

      return {
        summary: {
          total: teamMembers.length,
          eligible: eligibleCount,
          onTrack: onTrackCount,
          overdue: overdueCount,
          excluded: excludedCount,
          compliancePercent,
          rollingDays
        },
        members: memberDetails,
        cadenceRules: this.getCadenceRules()
      };

    } catch (error) {
      console.error('OneOnOneComplianceService.getCompliance error:', error.message);
      throw new Error(`Failed to calculate compliance: ${error.message}`);
    }
  }
}

export default new OneOnOneComplianceService();
