#!/usr/bin/env node

/**
 * Script to standardize import statements across the codebase
 * - Use @/ path alias consistently
 * - Remove explicit .js/.jsx extensions
 * - Apply consistent import grouping
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Track changes made
const changes = [];

/**
 * Process a single file to standardize imports
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  
  const processedLines = lines.map(line => {
    // Skip non-import lines
    if (!line.trim().startsWith('import ')) {
      return line;
    }
    
    let newLine = line;
    
    // Convert relative imports to use @/ alias where appropriate
    if (line.includes("from '../")) {
      // Calculate how many levels up we need to go
      const relativePath = filePath.replace(srcDir, '').replace(/\\/g, '/');
      const depth = relativePath.split('/').length - 2; // -1 for file, -1 for 0-based
      
      // Replace ../../../ patterns with @/
      const upLevels = '../'.repeat(depth);
      if (line.includes(`from '${upLevels}`)) {
        newLine = line.replace(`from '${upLevels}`, "from '@/");
        modified = true;
      }
    }
    
    // Remove explicit .js and .jsx extensions (but keep the quotes)
    if (newLine.includes('.js\'') || newLine.includes('.jsx\'') || 
        newLine.includes('.js"') || newLine.includes('.jsx"')) {
      newLine = newLine.replace(/\.(jsx?)(['"])/g, '$2');
      modified = true;
    }
    
    return newLine;
  });
  
  if (modified) {
    const newContent = processedLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    changes.push({
      file: path.relative(process.cwd(), filePath),
      type: 'imports_standardized'
    });
  }
}

/**
 * Recursively process all JS/JSX files in a directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      processDirectory(fullPath);
    } else if (entry.isFile() && /\.(js|jsx)$/.test(entry.name)) {
      processFile(fullPath);
    }
  }
}

// Main execution
console.log('🔧 Standardizing import statements...');
processDirectory(srcDir);

if (changes.length > 0) {
  console.log(`\n✅ Standardized imports in ${changes.length} files:`);
  changes.forEach(change => {
    console.log(`  - ${change.file}`);
  });
} else {
  console.log('\n✅ All import statements are already standardized!');
}

console.log('\n📋 Import standardization complete!');