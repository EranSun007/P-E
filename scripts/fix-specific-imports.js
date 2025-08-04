#!/usr/bin/env node

/**
 * Script to fix specific import patterns that should use @/ alias
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
 * Process a single file to fix specific import patterns
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
    
    // Fix common relative import patterns to use @/ alias
    const patterns = [
      // Components importing from ui
      { from: /from ['"]\.\.\/ui\/([^'"]+)['"]/g, to: "from '@/components/ui/$1'" },
      // Components importing from other components
      { from: /from ['"]\.\.\/([^'"]+)['"]/g, to: "from '@/components/$1'" },
      // Services importing from api
      { from: /from ['"]\.\.\/api\/([^'"]+)['"]/g, to: "from '@/api/$1'" },
      // Utils importing from api
      { from: /from ['"]\.\.\/api\/([^'"]+)['"]/g, to: "from '@/api/$1'" },
      // Tests importing from parent directories
      { from: /from ['"]\.\.\/([^'"]+)['"]/g, to: "from '@/$1'" },
      // Two levels up
      { from: /from ['"]\.\.\/\.\.\/([^'"]+)['"]/g, to: "from '@/$1'" },
      // Three levels up  
      { from: /from ['"]\.\.\/\.\.\/\.\.\/([^'"]+)['"]/g, to: "from '@/$1'" }
    ];
    
    patterns.forEach(pattern => {
      if (pattern.from.test(newLine)) {
        const updatedLine = newLine.replace(pattern.from, pattern.to);
        if (updatedLine !== newLine) {
          newLine = updatedLine;
          modified = true;
        }
      }
    });
    
    return newLine;
  });
  
  if (modified) {
    const newContent = processedLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    changes.push({
      file: path.relative(process.cwd(), filePath),
      type: 'imports_fixed'
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
console.log('🔧 Fixing specific import patterns...');
processDirectory(srcDir);

if (changes.length > 0) {
  console.log(`\n✅ Fixed imports in ${changes.length} files:`);
  changes.forEach(change => {
    console.log(`  - ${change.file}`);
  });
} else {
  console.log('\n✅ All import patterns are already correct!');
}

console.log('\n📋 Import fixes complete!');