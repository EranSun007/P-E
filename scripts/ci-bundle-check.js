#!/usr/bin/env node

import { BundleMonitor } from './bundle-monitoring-dashboard.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * CI/CD Bundle Size Check Script
 * Integrates bundle size monitoring into continuous integration pipeline
 */

function runCIBundleCheck() {
  console.log('🔍 CI/CD Bundle Size Check');
  console.log('===========================\n');

  const monitor = new BundleMonitor();
  
  try {
    // Ensure we have a fresh build
    console.log('📦 Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed\n');

    // Run bundle monitoring with CI-specific configuration
    const result = monitor.setupAlerts({
      maxChunkSize: 400 * 1024, // 400 KB
      maxTotalSize: 2 * 1024 * 1024, // 2 MB
      failOnAlert: true, // Fail CI on critical alerts
      warningThreshold: 0.85 // 85% of limit triggers warning
    });

    // Generate CI-specific report
    const ciReport = {
      timestamp: new Date().toISOString(),
      status: result.status,
      bundleSize: result.analysis?.totalSize || 0,
      chunkCount: result.analysis?.chunkCount || 0,
      largestChunk: result.analysis?.largestChunk?.size || 0,
      alerts: result.alerts || [],
      warnings: result.warnings || [],
      trends: result.trends || {},
      thresholds: {
        maxChunkSize: 400 * 1024,
        maxTotalSize: 2 * 1024 * 1024
      },
      recommendations: generateRecommendations(result)
    };

    // Save CI report
    const reportPath = path.resolve(process.cwd(), 'dist/ci-bundle-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(ciReport, null, 2));

    // Display CI summary
    console.log('\n📊 CI Bundle Check Summary:');
    console.log('============================');
    console.log(`Status: ${getStatusIcon(result.status)} ${result.status}`);
    
    if (result.analysis) {
      console.log(`Bundle Size: ${formatBytes(result.analysis.totalSize)}`);
      console.log(`Chunks: ${result.analysis.chunkCount}`);
      console.log(`Largest Chunk: ${result.analysis.largestChunk ? formatBytes(result.analysis.largestChunk.size) : 'N/A'}`);
    }

    if (result.alerts && result.alerts.length > 0) {
      console.log(`\n🚨 Critical Alerts: ${result.alerts.length}`);
      result.alerts.forEach(alert => {
        console.log(`  ❌ ${alert.message}`);
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning.message}`);
      });
    }

    // Display recommendations for CI
    const recommendations = generateRecommendations(result);
    if (recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');
      recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log(`\n📄 Detailed report: ${reportPath}`);

    if (result.status === 'CRITICAL') {
      console.log('\n💥 CI Check Failed: Critical bundle size alerts detected!');
      console.log('Please optimize bundle sizes before merging.');
      process.exit(1);
    } else if (result.status === 'WARNING') {
      console.log('\n⚠️  CI Check Passed with Warnings');
      console.log('Consider optimizing bundle sizes in future iterations.');
    } else {
      console.log('\n✅ CI Check Passed: All bundle size thresholds within limits');
    }

  } catch (error) {
    console.error('\n❌ CI Bundle Check Failed:', error.message);
    
    // Create error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    };
    
    const errorReportPath = path.resolve(process.cwd(), 'dist/ci-bundle-error.json');
    fs.writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));
    
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusIcon(status) {
  switch (status) {
    case 'OK': return '✅';
    case 'WARNING': return '⚠️';
    case 'CRITICAL': return '❌';
    case 'ERROR': return '💥';
    default: return '❓';
  }
}

function generateRecommendations(result) {
  const recommendations = [];
  
  if (!result.analysis) return recommendations;

  // Check for large chunks
  if (result.analysis.largestChunk && result.analysis.largestChunk.size > 350 * 1024) {
    recommendations.push('Consider splitting large chunks with dynamic imports');
    recommendations.push('Review vendor chunk grouping strategy');
  }

  // Check total bundle size
  if (result.analysis.totalSize > 1.5 * 1024 * 1024) {
    recommendations.push('Audit dependencies for unused code');
    recommendations.push('Consider lazy loading for rarely used features');
  }

  // Check chunk count
  if (result.analysis.chunkCount > 20) {
    recommendations.push('Consider consolidating small chunks');
    recommendations.push('Review code splitting strategy');
  }

  // Check for trends
  if (result.trends && result.trends.trend === 'increasing' && result.trends.changePercent > 10) {
    recommendations.push('Bundle size is increasing significantly - review recent changes');
    recommendations.push('Run component analysis to identify growth areas');
  }

  // Add general recommendations if there are alerts
  if (result.alerts && result.alerts.length > 0) {
    recommendations.push('Run "npm run analyze" for detailed bundle analysis');
    recommendations.push('Use "npm run bundle:visual" for interactive exploration');
    recommendations.push('Review component-level code splitting opportunities');
  }

  return recommendations;
}

// Environment-specific configuration
function getCIConfiguration() {
  const isCI = process.env.CI === 'true';
  const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
  
  return {
    isCI,
    isPR,
    failOnWarning: isPR, // Fail PRs on warnings, but not main branch
    generateArtifacts: isCI,
    verboseOutput: !isCI
  };
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('ci-bundle-check.js')) {
  runCIBundleCheck();
}

export { runCIBundleCheck };