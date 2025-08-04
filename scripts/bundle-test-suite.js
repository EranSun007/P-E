#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comprehensive Bundle Test Suite
 * Consolidates bundle size testing, loading performance validation, and optimization testing
 */

class BundleTestSuite {
  constructor(options = {}) {
    this.options = {
      skipBuild: options.skipBuild || false,
      verbose: options.verbose || false,
      generateReports: options.generateReports !== false, // Default to true
      ...options
    };
    this.distPath = path.resolve(__dirname, '../dist');
    this.results = {
      bundleAnalysis: null,
      bundleSizeTests: null,
      loadingPerformanceTests: null,
      optimizationValidation: null
    };
  }

  log(message) {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  async ensureBuild() {
    if (this.options.skipBuild && fs.existsSync(this.distPath)) {
      this.log('📦 Skipping build (using existing build)');
      return;
    }

    if (!fs.existsSync(this.distPath)) {
      console.log('📦 Build not found. Running build first...');
      try {
        execSync('npm run build', { stdio: this.options.verbose ? 'inherit' : 'pipe' });
        console.log('✅ Build completed successfully\n');
      } catch (error) {
        console.error('❌ Build failed:', error.message);
        throw error;
      }
    }
  }

  async runBundleAnalysis() {
    console.log('📊 Running bundle analysis...');
    try {
      execSync('node scripts/bundle-analysis.js', { 
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });
      this.results.bundleAnalysis = 'PASSED';
      console.log('✅ Bundle analysis completed\n');
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      this.results.bundleAnalysis = 'FAILED';
      throw error;
    }
  }

  async runBundleSizeTests() {
    console.log('🧪 Running bundle size regression tests...');
    try {
      execSync('npx vitest run scripts/__tests__/bundle-size-regression.test.js', { 
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      this.results.bundleSizeTests = 'PASSED';
      console.log('✅ Bundle size regression tests passed\n');
    } catch (error) {
      console.error('❌ Bundle size regression tests failed');
      this.results.bundleSizeTests = 'FAILED';
      throw error;
    }
  }

  async runLoadingPerformanceTests() {
    console.log('⚡ Running loading performance tests...');
    try {
      execSync('npx vitest run scripts/__tests__/loading-performance.test.js', { 
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      this.results.loadingPerformanceTests = 'PASSED';
      console.log('✅ Loading performance tests passed\n');
    } catch (error) {
      console.error('❌ Loading performance tests failed');
      this.results.loadingPerformanceTests = 'FAILED';
      throw error;
    }
  }

  async runBundleAnalysisTests() {
    console.log('🔬 Running bundle analysis unit tests...');
    try {
      execSync('npx vitest run scripts/__tests__/bundle-analysis.test.js', { 
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ Bundle analysis unit tests passed\n');
    } catch (error) {
      console.error('❌ Bundle analysis unit tests failed');
      // Don't throw here as this is not critical for the main suite
    }
  }

  generateComprehensiveReport() {
    if (!this.options.generateReports) {
      return null;
    }

    const reportPath = path.join(this.distPath, 'bundle-test-suite-report.json');
    const bundleBudgetPath = path.join(this.distPath, 'performance-budget-report.json');
    const loadingReportPath = path.join(this.distPath, 'loading-performance-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Bundle Test Suite',
      status: Object.values(this.results).every(result => result === 'PASSED') ? 'PASSED' : 'FAILED',
      results: this.results,
      summary: {
        bundleOptimization: this.results.bundleAnalysis === 'PASSED' ? 
          'Bundle analysis completed successfully' : 'Bundle analysis failed',
        performanceValidation: this.results.loadingPerformanceTests === 'PASSED' ? 
          'Loading performance validation passed' : 'Loading performance validation failed',
        regressionPrevention: this.results.bundleSizeTests === 'PASSED' ? 
          'Bundle size regression tests passed' : 'Bundle size regression tests failed'
      },
      reports: {
        bundleBudget: fs.existsSync(bundleBudgetPath) ? bundleBudgetPath : null,
        loadingPerformance: fs.existsSync(loadingReportPath) ? loadingReportPath : null
      },
      recommendations: this.generateRecommendations()
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Comprehensive report: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️  Could not write comprehensive report:', error.message);
    }

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.bundleSizeTests === 'FAILED') {
      recommendations.push('Review bundle size regression test failures');
      recommendations.push('Consider implementing more aggressive code splitting');
      recommendations.push('Audit dependencies for unused code');
    }
    
    if (this.results.loadingPerformanceTests === 'FAILED') {
      recommendations.push('Optimize loading performance for better user experience');
      recommendations.push('Consider lazy loading for rarely used features');
      recommendations.push('Review chunk loading strategy');
    }
    
    if (this.results.bundleAnalysis === 'FAILED') {
      recommendations.push('Fix bundle analysis issues before proceeding');
      recommendations.push('Ensure build process completes successfully');
    }
    
    // Add general recommendations
    recommendations.push('Integrate tests into CI/CD pipeline');
    recommendations.push('Set up monitoring for production performance metrics');
    recommendations.push('Continue monitoring bundle sizes with each deployment');
    
    return recommendations;
  }

  async runFullSuite() {
    console.log('🚀 Bundle Test Suite - Comprehensive Validation');
    console.log('==============================================\n');

    try {
      await this.ensureBuild();
      await this.runBundleAnalysis();
      await this.runBundleSizeTests();
      await this.runLoadingPerformanceTests();
      await this.runBundleAnalysisTests();

      const report = this.generateComprehensiveReport();

      // Display final summary
      console.log('📋 Bundle Test Suite Summary:');
      console.log('=============================');
      console.log(`✅ Bundle Analysis: ${this.results.bundleAnalysis}`);
      console.log(`✅ Bundle Size Tests: ${this.results.bundleSizeTests}`);
      console.log(`✅ Loading Performance: ${this.results.loadingPerformanceTests}`);
      console.log('');
      console.log('📊 Key Validations:');
      console.log('  • Bundle size regression prevention');
      console.log('  • Loading performance optimization');
      console.log('  • Code splitting effectiveness');
      console.log('  • Performance budget enforcement');
      console.log('');

      if (report && report.status === 'PASSED') {
        console.log('🎉 All bundle tests passed successfully!');
        console.log('   Your application bundle is optimized and performing well.');
      } else {
        console.log('⚠️  Some tests failed. Please review the results and optimize accordingly.');
      }

      return report;

    } catch (error) {
      console.error('\n❌ Bundle Test Suite Failed:', error.message);
      
      const errorReport = {
        timestamp: new Date().toISOString(),
        status: 'ERROR',
        error: error.message,
        results: this.results
      };
      
      if (this.options.generateReports) {
        const errorReportPath = path.join(this.distPath, 'bundle-test-suite-error.json');
        try {
          fs.writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));
        } catch (writeError) {
          console.warn('⚠️  Could not write error report:', writeError.message);
        }
      }
      
      throw error;
    }
  }

  // Individual test methods for targeted testing
  async runBundleSizeOnly() {
    console.log('🧪 Running Bundle Size Tests Only');
    console.log('=================================\n');
    
    await this.ensureBuild();
    await this.runBundleAnalysis();
    await this.runBundleSizeTests();
    
    console.log('✅ Bundle size testing completed!');
  }

  async runPerformanceOnly() {
    console.log('⚡ Running Performance Tests Only');
    console.log('=================================\n');
    
    await this.ensureBuild();
    await this.runLoadingPerformanceTests();
    
    console.log('✅ Performance testing completed!');
  }

  async runAnalysisOnly() {
    console.log('📊 Running Bundle Analysis Only');
    console.log('===============================\n');
    
    await this.ensureBuild();
    await this.runBundleAnalysis();
    
    console.log('✅ Bundle analysis completed!');
  }
}

// CLI interface
if (process.argv[1] && process.argv[1].endsWith('bundle-test-suite.js')) {
  const command = process.argv[2] || 'full';
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const skipBuild = process.argv.includes('--skip-build');
  const noReports = process.argv.includes('--no-reports');
  
  const suite = new BundleTestSuite({
    verbose,
    skipBuild,
    generateReports: !noReports
  });
  
  try {
    switch (command) {
      case 'bundle':
      case 'size':
        await suite.runBundleSizeOnly();
        break;
      case 'performance':
      case 'perf':
        await suite.runPerformanceOnly();
        break;
      case 'analysis':
      case 'analyze':
        await suite.runAnalysisOnly();
        break;
      case 'full':
      default:
        await suite.runFullSuite();
        break;
    }
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

export { BundleTestSuite };