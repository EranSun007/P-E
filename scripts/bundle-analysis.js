#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bundle Analysis Script
 * Generates detailed bundle size reports after build
 */

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundleFiles() {
  const distPath = path.resolve(__dirname, '../dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (!fs.existsSync(assetsPath)) {
    console.error('❌ Assets directory not found in build output.');
    process.exit(1);
  }

  console.log('📊 Bundle Analysis Report');
  console.log('========================\n');

  // Analyze main bundle files
  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  
  let totalSize = 0;
  const chunks = [];

  // Analyze JavaScript chunks
  console.log('📦 JavaScript Chunks:');
  jsFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalSize += size;
    
    chunks.push({
      name: file,
      size: size,
      type: 'js'
    });
    
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  // Analyze CSS files
  if (cssFiles.length > 0) {
    console.log('\n🎨 CSS Files:');
    cssFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      totalSize += size;
      
      chunks.push({
        name: file,
        size: size,
        type: 'css'
      });
      
      console.log(`  ${file}: ${formatBytes(size)}`);
    });
  }

  // Summary
  console.log('\n📈 Summary:');
  console.log(`  Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`  JavaScript Chunks: ${jsFiles.length}`);
  console.log(`  CSS Files: ${cssFiles.length}`);
  
  // Find largest chunks
  const sortedChunks = chunks.sort((a, b) => b.size - a.size);
  console.log('\n🔍 Largest Chunks:');
  sortedChunks.slice(0, 5).forEach((chunk, index) => {
    console.log(`  ${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)}`);
  });

  // Size warnings
  const warningThreshold = 500 * 1024; // 500 KB
  const largeChunks = chunks.filter(chunk => chunk.size > warningThreshold);
  
  if (largeChunks.length > 0) {
    console.log('\n⚠️  Large Chunks (>500 KB):');
    largeChunks.forEach(chunk => {
      console.log(`  ${chunk.name}: ${formatBytes(chunk.size)}`);
    });
  }

  // Check if bundle analysis HTML exists
  const analysisPath = path.join(distPath, 'bundle-analysis.html');
  if (fs.existsSync(analysisPath)) {
    console.log(`\n🔗 Visual Analysis: file://${analysisPath}`);
  }

  console.log('\n✅ Bundle analysis complete!');
  
  return {
    totalSize,
    chunks: sortedChunks,
    largeChunks
  };
}

// Run analysis if called directly
if (process.argv[1] && process.argv[1].endsWith('bundle-analysis.js')) {
  analyzeBundleFiles();
}

export { analyzeBundleFiles, formatBytes };