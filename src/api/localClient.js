// src/api/localClient.js
// Local storage-based API client for migration from Base44

import { sanitizeInput, validateInput } from '../utils/validation.js';
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../services/auditService.js';
import AuthService from '../services/authService.js';

function getData(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    
    // Ensure the data is always an array
    if (!Array.isArray(parsed)) {
      console.warn(`Data for key "${key}" is not an array, resetting to empty array`);
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error(`Error reading data from localStorage key "${key}":`, error);
    // Reset corrupted data to empty array
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }
}

function setData(key, data) {
  try {
    // Fix: Allow both arrays and single objects for calendar events
    if (key === 'calendar_events') {
      // For calendar events, ensure we have an array
      if (!Array.isArray(data)) {
        console.error(`setData validation failed for key "${key}": Expected array but got ${typeof data}`);
        throw new Error('Invalid data format - calendar_events must be an array');
      }
    } else {
      // For other keys, validate as array
      if (!validateInput.array(data)) {
        console.error(`setData validation failed for key "${key}":`, {
          dataType: typeof data,
          isArray: Array.isArray(data),
          data: data,
          stackTrace: new Error().stack
        });
        throw new Error('Invalid data format - must be an array');
      }
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

function getCurrentUser() {
  try {
    const token = AuthService.getStoredToken();
    return token?.username || null;
  } catch (error) {
    console.warn('Unable to get current user:', error);
    return null;
  }
}

// Import session management service
let sessionManagementService;
async function getSessionService() {
  if (!sessionManagementService) {
    const module = await import('../services/sessionManagementService.js');
    sessionManagementService = module.default;
  }
  return sessionManagementService;
}

function checkAccess(operation, resourceType, resourceData = null) {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    throw new Error('Access denied: User not authenticated');
  }
  
  // For personal file items, ensure access control
  if (resourceType === 'personal_file_items') {
    // Only the creator can access their personal file items
    if (resourceData && resourceData.createdBy && resourceData.createdBy !== currentUser) {
      throw new Error('Access denied: You can only access your own personal file items');
    }
  }
  
  return currentUser;
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
          duties: member.duties || [], // Added duties field for duty assignments
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
      },
      async getDuties(id) {
        // Get duties for a specific team member
        const duties = getData('duties');
        return duties.filter(d => d.team_member_id === id);
      },
      async getCurrentDuties(id) {
        // Get current active duties for a team member
        const duties = getData('duties');
        const now = new Date();
        return duties.filter(d => {
          if (d.team_member_id !== id) return false;
          const startDate = new Date(d.start_date);
          const endDate = new Date(d.end_date);
          return now >= startDate && now <= endDate;
        });
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

        // Trigger calendar synchronization to ensure consistency
        try {
          const { CalendarSynchronizationService } = await import('../services/calendarSynchronizationService.js');
          // Run sync in background without blocking the creation
          CalendarSynchronizationService.ensureOneOnOneVisibility({ 
            teamMemberId: newOneOnOne.team_member_id,
            createMissing: true 
          }).catch(syncError => {
            console.warn('Background calendar sync failed after OneOnOne creation:', syncError);
          });
        } catch (importError) {
          console.warn('Failed to import CalendarSynchronizationService:', importError);
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

          // Trigger calendar synchronization after update to ensure consistency
          try {
            const { CalendarSynchronizationService } = await import('../services/calendarSynchronizationService.js');
            // Run sync in background without blocking the update
            CalendarSynchronizationService.ensureOneOnOneVisibility({ 
              teamMemberId: updatedOneOnOne.team_member_id,
              createMissing: true 
            }).catch(syncError => {
              console.warn('Background calendar sync failed after OneOnOne update:', syncError);
            });
          } catch (importError) {
            console.warn('Failed to import CalendarSynchronizationService:', importError);
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
        
        // Validate event_type
        const validEventTypes = ['meeting', 'one_on_one', 'duty', 'birthday', 'out_of_office'];
        if (event.event_type && !validEventTypes.includes(event.event_type)) {
          throw new Error(`Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`);
        }

        // Validate linking fields based on event type
        if (event.event_type === 'duty' && !event.duty_id) {
          console.warn('Duty event created without duty_id - this may cause display issues');
        }
        if (event.event_type === 'out_of_office' && !event.out_of_office_id) {
          console.warn('Out of office event created without out_of_office_id - this may cause display issues');
        }

        const newEvent = {
          ...event,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          all_day: event.all_day || false,
          recurrence_rule: event.recurrence_rule || null,
          event_type: event.event_type || 'meeting', // Default to meeting type
          // New linking fields for different event types
          duty_id: event.duty_id || null,
          out_of_office_id: event.out_of_office_id || null,
          // Recurrence support for birthday events
          recurrence: event.recurrence || null
        };

        // Handle birthday event recurrence - automatically set yearly recurrence
        if (newEvent.event_type === 'birthday' && !newEvent.recurrence) {
          newEvent.recurrence = {
            type: 'yearly',
            interval: 1
          };
        }

        // Ensure events is an array before adding new event
        const eventsArray = Array.isArray(events) ? events : [];
        eventsArray.unshift(newEvent);
        setData('calendar_events', eventsArray);
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
      },
      // Helper methods for creating specific event types
      async createDutyEvent(dutyId, teamMemberId, title, startDate, endDate, description = null, styling = null) {
        // Check for existing events first to ensure idempotent behavior
        const existingEvents = await this.getByDutyId(dutyId);
        if (existingEvents.length > 0) {
          console.log(`Calendar event already exists for duty ${dutyId}`);
          return existingEvents[0];
        }

        // Create the calendar event with proper data structure
        const eventData = {
          title,
          description: description || `Duty assignment: ${title}`,
          start_date: startDate,
          end_date: endDate,
          all_day: true, // Duties are typically all-day events
          event_type: 'duty',
          duty_id: dutyId,
          team_member_id: teamMemberId,
          linked_entity_type: 'duty',
          linked_entity_id: dutyId,
          // Add styling properties for calendar display
          color: styling?.color || '#8B5CF6', // Default purple
          backgroundColor: styling?.backgroundColor || '#F3E8FF', // Default light purple
          icon: styling?.icon || '🛡️', // Default shield icon
          dutyType: styling?.dutyType || 'other' // Default duty type
        };

        console.log('Creating duty calendar event with data:', eventData);
        return await this.create(eventData);
      },
      async createBirthdayEvent(teamMemberId, teamMemberName, birthdayDate) {
        return await this.create({
          title: `🎂 ${teamMemberName}'s Birthday`,
          description: `Birthday celebration for ${teamMemberName}`,
          start_date: birthdayDate,
          end_date: birthdayDate,
          all_day: true,
          event_type: 'birthday',
          team_member_id: teamMemberId,
          linked_entity_type: 'team_member',
          linked_entity_id: teamMemberId,
          recurrence: {
            type: 'yearly',
            interval: 1
          }
        });
      },
      async createOutOfOfficeEvent(outOfOfficeId, teamMemberId, teamMemberName, startDate, endDate, type = 'vacation') {
        return await this.create({
          title: `${teamMemberName} - Out of Office (${type})`,
          description: `${teamMemberName} is out of office`,
          start_date: startDate,
          end_date: endDate,
          all_day: true,
          event_type: 'out_of_office',
          out_of_office_id: outOfOfficeId,
          team_member_id: teamMemberId,
          linked_entity_type: 'out_of_office',
          linked_entity_id: outOfOfficeId
        });
      },
      // Helper methods for querying events by type
      async getByType(eventType) {
        const events = await this.list();
        return events.filter(event => event.event_type === eventType);
      },
      async getByDutyId(dutyId) {
        const events = await this.list();
        return events.filter(event => event.duty_id === dutyId);
      },
      async getByOutOfOfficeId(outOfOfficeId) {
        const events = await this.list();
        return events.filter(event => event.out_of_office_id === outOfOfficeId);
      },
      async getBirthdayEvents() {
        return await this.getByType('birthday');
      },
      async getDutyEvents() {
        return await this.getByType('duty');
      },
      async getOutOfOfficeEvents() {
        return await this.getByType('out_of_office');
      },
      async getMeetingEvents() {
        const events = await this.list();
        return events.filter(event => 
          event.event_type === 'meeting' || event.event_type === 'one_on_one'
        );
      },
      
      // Cleanup utility to remove duplicate calendar events
      async cleanupDuplicateEvents() {
        const events = await this.list();
        const duplicatesRemoved = [];
        const seenDutyIds = new Set();
        const eventsToKeep = [];
        
        for (const event of events) {
          if (event.event_type === 'duty' && event.duty_id) {
            if (seenDutyIds.has(event.duty_id)) {
              // This is a duplicate, mark for removal
              duplicatesRemoved.push(event);
            } else {
              // First occurrence, keep it
              seenDutyIds.add(event.duty_id);
              eventsToKeep.push(event);
            }
          } else {
            // Non-duty events, keep them
            eventsToKeep.push(event);
          }
        }
        
        // Update storage with deduplicated events
        if (duplicatesRemoved.length > 0) {
          setData('calendar_events', eventsToKeep);
          console.log(`Removed ${duplicatesRemoved.length} duplicate calendar events`);
        }
        
        return {
          duplicatesRemoved: duplicatesRemoved.length,
          duplicateEvents: duplicatesRemoved
        };
      },
      
      // Validate data consistency between duties and calendar events
      async validateDutyEventConsistency() {
        const dutyEvents = await this.getDutyEvents();
        const duties = getData('duties');
        const inconsistencies = [];
        
        // Check for calendar events without corresponding duties
        for (const event of dutyEvents) {
          if (event.duty_id) {
            const correspondingDuty = duties.find(d => d.id === event.duty_id);
            if (!correspondingDuty) {
              inconsistencies.push({
                type: 'orphaned_calendar_event',
                event: event,
                issue: `Calendar event ${event.id} references non-existent duty ${event.duty_id}`
              });
            }
          }
        }
        
        // Check for duties without corresponding calendar events
        for (const duty of duties) {
          const correspondingEvents = dutyEvents.filter(e => e.duty_id === duty.id);
          if (correspondingEvents.length === 0) {
            inconsistencies.push({
              type: 'missing_calendar_event',
              duty: duty,
              issue: `Duty ${duty.id} has no corresponding calendar event`
            });
          } else if (correspondingEvents.length > 1) {
            inconsistencies.push({
              type: 'multiple_calendar_events',
              duty: duty,
              events: correspondingEvents,
              issue: `Duty ${duty.id} has ${correspondingEvents.length} calendar events`
            });
          }
        }
        
        return inconsistencies;
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
    },
    Duty: {
      async list() {
        return getData('duties');
      },
      async get(id) {
        const duties = getData('duties');
        return duties.find(d => d.id === id) || null;
      },
      async create(duty) {
        // Get session management service and clean up expired sessions first
        const sessionService = await getSessionService();
        sessionService.cleanupExpiredSessions();
        
        const duties = getData('duties');
        
        // Import validation utilities
        const { validateForm, sanitizeFormData } = await import('../utils/dutyValidation.js');
        
        // Sanitize input data first
        const sanitizedDuty = sanitizeFormData(duty);
        
        // Session-based idempotency check - if session exists and is active, prevent duplicate
        if (sanitizedDuty.creation_session_id) {
          // Check if this session already completed a duty creation
          const existingDuty = sessionService.findDutyBySession(sanitizedDuty.creation_session_id);
          if (existingDuty) {
            console.log('Idempotent request detected - returning existing duty for session:', sanitizedDuty.creation_session_id);
            return existingDuty;
          }
          
          // Check if session is currently active (another request in progress)
          if (sessionService.isSessionActive(sanitizedDuty.creation_session_id)) {
            // Register this session to track the request
            sessionService.registerSession(sanitizedDuty.creation_session_id, sanitizedDuty);
          }
        }
        
        // Comprehensive server-side validation
        const validationResult = validateForm(sanitizedDuty);
        
        // Separate actual errors from warnings
        const actualErrors = {};
        const warnings = [];
        
        Object.entries(validationResult.errors).forEach(([field, error]) => {
          if (field === '_warnings') {
            // Handle warnings array
            if (Array.isArray(error)) {
              warnings.push(...error);
            } else {
              warnings.push(error);
            }
          } else {
            // These are actual validation errors
            actualErrors[field] = error;
          }
        });
        
        // Only fail validation for actual errors, not warnings
        if (Object.keys(actualErrors).length > 0) {
          const errorMessages = Object.entries(actualErrors)
            .map(([field, error]) => `${field}: ${error}`)
            .join('; ');
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        
        // Log warnings but don't fail validation
        if (warnings.length > 0) {
          console.warn('Duty creation warnings:', warnings);
        }
        
        // Use sanitized data for further processing
        const validatedDuty = validationResult.sanitizedData;
        
        // Validate date range (additional server-side check)
        const startDate = new Date(validatedDuty.start_date);
        const endDate = new Date(validatedDuty.end_date);
        if (startDate >= endDate) {
          throw new Error('start_date must be before end_date');
        }
        
        // Validate date is not in invalid range
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format provided');
        }

        // Additional server-side business rule validation (BEFORE adding to array)
        await this.validateBusinessRules(validatedDuty, duties);

        // Use enhanced duplicate detection with session awareness
        const duplicateWarnings = await this.checkForDuplicates(validatedDuty);
        
        // Check for session-based duplicates (highest priority)
        const sessionDuplicates = duplicateWarnings.filter(w => w.type === 'session_duplicate');
        if (sessionDuplicates.length > 0) {
          // Return the existing duty instead of creating a duplicate
          const existingDuty = sessionService.findDutyBySession(validatedDuty.creation_session_id);
          if (existingDuty) {
            console.log('Prevented duplicate submission with session ID:', validatedDuty.creation_session_id);
            return existingDuty;
          }
        }

        // Check for high-severity duplicates that should block creation
        const highSeverityWarnings = duplicateWarnings.filter(w => w.severity === 'high' && w.type !== 'session_duplicate');
        if (highSeverityWarnings.length > 0) {
          const errorMessages = highSeverityWarnings.map(w => w.message).join('; ');
          throw new Error(`Duplicate duty detected: ${errorMessages}`);
        }

        // Validate rotation-specific fields
        if (validatedDuty.is_rotation) {
          if (!validatedDuty.rotation_id) {
            throw new Error('rotation_id is required when is_rotation is true');
          }
          if (typeof validatedDuty.rotation_participants !== 'number' || validatedDuty.rotation_participants < 2) {
            throw new Error('rotation_participants must be a number >= 2 when is_rotation is true');
          }
          if (typeof validatedDuty.rotation_sequence !== 'number' || validatedDuty.rotation_sequence < 0) {
            throw new Error('rotation_sequence must be a number >= 0 when is_rotation is true');
          }
          if (typeof validatedDuty.rotation_cycle_weeks !== 'number' || validatedDuty.rotation_cycle_weeks < 1) {
            throw new Error('rotation_cycle_weeks must be a number >= 1 when is_rotation is true');
          }
          if (validatedDuty.rotation_sequence >= validatedDuty.rotation_participants) {
            throw new Error('rotation_sequence must be less than rotation_participants');
          }
        } else {
          // Ensure rotation fields are null when not a rotation
          if (validatedDuty.rotation_id || validatedDuty.rotation_participants || (validatedDuty.rotation_sequence !== null && validatedDuty.rotation_sequence !== undefined) || validatedDuty.rotation_cycle_weeks) {
            throw new Error('Rotation fields must be null when is_rotation is false');
          }
        }

        // Begin atomic transaction - create duty and calendar event together
        const newDuty = {
          ...validatedDuty,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Ensure proper field initialization
          team_member_id: validatedDuty.team_member_id,
          type: validatedDuty.type,
          title: validatedDuty.title,
          description: validatedDuty.description || null,
          start_date: validatedDuty.start_date,
          end_date: validatedDuty.end_date,
          // Session-based duplicate prevention
          creation_session_id: validatedDuty.creation_session_id || null,
          // New rotation fields
          is_rotation: validatedDuty.is_rotation || false,
          rotation_id: validatedDuty.rotation_id || null,
          rotation_participants: validatedDuty.rotation_participants || null,
          rotation_sequence: validatedDuty.rotation_sequence !== undefined ? validatedDuty.rotation_sequence : null,
          rotation_cycle_weeks: validatedDuty.rotation_cycle_weeks || null
        };

        // Atomic operation: save duty first
        duties.unshift(newDuty);
        setData('duties', duties);
        
        try {
          // Create corresponding calendar event atomically
          await localClient.entities.CalendarEvent.createDutyEvent(
            newDuty.id,
            newDuty.team_member_id,
            newDuty.title,
            newDuty.start_date,
            newDuty.end_date,
            newDuty.description
          );
          
          // Mark session as completed if session ID provided
          if (newDuty.creation_session_id) {
            sessionService.markSessionCompleted(newDuty.creation_session_id, newDuty.id);
          }
          
          // Log successful creation for audit
          try {
            await logAuditEvent(AUDIT_ACTIONS.CREATE, AUDIT_RESOURCES.DUTY, newDuty.id, {
              team_member_id: newDuty.team_member_id,
              type: newDuty.type,
              title: newDuty.title,
              session_id: newDuty.creation_session_id
            });
          } catch (auditError) {
            console.warn('Failed to log audit event:', auditError);
            // Don't fail the operation for audit logging issues
          }
          
          return newDuty;
          
        } catch (error) {
          // Atomic rollback: if calendar event creation fails, rollback the duty creation
          console.error('Failed to create calendar event for duty, rolling back:', error);
          const rollbackDuties = getData('duties').filter(d => d.id !== newDuty.id);
          setData('duties', rollbackDuties);
          
          // Clean up session if it was registered
          if (newDuty.creation_session_id) {
            const sessions = sessionService.getActiveSessions();
            delete sessions[newDuty.creation_session_id];
            sessionService.setActiveSessions(sessions);
          }
          
          throw new Error(`Failed to create duty: Calendar event creation failed - ${error.message}`);
        }
      },
      async update(id, updates) {
        const duties = getData('duties');
        const idx = duties.findIndex(d => d.id === id);
        if (idx === -1) {
          throw new Error('Duty not found');
        }

        const currentDuty = duties[idx];
        
        // Import validation utilities
        const { sanitizeFormData, validateField } = await import('../utils/dutyValidation.js');
        
        // Sanitize update data
        const sanitizedUpdates = sanitizeFormData(updates);
        
        // Validate each updated field
        const errors = {};
        Object.keys(sanitizedUpdates).forEach(fieldName => {
          if (sanitizedUpdates[fieldName] !== undefined) {
            // Create merged data for cross-field validation
            const mergedData = { ...currentDuty, ...sanitizedUpdates };
            const error = validateField(fieldName, sanitizedUpdates[fieldName], mergedData);
            if (error) {
              errors[fieldName] = error;
            }
          }
        });
        
        if (Object.keys(errors).length > 0) {
          const errorMessages = Object.entries(errors)
            .map(([field, error]) => `${field}: ${error}`)
            .join('; ');
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        
        // Use sanitized data for further processing
        const validatedUpdates = sanitizedUpdates;
        
        // Validate date range if dates are being updated
        const startDate = new Date(validatedUpdates.start_date || currentDuty.start_date);
        const endDate = new Date(validatedUpdates.end_date || currentDuty.end_date);
        if (startDate >= endDate) {
          throw new Error('start_date must be before end_date');
        }
        
        // Validate merged duty data against business rules
        const mergedDuty = { ...currentDuty, ...validatedUpdates };
        await this.validateBusinessRules(mergedDuty, duties.filter(d => d.id !== id));

        // Check for conflicts if dates, team member, type, or title are being updated
        if (validatedUpdates.start_date || validatedUpdates.end_date || validatedUpdates.team_member_id || validatedUpdates.type || validatedUpdates.title) {
          const teamMemberId = validatedUpdates.team_member_id || currentDuty.team_member_id;
          const dutyType = validatedUpdates.type || currentDuty.type;
          const dutyTitle = validatedUpdates.title || currentDuty.title;
          
          const existingDuties = duties.filter(d => 
            d.team_member_id === teamMemberId && d.id !== id
          );
          
          // Check for exact duplicates (same team member, type, title, and date range)
          const exactDuplicate = existingDuties.find(existingDuty => {
            return existingDuty.type === dutyType &&
                   existingDuty.title === dutyTitle &&
                   existingDuty.start_date === startDate.toISOString().split('T')[0] &&
                   existingDuty.end_date === endDate.toISOString().split('T')[0];
          });

          if (exactDuplicate) {
            throw new Error(`Duplicate duty detected: A duty with the same type "${dutyType}", title "${dutyTitle}", and date range already exists for this team member`);
          }

          // Check for overlapping duty periods of the same type
          const overlappingDutiesOfSameType = existingDuties.filter(existingDuty => {
            // Only check for overlaps within the same duty type
            if (existingDuty.type !== dutyType) return false;
            
            const existingStart = new Date(existingDuty.start_date);
            const existingEnd = new Date(existingDuty.end_date);
            
            // Check if date ranges overlap
            return (startDate <= existingEnd && endDate >= existingStart);
          });

          if (overlappingDutiesOfSameType.length > 0) {
            const conflictDetails = overlappingDutiesOfSameType.map(d => 
              `"${d.title}" (${d.type}) from ${d.start_date} to ${d.end_date}`
            ).join(', ');
            throw new Error(`Duty assignment conflicts with existing duties of the same type for this team member: ${conflictDetails}. Overlapping duty periods of the same type are not allowed.`);
          }
        }

        // Validate rotation-specific fields if being updated
        const isRotation = validatedUpdates.is_rotation !== undefined ? validatedUpdates.is_rotation : currentDuty.is_rotation;
        if (isRotation) {
          const rotationId = validatedUpdates.rotation_id !== undefined ? validatedUpdates.rotation_id : currentDuty.rotation_id;
          const rotationParticipants = validatedUpdates.rotation_participants !== undefined ? validatedUpdates.rotation_participants : currentDuty.rotation_participants;
          const rotationSequence = validatedUpdates.rotation_sequence !== undefined ? validatedUpdates.rotation_sequence : currentDuty.rotation_sequence;
          const rotationCycleWeeks = validatedUpdates.rotation_cycle_weeks !== undefined ? validatedUpdates.rotation_cycle_weeks : currentDuty.rotation_cycle_weeks;

          if (!rotationId) {
            throw new Error('rotation_id is required when is_rotation is true');
          }
          if (typeof rotationParticipants !== 'number' || rotationParticipants < 2) {
            throw new Error('rotation_participants must be a number >= 2 when is_rotation is true');
          }
          if (typeof rotationSequence !== 'number' || rotationSequence < 0) {
            throw new Error('rotation_sequence must be a number >= 0 when is_rotation is true');
          }
          if (typeof rotationCycleWeeks !== 'number' || rotationCycleWeeks < 1) {
            throw new Error('rotation_cycle_weeks must be a number >= 1 when is_rotation is true');
          }
          if (rotationSequence >= rotationParticipants) {
            throw new Error('rotation_sequence must be less than rotation_participants');
          }
        } else if (validatedUpdates.is_rotation === false) {
          // When explicitly setting is_rotation to false, ensure rotation fields are cleared
          if (validatedUpdates.rotation_id || validatedUpdates.rotation_participants || (validatedUpdates.rotation_sequence !== null && validatedUpdates.rotation_sequence !== undefined) || validatedUpdates.rotation_cycle_weeks) {
            throw new Error('Rotation fields must be null when is_rotation is false');
          }
        }

        const updatedDuty = {
          ...currentDuty,
          ...validatedUpdates,
          updated_date: new Date().toISOString()
        };

        duties[idx] = updatedDuty;
        setData('duties', duties);
        return updatedDuty;
      },
      async delete(id) {
        let duties = getData('duties');
        const dutyExists = duties.some(d => d.id === id);
        if (!dutyExists) {
          throw new Error('Duty not found');
        }
        
        duties = duties.filter(d => d.id !== id);
        setData('duties', duties);
        return true;
      },
      async getByTeamMember(teamMemberId) {
        const duties = getData('duties');
        return duties.filter(d => d.team_member_id === teamMemberId);
      },
      async getActiveForDate(date) {
        const duties = getData('duties');
        const targetDate = new Date(date);
        return duties.filter(d => {
          const startDate = new Date(d.start_date);
          const endDate = new Date(d.end_date);
          return targetDate >= startDate && targetDate <= endDate;
        });
      },
      async getConflicts(teamMemberId, startDate, endDate, excludeId = null) {
        const duties = getData('duties');
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return duties.filter(duty => {
          if (excludeId && duty.id === excludeId) return false;
          if (duty.team_member_id !== teamMemberId) return false;
          
          const dutyStart = new Date(duty.start_date);
          const dutyEnd = new Date(duty.end_date);
          
          // Check if date ranges overlap
          return (start <= dutyEnd && end >= dutyStart);
        });
      },
      async checkForDuplicates(dutyData, excludeId = null) {
        const duties = getData('duties');
        const warnings = [];
        const start = new Date(dutyData.start_date);
        const end = new Date(dutyData.end_date);
        
        // Optimized filtering with early returns for better performance
        const teamMemberDuties = duties.filter(duty => {
          // Quick exclusion checks first
          if (excludeId && duty.id === excludeId) return false;
          if (duty.team_member_id !== dutyData.team_member_id) return false;
          
          // Pre-filter by date range to reduce processing
          const dutyStart = new Date(duty.start_date);
          const dutyEnd = new Date(duty.end_date);
          
          // Only include duties that could potentially conflict
          return (start <= dutyEnd && end >= dutyStart) || 
                 (duty.type === dutyData.type && duty.title === dutyData.title);
        });
        
        // Optimized duplicate checking with single pass through duties
        const exactDuplicates = [];
        const sameTypeOverlaps = [];
        const generalOverlaps = [];
        
        // Single pass through filtered duties for better performance
        for (const duty of teamMemberDuties) {
          const dutyStart = new Date(duty.start_date);
          const dutyEnd = new Date(duty.end_date);
          const hasDateOverlap = (start <= dutyEnd && end >= dutyStart);
          
          // Check for exact duplicates
          if (duty.type === dutyData.type &&
              duty.title === dutyData.title &&
              duty.start_date === dutyData.start_date &&
              duty.end_date === dutyData.end_date) {
            exactDuplicates.push(duty);
          }
          // Check for same type overlaps (excluding exact duplicates)
          else if (duty.type === dutyData.type && hasDateOverlap) {
            sameTypeOverlaps.push(duty);
          }
          // Check for general overlaps (different types)
          else if (duty.type !== dutyData.type && hasDateOverlap) {
            generalOverlaps.push(duty);
          }
        }
        
        // Add warnings based on findings
        if (exactDuplicates.length > 0) {
          warnings.push({
            type: 'exact_duplicate',
            severity: 'high',
            message: 'An identical duty assignment already exists',
            conflictingDuties: exactDuplicates,
            details: `Exact match found: ${dutyData.type} - ${dutyData.title} for the same dates`
          });
        }
        
        if (sameTypeOverlaps.length > 0) {
          warnings.push({
            type: 'same_type_overlap',
            severity: 'high',
            message: 'Overlapping duties of the same type detected',
            conflictingDuties: sameTypeOverlaps,
            details: `${dutyData.type} duties cannot overlap for the same team member`
          });
        }
        
        if (generalOverlaps.length > 0) {
          warnings.push({
            type: 'overlapping_dates',
            severity: 'medium',
            message: 'Overlapping duty periods detected',
            conflictingDuties: generalOverlaps,
            details: 'Multiple duties assigned to the same team member during overlapping periods'
          });
        }
        
        // Check for session-based duplicates
        if (dutyData.creation_session_id) {
          const sessionDuplicates = duties.filter(duty => 
            duty.creation_session_id === dutyData.creation_session_id
          );
          
          if (sessionDuplicates.length > 0) {
            warnings.push({
              type: 'session_duplicate',
              severity: 'high',
              message: 'Duplicate submission detected',
              conflictingDuties: sessionDuplicates,
              details: 'This duty may have already been created in this session'
            });
          }
        }
        
        return warnings;
      },
      
      // Server-side business rules validation
      async validateBusinessRules(dutyData, existingDuties = null) {
        const duties = existingDuties || getData('duties');
        
        // Validate team member exists
        const teamMembers = getData('team_members');
        const teamMemberExists = teamMembers.some(tm => tm.id === dutyData.team_member_id);
        if (!teamMemberExists) {
          throw new Error('Invalid team member: Team member does not exist');
        }
        
        // Validate duty type and title combination
        const validCombinations = {
          'devops': ['DevOps'],
          'on_call': ['Reporting', 'Metering'],
          'other': ['Reporting', 'Metering', 'DevOps']
        };
        
        if (!validCombinations[dutyData.type]?.includes(dutyData.title)) {
          throw new Error(`Invalid combination: ${dutyData.type} duties cannot have title "${dutyData.title}"`);
        }
        
        // Validate date constraints
        const startDate = new Date(dutyData.start_date);
        const endDate = new Date(dutyData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check minimum duty period (at least 1 day)
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysDiff < 1) {
          throw new Error('Duty period must be at least 1 day');
        }
        
        // Check maximum duty period (1 year)
        if (daysDiff > 365) {
          throw new Error('Duty period cannot exceed 1 year');
        }
        
        // Weekend duty validation for on-call duties
        if (dutyData.type === 'on_call') {
          const startDayOfWeek = startDate.getDay();
          if (startDayOfWeek === 0 || startDayOfWeek === 6) {
            // This is a warning, not an error - log it but don't throw
            console.warn('On-call duty starting on weekend may require additional approval');
          }
        }
        
        // Validate against existing duties for conflicts
        const conflicts = duties.filter(existingDuty => {
          if (existingDuty.team_member_id !== dutyData.team_member_id) return false;
          
          const existingStart = new Date(existingDuty.start_date);
          const existingEnd = new Date(existingDuty.end_date);
          
          // Check for date overlap
          return (startDate <= existingEnd && endDate >= existingStart);
        });
        
        // Check for same-type conflicts (high severity)
        const sameTypeConflicts = conflicts.filter(conflict => conflict.type === dutyData.type);
        if (sameTypeConflicts.length > 0) {
          const conflictDetails = sameTypeConflicts.map(c => 
            `"${c.title}" from ${c.start_date} to ${c.end_date}`
          ).join(', ');
          throw new Error(`Duty conflicts with existing ${dutyData.type} duties: ${conflictDetails}`);
        }
        
        return true;
      }
    },
    DutyRotation: {
      async list() {
        return getData('duty_rotations');
      },
      async get(id) {
        const rotations = getData('duty_rotations');
        return rotations.find(r => r.id === id) || null;
      },
      async create(rotation) {
        const rotations = getData('duty_rotations');
        
        // Validate required fields
        if (!rotation.name) {
          throw new Error('name is required');
        }
        if (!rotation.type) {
          throw new Error('type is required');
        }
        if (!rotation.participants || !Array.isArray(rotation.participants)) {
          throw new Error('participants must be an array');
        }
        if (rotation.participants.length < 2) {
          throw new Error('rotation must have at least 2 participants');
        }
        if (typeof rotation.cycle_weeks !== 'number' || rotation.cycle_weeks < 1) {
          throw new Error('cycle_weeks must be a number >= 1');
        }

        // Validate rotation type
        const validTypes = ['Reporting', 'Metering', 'DevOps'];
        if (!validTypes.includes(rotation.type)) {
          throw new Error(`Invalid rotation type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate that all participants exist
        const teamMembers = getData('team_members');
        const teamMemberIds = teamMembers.map(tm => tm.id);
        const invalidParticipants = rotation.participants.filter(p => !teamMemberIds.includes(p));
        if (invalidParticipants.length > 0) {
          throw new Error(`Invalid participants: ${invalidParticipants.join(', ')} do not exist`);
        }

        // Check for duplicate participants
        const uniqueParticipants = [...new Set(rotation.participants)];
        if (uniqueParticipants.length !== rotation.participants.length) {
          throw new Error('Duplicate participants are not allowed in a rotation');
        }

        // Validate current_assignee_index
        const currentAssigneeIndex = rotation.current_assignee_index || 0;
        if (currentAssigneeIndex < 0 || currentAssigneeIndex >= rotation.participants.length) {
          throw new Error('current_assignee_index must be within the range of participants');
        }

        const newRotation = {
          ...rotation,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize with defaults
          current_assignee_index: currentAssigneeIndex,
          next_rotation_date: rotation.next_rotation_date || null,
          is_active: rotation.is_active !== undefined ? rotation.is_active : true
        };

        rotations.unshift(newRotation);
        setData('duty_rotations', rotations);
        return newRotation;
      },
      async update(id, updates) {
        const rotations = getData('duty_rotations');
        const idx = rotations.findIndex(r => r.id === id);
        if (idx === -1) {
          throw new Error('DutyRotation not found');
        }

        const currentRotation = rotations[idx];

        // Validate rotation type if being updated
        if (updates.type) {
          const validTypes = ['Reporting', 'Metering', 'DevOps'];
          if (!validTypes.includes(updates.type)) {
            throw new Error(`Invalid rotation type. Must be one of: ${validTypes.join(', ')}`);
          }
        }

        // Validate participants if being updated
        if (updates.participants) {
          if (!Array.isArray(updates.participants)) {
            throw new Error('participants must be an array');
          }
          if (updates.participants.length < 2) {
            throw new Error('rotation must have at least 2 participants');
          }

          // Validate that all participants exist
          const teamMembers = getData('team_members');
          const teamMemberIds = teamMembers.map(tm => tm.id);
          const invalidParticipants = updates.participants.filter(p => !teamMemberIds.includes(p));
          if (invalidParticipants.length > 0) {
            throw new Error(`Invalid participants: ${invalidParticipants.join(', ')} do not exist`);
          }

          // Check for duplicate participants
          const uniqueParticipants = [...new Set(updates.participants)];
          if (uniqueParticipants.length !== updates.participants.length) {
            throw new Error('Duplicate participants are not allowed in a rotation');
          }
        }

        // Validate cycle_weeks if being updated
        if (updates.cycle_weeks !== undefined) {
          if (typeof updates.cycle_weeks !== 'number' || updates.cycle_weeks < 1) {
            throw new Error('cycle_weeks must be a number >= 1');
          }
        }

        // Validate current_assignee_index if being updated
        if (updates.current_assignee_index !== undefined) {
          const participants = updates.participants || currentRotation.participants;
          if (updates.current_assignee_index < 0 || updates.current_assignee_index >= participants.length) {
            throw new Error('current_assignee_index must be within the range of participants');
          }
        }

        const updatedRotation = {
          ...currentRotation,
          ...updates,
          updated_date: new Date().toISOString()
        };

        rotations[idx] = updatedRotation;
        setData('duty_rotations', rotations);
        return updatedRotation;
      },
      async delete(id) {
        let rotations = getData('duty_rotations');
        const rotationExists = rotations.some(r => r.id === id);
        if (!rotationExists) {
          throw new Error('DutyRotation not found');
        }

        rotations = rotations.filter(r => r.id !== id);
        setData('duty_rotations', rotations);
        return true;
      },
      async getByType(type) {
        const rotations = getData('duty_rotations');
        return rotations.filter(r => r.type === type);
      },
      async getActive() {
        const rotations = getData('duty_rotations');
        return rotations.filter(r => r.is_active);
      },
      async getCurrentAssignee(id) {
        const rotation = await this.get(id);
        if (!rotation) {
          throw new Error('DutyRotation not found');
        }
        
        const currentParticipantId = rotation.participants[rotation.current_assignee_index];
        const teamMembers = getData('team_members');
        return teamMembers.find(tm => tm.id === currentParticipantId) || null;
      },
      async getNextAssignee(id) {
        const rotation = await this.get(id);
        if (!rotation) {
          throw new Error('DutyRotation not found');
        }
        
        const nextIndex = (rotation.current_assignee_index + 1) % rotation.participants.length;
        const nextParticipantId = rotation.participants[nextIndex];
        const teamMembers = getData('team_members');
        return teamMembers.find(tm => tm.id === nextParticipantId) || null;
      },
      async advanceRotation(id) {
        const rotation = await this.get(id);
        if (!rotation) {
          throw new Error('DutyRotation not found');
        }

        const nextIndex = (rotation.current_assignee_index + 1) % rotation.participants.length;
        const nextRotationDate = new Date();
        nextRotationDate.setDate(nextRotationDate.getDate() + (rotation.cycle_weeks * 7));

        return await this.update(id, {
          current_assignee_index: nextIndex,
          next_rotation_date: nextRotationDate.toISOString()
        });
      }
    },
    AgendaItem: {
      async list() {
        return getData('agenda_items');
      },
      async get(id) {
        const items = getData('agenda_items');
        return items.find(item => item.id === id) || null;
      },
      async create(agendaItem) {
        const items = getData('agenda_items');
        const newItem = {
          ...agendaItem,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Initialize with defaults
          status: agendaItem.status || 'pending',
          priority: agendaItem.priority || 2,
          tags: agendaItem.tags || []
        };
        items.unshift(newItem);
        setData('agenda_items', items);
        return newItem;
      },
      async update(id, updates) {
        const items = getData('agenda_items');
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
          items[idx] = {
            ...items[idx],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          setData('agenda_items', items);
          return items[idx];
        }
        throw new Error('AgendaItem not found');
      },
      async delete(id) {
        let items = getData('agenda_items');
        items = items.filter(item => item.id !== id);
        setData('agenda_items', items);
        return true;
      },
      async getByTeamMember(teamMemberId) {
        const items = getData('agenda_items');
        return items.filter(item => item.teamMemberId === teamMemberId);
      },
      async getByStatus(status) {
        const items = getData('agenda_items');
        return items.filter(item => item.status === status);
      },
      async getForNextMeeting(teamMemberId) {
        const items = getData('agenda_items');
        return items.filter(item => 
          item.teamMemberId === teamMemberId && 
          item.status === 'pending'
        );
      }
    },
    PersonalFileItem: {
      async list() {
        const currentUser = checkAccess('READ', 'personal_file_items');
        const items = getData('personal_file_items');
        
        // Filter to only show items created by current user
        const userItems = items.filter(item => item.createdBy === currentUser);
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'all', {
          operation: 'list',
          itemCount: userItems.length
        });
        
        return userItems;
      },
      async get(id) {
        const currentUser = checkAccess('READ', 'personal_file_items');
        const items = getData('personal_file_items');
        const item = items.find(item => item.id === id);
        
        if (!item) {
          return null;
        }
        
        // Check access control
        if (item.createdBy !== currentUser) {
          throw new Error('Access denied: You can only access your own personal file items');
        }
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, id, {
          operation: 'get',
          teamMemberId: item.teamMemberId
        });
        
        return item;
      },
      async create(personalFileItem) {
        const currentUser = checkAccess('CREATE', 'personal_file_items');
        const items = getData('personal_file_items');
        const newItem = {
          ...personalFileItem,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser, // Add access control field
          // Initialize with defaults
          category: personalFileItem.category || 'general',
          tags: personalFileItem.tags || [],
          importance: personalFileItem.importance || 3
        };
        items.unshift(newItem);
        setData('personal_file_items', items);
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.CREATE, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, newItem.id, {
          operation: 'create',
          teamMemberId: newItem.teamMemberId,
          category: newItem.category,
          importance: newItem.importance
        });
        
        return newItem;
      },
      async update(id, updates) {
        const currentUser = checkAccess('UPDATE', 'personal_file_items');
        const items = getData('personal_file_items');
        const idx = items.findIndex(item => item.id === id);
        
        if (idx === -1) {
          throw new Error('PersonalFileItem not found');
        }
        
        const existingItem = items[idx];
        
        // Check access control
        if (existingItem.createdBy !== currentUser) {
          throw new Error('Access denied: You can only update your own personal file items');
        }
        
        const updatedItem = {
          ...existingItem,
          ...updates,
          updatedAt: new Date().toISOString(),
          createdBy: existingItem.createdBy // Preserve original creator
        };
        
        items[idx] = updatedItem;
        setData('personal_file_items', items);
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, id, {
          operation: 'update',
          teamMemberId: updatedItem.teamMemberId,
          changes: Object.keys(updates)
        });
        
        return updatedItem;
      },
      async delete(id) {
        const currentUser = checkAccess('DELETE', 'personal_file_items');
        let items = getData('personal_file_items');
        const itemToDelete = items.find(item => item.id === id);
        
        if (!itemToDelete) {
          throw new Error('PersonalFileItem not found');
        }
        
        // Check access control
        if (itemToDelete.createdBy !== currentUser) {
          throw new Error('Access denied: You can only delete your own personal file items');
        }
        
        items = items.filter(item => item.id !== id);
        setData('personal_file_items', items);
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.DELETE, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, id, {
          operation: 'delete',
          teamMemberId: itemToDelete.teamMemberId,
          category: itemToDelete.category
        });
        
        return true;
      },
      async getByTeamMember(teamMemberId) {
        const currentUser = checkAccess('READ', 'personal_file_items');
        const items = getData('personal_file_items');
        const userItems = items.filter(item => 
          item.teamMemberId === teamMemberId && item.createdBy === currentUser
        );
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'team_member', {
          operation: 'getByTeamMember',
          teamMemberId,
          itemCount: userItems.length
        });
        
        return userItems;
      },
      async getByCategory(category) {
        const currentUser = checkAccess('READ', 'personal_file_items');
        const items = getData('personal_file_items');
        const userItems = items.filter(item => 
          item.category === category && item.createdBy === currentUser
        );
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'category', {
          operation: 'getByCategory',
          category,
          itemCount: userItems.length
        });
        
        return userItems;
      },
      async searchByTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) {
          return [];
        }
        
        const currentUser = checkAccess('READ', 'personal_file_items');
        const items = getData('personal_file_items');
        const userItems = items.filter(item => 
          item.createdBy === currentUser &&
          item.tags && item.tags.some(tag => tags.includes(tag))
        );
        
        // Log audit event
        logAuditEvent(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'tags', {
          operation: 'searchByTags',
          tags,
          itemCount: userItems.length
        });
        
        return userItems;
      }
    },
    EmployeeGoal: {
      async list() {
        return getData('employee_goals');
      },
      async get(id) {
        const goals = getData('employee_goals');
        return goals.find(g => g.id === id) || null;
      },
      async create(goal) {
        const goals = getData('employee_goals');
        
        // Validate required fields
        if (!goal.employeeId) {
          throw new Error('employeeId is required');
        }
        if (!goal.title) {
          throw new Error('title is required');
        }
        if (!goal.developmentNeed) {
          throw new Error('developmentNeed is required');
        }
        if (!goal.developmentActivity) {
          throw new Error('developmentActivity is required');
        }
        if (!goal.developmentGoalDescription) {
          throw new Error('developmentGoalDescription is required');
        }

        const newGoal = {
          ...goal,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Initialize with defaults
          status: goal.status || 'active',
          importSource: goal.importSource || null
        };

        goals.unshift(newGoal);
        setData('employee_goals', goals);
        return newGoal;
      },
      async update(id, updates) {
        const goals = getData('employee_goals');
        const idx = goals.findIndex(g => g.id === id);
        if (idx !== -1) {
          const updatedGoal = {
            ...goals[idx],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          goals[idx] = updatedGoal;
          setData('employee_goals', goals);
          return updatedGoal;
        }
        throw new Error('Employee goal not found');
      },
      async delete(id) {
        let goals = getData('employee_goals');
        const goalExists = goals.some(g => g.id === id);
        if (!goalExists) {
          throw new Error('Employee goal not found');
        }
        goals = goals.filter(g => g.id !== id);
        setData('employee_goals', goals);
        return true;
      },
      async getByTeamMember(teamMemberId) {
        const goals = getData('employee_goals');
        return goals.filter(g => g.employeeId === teamMemberId);
      },
      async getByStatus(status) {
        const goals = getData('employee_goals');
        return goals.filter(g => g.status === status);
      },
      async search(searchText) {
        if (!searchText) return [];
        const goals = getData('employee_goals');
        const searchLower = searchText.toLowerCase();
        return goals.filter(goal => {
          const titleMatch = goal.title?.toLowerCase().includes(searchLower);
          const descriptionMatch = goal.developmentGoalDescription?.toLowerCase().includes(searchLower);
          const needMatch = goal.developmentNeed?.toLowerCase().includes(searchLower);
          const activityMatch = goal.developmentActivity?.toLowerCase().includes(searchLower);
          return titleMatch || descriptionMatch || needMatch || activityMatch;
        });
      }
    }
  },
  
  // Migration functions for data model updates
  migrations: {
    async migrateDutiesForRotationSupport() {
      const duties = getData('duties');
      let migrationCount = 0;
      
      const migratedDuties = duties.map(duty => {
        // Check if duty already has rotation fields
        if (duty.is_rotation !== undefined) {
          return duty; // Already migrated
        }
        
        // Add rotation fields with default values
        migrationCount++;
        return {
          ...duty,
          is_rotation: false,
          rotation_id: null,
          rotation_participants: null,
          rotation_sequence: null,
          rotation_cycle_weeks: null,
          updated_date: new Date().toISOString()
        };
      });
      
      if (migrationCount > 0) {
        setData('duties', migratedDuties);
        console.log(`Migrated ${migrationCount} duties to support rotation fields`);
      }
      
      return {
        migrated: migrationCount,
        total: duties.length
      };
    },
    
    async validateRotationDataIntegrity() {
      const duties = getData('duties');
      const rotations = getData('duty_rotations');
      const issues = [];
      
      // Check for rotation duties without corresponding rotation records
      const rotationDuties = duties.filter(d => d.is_rotation);
      for (const duty of rotationDuties) {
        if (!duty.rotation_id) {
          issues.push({
            type: 'missing_rotation_id',
            duty: duty,
            message: `Rotation duty ${duty.id} is missing rotation_id`
          });
          continue;
        }
        
        const correspondingRotation = rotations.find(r => r.id === duty.rotation_id);
        if (!correspondingRotation) {
          issues.push({
            type: 'orphaned_rotation_duty',
            duty: duty,
            message: `Rotation duty ${duty.id} references non-existent rotation ${duty.rotation_id}`
          });
        }
      }
      
      // Check for rotation records without corresponding duties
      for (const rotation of rotations) {
        const correspondingDuties = duties.filter(d => d.rotation_id === rotation.id);
        if (correspondingDuties.length === 0) {
          issues.push({
            type: 'unused_rotation',
            rotation: rotation,
            message: `Rotation ${rotation.id} has no corresponding duties`
          });
        }
      }
      
      return issues;
    },
    
    async cleanupRotationData() {
      const duties = getData('duties');
      const rotations = getData('duty_rotations');
      let cleanupCount = 0;
      
      // Remove rotation records that have no corresponding duties
      const activeRotationIds = new Set(
        duties.filter(d => d.is_rotation && d.rotation_id).map(d => d.rotation_id)
      );
      
      const cleanedRotations = rotations.filter(rotation => {
        if (activeRotationIds.has(rotation.id)) {
          return true;
        } else {
          cleanupCount++;
          console.log(`Removing unused rotation: ${rotation.name} (${rotation.id})`);
          return false;
        }
      });
      
      if (cleanupCount > 0) {
        setData('duty_rotations', cleanedRotations);
      }
      
      return {
        removed: cleanupCount,
        remaining: cleanedRotations.length
      };
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
