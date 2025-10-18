// Test script to verify the duty conflict validation fix
// This script simulates the duty creation process to ensure the fix works

// Mock localStorage for testing
const mockStorage = {};
const localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; }
};

// Mock generateId function
function generateId() {
  return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Simplified version of the validation logic from localClient.js
function getData(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Error reading data from localStorage key "${key}":`, error);
    return [];
  }
}

function setData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Simplified validateBusinessRules function
async function validateBusinessRules(dutyData, existingDuties) {
  console.log('Validating business rules for:', dutyData.title);
  console.log('Against existing duties:', existingDuties.length);
  
  // Validate against existing duties for conflicts
  const startDate = new Date(dutyData.start_date);
  const endDate = new Date(dutyData.end_date);
  
  const conflicts = existingDuties.filter(existingDuty => {
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

// Simplified duty creation function with the fix
async function createDuty(dutyData) {
  console.log('\n=== Testing Duty Creation ===');
  console.log('Creating duty:', dutyData);
  
  const duties = getData('duties');
  console.log('Existing duties before validation:', duties.length);
  
  try {
    // FIXED: Validate BEFORE adding to array
    await validateBusinessRules(dutyData, duties);
    console.log('✅ Validation passed');
    
    // Create the new duty
    const newDuty = {
      ...dutyData,
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    
    // Add to duties array AFTER validation
    duties.unshift(newDuty);
    setData('duties', duties);
    
    console.log('✅ Duty created successfully:', newDuty.id);
    return newDuty;
    
  } catch (error) {
    console.log('❌ Duty creation failed:', error.message);
    throw error;
  }
}

// Test scenarios
async function runTests() {
  console.log('🧪 Testing Duty Conflict Validation Fix\n');
  
  // Clear storage
  localStorage.removeItem('duties');
  
  // Test 1: Create first duty (should succeed)
  console.log('Test 1: Creating first duty');
  try {
    const duty1 = await createDuty({
      team_member_id: 'member1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-08-10',
      end_date: '2025-08-16',
      description: 'DevOps duty for member 1'
    });
    console.log('✅ Test 1 PASSED: First duty created successfully\n');
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message, '\n');
    return;
  }
  
  // Test 2: Create conflicting duty (should fail)
  console.log('Test 2: Creating conflicting duty (same type, same member, overlapping dates)');
  try {
    await createDuty({
      team_member_id: 'member1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-08-12',
      end_date: '2025-08-18',
      description: 'Conflicting DevOps duty'
    });
    console.log('❌ Test 2 FAILED: Should have detected conflict\n');
  } catch (error) {
    console.log('✅ Test 2 PASSED: Correctly detected conflict:', error.message, '\n');
  }
  
  // Test 3: Create non-conflicting duty (different type, should succeed)
  console.log('Test 3: Creating non-conflicting duty (different type)');
  try {
    await createDuty({
      team_member_id: 'member1',
      type: 'on_call',
      title: 'Metering',
      start_date: '2025-08-12',
      end_date: '2025-08-18',
      description: 'On-call duty for member 1'
    });
    console.log('✅ Test 3 PASSED: Non-conflicting duty created successfully\n');
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message, '\n');
  }
  
  // Test 4: Create duty for different member (should succeed)
  console.log('Test 4: Creating duty for different member');
  try {
    await createDuty({
      team_member_id: 'member2',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-08-12',
      end_date: '2025-08-18',
      description: 'DevOps duty for member 2'
    });
    console.log('✅ Test 4 PASSED: Duty for different member created successfully\n');
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error.message, '\n');
  }
  
  // Show final state
  const finalDuties = getData('duties');
  console.log('=== Final State ===');
  console.log(`Total duties created: ${finalDuties.length}`);
  finalDuties.forEach((duty, index) => {
    console.log(`${index + 1}. ${duty.title} (${duty.type}) for ${duty.team_member_id}: ${duty.start_date} to ${duty.end_date}`);
  });
  
  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error);
