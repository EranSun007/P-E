#!/usr/bin/env node

/**
 * Clear All Duties Utility
 * Completely clears all duties and calendar events for a fresh start
 */

console.log('🧹 P&E Manager - Clear All Duties Utility');
console.log('==========================================\n');

console.log('⚠️  WARNING: This will delete ALL duties and calendar events!');
console.log('   Only use this if you want to start fresh.\n');

console.log('📋 To clear all duties and resolve conflicts:');
console.log('');

console.log('1️⃣ OPEN BROWSER DEVELOPER TOOLS');
console.log('   Press F12 or right-click → Inspect → Console tab');
console.log('');

console.log('2️⃣ COPY AND PASTE THIS CODE:');
console.log('');
console.log('// Clear all duties and calendar events');
console.log('localStorage.removeItem("duties");');
console.log('localStorage.removeItem("calendar_events");');
console.log('console.log("✅ All duties cleared!");');
console.log('');
console.log('// Refresh the page to reset the UI');
console.log('location.reload();');
console.log('');

console.log('3️⃣ AFTER PAGE REFRESHES:');
console.log('   You can now create duties without any conflicts!');
console.log('');

console.log('4️⃣ TEST WITH THESE SETTINGS:');
console.log('   • Team Member: Any team member');
console.log('   • Type: on_call');
console.log('   • Title: Reporting');
console.log('   • Start Date: 2025-09-01');
console.log('   • End Date: 2025-09-05');
console.log('   • Description: Test duty');
console.log('');

console.log('5️⃣ VERIFY IT WORKS:');
console.log('   The duty should be created successfully and the popup should close.');
console.log('');

console.log('💡 ALTERNATIVE - CLEAR SPECIFIC CONFLICTS:');
console.log('   If you want to keep some duties, you can delete specific ones:');
console.log('');
console.log('   // First, see all duties');
console.log('   const duties = JSON.parse(localStorage.getItem("duties") || "[]");');
console.log('   duties.forEach((duty, i) => {');
console.log('     console.log(`${i}. ${duty.type} ${duty.title} from ${duty.start_date} to ${duty.end_date} (ID: ${duty.id})`);');
console.log('   });');
console.log('');
console.log('   // Then remove specific duty by ID');
console.log('   // const updatedDuties = duties.filter(d => d.id !== "DUTY_ID_TO_REMOVE");');
console.log('   // localStorage.setItem("duties", JSON.stringify(updatedDuties));');
console.log('');

console.log('🎯 CURRENT CONFLICTS DETECTED:');
console.log('   Based on your error messages, you have:');
console.log('   • "other" type "Metering" duty from 2025-08-10 to 2025-08-16');
console.log('   • "on_call" type "Reporting" duty from 2025-08-25 to 2025-08-30');
console.log('   • Possibly more duties causing conflicts');
console.log('');

console.log('✅ After clearing, you can create duties with any dates!');
