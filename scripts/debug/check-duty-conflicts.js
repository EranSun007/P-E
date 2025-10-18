// Debug script to check duty conflicts in localStorage
// Run this in the browser console or with a headless browser

function checkDutyConflicts() {
  try {
    // Get duties from localStorage
    const dutiesData = localStorage.getItem('duties');
    const duties = dutiesData ? JSON.parse(dutiesData) : [];
    
    console.log('=== Current Duties ===');
    console.log(`Total duties: ${duties.length}`);
    
    if (duties.length === 0) {
      console.log('No duties found in localStorage');
      return;
    }
    
    // Group duties by team member
    const dutiesByMember = {};
    duties.forEach(duty => {
      if (!dutiesByMember[duty.team_member_id]) {
        dutiesByMember[duty.team_member_id] = [];
      }
      dutiesByMember[duty.team_member_id].push(duty);
    });
    
    // Check for conflicts
    console.log('\n=== Duty Analysis ===');
    Object.keys(dutiesByMember).forEach(memberId => {
      const memberDuties = dutiesByMember[memberId];
      console.log(`\nTeam Member ${memberId}:`);
      
      memberDuties.forEach(duty => {
        console.log(`  - ${duty.title} (${duty.type}): ${duty.start_date} to ${duty.end_date}`);
      });
      
      // Check for overlapping duties of the same type
      for (let i = 0; i < memberDuties.length; i++) {
        for (let j = i + 1; j < memberDuties.length; j++) {
          const duty1 = memberDuties[i];
          const duty2 = memberDuties[j];
          
          // Check if same type
          if (duty1.type === duty2.type) {
            const start1 = new Date(duty1.start_date);
            const end1 = new Date(duty1.end_date);
            const start2 = new Date(duty2.start_date);
            const end2 = new Date(duty2.end_date);
            
            // Check for overlap
            if (start1 <= end2 && start2 <= end1) {
              console.log(`  ⚠️  CONFLICT: "${duty1.title}" overlaps with "${duty2.title}"`);
              console.log(`      ${duty1.start_date} to ${duty1.end_date} vs ${duty2.start_date} to ${duty2.end_date}`);
            }
          }
        }
      }
    });
    
    // Look specifically for DevOps duties around the error date range
    console.log('\n=== DevOps Duties Analysis ===');
    const devopsDuties = duties.filter(d => d.type === 'devops' || d.title === 'DevOps');
    console.log(`Found ${devopsDuties.length} DevOps duties:`);
    
    devopsDuties.forEach(duty => {
      console.log(`  - ${duty.title} (${duty.type}) for ${duty.team_member_id}: ${duty.start_date} to ${duty.end_date}`);
      
      // Check if this overlaps with the error date range (2025-08-17 to 2025-08-23)
      const dutyStart = new Date(duty.start_date);
      const dutyEnd = new Date(duty.end_date);
      const errorStart = new Date('2025-08-17');
      const errorEnd = new Date('2025-08-23');
      
      if (dutyStart <= errorEnd && errorStart <= dutyEnd) {
        console.log(`    ⚠️  This duty overlaps with the error date range (2025-08-17 to 2025-08-23)`);
      }
    });
    
  } catch (error) {
    console.error('Error checking duty conflicts:', error);
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkDutyConflicts };
} else if (typeof window !== 'undefined') {
  window.checkDutyConflicts = checkDutyConflicts;
}

// Run immediately if in browser
if (typeof localStorage !== 'undefined') {
  checkDutyConflicts();
}
