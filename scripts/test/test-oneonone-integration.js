// test-oneonone-integration.js
// Manual test script to verify OneOnOne calendar integration

import { localClient } from './src/api/localClient.js';

// Mock localStorage for testing
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

async function testOneOnOneIntegration() {
  console.log('🧪 Testing OneOnOne Calendar Integration...\n');

  try {
    // Clear any existing data
    localStorage.clear();

    // 1. Create a team member first
    console.log('1. Creating team member...');
    const teamMember = await localClient.entities.TeamMember.create({
      name: 'John Smith',
      email: 'john.smith@example.com',
      role: 'Developer'
    });
    console.log('✅ Team member created:', teamMember.name);

    // 2. Create OneOnOne without next_meeting_date
    console.log('\n2. Creating OneOnOne without next_meeting_date...');
    const oneOnOne1 = await localClient.entities.OneOnOne.create({
      team_member_id: teamMember.id,
      date: new Date().toISOString(),
      notes: 'First meeting notes',
      mood: 'good'
    });
    console.log('✅ OneOnOne created without calendar event');
    console.log('   next_meeting_calendar_event_id:', oneOnOne1.next_meeting_calendar_event_id);

    // 3. Create OneOnOne with next_meeting_date
    console.log('\n3. Creating OneOnOne with next_meeting_date...');
    const nextMeetingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now
    const oneOnOne2 = await localClient.entities.OneOnOne.create({
      team_member_id: teamMember.id,
      date: new Date().toISOString(),
      notes: 'Second meeting notes',
      mood: 'great',
      next_meeting_date: nextMeetingDate
    });
    console.log('✅ OneOnOne created with calendar event');
    console.log('   next_meeting_calendar_event_id:', oneOnOne2.next_meeting_calendar_event_id);

    // 4. Update OneOnOne to add next_meeting_date
    console.log('\n4. Updating first OneOnOne to add next_meeting_date...');
    const updatedMeetingDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks from now
    const updatedOneOnOne1 = await localClient.entities.OneOnOne.update(oneOnOne1.id, {
      next_meeting_date: updatedMeetingDate
    });
    console.log('✅ OneOnOne updated with calendar event');
    console.log('   next_meeting_calendar_event_id:', updatedOneOnOne1.next_meeting_calendar_event_id);

    // 5. Update OneOnOne to change next_meeting_date
    console.log('\n5. Updating OneOnOne to change next_meeting_date...');
    const newMeetingDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days from now
    const updatedOneOnOne2 = await localClient.entities.OneOnOne.update(oneOnOne2.id, {
      next_meeting_date: newMeetingDate
    });
    console.log('✅ OneOnOne updated with new meeting date');
    console.log('   Calendar event should be updated');

    // 6. Clear next_meeting_date
    console.log('\n6. Clearing next_meeting_date...');
    const clearedOneOnOne = await localClient.entities.OneOnOne.update(oneOnOne2.id, {
      next_meeting_date: null
    });
    console.log('✅ OneOnOne next_meeting_date cleared');
    console.log('   next_meeting_calendar_event_id:', clearedOneOnOne.next_meeting_calendar_event_id);

    // 7. Delete OneOnOne with calendar event
    console.log('\n7. Deleting OneOnOne with calendar event...');
    await localClient.entities.OneOnOne.delete(updatedOneOnOne1.id);
    console.log('✅ OneOnOne deleted (calendar event should be cleaned up)');

    // 8. Check calendar events
    console.log('\n8. Checking calendar events...');
    const calendarEvents = await localClient.entities.CalendarEvent.list();
    console.log('📅 Calendar events count:', calendarEvents.length);
    calendarEvents.forEach(event => {
      console.log(`   - ${event.title} (${event.event_type})`);
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testOneOnOneIntegration();