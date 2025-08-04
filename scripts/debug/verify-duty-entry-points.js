#!/usr/bin/env node

/**
 * Verification script to ensure all duty creation entry points use the same enhanced DutyForm component
 */

import fs from 'fs';
import path from 'path';

const entryPoints = [
  {
    name: 'Team Member Profile',
    file: 'src/pages/TeamMemberProfile.jsx',
    expectedImport: 'import DutyForm from "@/components/duty/DutyForm";',
    expectedUsage: '<DutyForm'
  },
  {
    name: 'Calendar Page',
    file: 'src/pages/Calendar.jsx',
    expectedImport: 'const DutyForm = lazy(() => retryImport(() => import("../components/duty/DutyForm"), 3, 1000));',
    expectedUsage: '<DutyForm'
  },
  {
    name: 'Team Page',
    file: 'src/pages/Team.jsx',
    expectedImport: 'const DutyForm = lazy(() => retryImport(() => import("@/components/duty/DutyForm"), 3, 1000));',
    expectedUsage: '<DutyForm'
  }
];

console.log('🔍 Verifying duty creation entry points...\n');

let allValid = true;

for (const entryPoint of entryPoints) {
  console.log(`📄 Checking ${entryPoint.name} (${entryPoint.file})`);
  
  try {
    const content = fs.readFileSync(entryPoint.file, 'utf8');
    
    // Check for import
    const hasImport = content.includes(entryPoint.expectedImport);
    console.log(`   ✅ Import: ${hasImport ? 'Found' : '❌ Missing'}`);
    
    // Check for usage
    const hasUsage = content.includes(entryPoint.expectedUsage);
    console.log(`   ✅ Usage: ${hasUsage ? 'Found' : '❌ Missing'}`);
    
    // Check for consistent props
    const hasTeamMembersProps = content.includes('teamMembers={');
    const hasOnSaveProps = content.includes('onSave={');
    const hasOnCancelProps = content.includes('onCancel={');
    
    console.log(`   ✅ Props: teamMembers=${hasTeamMembersProps ? '✓' : '❌'}, onSave=${hasOnSaveProps ? '✓' : '❌'}, onCancel=${hasOnCancelProps ? '✓' : '❌'}`);
    
    if (!hasImport || !hasUsage || !hasTeamMembersProps || !hasOnSaveProps || !hasOnCancelProps) {
      allValid = false;
    }
    
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}\n`);
    allValid = false;
  }
}

// Check DutyForm component itself
console.log('📄 Checking DutyForm component consistency');
try {
  const dutyFormContent = fs.readFileSync('src/components/duty/DutyForm.jsx', 'utf8');
  
  // Check for enhanced features
  const hasValidationHooks = dutyFormContent.includes('useDutyFormValidation');
  const hasSubmissionHooks = dutyFormContent.includes('useDutyFormSubmission');
  const hasDuplicateWarning = dutyFormContent.includes('DuplicateWarningDialog');
  const hasRefreshService = dutyFormContent.includes('DutyRefreshService');
  
  console.log(`   ✅ Enhanced validation: ${hasValidationHooks ? '✓' : '❌'}`);
  console.log(`   ✅ Enhanced submission: ${hasSubmissionHooks ? '✓' : '❌'}`);
  console.log(`   ✅ Duplicate prevention: ${hasDuplicateWarning ? '✓' : '❌'}`);
  console.log(`   ✅ Refresh service: ${hasRefreshService ? '✓' : '❌'}`);
  
  if (!hasValidationHooks || !hasSubmissionHooks || !hasDuplicateWarning || !hasRefreshService) {
    allValid = false;
  }
  
} catch (error) {
  console.log(`   ❌ Error reading DutyForm: ${error.message}`);
  allValid = false;
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ SUCCESS: All duty creation entry points are consistent!');
  console.log('   - All entry points use the same enhanced DutyForm component');
  console.log('   - All entry points have consistent props and handlers');
  console.log('   - DutyForm has all enhanced features implemented');
} else {
  console.log('❌ ISSUES FOUND: Some entry points are not consistent');
  console.log('   Please review the output above and fix any missing components');
}
console.log('='.repeat(50));

process.exit(allValid ? 0 : 1);