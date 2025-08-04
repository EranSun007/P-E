// test-date-validation-improvements.js
// Demonstration script showing the improved date validation logic

import { CalendarService, ValidationError } from './src/utils/calendarService.js';

console.log('=== CalendarService Date Validation Improvements Demo ===\n');

// Test 1: Valid future date
console.log('1. Testing valid future date:');
try {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 2);
  const result = CalendarService._validateDateTime(futureDate.toISOString());
  console.log('✅ Success:', result.toISOString());
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 2: Date within buffer time (should pass)
console.log('\n2. Testing date within 5-minute buffer:');
try {
  const nearCurrentDate = new Date();
  nearCurrentDate.setMinutes(nearCurrentDate.getMinutes() - 2); // 2 minutes ago
  const result = CalendarService._validateDateTime(nearCurrentDate.toISOString());
  console.log('✅ Success:', result.toISOString());
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 3: Date outside buffer time (should fail with detailed error)
console.log('\n3. Testing date outside 5-minute buffer:');
try {
  const pastDate = new Date();
  pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutes ago
  const result = CalendarService._validateDateTime(pastDate.toISOString());
  console.log('✅ Success:', result.toISOString());
} catch (error) {
  console.log('❌ Expected error with detailed message:');
  console.log('   ', error.message);
}

// Test 4: Invalid date format (should fail with detailed error)
console.log('\n4. Testing invalid date format:');
try {
  const result = CalendarService._validateDateTime('not-a-valid-date');
  console.log('✅ Success:', result.toISOString());
} catch (error) {
  console.log('❌ Expected error with detailed message:');
  console.log('   ', error.message);
}

// Test 5: Custom buffer time
console.log('\n5. Testing custom buffer time (15 minutes):');
try {
  const dateWithinCustomBuffer = new Date();
  dateWithinCustomBuffer.setMinutes(dateWithinCustomBuffer.getMinutes() - 10); // 10 minutes ago
  const result = CalendarService._validateDateTime(dateWithinCustomBuffer.toISOString(), 'dateTime', false, 15);
  console.log('✅ Success with 15-minute buffer:', result.toISOString());
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 6: Date too far in future (should fail with detailed error)
console.log('\n6. Testing date too far in future:');
try {
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 3); // 3 years from now
  const result = CalendarService._validateDateTime(farFutureDate.toISOString());
  console.log('✅ Success:', result.toISOString());
} catch (error) {
  console.log('❌ Expected error with detailed message:');
  console.log('   ', error.message);
}

// Test 7: Timezone handling
console.log('\n7. Testing timezone handling:');
try {
  const utcDate = new Date();
  utcDate.setHours(utcDate.getHours() + 1);
  const utcString = utcDate.toISOString();
  
  // Create same time with timezone offset
  const offsetDate = new Date(utcDate);
  const offsetString = offsetDate.toISOString().replace('Z', '+01:00');
  
  const utcResult = CalendarService._validateDateTime(utcString);
  const offsetResult = CalendarService._validateDateTime(offsetString);
  
  console.log('✅ UTC format:', utcResult.toISOString());
  console.log('✅ Offset format:', offsetResult.toISOString());
  console.log('✅ Same time?', utcResult.getTime() === offsetResult.getTime());
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n=== Demo Complete ===');
console.log('\nKey improvements implemented:');
console.log('• Enhanced error messages with actual dates and time differences');
console.log('• Configurable buffer time for near-current dates (default: 5 minutes)');
console.log('• Proper timezone handling for different date formats');
console.log('• Minimum 1-minute buffer enforcement');
console.log('• Detailed validation context in error messages');