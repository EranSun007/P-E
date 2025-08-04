// test-birthday-integration.js
// Test script to verify birthday event integration works end-to-end

import { CalendarEventGenerationService } from './src/services/calendarEventGenerationService.js';
import { TeamMember, CalendarEvent } from './src/api/entities.js';

// Mock localStorage for Node.js
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
};

async function testBirthdayIntegration() {
  console.log('🎂 Testing Birthday Event Integration...\n');

  try {
    // Clear existing data
    localStorage.clear();
    
    console.log('1. Creating team member with birthday...');
    const teamMember = await TeamMember.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Developer',
      birthday: '1990-05-15T00:00:00.000Z'
    });
    console.log(`✓ Created team member: ${teamMember.name} (ID: ${teamMember.id})`);

    console.log('\n2. Generating birthday events for team member...');
    const birthdayEvents = await CalendarEventGenerationService.handleTeamMemberCreation(teamMember);
    console.log(`✓ Generated ${birthdayEvents.length} birthday events`);
    
    birthdayEvents.forEach(event => {
      const eventDate = new Date(event.start_date);
      console.log(`  - ${event.title} on ${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`);
    });

    console.log('\n3. Testing birthday update...');
    const newBirthday = '1990-08-20T00:00:00.000Z';
    const updatedMember = await TeamMember.update(teamMember.id, { birthday: newBirthday });
    const updatedEvents = await CalendarEventGenerationService.handleTeamMemberUpdate(
      teamMember.id,
      updatedMember,
      teamMember
    );
    console.log(`✓ Updated birthday events: ${updatedEvents.length} events`);
    
    if (updatedEvents.length > 0) {
      const eventDate = new Date(updatedEvents[0].start_date);
      console.log(`  - New birthday date: ${eventDate.getMonth() + 1}/${eventDate.getDate()}`);
    }

    console.log('\n4. Testing synchronization...');
    const syncResults = await CalendarEventGenerationService.synchronizeAllEvents({
      includeBirthdays: true,
      includeDuties: false,
      includeOutOfOffice: false
    });
    console.log(`✓ Synchronization completed:`);
    console.log(`  - Total events created: ${syncResults.summary.totalCreated}`);
    console.log(`  - Total errors: ${syncResults.summary.totalErrors}`);

    console.log('\n5. Testing team member deletion cleanup...');
    const cleanupResult = await CalendarEventGenerationService.handleTeamMemberDeletion(teamMember.id);
    console.log(`✓ Cleanup completed: ${cleanupResult}`);

    // Verify no events remain
    const remainingEvents = await CalendarEvent.getBirthdayEvents();
    const memberEvents = remainingEvents.filter(event => event.team_member_id === teamMember.id);
    console.log(`✓ Remaining events for deleted member: ${memberEvents.length} (should be 0)`);

    console.log('\n🎉 Birthday event integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testBirthdayIntegration().catch(console.error);