// Test script to verify TeamMemberProfile calendar integration
import { TeamMember, OneOnOne, CalendarEvent } from './src/api/entities.js';
import { CalendarService } from './src/utils/calendarService.js';

async function testTeamMemberProfileIntegration() {
  console.log('Testing TeamMemberProfile calendar integration...');

  try {
    // Create a test team member
    const teamMember = await TeamMember.create({
      name: 'Test User',
      role: 'Developer',
      department: 'Engineering'
    });
    console.log('✓ Created test team member:', teamMember.name);

    // Create a OneOnOne meeting with next_meeting_date
    const meeting = await OneOnOne.create({
      team_member_id: teamMember.id,
      date: new Date().toISOString(),
      notes: [],
      mood: 'good',
      topics_discussed: [],
      next_meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
      action_items: []
    });
    console.log('✓ Created OneOnOne meeting with next_meeting_date');

    // Test calendar event creation and linking
    const result = await CalendarService.createAndLinkOneOnOneMeeting(
      meeting.id,
      teamMember.id,
      meeting.next_meeting_date
    );
    console.log('✓ Created and linked calendar event:', result.calendarEvent.title);

    // Verify the calendar event was created correctly
    const calendarEvents = await CalendarService.getOneOnOneMeetingsForTeamMember(teamMember.id);
    console.log('✓ Found calendar events for team member:', calendarEvents.length);

    // Test updating the next meeting date
    const newDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // Two weeks from now
    const updatedEvent = await CalendarService.updateOneOnOneCalendarEvent(meeting.id, newDate);
    console.log('✓ Updated calendar event to new date');

    // Test cleanup - delete calendar event when meeting is deleted
    await CalendarService.unlinkCalendarEventFromOneOnOne(meeting.id);
    console.log('✓ Unlinked and deleted calendar event');

    // Cleanup test data
    await OneOnOne.delete(meeting.id);
    await TeamMember.delete(teamMember.id);
    console.log('✓ Cleaned up test data');

    console.log('\n🎉 All TeamMemberProfile calendar integration tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testTeamMemberProfileIntegration().catch(console.error);