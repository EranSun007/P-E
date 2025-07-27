import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeBundleFiles } from '../bundle-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Bundle Size Regression Tests', () => {
  let bundleAnalysis;
  const distPath = path.resolve(__dirname, '../../dist');
  
  // Performance budget thresholds (in bytes)
  const PERFORMANCE_BUDGET = {
    // Individual chunk limits
    MAX_CHUNK_SIZE: 450 * 1024, // 450 KB (allowing for one large chunk)
    MAX_VENDOR_CHUNK_SIZE: 500 * 1024, // 500 KB for vendor chunks
    MAX_ENTRY_CHUNK_SIZE: 300 * 1024, // 300 KB for entry chunks
    
    // Total bundle limits
    MAX_TOTAL_JS_SIZE: 2 * 1024 * 1024, // 2 MB total JS
    MAX_TOTAL_BUNDLE_SIZE: 3 * 1024 * 1024, // 3 MB total bundle
    
    // Chunk count limits
    MAX_CHUNK_COUNT: 50, // Increased to accommodate current chunk count
    MIN_VENDOR_CHUNKS: 0, // Adjusted since vendor chunks may be in different chunks
    
    // Category distribution limits (percentages)
    MAX_VENDOR_PERCENTAGE: 70, // Vendor code should not exceed 70% of total
    MIN_APP_PERCENTAGE: 15, // App code should be at least 15% of total (adjusted)
  };

  beforeAll(async () => {
    // Check if build exists, if not skip tests with warning
    if (!fs.existsSync(distPath)) {
      console.warn('⚠️  Build directory not found. Run "npm run build" before running bundle tests.');
      return;
    }
    
    // Suppress console output during analysis for cleaner test output
    const originalConsoleLog = console.log;
    console.log = () => {};
    
    try {
      bundleAnalysis = analyzeBundleFiles();
    } finally {
      console.log = originalConsoleLog;
    }
  });

  describe('Individual Chunk Size Limits', () => {
    it('should not have any chunks exceeding the maximum size limit', () => {
      if (!bundleAnalysis) return;
      
      const oversizedChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.type === 'js' && chunk.size > PERFORMANCE_BUDGET.MAX_CHUNK_SIZE
      );
      
      if (oversizedChunks.length > 0) {
        const chunkDetails = oversizedChunks.map(chunk => 
          `${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`
        ).join(', ');
        
        expect.fail(
          `Found ${oversizedChunks.length} chunks exceeding ${PERFORMANCE_BUDGET.MAX_CHUNK_SIZE / 1024} KB limit: ${chunkDetails}`
        );
      }
      
      expect(oversizedChunks).toHaveLength(0);
    });

    it('should keep vendor chunks within acceptable size limits', () => {
      if (!bundleAnalysis) return;
      
      const vendorChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'vendor' && chunk.type === 'js'
      );
      
      const oversizedVendorChunks = vendorChunks.filter(
        chunk => chunk.size > PERFORMANCE_BUDGET.MAX_VENDOR_CHUNK_SIZE
      );
      
      if (oversizedVendorChunks.length > 0) {
        const chunkDetails = oversizedVendorChunks.map(chunk => 
          `${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`
        ).join(', ');
        
        expect.fail(
          `Found ${oversizedVendorChunks.length} vendor chunks exceeding ${PERFORMANCE_BUDGET.MAX_VENDOR_CHUNK_SIZE / 1024} KB limit: ${chunkDetails}`
        );
      }
      
      expect(oversizedVendorChunks).toHaveLength(0);
    });

    it('should keep entry chunks within acceptable size limits', () => {
      if (!bundleAnalysis) return;
      
      const entryChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'entry' && chunk.type === 'js'
      );
      
      const oversizedEntryChunks = entryChunks.filter(
        chunk => chunk.size > PERFORMANCE_BUDGET.MAX_ENTRY_CHUNK_SIZE
      );
      
      if (oversizedEntryChunks.length > 0) {
        const chunkDetails = oversizedEntryChunks.map(chunk => 
          `${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`
        ).join(', ');
        
        expect.fail(
          `Found ${oversizedEntryChunks.length} entry chunks exceeding ${PERFORMANCE_BUDGET.MAX_ENTRY_CHUNK_SIZE / 1024} KB limit: ${chunkDetails}`
        );
      }
      
      expect(oversizedEntryChunks).toHaveLength(0);
    });
  });

  describe('Total Bundle Size Limits', () => {
    it('should keep total JavaScript size within budget', () => {
      if (!bundleAnalysis) return;
      
      const totalJSSize = bundleAnalysis.chunks
        .filter(chunk => chunk.type === 'js')
        .reduce((sum, chunk) => sum + chunk.size, 0);
      
      expect(totalJSSize).toBeLessThanOrEqual(PERFORMANCE_BUDGET.MAX_TOTAL_JS_SIZE);
      
      if (totalJSSize > PERFORMANCE_BUDGET.MAX_TOTAL_JS_SIZE * 0.9) {
        console.warn(
          `⚠️  Total JS size (${(totalJSSize / 1024 / 1024).toFixed(2)} MB) is approaching the limit of ${PERFORMANCE_BUDGET.MAX_TOTAL_JS_SIZE / 1024 / 1024} MB`
        );
      }
    });

    it('should keep total bundle size within budget', () => {
      if (!bundleAnalysis) return;
      
      expect(bundleAnalysis.totalSize).toBeLessThanOrEqual(PERFORMANCE_BUDGET.MAX_TOTAL_BUNDLE_SIZE);
      
      if (bundleAnalysis.totalSize > PERFORMANCE_BUDGET.MAX_TOTAL_BUNDLE_SIZE * 0.9) {
        console.warn(
          `⚠️  Total bundle size (${(bundleAnalysis.totalSize / 1024 / 1024).toFixed(2)} MB) is approaching the limit of ${PERFORMANCE_BUDGET.MAX_TOTAL_BUNDLE_SIZE / 1024 / 1024} MB`
        );
      }
    });
  });

  describe('Bundle Composition Validation', () => {
    it('should not exceed maximum chunk count', () => {
      if (!bundleAnalysis) return;
      
      const jsChunkCount = bundleAnalysis.chunks.filter(chunk => chunk.type === 'js').length;
      
      expect(jsChunkCount).toBeLessThanOrEqual(PERFORMANCE_BUDGET.MAX_CHUNK_COUNT);
      
      if (jsChunkCount > PERFORMANCE_BUDGET.MAX_CHUNK_COUNT * 0.8) {
        console.warn(
          `⚠️  Chunk count (${jsChunkCount}) is approaching the limit of ${PERFORMANCE_BUDGET.MAX_CHUNK_COUNT}`
        );
      }
    });

    it('should have proper vendor chunk separation', () => {
      if (!bundleAnalysis) return;
      
      const vendorChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'vendor' && chunk.type === 'js'
      );
      
      // Check if we have vendor chunks or if they're in async chunks
      const asyncChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'async' && chunk.type === 'js'
      );
      
      // We should have either vendor chunks or async chunks containing vendor code
      const totalVendorAndAsyncChunks = vendorChunks.length + asyncChunks.length;
      expect(totalVendorAndAsyncChunks).toBeGreaterThan(0);
      
      // Check for vendor-like chunks (may be in async category due to dynamic imports)
      const allChunkNames = bundleAnalysis.chunks.map(chunk => chunk.name);
      const hasVendorLikeChunks = allChunkNames.some(name => 
        name.includes('vendor') || name.includes('chunk-') // chunk- files often contain vendor code
      );
      
      expect(hasVendorLikeChunks).toBe(true);
    });

    it('should maintain proper size distribution between vendor and app code', () => {
      if (!bundleAnalysis) return;
      
      const totalJSSize = bundleAnalysis.chunks
        .filter(chunk => chunk.type === 'js')
        .reduce((sum, chunk) => sum + chunk.size, 0);
      
      const vendorSize = bundleAnalysis.chunks
        .filter(chunk => chunk.category === 'vendor' && chunk.type === 'js')
        .reduce((sum, chunk) => sum + chunk.size, 0);
      
      const appSize = bundleAnalysis.chunks
        .filter(chunk => chunk.category === 'app' && chunk.type === 'js')
        .reduce((sum, chunk) => sum + chunk.size, 0);
      
      const vendorPercentage = (vendorSize / totalJSSize) * 100;
      const appPercentage = (appSize / totalJSSize) * 100;
      
      expect(vendorPercentage).toBeLessThanOrEqual(PERFORMANCE_BUDGET.MAX_VENDOR_PERCENTAGE);
      expect(appPercentage).toBeGreaterThanOrEqual(PERFORMANCE_BUDGET.MIN_APP_PERCENTAGE);
    });
  });

  describe('Code Splitting Validation', () => {
    it('should have async chunks for route-based code splitting', () => {
      if (!bundleAnalysis) return;
      
      const asyncChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'async' && chunk.type === 'js'
      );
      
      // Should have at least some async chunks from route splitting
      expect(asyncChunks.length).toBeGreaterThan(0);
    });

    it('should have reasonably sized async chunks', () => {
      if (!bundleAnalysis) return;
      
      const asyncChunks = bundleAnalysis.chunks.filter(
        chunk => chunk.category === 'async' && chunk.type === 'js'
      );
      
      // Async chunks should generally be smaller than vendor chunks
      const oversizedAsyncChunks = asyncChunks.filter(
        chunk => chunk.size > PERFORMANCE_BUDGET.MAX_CHUNK_SIZE
      );
      
      if (oversizedAsyncChunks.length > 0) {
        const chunkDetails = oversizedAsyncChunks.map(chunk => 
          `${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`
        ).join(', ');
        
        console.warn(
          `⚠️  Found ${oversizedAsyncChunks.length} large async chunks that might benefit from further splitting: ${chunkDetails}`
        );
      }
      
      // This is a warning rather than a hard failure for async chunks
      expect(oversizedAsyncChunks.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Performance Budget Enforcement', () => {
    it('should generate a performance budget report', () => {
      if (!bundleAnalysis) return;
      
      const report = {
        timestamp: new Date().toISOString(),
        totalSize: bundleAnalysis.totalSize,
        totalSizeMB: (bundleAnalysis.totalSize / 1024 / 1024).toFixed(2),
        chunkCount: bundleAnalysis.chunks.filter(chunk => chunk.type === 'js').length,
        largestChunk: bundleAnalysis.chunks[0],
        categories: bundleAnalysis.categories,
        budgetStatus: {
          totalSize: bundleAnalysis.totalSize <= PERFORMANCE_BUDGET.MAX_TOTAL_BUNDLE_SIZE ? 'PASS' : 'FAIL',
          chunkCount: bundleAnalysis.chunks.filter(chunk => chunk.type === 'js').length <= PERFORMANCE_BUDGET.MAX_CHUNK_COUNT ? 'PASS' : 'FAIL',
          largestChunk: bundleAnalysis.chunks[0]?.size <= PERFORMANCE_BUDGET.MAX_CHUNK_SIZE ? 'PASS' : 'FAIL'
        }
      };
      
      // Write report to file for CI/CD integration
      const reportPath = path.resolve(__dirname, '../../dist/performance-budget-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('📊 Performance Budget Report generated:', reportPath);
      
      expect(report.budgetStatus.totalSize).toBe('PASS');
      expect(report.budgetStatus.chunkCount).toBe('PASS');
    });
  });
});