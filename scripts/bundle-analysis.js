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

  console.log('📊 Detailed Bundle Analysis Report');
  console.log('==================================\n');

  // Analyze main bundle files
  let files;
  try {
    files = fs.readdirSync(assetsPath);
  } catch (error) {
    console.error('❌ Error reading assets directory:', error.message);
    process.exit(1);
  }
  
  if (!files) {
    console.error('❌ No files found in assets directory.');
    process.exit(1);
  }
  
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  const otherFiles = files.filter(file => !file.endsWith('.js') && !file.endsWith('.css'));
  
  let totalSize = 0;
  const chunks = [];

  // Analyze JavaScript chunks with categorization
  console.log('📦 JavaScript Chunks:');
  jsFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalSize += size;
    
    // Categorize chunks
    let category = 'app';
    if (file.includes('vendor-')) category = 'vendor';
    else if (file.includes('chunk-')) category = 'async';
    else if (file.includes('index-')) category = 'entry';
    
    chunks.push({
      name: file,
      size: size,
      type: 'js',
      category: category
    });
    
    const warning = size > 400 * 1024 ? ' ⚠️  (>400KB)' : '';
    console.log(`  ${file}: ${formatBytes(size)}${warning}`);
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
        type: 'css',
        category: 'styles'
      });
      
      console.log(`  ${file}: ${formatBytes(size)}`);
    });
  }

  // Analyze other assets
  if (otherFiles.length > 0) {
    console.log('\n📁 Other Assets:');
    otherFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      totalSize += size;
      
      chunks.push({
        name: file,
        size: size,
        type: 'asset',
        category: 'assets'
      });
      
      console.log(`  ${file}: ${formatBytes(size)}`);
    });
  }

  // Enhanced Summary with categories
  console.log('\n📈 Bundle Summary:');
  console.log(`  Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`  JavaScript Chunks: ${jsFiles.length}`);
  console.log(`  CSS Files: ${cssFiles.length}`);
  console.log(`  Other Assets: ${otherFiles.length}`);
  
  // Category breakdown
  const categories = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.category]) acc[chunk.category] = { count: 0, size: 0 };
    acc[chunk.category].count++;
    acc[chunk.category].size += chunk.size;
    return acc;
  }, {});
  
  console.log('\n📊 Size by Category:');
  Object.entries(categories).forEach(([category, data]) => {
    const percentage = ((data.size / totalSize) * 100).toFixed(1);
    console.log(`  ${category}: ${formatBytes(data.size)} (${percentage}%) - ${data.count} files`);
  });
  
  // Find largest chunks
  const sortedChunks = chunks.sort((a, b) => b.size - a.size);
  console.log('\n🔍 Largest Chunks:');
  sortedChunks.slice(0, 8).forEach((chunk, index) => {
    const percentage = ((chunk.size / totalSize) * 100).toFixed(1);
    console.log(`  ${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)} (${percentage}%)`);
  });

  // Size warnings with recommendations
  const warningThreshold = 400 * 1024; // 400 KB (matching Vite config)
  const largeChunks = chunks.filter(chunk => chunk.size > warningThreshold);
  
  if (largeChunks.length > 0) {
    console.log('\n⚠️  Large Chunks (>400 KB):');
    largeChunks.forEach(chunk => {
      console.log(`  ${chunk.name}: ${formatBytes(chunk.size)}`);
    });
    console.log('\n💡 Optimization Suggestions:');
    console.log('  - Consider code splitting for large chunks');
    console.log('  - Use dynamic imports for rarely used features');
    console.log('  - Review vendor chunk grouping');
  }

  // Performance insights
  const jsSize = chunks.filter(c => c.type === 'js').reduce((sum, c) => sum + c.size, 0);
  const cssSize = chunks.filter(c => c.type === 'css').reduce((sum, c) => sum + c.size, 0);
  
  console.log('\n⚡ Performance Insights:');
  console.log(`  JavaScript: ${formatBytes(jsSize)} (${((jsSize / totalSize) * 100).toFixed(1)}%)`);
  console.log(`  CSS: ${formatBytes(cssSize)} (${((cssSize / totalSize) * 100).toFixed(1)}%)`);
  
  if (jsSize > 1024 * 1024) { // > 1MB
    console.log('  📝 Consider implementing more aggressive code splitting');
  }
  
  // Check if bundle analysis HTML exists
  const analysisPath = path.join(distPath, 'bundle-analysis.html');
  if (fs.existsSync(analysisPath)) {
    console.log(`\n🔗 Visual Analysis: file://${analysisPath}`);
    console.log('  Open this file in your browser for interactive bundle exploration');
  }

  console.log('\n✅ Bundle analysis complete!');
  
  return {
    totalSize,
    chunks: sortedChunks,
    largeChunks,
    categories
  };
}

// Run analysis if called directly
if (process.argv[1] && process.argv[1].endsWith('bundle-analysis.js')) {
  analyzeBundleFiles();
}

export { analyzeBundleFiles, formatBytes };