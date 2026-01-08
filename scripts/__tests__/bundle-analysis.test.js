import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeBundleFiles, formatBytes } from '../bundle-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Bundle Analysis', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should handle edge cases', () => {
      expect(formatBytes(1)).toBe('1 Bytes');
      expect(formatBytes(1023)).toBe('1023 Bytes');
      expect(formatBytes(1025)).toBe('1 KB');
    });
  });

  describe('analyzeBundleFiles', () => {
    const testDistPath = path.resolve(__dirname, '../../test-dist');
    const testAssetsPath = path.join(testDistPath, 'assets');

    beforeEach(() => {
      // Create test directory structure
      if (!fs.existsSync(testDistPath)) {
        fs.mkdirSync(testDistPath, { recursive: true });
      }
      if (!fs.existsSync(testAssetsPath)) {
        fs.mkdirSync(testAssetsPath, { recursive: true });
      }

      // Create test files with realistic names and sizes
      fs.writeFileSync(path.join(testAssetsPath, 'vendor-core-abc123.js'), 'console.log("vendor-core");'.repeat(5000));
      fs.writeFileSync(path.join(testAssetsPath, 'vendor-ui-def456.js'), 'console.log("vendor-ui");'.repeat(8000));
      fs.writeFileSync(path.join(testAssetsPath, 'index-ghi789.js'), 'console.log("main");'.repeat(3000));
      fs.writeFileSync(path.join(testAssetsPath, 'chunk-jkl012.js'), 'console.log("async");'.repeat(2000));
      fs.writeFileSync(path.join(testAssetsPath, 'index-mno345.css'), '.test { color: red; }'.repeat(500));
      fs.writeFileSync(path.join(testAssetsPath, 'favicon.ico'), Buffer.alloc(1024));
    });

    afterEach(() => {
      // Clean up test files
      if (fs.existsSync(testDistPath)) {
        fs.rmSync(testDistPath, { recursive: true, force: true });
      }
    });

    it('should analyze bundle files and return structured data', () => {
      // Mock the path resolution to use our test directory
      const originalResolve = path.resolve;
      vi.spyOn(path, 'resolve').mockImplementation((dir, ...paths) => {
        if (paths[0] === '../dist') {
          return testDistPath;
        }
        return originalResolve(dir, ...paths);
      });

      // Suppress console output during test
      const originalConsoleLog = console.log;
      console.log = vi.fn();

      try {
        const result = analyzeBundleFiles();
        
        expect(result).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
        expect(result.chunks).toBeInstanceOf(Array);
        expect(result.largeChunks).toBeInstanceOf(Array);
        expect(result.categories).toBeDefined();
        
        // Check that chunks are properly categorized
        const jsChunks = result.chunks.filter(chunk => chunk.type === 'js');
        expect(jsChunks.length).toBeGreaterThan(0);
        
        // Check for vendor chunks
        const vendorChunks = jsChunks.filter(chunk => chunk.category === 'vendor');
        expect(vendorChunks.length).toBeGreaterThan(0);
        
        // Check for entry chunks
        const entryChunks = jsChunks.filter(chunk => chunk.category === 'entry');
        expect(entryChunks.length).toBeGreaterThan(0);
        
        // Check for async chunks
        const asyncChunks = jsChunks.filter(chunk => chunk.category === 'async');
        expect(asyncChunks.length).toBeGreaterThan(0);
        
      } finally {
        console.log = originalConsoleLog;
        path.resolve.mockRestore();
      }
    });

    it('should handle missing dist directory gracefully', () => {
      // Mock fs.existsSync to return false for dist directory
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      
      // Mock process.exit to prevent actual exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        analyzeBundleFiles();
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockConsoleError).toHaveBeenCalledWith('❌ Build directory not found. Run "npm run build" first.');
      } finally {
        mockExit.mockRestore();
        mockConsoleError.mockRestore();
        fs.existsSync.mockRestore();
      }
    });

    it('should identify large chunks correctly', () => {
      // Create a large test file
      fs.writeFileSync(path.join(testAssetsPath, 'large-chunk-xyz.js'), 'console.log("large");'.repeat(50000));
      
      const originalResolve = path.resolve;
      vi.spyOn(path, 'resolve').mockImplementation((dir, ...paths) => {
        if (paths[0] === '../dist') {
          return testDistPath;
        }
        return originalResolve(dir, ...paths);
      });

      const originalConsoleLog = console.log;
      console.log = vi.fn();

      try {
        const result = analyzeBundleFiles();
        
        // Should identify the large chunk
        expect(result.largeChunks.length).toBeGreaterThan(0);
        
        const largeChunk = result.largeChunks.find(chunk => chunk.name.includes('large-chunk'));
        expect(largeChunk).toBeDefined();
        expect(largeChunk.size).toBeGreaterThan(400 * 1024); // > 400KB
        
      } finally {
        console.log = originalConsoleLog;
        path.resolve.mockRestore();
      }
    });

    it('should calculate categories correctly', () => {
      const originalResolve = path.resolve;
      vi.spyOn(path, 'resolve').mockImplementation((dir, ...paths) => {
        if (paths[0] === '../dist') {
          return testDistPath;
        }
        return originalResolve(dir, ...paths);
      });

      const originalConsoleLog = console.log;
      console.log = vi.fn();

      try {
        const result = analyzeBundleFiles();
        
        expect(result.categories).toBeDefined();
        expect(result.categories.vendor).toBeDefined();
        expect(result.categories.entry).toBeDefined();
        expect(result.categories.async).toBeDefined();
        expect(result.categories.styles).toBeDefined();
        expect(result.categories.assets).toBeDefined();
        
        // Each category should have count and size
        Object.values(result.categories).forEach(category => {
          expect(category.count).toBeGreaterThanOrEqual(0);
          expect(category.size).toBeGreaterThanOrEqual(0);
        });
        
      } finally {
        console.log = originalConsoleLog;
        path.resolve.mockRestore();
      }
    });
  });
});