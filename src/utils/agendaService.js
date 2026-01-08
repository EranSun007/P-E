// src/utils/agendaService.js
// Utility service for processing agenda items from OneOnOne meeting notes

import { OneOnOne, TeamMember } from '../api/entities.js';

/**
 * AgendaService - Utility for processing agenda-related data from OneOnOne meetings
 */
export class AgendaService {
  /**
   * Get all agenda items (notes) that reference a specific team member
   * @param {string} memberId - The ID of the team member
   * @returns {Promise<Array>} Array of processed agenda items
   */
  static async getAgendaItemsForMember(memberId) {
    try {
      const oneOnOnes = await OneOnOne.list();
      const agendaItems = [];

      for (const meeting of oneOnOnes) {
        if (!Array.isArray(meeting.notes)) continue;

        // Filter notes that reference the specific team member
        const relevantNotes = meeting.notes.filter(note => {
          // Handle malformed or missing referenced_entity
          if (!note.referenced_entity || typeof note.referenced_entity !== 'object') {
            return false;
          }
          
          return note.referenced_entity.type === 'team_member' && 
                 String(note.referenced_entity.id) === String(memberId);
        });

        // Process each relevant note into an agenda item
        for (const note of relevantNotes) {
          // Validate meeting data structure
          if (!meeting.date || !meeting.id) {
            console.warn('Malformed meeting data, skipping agenda item:', meeting.id);
            continue;
          }

          const agendaItem = {
            id: `${meeting.id}-${note.timestamp || Date.now()}`,
            meetingId: meeting.id,
            meetingDate: new Date(meeting.date),
            noteText: note.text || '[No text available]',
            referencedMemberId: memberId,
            createdBy: note.created_by || meeting.team_member_id || 'Unknown',
            meetingOwner: meeting.team_member_id || 'Unknown',
            isDiscussed: note.isDiscussed || false,
            discussedAt: note.discussedAt || null,
            timestamp: note.timestamp || meeting.created_date || new Date().toISOString()
          };
          agendaItems.push(agendaItem);
        }
      }

      // Sort by meeting date (most recent first)
      agendaItems.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));

      return agendaItems;
    } catch (error) {
      console.error('Error getting agenda items for member:', error);
      return [];
    }
  }

  /**
   * Get agenda summary counts for all team members
   * @returns {Promise<Object>} Object mapping team member IDs to their agenda summaries
   */
  static async getAgendaSummaryForAllMembers() {
    try {
      const [oneOnOnes, teamMembers] = await Promise.all([
        OneOnOne.list(),
        TeamMember.list()
      ]);

      const agendaSummary = {};

      // Initialize summary for all team members
      for (const member of teamMembers) {
        agendaSummary[member.id] = {
          count: 0,
          recentItems: [],
          hasUnresolved: false
        };
      }

      // Process all OneOnOne meetings
      for (const meeting of oneOnOnes) {
        if (!Array.isArray(meeting.notes)) continue;

        // Process each note that references a team member
        for (const note of meeting.notes) {
          // Handle malformed or missing referenced_entity
          if (!note.referenced_entity || 
              typeof note.referenced_entity !== 'object' ||
              note.referenced_entity.type !== 'team_member' ||
              !note.referenced_entity.id) {
            continue;
          }

          // Check if the referenced team member still exists
          if (agendaSummary[note.referenced_entity.id]) {
            
            const memberId = note.referenced_entity.id;
            const isDiscussed = note.isDiscussed || false;
            
            // Increment count
            agendaSummary[memberId].count++;
            
            // Track if there are unresolved items
            if (!isDiscussed) {
              agendaSummary[memberId].hasUnresolved = true;
            }

            // Add to recent items (limit to 3 most recent)
            const agendaItem = {
              id: `${meeting.id}-${note.timestamp || Date.now()}`,
              meetingId: meeting.id,
              meetingDate: new Date(meeting.date),
              noteText: note.text,
              isDiscussed: isDiscussed,
              meetingOwner: meeting.team_member_id
            };

            agendaSummary[memberId].recentItems.push(agendaItem);
          }
        }
      }

      // Sort recent items and limit to 3 for each member
      for (const memberId in agendaSummary) {
        agendaSummary[memberId].recentItems.sort((a, b) => 
          new Date(b.meetingDate) - new Date(a.meetingDate)
        );
        agendaSummary[memberId].recentItems = agendaSummary[memberId].recentItems.slice(0, 3);
      }

      return agendaSummary;
    } catch (error) {
      console.error('Error getting agenda summary for all members:', error);
      return {};
    }
  }

  /**
   * Mark an agenda item as discussed/resolved
   * @param {string} meetingId - The ID of the meeting
   * @param {string} noteTimestamp - The timestamp of the note to mark as discussed
   * @returns {Promise<boolean>} Success status
   */
  static async markAgendaItemDiscussed(meetingId, noteTimestamp) {
    try {
      const oneOnOnes = await OneOnOne.list();
      const meeting = oneOnOnes.find(m => m.id === meetingId);
      
      if (!meeting || !Array.isArray(meeting.notes)) {
        throw new Error('Meeting or notes not found');
      }

      // Find and update the specific note
      const noteIndex = meeting.notes.findIndex(note => 
        note.timestamp === noteTimestamp
      );

      if (noteIndex === -1) {
        throw new Error('Note not found');
      }

      // Update the note with discussed status
      const updatedNotes = [...meeting.notes];
      updatedNotes[noteIndex] = {
        ...updatedNotes[noteIndex],
        isDiscussed: true,
        discussedAt: new Date().toISOString()
      };

      // Update the meeting
      await OneOnOne.update(meetingId, { 
        ...meeting, 
        notes: updatedNotes 
      });

      return true;
    } catch (error) {
      console.error('Error marking agenda item as discussed:', error);
      return false;
    }
  }

  /**
   * Get agenda items filtered by discussion status
   * @param {string} memberId - The ID of the team member
   * @param {boolean} includeDiscussed - Whether to include discussed items
   * @returns {Promise<Array>} Filtered array of agenda items
   */
  static async getFilteredAgendaItems(memberId, includeDiscussed = true) {
    try {
      const allItems = await this.getAgendaItemsForMember(memberId);
      
      if (includeDiscussed) {
        return allItems;
      }

      // Filter out discussed items
      return allItems.filter(item => !item.isDiscussed);
    } catch (error) {
      console.error('Error getting filtered agenda items:', error);
      return [];
    }
  }

  /**
   * Get agenda items grouped by meeting
   * @param {string} memberId - The ID of the team member
   * @returns {Promise<Object>} Object with meetings as keys and agenda items as values
   */
  static async getAgendaItemsGroupedByMeeting(memberId) {
    try {
      const agendaItems = await this.getAgendaItemsForMember(memberId);
      const groupedItems = {};

      for (const item of agendaItems) {
        if (!groupedItems[item.meetingId]) {
          groupedItems[item.meetingId] = {
            meetingId: item.meetingId,
            meetingDate: item.meetingDate,
            meetingOwner: item.meetingOwner,
            items: []
          };
        }
        groupedItems[item.meetingId].items.push(item);
      }

      return groupedItems;
    } catch (error) {
      console.error('Error grouping agenda items by meeting:', error);
      return {};
    }
  }

  /**
   * Get count of unresolved agenda items for a team member
   * @param {string} memberId - The ID of the team member
   * @returns {Promise<number>} Count of unresolved items
   */
  static async getUnresolvedItemsCount(memberId) {
    try {
      const items = await this.getFilteredAgendaItems(memberId, false);
      return items.length;
    } catch (error) {
      console.error('Error getting unresolved items count:', error);
      return 0;
    }
  }

  /**
   * Get all agenda items (notes) that reference a specific peer
   * @param {string} peerId - The ID of the peer
   * @returns {Promise<Array>} Array of processed agenda items
   */
  static async getAgendaItemsForPeer(peerId) {
    try {
      const oneOnOnes = await OneOnOne.list();
      const agendaItems = [];
      for (const meeting of oneOnOnes) {
        if (!Array.isArray(meeting.notes)) continue;
        const relevantNotes = meeting.notes.filter(note => {
          if (!note.referenced_entity || typeof note.referenced_entity !== 'object') return false;
          return note.referenced_entity.type === 'peer' && String(note.referenced_entity.id) === String(peerId);
        });
        for (const note of relevantNotes) {
          if (!meeting.date || !meeting.id) continue;
          const agendaItem = {
            id: `${meeting.id}-${note.timestamp || Date.now()}`,
            meetingId: meeting.id,
            meetingDate: new Date(meeting.date),
            noteText: note.text || '[No text available]',
            referencedPeerId: peerId,
            createdBy: note.created_by || meeting.peer_id || 'Unknown',
            meetingOwner: meeting.peer_id || 'Unknown',
            isDiscussed: note.isDiscussed || false,
            discussedAt: note.discussedAt || null,
            timestamp: note.timestamp || meeting.created_date || new Date().toISOString()
          };
          agendaItems.push(agendaItem);
        }
      }
      agendaItems.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));
      return agendaItems;
    } catch (error) {
      console.error('Error getting agenda items for peer:', error);
      return [];
    }
  }

  /**
   * Get agenda summary counts for all peers
   * @returns {Promise<Object>} Object mapping peer IDs to their agenda summaries
   */
  static async getAgendaSummaryForAllPeers() {
    try {
      const [oneOnOnes, peers] = await Promise.all([
        OneOnOne.list(),
        import('../api/entities.js').then(mod => mod.Peer.list())
      ]);
      const agendaSummary = {};
      for (const peer of peers) {
        agendaSummary[peer.id] = {
          count: 0,
          recentItems: [],
          hasUnresolved: false
        };
      }
      for (const meeting of oneOnOnes) {
        if (!Array.isArray(meeting.notes)) continue;
        for (const note of meeting.notes) {
          if (!note.referenced_entity || typeof note.referenced_entity !== 'object' || note.referenced_entity.type !== 'peer' || !note.referenced_entity.id) continue;
          if (agendaSummary[note.referenced_entity.id]) {
            const peerId = note.referenced_entity.id;
            const isDiscussed = note.isDiscussed || false;
            agendaSummary[peerId].count++;
            if (!isDiscussed) agendaSummary[peerId].hasUnresolved = true;
            const agendaItem = {
              id: `${meeting.id}-${note.timestamp || Date.now()}`,
              meetingId: meeting.id,
              meetingDate: new Date(meeting.date),
              noteText: note.text,
              isDiscussed: isDiscussed,
              meetingOwner: meeting.peer_id
            };
            agendaSummary[peerId].recentItems.push(agendaItem);
          }
        }
      }
      for (const peerId in agendaSummary) {
        agendaSummary[peerId].recentItems.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));
        agendaSummary[peerId].recentItems = agendaSummary[peerId].recentItems.slice(0, 3);
      }
      return agendaSummary;
    } catch (error) {
      console.error('Error getting agenda summary for all peers:', error);
      return {};
    }
  }

  /**
   * Get agenda items filtered by discussion status for peer
   * @param {string} peerId - The ID of the peer
   * @param {boolean} includeDiscussed - Whether to include discussed items
   * @returns {Promise<Array>} Filtered array of agenda items
   */
  static async getFilteredAgendaItemsForPeer(peerId, includeDiscussed = true) {
    try {
      const allItems = await this.getAgendaItemsForPeer(peerId);
      if (includeDiscussed) return allItems;
      return allItems.filter(item => !item.isDiscussed);
    } catch (error) {
      console.error('Error getting filtered agenda items for peer:', error);
      return [];
    }
  }

  /**
   * Get agenda items grouped by meeting for peer
   * @param {string} peerId - The ID of the peer
   * @returns {Promise<Object>} Object with meetings as keys and agenda items as values
   */
  static async getAgendaItemsGroupedByMeetingForPeer(peerId) {
    try {
      const agendaItems = await this.getAgendaItemsForPeer(peerId);
      const groupedItems = {};
      for (const item of agendaItems) {
        if (!groupedItems[item.meetingId]) {
          groupedItems[item.meetingId] = {
            meetingId: item.meetingId,
            meetingDate: item.meetingDate,
            meetingOwner: item.meetingOwner,
            items: []
          };
        }
        groupedItems[item.meetingId].items.push(item);
      }
      return groupedItems;
    } catch (error) {
      console.error('Error grouping agenda items by meeting for peer:', error);
      return {};
    }
  }

  /**
   * Get count of unresolved agenda items for a peer
   * @param {string} peerId - The ID of the peer
   * @returns {Promise<number>} Count of unresolved items
   */
  static async getUnresolvedItemsCountForPeer(peerId) {
    try {
      const items = await this.getFilteredAgendaItemsForPeer(peerId, false);
      return items.length;
    } catch (error) {
      console.error('Error getting unresolved items count for peer:', error);
      return 0;
    }
  }
}