#!/usr/bin/env node

/**
 * Apply Test Structure Standards
 * 
 * This script applies consistent test organization patterns across all test files:
 * 1. Standardizes import grouping and ordering
 * 2. Ensures consistent describe/it block structure
 * 3. Applies standard mock patterns (beforeEach/afterEach)
 * 4. Updates file naming conventions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

class TestStandardsApplier {
  constructor() {
    this.processedFiles = 0;
    this.standardizedFiles = 0;
    this.errors = [];
  }

  async applyStandards() {
    console.log('🔧 Applying test structure standards...\n');
    
    try {
      const testFiles = await this.findAllTestFiles();
      console.log(`📁 Found ${testFiles.length} test files to process\n`);
      
      for (const filePath of testFiles) {
        await this.standardizeFile(filePath);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Standardization failed:', error.message);
      process.exit(1);
    }
  }

  async findAllTestFiles() {
    const testFiles = [];
    const searchDirs = [
      'src/components',
      'src/services', 
      'src/utils',
      'src/pages',
      'src/hooks',
      'src/contexts',
      'src/api',
      'src/__tests__',
      'scripts/__tests__'
    ];

    for (const dir of searchDirs) {
      const fullPath = path.join(rootDir, dir);
      if (fs.existsSync(fullPath)) {
        await this.findTestFilesRecursive(fullPath, testFiles);
      }
    }

    return testFiles;
  }

  async findTestFilesRecursive(dir, testFiles) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name === '__tests__') {
        const testDirFiles = fs.readdirSync(fullPath);
        for (const testFile of testDirFiles) {
          if (testFile.endsWith('.test.js') || testFile.endsWith('.test.jsx')) {
            testFiles.push(path.join(fullPath, testFile));
          }
        }
      } else if (entry.isDirectory()) {
        await this.findTestFilesRecursive(fullPath, testFiles);
      } else if (entry.name.includes('.test.') && 
                 (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        testFiles.push(fullPath);
      }
    }
  }

  async standardizeFile(filePath) {
    this.processedFiles++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(rootDir, filePath);
      
      console.log(`📝 Processing: ${relativePath}`);
      
      let standardizedContent = content;
      let hasChanges = false;

      // 1. Standardize imports
      const importsResult = this.standardizeImports(standardizedContent);
      if (importsResult.changed) {
        standardizedContent = importsResult.content;
        hasChanges = true;
      }

      // 2. Ensure proper test structure
      const structureResult = this.ensureTestStructure(standardizedContent, filePath);
      if (structureResult.changed) {
        standardizedContent = structureResult.content;
        hasChanges = true;
      }

      // 3. Add standard mock patterns
      const mocksResult = this.addStandardMockPatterns(standardizedContent);
      if (mocksResult.changed) {
        standardizedContent = mocksResult.content;
        hasChanges = true;
      }

      if (hasChanges) {
        fs.writeFileSync(filePath, standardizedContent);
        this.standardizedFiles++;
        console.log(`  ✅ Standardized`);
      } else {
        console.log(`  ✓ Already compliant`);
      }

    } catch (error) {
      const relativePath = path.relative(rootDir, filePath);
      this.errors.push(`${relativePath}: ${error.message}`);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  standardizeImports(content) {
    const lines = content.split('\n');
    const importStartIndex = lines.findIndex(line => line.trim().startsWith('import'));
    
    if (importStartIndex === -1) {
      return { content, changed: false };
    }
    
    // Find end of imports
    let importEndIndex = importStartIndex;
    for (let i = importStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import') || line === '' || line.startsWith('//')) {
        importEndIndex = i;
      } else {
        break;
      }
    }
    
    const importLines = lines.slice(importStartIndex, importEndIndex + 1);
    const beforeImports = lines.slice(0, importStartIndex);
    const afterImports = lines.slice(importEndIndex + 1);
    
    // Group imports
    const groups = {
      vitest: [],
      react: [],
      testingLibrary: [],
      thirdParty: [],
      local: []
    };
    
    for (const line of importLines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import')) continue;
      
      const match = trimmed.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      
      const moduleName = match[1];
      
      if (/^(vitest|@vitest)/.test(moduleName)) {
        groups.vitest.push(line);
      } else if (/^react/.test(moduleName)) {
        groups.react.push(line);
      } else if (/^@testing-library/.test(moduleName)) {
        groups.testingLibrary.push(line);
      } else if (/^[@.]/.test(moduleName)) {
        groups.local.push(line);
      } else {
        groups.thirdParty.push(line);
      }
    }
    
    // Build standardized imports
    const standardizedImports = [];
    
    if (groups.vitest.length > 0) {
      standardizedImports.push(...groups.vitest.sort(), '');
    }
    if (groups.react.length > 0) {
      standardizedImports.push(...groups.react.sort(), '');
    }
    if (groups.testingLibrary.length > 0) {
      standardizedImports.push(...groups.testingLibrary.sort(), '');
    }
    if (groups.thirdParty.length > 0) {
      standardizedImports.push(...groups.thirdParty.sort(), '');
    }
    if (groups.local.length > 0) {
      standardizedImports.push(...groups.local.sort(), '');
    }
    
    // Remove trailing empty line
    if (standardizedImports[standardizedImports.length - 1] === '') {
      standardizedImports.pop();
    }
    
    const originalImports = importLines.join('\n');
    const newImports = standardizedImports.join('\n');
    
    if (originalImports !== newImports) {
      const newContent = [
        ...beforeImports,
        ...standardizedImports,
        ...afterImports
      ].join('\n');
      
      return { content: newContent, changed: true };
    }
    
    return { content, changed: false };
  }

  ensureTestStructure(content, filePath) {
    // Ensure main describe block exists
    if (!content.includes('describe(')) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const componentName = fileName.replace('.test', '');
      
      const lines = content.split('\n');
      const testStartIndex = lines.findIndex(line => 
        line.trim().startsWith('it(') || line.trim().startsWith('test(')
      );
      
      if (testStartIndex !== -1) {
        // Find the end of imports to insert describe block
        const importEndIndex = lines.findIndex((line, index) => 
          index > 0 && !line.trim().startsWith('import') && 
          !line.trim().startsWith('//') && !line.trim().startsWith('vi.mock') &&
          line.trim() !== ''
        );
        
        const insertIndex = importEndIndex !== -1 ? importEndIndex : testStartIndex;
        
        lines.splice(insertIndex, 0, `describe('${componentName}', () => {`);
        lines.push('});');
        
        // Indent existing test content
        for (let i = insertIndex + 1; i < lines.length - 1; i++) {
          if (lines[i].trim() !== '') {
            lines[i] = '  ' + lines[i];
          }
        }
        
        return { content: lines.join('\n'), changed: true };
      }
    }
    
    return { content, changed: false };
  }

  addStandardMockPatterns(content) {
    // Check if mocks are used and beforeEach is missing
    if ((content.includes('vi.fn()') || content.includes('vi.mock(')) && 
        !content.includes('beforeEach(')) {
      
      const lines = content.split('\n');
      const describeIndex = lines.findIndex(line => line.includes('describe('));
      
      if (describeIndex !== -1) {
        // Find the opening brace of the describe block
        const openBraceIndex = lines.findIndex((line, index) => 
          index > describeIndex && line.includes('{')
        );
        
        if (openBraceIndex !== -1) {
          const beforeEachBlock = [
            '  beforeEach(() => {',
            '    vi.clearAllMocks();',
            '  });',
            ''
          ];
          
          lines.splice(openBraceIndex + 1, 0, ...beforeEachBlock);
          
          return { content: lines.join('\n'), changed: true };
        }
      }
    }
    
    return { content, changed: false };
  }

  printSummary() {
    console.log('\n📊 Standardization Summary:');
    console.log(`   Total files processed: ${this.processedFiles}`);
    console.log(`   Files standardized: ${this.standardizedFiles}`);
    console.log(`   Files already compliant: ${this.processedFiles - this.standardizedFiles}`);
    
    if (this.errors.length > 0) {
      console.log(`   Errors encountered: ${this.errors.length}`);
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (this.standardizedFiles > 0) {
      console.log('\n✅ Test structure standardization completed successfully!');
      console.log('\nStandardizations applied:');
      console.log('• Import statements grouped and sorted consistently');
      console.log('• Main describe blocks added where missing');
      console.log('• Standard beforeEach mock cleanup patterns added');
      console.log('• Consistent indentation and formatting applied');
    } else {
      console.log('\n✅ All test files are already compliant with standards!');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const applier = new TestStandardsApplier();
  applier.applyStandards().catch(console.error);
}

export { TestStandardsApplier };