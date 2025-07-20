// src/api/localClient.js
// Local storage-based API client for migration from Base44

import { sanitizeInput, validateInput } from '../utils/validation.js';

function getData(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading data from localStorage key "${key}":`, error);
    return [];
  }
}

function setData(key, data) {
  try {
    if (!validateInput.array(data)) {
      throw new Error('Invalid data format - must be an array');
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving data to localStorage key "${key}":`, error);
    throw error;
  }
}

function generateId() {
  // Use crypto.randomUUID() for secure ID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const localClient = {
  entities: {
    Task: {
      async list() {
        return getData('tasks');
      },
      async create(task) {
        const tasks = getData('tasks');
        const newTask = { 
          ...task, 
          id: generateId(), 
          created_date: new Date().toISOString(), 
          updated_date: new Date().toISOString(),
          // Initialize new fields with defaults
          due_date: task.due_date || null,
          assignee: task.assignee || null,
          estimated_hours: task.estimated_hours || null,
          actual_hours: task.actual_hours || null,
          completion_date: null
        };
        tasks.unshift(newTask);
        setData('tasks', tasks);
        return newTask;
      },
      async update(id, updates) {
        const tasks = getData('tasks');
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          const currentTask = tasks[idx];
          const updatedTask = { 
            ...currentTask, 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          
          // Auto-set completion_date when status changes to "done"
          if (updates.status === "done" && currentTask.status !== "done") {
            updatedTask.completion_date = new Date().toISOString();
          }
          // Clear completion_date if status changes away from "done"
          else if (updates.status && updates.status !== "done" && currentTask.status === "done") {
            updatedTask.completion_date = null;
          }
          
          tasks[idx] = updatedTask;
          setData('tasks', tasks);
          return tasks[idx];
        }
        throw new Error('Task not found');
      },
      async delete(id) {
        let tasks = getData('tasks');
        tasks = tasks.filter(t => t.id !== id);
        setData('tasks', tasks);
        return true;
      }
    },
    Project: {
      async list() {
        return getData('projects');
      },
      async create(project) {
        const projects = getData('projects');
        const newProject = { 
          ...project, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          deadline: project.deadline || null,
          budget: project.budget || null,
          cost: project.cost || null,
          priority_level: project.priority_level || 'medium',
          progress_percentage: project.progress_percentage || 0
        };
        projects.unshift(newProject);
        setData('projects', projects);
        return newProject;
      },
      async update(id, updates) {
        const projects = getData('projects');
        const idx = projects.findIndex(p => p.id === id);
        if (idx !== -1) {
          projects[idx] = { ...projects[idx], ...updates };
          setData('projects', projects);
          return projects[idx];
        }
        throw new Error('Project not found');
      },
      async delete(id) {
        let projects = getData('projects');
        projects = projects.filter(p => p.id !== id);
        setData('projects', projects);
        return true;
      }
    },
    Stakeholder: {
      async list() {
        return getData('stakeholders');
      },
      async create(stakeholder) {
        const stakeholders = getData('stakeholders');
        const newStakeholder = { 
          ...stakeholder, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          phone: stakeholder.phone || null,
          contact_info: stakeholder.contact_info || null,
          // Rename organization to company for consistency
          company: stakeholder.company || stakeholder.organization || null
        };
        // Remove old organization field if it exists
        delete newStakeholder.organization;
        stakeholders.unshift(newStakeholder);
        setData('stakeholders', stakeholders);
        return newStakeholder;
      },
      async update(id, updates) {
        const stakeholders = getData('stakeholders');
        const idx = stakeholders.findIndex(s => s.id === id);
        if (idx !== -1) {
          const updatedStakeholder = { ...stakeholders[idx], ...updates };
          // Handle organization -> company migration during updates
          if (updates.organization && !updates.company) {
            updatedStakeholder.company = updates.organization;
            delete updatedStakeholder.organization;
          }
          stakeholders[idx] = updatedStakeholder;
          setData('stakeholders', stakeholders);
          return stakeholders[idx];
        }
        throw new Error('Stakeholder not found');
      },
      async delete(id) {
        let stakeholders = getData('stakeholders');
        stakeholders = stakeholders.filter(s => s.id !== id);
        setData('stakeholders', stakeholders);
        return true;
      }
    },
    TeamMember: {
      async list() {
        return getData('team_members');
      },
      async get(id) {
        const members = getData('team_members');
        return members.find(m => m.id === id) || null;
      },
      async create(member) {
        const members = getData('team_members');
        const newMember = { 
          ...member, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          phone: member.phone || null,
          company: member.company || null,
          birthday: member.birthday || null, // Added birthday field
          last_activity: null // Will be calculated dynamically
        };
        members.unshift(newMember);
        setData('team_members', members);
        return newMember;
      },
      async update(id, updates) {
        const members = getData('team_members');
        const idx = members.findIndex(m => m.id === id);
        if (idx !== -1) {
          members[idx] = { ...members[idx], ...updates };
          setData('team_members', members);
          return members[idx];
        }
        throw new Error('Team member not found');
      },
      async delete(id) {
        let members = getData('team_members');
        members = members.filter(m => m.id !== id);
        setData('team_members', members);
        return true;
      }
    },
    OneOnOne: {
      async list() {
        return getData('one_on_ones');
      },
      async create(oneOnOne) {
        const oneOnOnes = getData('one_on_ones');
        const newOneOnOne = { 
          ...oneOnOne, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize new fields with defaults
          team_member_id: oneOnOne.team_member_id || oneOnOne.participant_id || null,
          status: oneOnOne.status || 'scheduled',
          location: oneOnOne.location || null,
          // Add calendar integration field
          next_meeting_calendar_event_id: oneOnOne.next_meeting_calendar_event_id || null
        };
        // Remove old participant_id field if it exists
        delete newOneOnOne.participant_id;
        oneOnOnes.unshift(newOneOnOne);
        setData('one_on_ones', oneOnOnes);

        // Auto-create calendar event if next_meeting_date is provided
        if (newOneOnOne.next_meeting_date && newOneOnOne.team_member_id) {
          try {
            // Import CalendarService dynamically to avoid circular dependency
            const { CalendarService } = await import('../utils/calendarService.js');
            const result = await CalendarService.createAndLinkOneOnOneMeeting(
              newOneOnOne.id,
              newOneOnOne.team_member_id,
              newOneOnOne.next_meeting_date
            );
            // Update the OneOnOne record with the calendar event ID
            newOneOnOne.next_meeting_calendar_event_id = result.calendarEvent.id;
            oneOnOnes[0] = newOneOnOne; // Update the first item (just added)
            setData('one_on_ones', oneOnOnes);
          } catch (error) {
            console.warn('Failed to create calendar event for OneOnone:', error);
            // Continue without calendar event - don't fail the OneOnOne creation
          }
        }

        return newOneOnOne;
      },
      async update(id, updates) {
        const oneOnOnes = getData('one_on_ones');
        const idx = oneOnOnes.findIndex(o => o.id === id);
        if (idx !== -1) {
          const currentOneOnOne = oneOnOnes[idx];
          const updatedOneOnOne = { 
            ...currentOneOnOne, 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          
          // Handle participant_id -> team_member_id migration during updates
          if (updates.participant_id && !updates.team_member_id) {
            updatedOneOnOne.team_member_id = updates.participant_id;
            delete updatedOneOnOne.participant_id;
          }

          // Handle calendar event updates when next_meeting_date changes
          if (updates.next_meeting_date && updates.next_meeting_date !== currentOneOnOne.next_meeting_date) {
            try {
              // Import CalendarService dynamically to avoid circular dependency
              const { CalendarService } = await import('../utils/calendarService.js');
              
              if (currentOneOnOne.next_meeting_calendar_event_id) {
                // Update existing calendar event
                await CalendarService.updateOneOnOneMeeting(
                  currentOneOnOne.next_meeting_calendar_event_id,
                  updates.next_meeting_date
                );
              } else if (updatedOneOnOne.team_member_id) {
                // Create new calendar event and link it
                const result = await CalendarService.createAndLinkOneOnOneMeeting(
                  id,
                  updatedOneOnOne.team_member_id,
                  updates.next_meeting_date
                );
                updatedOneOnOne.next_meeting_calendar_event_id = result.calendarEvent.id;
              }
            } catch (error) {
              console.warn('Failed to update calendar event for OneOnOne:', error);
              // Continue with the update - don't fail the OneOnOne update
            }
          }

          // Handle calendar event deletion when next_meeting_date is cleared
          if (updates.next_meeting_date === null || updates.next_meeting_date === '') {
            if (currentOneOnOne.next_meeting_calendar_event_id) {
              try {
                const { CalendarService } = await import('../utils/calendarService.js');
                await CalendarService.deleteOneOnOneMeeting(currentOneOnOne.next_meeting_calendar_event_id);
                updatedOneOnOne.next_meeting_calendar_event_id = null;
              } catch (error) {
                console.warn('Failed to delete calendar event for OneOnOne:', error);
                // Continue with the update
              }
            }
          }

          oneOnOnes[idx] = updatedOneOnOne;
          setData('one_on_ones', oneOnOnes);
          return oneOnOnes[idx];
        }
        throw new Error('OneOnOne not found');
      },
      async delete(id) {
        // Get the OneOnOne record before deletion to clean up calendar event
        const oneOnOnes = getData('one_on_ones');
        const oneOnOneToDelete = oneOnOnes.find(o => o.id === id);
        
        if (oneOnOneToDelete && oneOnOneToDelete.next_meeting_calendar_event_id) {
          try {
            // Import CalendarService dynamically to avoid circular dependency
            const { CalendarService } = await import('../utils/calendarService.js');
            await CalendarService.deleteOneOnOneMeeting(oneOnOneToDelete.next_meeting_calendar_event_id);
          } catch (error) {
            console.warn('Failed to delete associated calendar event:', error);
            // Continue with deletion even if calendar cleanup fails
          }
        }

        const filteredOneOnOnes = oneOnOnes.filter(o => o.id !== id);
        setData('one_on_ones', filteredOneOnOnes);
        return true;
      }
    },
    TaskAttribute: {
      async list() {
        return getData('task_attributes');
      },
      async create(attr) {
        const attrs = getData('task_attributes');
        const newAttr = { 
          ...attr, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        };
        attrs.unshift(newAttr);
        setData('task_attributes', attrs);
        return newAttr;
      },
      async update(id, updates) {
        const attrs = getData('task_attributes');
        const idx = attrs.findIndex(a => a.id === id);
        if (idx !== -1) {
          attrs[idx] = { 
            ...attrs[idx], 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          setData('task_attributes', attrs);
          return attrs[idx];
        }
        throw new Error('TaskAttribute not found');
      },
      async delete(id) {
        let attrs = getData('task_attributes');
        attrs = attrs.filter(a => a.id !== id);
        setData('task_attributes', attrs);
        return true;
      }
    },
    Meeting: {
      async list() {
        return getData('meetings');
      },
      async get(id) {
        const meetings = getData('meetings');
        return meetings.find(m => m.id === id) || null;
      },
      async create(meeting) {
        const meetings = getData('meetings');
        const newMeeting = {
          ...meeting,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize with defaults
          status: meeting.status || 'scheduled',
          participants: meeting.participants || [],
          agenda_items: meeting.agenda_items || [],
          action_items: meeting.action_items || []
        };
        meetings.unshift(newMeeting);
        setData('meetings', meetings);
        return newMeeting;
      },
      async update(id, updates) {
        const meetings = getData('meetings');
        const idx = meetings.findIndex(m => m.id === id);
        if (idx !== -1) {
          meetings[idx] = {
            ...meetings[idx],
            ...updates,
            updated_date: new Date().toISOString()
          };
          setData('meetings', meetings);
          return meetings[idx];
        }
        throw new Error('Meeting not found');
      },
      async delete(id) {
        let meetings = getData('meetings');
        meetings = meetings.filter(m => m.id !== id);
        setData('meetings', meetings);
        return true;
      }
    },
    CalendarEvent: {
      async list() {
        return getData('calendar_events');
      },
      async get(id) {
        const events = getData('calendar_events');
        return events.find(e => e.id === id) || null;
      },
      async create(event) {
        const events = getData('calendar_events');
        const newEvent = {
          ...event,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          all_day: event.all_day || false,
          recurrence_rule: event.recurrence_rule || null
        };
        events.unshift(newEvent);
        setData('calendar_events', events);
        return newEvent;
      },
      async update(id, updates) {
        const events = getData('calendar_events');
        const idx = events.findIndex(e => e.id === id);
        if (idx !== -1) {
          events[idx] = { ...events[idx], ...updates };
          setData('calendar_events', events);
          return events[idx];
        }
        throw new Error('Calendar event not found');
      },
      async delete(id) {
        let events = getData('calendar_events');
        events = events.filter(e => e.id !== id);
        setData('calendar_events', events);
        return true;
      }
    },
    Notification: {
      async list() {
        return getData('notifications');
      },
      async get(id) {
        const notifications = getData('notifications');
        return notifications.find(n => n.id === id) || null;
      },
      async create(notification) {
        const notifications = getData('notifications');
        const newNotification = {
          ...notification,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          read: notification.read || false,
          scheduled_date: notification.scheduled_date || null
        };
        notifications.unshift(newNotification);
        setData('notifications', notifications);
        return newNotification;
      },
      async update(id, updates) {
        const notifications = getData('notifications');
        const idx = notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
          notifications[idx] = { ...notifications[idx], ...updates };
          setData('notifications', notifications);
          return notifications[idx];
        }
        throw new Error('Notification not found');
      },
      async delete(id) {
        let notifications = getData('notifications');
        notifications = notifications.filter(n => n.id !== id);
        setData('notifications', notifications);
        return true;
      }
    },
    Reminder: {
      async list() {
        return getData('reminders');
      },
      async get(id) {
        const reminders = getData('reminders');
        return reminders.find(r => r.id === id) || null;
      },
      async create(reminder) {
        const reminders = getData('reminders');
        const newReminder = {
          ...reminder,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          completed: reminder.completed || false
        };
        reminders.unshift(newReminder);
        setData('reminders', reminders);
        return newReminder;
      },
      async update(id, updates) {
        const reminders = getData('reminders');
        const idx = reminders.findIndex(r => r.id === id);
        if (idx !== -1) {
          reminders[idx] = { ...reminders[idx], ...updates };
          setData('reminders', reminders);
          return reminders[idx];
        }
        throw new Error('Reminder not found');
      },
      async delete(id) {
        let reminders = getData('reminders');
        reminders = reminders.filter(r => r.id !== id);
        setData('reminders', reminders);
        return true;
      }
    },
    Comment: {
      async list() {
        return getData('comments');
      },
      async get(id) {
        const comments = getData('comments');
        return comments.find(c => c.id === id) || null;
      },
      async create(comment) {
        const comments = getData('comments');
        const newComment = {
          ...comment,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize with defaults
          author_name: comment.author_name || 'Local User'
        };
        comments.unshift(newComment);
        setData('comments', comments);
        return newComment;
      },
      async update(id, updates) {
        const comments = getData('comments');
        const idx = comments.findIndex(c => c.id === id);
        if (idx !== -1) {
          comments[idx] = {
            ...comments[idx],
            ...updates,
            updated_date: new Date().toISOString()
          };
          setData('comments', comments);
          return comments[idx];
        }
        throw new Error('Comment not found');
      },
      async delete(id) {
        let comments = getData('comments');
        comments = comments.filter(c => c.id !== id);
        setData('comments', comments);
        return true;
      }
    },
    OutOfOffice: {
      async list() {
        return getData('out_of_office');
      },
      async get(id) {
        const outOfOffice = getData('out_of_office');
        return outOfOffice.find(o => o.id === id) || null;
      },
      async create(outOfOfficeData) {
        const outOfOffice = getData('out_of_office');
        const newOutOfOffice = {
          ...outOfOfficeData,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          notes: outOfOfficeData.notes || null,
          // Support both team_member_id and peer_id
          team_member_id: outOfOfficeData.team_member_id || null,
          peer_id: outOfOfficeData.peer_id || null
        };
        outOfOffice.unshift(newOutOfOffice);
        setData('out_of_office', outOfOffice);
        return newOutOfOffice;
      },
      async update(id, updates) {
        const outOfOffice = getData('out_of_office');
        const idx = outOfOffice.findIndex(o => o.id === id);
        if (idx !== -1) {
          outOfOffice[idx] = {
            ...outOfOffice[idx],
            ...updates,
            updated_date: new Date().toISOString()
          };
          setData('out_of_office', outOfOffice);
          return outOfOffice[idx];
        }
        throw new Error('OutOfOffice not found');
      },
      async delete(id) {
        let outOfOffice = getData('out_of_office');
        outOfOffice = outOfOffice.filter(o => o.id !== id);
        setData('out_of_office', outOfOffice);
        return true;
      },
      async getByTeamMember(teamMemberId) {
        const outOfOffice = getData('out_of_office');
        return outOfOffice.filter(o => o.team_member_id === teamMemberId);
      },
      async getByPeer(peerId) {
        const outOfOffice = getData('out_of_office');
        return outOfOffice.filter(o => o.peer_id === peerId);
      },
      async getActiveForDate(date) {
        const outOfOffice = getData('out_of_office');
        const targetDate = new Date(date);
        return outOfOffice.filter(o => {
          const startDate = new Date(o.start_date);
          const endDate = new Date(o.end_date);
          return targetDate >= startDate && targetDate <= endDate;
        });
      },
      async getCountForYear(teamMemberId, year) {
        const outOfOffice = getData('out_of_office');
        const memberPeriods = outOfOffice.filter(o => o.team_member_id === teamMemberId);
        
        let totalDays = 0;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        memberPeriods.forEach(period => {
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          
          // Calculate overlap with the target year
          const overlapStart = new Date(Math.max(periodStart.getTime(), yearStart.getTime()));
          const overlapEnd = new Date(Math.min(periodEnd.getTime(), yearEnd.getTime()));
          
          if (overlapStart <= overlapEnd) {
            // Calculate days including both start and end dates
            const timeDiff = overlapEnd.getTime() - overlapStart.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
            totalDays += daysDiff;
          }
        });
        
        return totalDays;
      },
      async getCountForYearByPeer(peerId, year) {
        const outOfOffice = getData('out_of_office');
        const peerPeriods = outOfOffice.filter(o => o.peer_id === peerId);
        let totalDays = 0;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        peerPeriods.forEach(period => {
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          const overlapStart = new Date(Math.max(periodStart.getTime(), yearStart.getTime()));
          const overlapEnd = new Date(Math.min(periodEnd.getTime(), yearEnd.getTime()));
          if (overlapStart <= overlapEnd) {
            const timeDiff = overlapEnd.getTime() - overlapStart.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
            totalDays += daysDiff;
          }
        });
        return totalDays;
      }
    },
    Peer: {
      async list() {
        return getData('peers');
      },
      async get(id) {
        const peers = getData('peers');
        return peers.find(p => p.id === id) || null;
      },
      async create(peer) {
        const peers = getData('peers');
        const newPeer = {
          ...peer,
          id: generateId(),
          created_date: new Date().toISOString(),
          last_activity: null,
          // Peer-specific fields
          organization: peer.organization || '',
          collaboration_context: peer.collaboration_context || '',
          relationship_type: peer.relationship_type || 'other',
          // Base fields
          name: peer.name,
          role: peer.role || '',
          email: peer.email || '',
          phone: peer.phone || '',
          department: peer.department || '',
          availability: peer.availability || '',
          skills: Array.isArray(peer.skills) ? peer.skills : [],
          notes: peer.notes || '',
          avatar: peer.avatar || '',
        };
        peers.unshift(newPeer);
        setData('peers', peers);
        return newPeer;
      },
      async update(id, updates) {
        const peers = getData('peers');
        const idx = peers.findIndex(p => p.id === id);
        if (idx !== -1) {
          peers[idx] = { ...peers[idx], ...updates };
          setData('peers', peers);
          return peers[idx];
        }
        throw new Error('Peer not found');
      },
      async delete(id) {
        let peers = getData('peers');
        peers = peers.filter(p => p.id !== id);
        setData('peers', peers);
        return true;
      }
    }
  },
  auth: {
    async me() {
      return { id: 'local-user', name: 'Local User' };
    },
    async logout() {
      return true;
    }
  }
};
