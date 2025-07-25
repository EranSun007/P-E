// test-enhanced-calendar-events.js
// Integration test for CalendarEventGenerationService

import { CalendarEventGenerationService } from './src/services/calendarEventGenerationService.js';
import { TeamMember, Duty, OutOfOffice, CalendarEvent } from './src/api/entities.js';

async function testCalendarEventGeneration() {
  console.log('🧪 Testing Calendar Event Generation Service...\n');

  try {
    // Test 1: Create a team member with birthday
    console.log('1. Creating team member with birthday...');
    const teamMember = await TeamMember.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Developer',
      birthday: '1990-05-15T00:00:00.000Z'
    });
    console.log(`✅ Created team member: ${teamMember.name} (${teamMember.id})`);

    // Test 2: Generate birthday events
    console.log('\n2. Generating birthday events...');
    const birthdayEvents = await CalendarEventGenerationService.generateBirthdayEvents([teamMember]);
    console.log(`✅ Generated ${birthdayEvents.length} birthday events`);
    if (birthdayEvents.length > 0) {
      console.log(`   - ${birthdayEvents[0].title} on ${new Date(birthdayEvents[0].start_date).toDateString()}`);
    }

    // Test 3: Create a duty assignment
    console.log('\n3. Creating duty assignment...');
    const duty = await Duty.create({
      team_member_id: teamMember.id,
      type: 'devops',
      title: 'DevOps Duty Week 1',
      description: 'Weekly DevOps duty rotation',
      start_date: '2024-01-01T00:00:00.000Z',
      end_date: '2024-01-07T23:59:59.999Z'
    });
    console.log(`✅ Created duty: ${duty.title} (${duty.id})`);

    // Test 4: Convert duty to calendar event
    console.log('\n4. Converting duty to calendar event...');
    const dutyEvent = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);
    console.log(`✅ Created duty calendar event: ${dutyEvent.title} (${dutyEvent.id})`);

    // Test 5: Create out-of-office period
    console.log('\n5. Creating out-of-office period...');
    const outOfOffice = await OutOfOffice.create({
      team_member_id: teamMember.id,
      type: 'vacation',
      start_date: '2024-02-01T00:00:00.000Z',
      end_date: '2024-02-05T23:59:59.999Z',
      description: 'Winter vacation'
    });
    console.log(`✅ Created out-of-office: ${outOfOffice.type} (${outOfOffice.id})`);

    // Test 6: Convert out-of-office to calendar event
    console.log('\n6. Converting out-of-office to calendar event...');
    const oooEvent = await CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(outOfOffice);
    console.log(`✅ Created out-of-office calendar event: ${oooEvent.title} (${oooEvent.id})`);

    // Test 7: Synchronize all events
    console.log('\n7. Synchronizing all calendar events...');
    const syncResults = await CalendarEventGenerationService.synchronizeAllEvents();
    console.log(`✅ Synchronization completed:`);
    console.log(`   - Birthday events: ${syncResults.birthdayEvents.length}`);
    console.log(`   - Duty events: ${syncResults.dutyEvents.length}`);
    console.log(`   - Out-of-office events: ${syncResults.outOfOfficeEvents.length}`);
    console.log(`   - Total created: ${syncResults.summary.totalCreated}`);
    console.log(`   - Total errors: ${syncResults.summary.totalErrors}`);

    // Test 8: List all calendar events
    console.log('\n8. Listing all calendar events...');
    const allEvents = await CalendarEvent.list();
    console.log(`✅ Total calendar events: ${allEvents.length}`);
    
    const eventsByType = allEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('   Event types:');
    Object.entries(eventsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    // Test 9: Update duty and sync calendar event
    console.log('\n9. Testing duty update and calendar sync...');
    const updatedDuty = await Duty.update(duty.id, {
      title: 'Updated DevOps Duty Week 1',
      description: 'Updated weekly DevOps duty rotation'
    });
    
    const updatedEvent = await CalendarEventGenerationService.updateCalendarEventFromSource(
      'duty', 
      duty.id, 
      updatedDuty
    );
    console.log(`✅ Updated calendar event: ${updatedEvent.title} (${updatedEvent.id})`);

    console.log('\n🎉 All tests completed successfully!');
    
    return {
      success: true,
      teamMember,
      duty,
      outOfOffice,
      birthdayEvents,
      dutyEvent,
      oooEvent,
      syncResults,
      allEvents: allEvents.length
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testCalendarEventGeneration()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Integration test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Integration test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });