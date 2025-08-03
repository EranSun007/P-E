// Debug script to help identify duty validation issues
// Run this in the browser console to debug the validation

async function debugDutyValidation() {
  console.log('=== Duty Validation Debug ===');
  
  // Get current form data (you'll need to inspect the form state)
  const formData = {
    team_member_id: 'dan-bar-lev-id', // Replace with actual ID
    type: 'on_call',
    title: 'Reporting', 
    description: '',
    start_date: '2025-08-03', // Convert from DD/MM/YYYY to YYYY-MM-DD
    end_date: '2025-08-09'    // Convert from DD/MM/YYYY to YYYY-MM-DD
  };
  
  console.log('Form data:', formData);
  
  // Check team members
  const teamMembers = JSON.parse(localStorage.getItem('team_members') || '[]');
  console.log('Available team members:', teamMembers.map(tm => ({ id: tm.id, name: tm.name })));
  
  const teamMemberExists = teamMembers.some(tm => tm.id === formData.team_member_id);
  console.log('Team member exists:', teamMemberExists);
  
  // Check duty type/title combination
  const validCombinations = {
    'devops': ['DevOps'],
    'on_call': ['Reporting', 'Metering'],
    'other': ['Reporting', 'Metering', 'DevOps']
  };
  
  const isValidCombination = validCombinations[formData.type]?.includes(formData.title);
  console.log('Valid type/title combination:', isValidCombination);
  
  // Check date format and range
  const startDate = new Date(formData.start_date);
  const endDate = new Date(formData.end_date);
  console.log('Start date:', startDate, 'Valid:', !isNaN(startDate.getTime()));
  console.log('End date:', endDate, 'Valid:', !isNaN(endDate.getTime()));
  
  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    console.log('Days difference:', daysDiff);
    console.log('Valid period (>= 1 day):', daysDiff >= 1);
    console.log('Valid period (<= 365 days):', daysDiff <= 365);
  }
  
  // Check for existing duties
  const duties = JSON.parse(localStorage.getItem('duties') || '[]');
  console.log('Existing duties count:', duties.length);
  
  const conflicts = duties.filter(existingDuty => {
    if (existingDuty.team_member_id !== formData.team_member_id) return false;
    
    const existingStart = new Date(existingDuty.start_date);
    const existingEnd = new Date(existingDuty.end_date);
    
    return (startDate <= existingEnd && endDate >= existingStart);
  });
  
  console.log('Conflicting duties:', conflicts);
  
  const sameTypeConflicts = conflicts.filter(conflict => conflict.type === formData.type);
  console.log('Same type conflicts:', sameTypeConflicts);
  
  console.log('=== Debug Complete ===');
}

// Run the debug function
debugDutyValidation();