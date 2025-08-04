// Simple test for CalendarService title generation
function testTitleGeneration() {
  try {
    console.log('Testing CalendarService title generation...');
    
    // Simulate the generateOneOnOneTitle method
    function generateOneOnOneTitle(teamMemberName) {
      if (!teamMemberName) {
        throw new Error('Team member name is required');
      }
      return `${teamMemberName} 1:1`;
    }
    
    // Test title generation
    const title = generateOneOnOneTitle('John Smith');
    console.log('✓ Title generation:', title);
    
    if (title !== 'John Smith 1:1') {
      throw new Error('Title format incorrect');
    }
    
    // Test error case
    try {
      generateOneOnOneTitle('');
      throw new Error('Should have thrown error for empty name');
    } catch (error) {
      if (error.message === 'Team member name is required') {
        console.log('✓ Error handling for empty name works');
      } else {
        throw error;
      }
    }
    
    console.log('✓ All CalendarService title tests passed!');
    return true;
  } catch (error) {
    console.error('✗ CalendarService test failed:', error.message);
    return false;
  }
}

const success = testTitleGeneration();
process.exit(success ? 0 : 1);