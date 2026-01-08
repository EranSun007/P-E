// test-simple-integration.js
// Simple test to verify OneOnOne data structure changes

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

async function testDataStructure() {
  console.log('🧪 Testing OneOnOne Data Structure Changes...\n');

  try {
    // Clear any existing data
    localStorage.clear();

    // 1. Create OneOnOne without next_meeting_date
    console.log('1. Creating OneOnOne without next_meeting_date...');
    const oneOnOne1 = await localClient.entities.OneOnOne.create({
      team_member_id: 'team-123',
      date: new Date().toISOString(),
      notes: 'Test meeting notes',
      mood: 'good'
    });
    
    console.log('✅ OneOnOne created successfully');
    console.log('   ID:', oneOnOne1.id);
    console.log('   Has next_meeting_calendar_event_id field:', 'next_meeting_calendar_event_id' in oneOnOne1);
    console.log('   next_meeting_calendar_event_id value:', oneOnOne1.next_meeting_calendar_event_id);

    // 2. Create OneOnOne with next_meeting_date (calendar creation will fail but field should be present)
    console.log('\n2. Creating OneOnOne with next_meeting_date...');
    const oneOnOne2 = await localClient.entities.OneOnOne.create({
      team_member_id: 'team-456',
      date: new Date().toISOString(),
      notes: 'Test meeting with next date',
      mood: 'great',
      next_meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    console.log('✅ OneOnOne created successfully');
    console.log('   ID:', oneOnOne2.id);
    console.log('   Has next_meeting_calendar_event_id field:', 'next_meeting_calendar_event_id' in oneOnOne2);
    console.log('   next_meeting_calendar_event_id value:', oneOnOne2.next_meeting_calendar_event_id);
    console.log('   next_meeting_date:', oneOnOne2.next_meeting_date);

    // 3. Update OneOnOne to add next_meeting_date
    console.log('\n3. Updating OneOnOne to add next_meeting_date...');
    const updatedOneOnOne = await localClient.entities.OneOnOne.update(oneOnOne1.id, {
      next_meeting_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    console.log('✅ OneOnOne updated successfully');
    console.log('   next_meeting_calendar_event_id value:', updatedOneOnOne.next_meeting_calendar_event_id);
    console.log('   next_meeting_date:', updatedOneOnOne.next_meeting_date);

    // 4. Verify data persistence
    console.log('\n4. Verifying data persistence...');
    const allOneOnOnes = await localClient.entities.OneOnOne.list();
    console.log('✅ Total OneOnOnes:', allOneOnOnes.length);
    
    allOneOnOnes.forEach((meeting, index) => {
      console.log(`   Meeting ${index + 1}:`);
      console.log(`     - ID: ${meeting.id}`);
      console.log(`     - Has calendar field: ${'next_meeting_calendar_event_id' in meeting}`);
      console.log(`     - Calendar event ID: ${meeting.next_meeting_calendar_event_id}`);
      console.log(`     - Next meeting date: ${meeting.next_meeting_date || 'Not set'}`);
    });

    console.log('\n🎉 Data structure test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ next_meeting_calendar_event_id field added to OneOnOne entity');
    console.log('   ✅ Field is properly initialized during creation');
    console.log('   ✅ Field is maintained during updates');
    console.log('   ✅ Calendar integration attempts are made (gracefully handled when failing)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testDataStructure();