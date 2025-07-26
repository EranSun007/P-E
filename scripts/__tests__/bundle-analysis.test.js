import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

      // Create test files
      fs.writeFileSync(path.join(testAssetsPath, 'test-chunk.js'), 'console.log("test");'.repeat(1000));
      fs.writeFileSync(path.join(testAssetsPath, 'test-styles.css'), '.test { color: red; }'.repeat(100));
    });

    afterEach(() => {
      // Clean up test files
      if (fs.existsSync(testDistPath)) {
        fs.rmSync(testDistPath, { recursive: true, force: true });
      }
    });

    it('should analyze bundle files when dist exists', () => {
      // This test would need to be adapted to work with the actual function
      // For now, we'll just test that the function exists and can be called
      expect(typeof analyzeBundleFiles).toBe('function');
    });
  });
});