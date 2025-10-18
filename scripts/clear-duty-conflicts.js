// Utility script to clear duty conflicts from localStorage
// This script can be run in the browser console to resolve duty conflicts

console.log('🧹 Duty Conflict Resolution Utility');
console.log('This script will help identify and resolve duty conflicts in localStorage\n');

// Function to analyze and optionally clear duties
function analyzeDutyConflicts(options = {}) {
  const { clearAll = false, clearConflicts = false, dryRun = true } = options;
  
  try {
    const dutiesData = localStorage.getItem('duties');
    const duties = dutiesData ? JSON.parse(dutiesData) : [];
    
    console.log(`📊 Found ${duties.length} duties in localStorage`);
    
    if (duties.length === 0) {
      console.log('✅ No duties found - no conflicts possible');
      return { conflicts: [], totalDuties: 0 };
    }
    
    // Group duties by team member
    const dutiesByMember = {};
    duties.forEach(duty => {
      if (!dutiesByMember[duty.team_member_id]) {
        dutiesByMember[duty.team_member_id] = [];
      }
      dutiesByMember[duty.team_member_id].push(duty);
    });
    
    console.log('\n📋 Duties by Team Member:');
    Object.keys(dutiesByMember).forEach(memberId => {
      console.log(`\n👤 Team Member ${memberId}:`);
      dutiesByMember[memberId].forEach(duty => {
        console.log(`  • ${duty.title} (${duty.type}): ${duty.start_date} to ${duty.end_date}`);
      });
    });
    
    // Find conflicts
    const conflicts = [];
    Object.keys(dutiesByMember).forEach(memberId => {
      const memberDuties = dutiesByMember[memberId];
      
      for (let i = 0; i < memberDuties.length; i++) {
        for (let j = i + 1; j < memberDuties.length; j++) {
          const duty1 = memberDuties[i];
          const duty2 = memberDuties[j];
          
          // Check if same type and overlapping dates
          if (duty1.type === duty2.type) {
            const start1 = new Date(duty1.start_date);
            const end1 = new Date(duty1.end_date);
            const start2 = new Date(duty2.start_date);
            const end2 = new Date(duty2.end_date);
            
            // Check for overlap
            if (start1 <= end2 && start2 <= end1) {
              conflicts.push({
                memberId,
                duty1,
                duty2,
                type: 'same_type_overlap',
                severity: 'high'
              });
            }
          }
        }
      }
    });
    
    console.log(`\n⚠️  Found ${conflicts.length} conflicts:`);
    conflicts.forEach((conflict, index) => {
      console.log(`\n${index + 1}. Conflict for Team Member ${conflict.memberId}:`);
      console.log(`   • "${conflict.duty1.title}" (${conflict.duty1.type}): ${conflict.duty1.start_date} to ${conflict.duty1.end_date}`);
      console.log(`   • "${conflict.duty2.title}" (${conflict.duty2.type}): ${conflict.duty2.start_date} to ${conflict.duty2.end_date}`);
    });
    
    // Handle clearing based on options
    if (clearAll && !dryRun) {
      localStorage.removeItem('duties');
      localStorage.removeItem('calendar_events');
      console.log('\n🗑️  Cleared ALL duties and calendar events');
      return { conflicts, totalDuties: 0, action: 'cleared_all' };
    }
    
    if (clearConflicts && conflicts.length > 0 && !dryRun) {
      // Remove conflicting duties (keep the first one of each conflict)
      const dutiesToRemove = new Set();
      conflicts.forEach(conflict => {
        // Remove the second duty in each conflict (keep the first)
        dutiesToRemove.add(conflict.duty2.id);
      });
      
      const filteredDuties = duties.filter(duty => !dutiesToRemove.has(duty.id));
      localStorage.setItem('duties', JSON.stringify(filteredDuties));
      
      console.log(`\n🗑️  Removed ${dutiesToRemove.size} conflicting duties`);
      console.log(`📊 Remaining duties: ${filteredDuties.length}`);
      
      return { 
        conflicts, 
        totalDuties: filteredDuties.length, 
        action: 'cleared_conflicts',
        removedCount: dutiesToRemove.size 
      };
    }
    
    if (dryRun) {
      console.log('\n🔍 This was a dry run. To actually clear data, use:');
      console.log('   analyzeDutyConflicts({ clearAll: true, dryRun: false })  // Clear everything');
      console.log('   analyzeDutyConflicts({ clearConflicts: true, dryRun: false })  // Clear only conflicts');
    }
    
    return { conflicts, totalDuties: duties.length, action: 'analyzed' };
    
  } catch (error) {
    console.error('❌ Error analyzing duties:', error);
    return { error: error.message };
  }
}

// Quick functions for common operations
function clearAllDuties() {
  return analyzeDutyConflicts({ clearAll: true, dryRun: false });
}

function clearConflictingDuties() {
  return analyzeDutyConflicts({ clearConflicts: true, dryRun: false });
}

function analyzeOnly() {
  return analyzeDutyConflicts({ dryRun: true });
}

// Export functions for browser use
if (typeof window !== 'undefined') {
  window.analyzeDutyConflicts = analyzeDutyConflicts;
  window.clearAllDuties = clearAllDuties;
  window.clearConflictingDuties = clearConflictingDuties;
  window.analyzeOnly = analyzeOnly;
}

// Run analysis by default
console.log('🔍 Running initial analysis...\n');
const result = analyzeDutyConflicts({ dryRun: true });

console.log('\n📖 Available functions:');
console.log('  • analyzeOnly() - Just analyze conflicts');
console.log('  • clearConflictingDuties() - Remove only conflicting duties');
console.log('  • clearAllDuties() - Remove all duties (nuclear option)');
console.log('  • analyzeDutyConflicts(options) - Full control');

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeDutyConflicts,
    clearAllDuties,
    clearConflictingDuties,
    analyzeOnly
  };
}
