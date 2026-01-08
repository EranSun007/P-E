#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bundle Size Testing Script
 * Runs bundle size regression tests and performance budget validation
 */

function runBundleSizeTests() {
  console.log('🧪 Running Bundle Size Regression Tests');
  console.log('========================================\n');

  const distPath = path.resolve(__dirname, '../dist');
  
  // Check if build exists
  if (!fs.existsSync(distPath)) {
    console.log('📦 Build not found. Running build first...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build completed successfully\n');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  // Run bundle analysis first
  console.log('📊 Generating bundle analysis...');
  try {
    execSync('node scripts/bundle-analysis.js', { stdio: 'inherit' });
    console.log('');
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }

  // Run bundle size regression tests
  console.log('🧪 Running bundle size regression tests...');
  try {
    execSync('npx vitest run scripts/__tests__/bundle-size-regression.test.js', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log('✅ Bundle size regression tests passed\n');
  } catch (error) {
    console.error('❌ Bundle size regression tests failed');
    process.exit(1);
  }

  // Check if performance budget report was generated
  const reportPath = path.join(distPath, 'performance-budget-report.json');
  if (fs.existsSync(reportPath)) {
    console.log('📋 Performance Budget Report:');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log(`  Total Bundle Size: ${report.totalSizeMB} MB`);
    console.log(`  Chunk Count: ${report.chunkCount}`);
    console.log(`  Largest Chunk: ${report.largestChunk?.name} (${(report.largestChunk?.size / 1024).toFixed(2)} KB)`);
    
    console.log('\n  Budget Status:');
    Object.entries(report.budgetStatus).forEach(([key, status]) => {
      const icon = status === 'PASS' ? '✅' : '❌';
      console.log(`    ${key}: ${icon} ${status}`);
    });
    
    console.log(`\n📄 Full report: ${reportPath}`);
  }

  console.log('\n🎉 All bundle size tests completed successfully!');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-bundle-size.js')) {
  runBundleSizeTests();
}

export { runBundleSizeTests };