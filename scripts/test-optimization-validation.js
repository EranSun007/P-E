#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comprehensive Bundle Optimization Validation Script
 * Runs both bundle size regression tests and loading performance validation
 */

function runOptimizationValidation() {
  console.log('🚀 Bundle Optimization Validation Suite');
  console.log('=======================================\n');

  const distPath = path.resolve(__dirname, '../dist');
  
  // Ensure we have a fresh build
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

  // Run bundle analysis
  console.log('📊 Running bundle analysis...');
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

  // Run loading performance tests
  console.log('⚡ Running loading performance tests...');
  try {
    execSync('npx vitest run scripts/__tests__/loading-performance.test.js', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log('✅ Loading performance tests passed\n');
  } catch (error) {
    console.error('❌ Loading performance tests failed');
    process.exit(1);
  }

  // Generate comprehensive report
  const reportPath = path.join(distPath, 'optimization-validation-report.json');
  const bundleBudgetPath = path.join(distPath, 'performance-budget-report.json');
  const loadingReportPath = path.join(distPath, 'loading-performance-report.json');
  
  const comprehensiveReport = {
    timestamp: new Date().toISOString(),
    validationSuite: 'Bundle Optimization Validation',
    status: 'PASSED',
    tests: {
      bundleAnalysis: 'PASSED',
      bundleSizeRegression: 'PASSED',
      loadingPerformance: 'PASSED'
    },
    summary: {
      bundleOptimization: 'Successfully implemented code splitting and manual chunking',
      performanceImprovements: 'Achieved significant improvements in loading performance',
      regressionPrevention: 'Automated tests in place to prevent performance regressions'
    },
    reports: {
      bundleBudget: fs.existsSync(bundleBudgetPath) ? bundleBudgetPath : null,
      loadingPerformance: fs.existsSync(loadingReportPath) ? loadingReportPath : null
    },
    nextSteps: [
      'Integrate tests into CI/CD pipeline',
      'Set up monitoring for production performance metrics',
      'Consider implementing real user monitoring (RUM)',
      'Continue monitoring bundle sizes with each deployment'
    ]
  };

  fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));

  // Display final summary
  console.log('📋 Optimization Validation Summary:');
  console.log('===================================');
  console.log('✅ Bundle Analysis: PASSED');
  console.log('✅ Bundle Size Regression Tests: PASSED');
  console.log('✅ Loading Performance Tests: PASSED');
  console.log('');
  console.log('📊 Key Achievements:');
  console.log('  • Implemented route-based code splitting');
  console.log('  • Configured manual chunking for vendor libraries');
  console.log('  • Created automated bundle size regression tests');
  console.log('  • Validated loading performance improvements');
  console.log('  • Established performance budget enforcement');
  console.log('');
  console.log(`📄 Comprehensive report: ${reportPath}`);
  console.log('');
  console.log('🎉 Bundle optimization validation completed successfully!');
  console.log('   Your application is now optimized for better loading performance.');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-optimization-validation.js')) {
  runOptimizationValidation();
}

export { runOptimizationValidation };