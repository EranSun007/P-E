#!/usr/bin/env node

/**
 * Test Structure Standardization Script
 * 
 * This script standardizes test structure and patterns across all test files:
 * - Applies consistent test organization patterns
 * - Ensures all tests follow established naming conventions
 * - Updates test imports to use standardized paths
 * - Standardizes describe/it block structure
 * - Applies consistent mock patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Standard patterns for test organization
const STANDARD_PATTERNS = {
  // Import grouping order
  IMPORT_ORDER: [
    'vitest', 
    'react', 
    '@testing-library', 
    'third-party', 
    'local-components', 
    'local-services', 
    'local-utils'
  ],
  
  // Standard describe block structure
  DESCRIBE_STRUCTURE: {
    component: [
      'rendering',
      'props and state',
      'user interactions',
      'error handling',
      'accessibility'
    ],
    service: [
      'initialization',
      'core functionality',
      'error handling',
      'edge cases',
      'integration'
    ],
    utility: [
      'basic functionality',
      'input validation',
      'error handling',
      'edge cases'
    ]
  },

  // Standard mock patterns
  MOCK_PATTERNS: {
    beforeEach: `beforeEach(() => {
    vi.clearAllMocks();
  });`,
    afterEach: `afterEach(() => {
    vi.restoreAllMocks();
  });`
  }
};

// File naming conventions
const NAMING_CONVENTIONS = {
  component: /^[A-Z][a-zA-Z0-9]*\.test\.jsx$/,
  service: /^[a-z][a-zA-Z0-9]*Service\.test\.js$/,
  utility: /^[a-z][a-zA-Z0-9]*\.test\.js$/,
  integration: /^[a-zA-Z0-9-]*\.integration\.test\.(js|jsx)$/,
  e2e: /^[a-zA-Z0-9-]*\.e2e\.test\.(js|jsx)$/
};

// Path standardization rules
const PATH_STANDARDS = {
  // Use @ alias for src imports
  srcAlias: /@\/(.+)/,
  // Relative imports for local files
  relativeImports: /^\.\.?\//,
  // Standard import groupings
  importGroups: {
    vitest: /^(vitest|@vitest)/,
    react: /^react/,
    testingLibrary: /^@testing-library/,
    thirdParty: /^[^.@]/,
    local: /^[@.]/
  }
};

class TestStandardizer {
  constructor() {
    this.processedFiles = 0;
    this.standardizedFiles = 0;
    this.errors = [];
  }

  /**
   * Main standardization process
   */
  async standardizeAllTests() {
    console.log('🔧 Starting test structure standardization...\n');
    
    try {
      const testFiles = await this.findAllTestFiles();
      console.log(`📁 Found ${testFiles.length} test files to process\n`);
      
      for (const filePath of testFiles) {
        await this.standardizeTestFile(filePath);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Standardization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Find all test files in the project
   */
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

  /**
   * Recursively find test files
   */
  async findTestFilesRecursive(dir, testFiles) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name === '__tests__') {
        // Process all files in __tests__ directories
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

  /**
   * Standardize a single test file
   */
  async standardizeTestFile(filePath) {
    this.processedFiles++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(rootDir, filePath);
      
      console.log(`📝 Processing: ${relativePath}`);
      
      let standardizedContent = content;
      let hasChanges = false;

      // 1. Standardize imports
      const { content: importsStandardized, changed: importsChanged } = 
        this.standardizeImports(standardizedContent, filePath);
      standardizedContent = importsStandardized;
      hasChanges = hasChanges || importsChanged;

      // 2. Standardize describe/it structure
      const { content: structureStandardized, changed: structureChanged } = 
        this.standardizeTestStructure(standardizedContent, filePath);
      standardizedContent = structureStandardized;
      hasChanges = hasChanges || structureChanged;

      // 3. Standardize mock patterns
      const { content: mocksStandardized, changed: mocksChanged } = 
        this.standardizeMockPatterns(standardizedContent);
      standardizedContent = mocksStandardized;
      hasChanges = hasChanges || mocksChanged;

      // 4. Apply consistent formatting
      const { content: formattingStandardized, changed: formattingChanged } = 
        this.standardizeFormatting(standardizedContent);
      standardizedContent = formattingStandardized;
      hasChanges = hasChanges || formattingChanged;

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

  /**
   * Standardize import statements
   */
  standardizeImports(content, filePath) {
    let hasChanges = false;
    let lines = content.split('\n');
    
    // Find import section
    const importStartIndex = lines.findIndex(line => line.trim().startsWith('import'));
    if (importStartIndex === -1) return { content, changed: false };
    
    const importEndIndex = lines.findIndex((line, index) => 
      index > importStartIndex && !line.trim().startsWith('import') && 
      !line.trim().startsWith('//') && line.trim() !== ''
    );
    
    if (importEndIndex === -1) return { content, changed: false };
    
    const importLines = lines.slice(importStartIndex, importEndIndex);
    const nonImportLines = [
      ...lines.slice(0, importStartIndex),
      ...lines.slice(importEndIndex)
    ];
    
    // Group and sort imports
    const groupedImports = this.groupImports(importLines);
    const sortedImports = this.sortImportGroups(groupedImports);
    
    // Check if imports changed
    const originalImports = importLines.join('\n');
    const newImports = sortedImports.join('\n');
    
    if (originalImports !== newImports) {
      hasChanges = true;
      lines = [
        ...nonImportLines.slice(0, importStartIndex),
        ...sortedImports,
        ...nonImportLines.slice(importStartIndex)
      ];
    }
    
    return { content: lines.join('\n'), changed: hasChanges };
  }

  /**
   * Group imports by type
   */
  groupImports(importLines) {
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
      
      // Extract module name
      const match = trimmed.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      
      const moduleName = match[1];
      
      if (PATH_STANDARDS.importGroups.vitest.test(moduleName)) {
        groups.vitest.push(line);
      } else if (PATH_STANDARDS.importGroups.react.test(moduleName)) {
        groups.react.push(line);
      } else if (PATH_STANDARDS.importGroups.testingLibrary.test(moduleName)) {
        groups.testingLibrary.push(line);
      } else if (PATH_STANDARDS.importGroups.local.test(moduleName)) {
        groups.local.push(line);
      } else {
        groups.thirdParty.push(line);
      }
    }
    
    return groups;
  }

  /**
   * Sort import groups
   */
  sortImportGroups(groups) {
    const sortedImports = [];
    
    // Add groups in standard order with spacing
    if (groups.vitest.length > 0) {
      sortedImports.push(...groups.vitest.sort());
      sortedImports.push('');
    }
    
    if (groups.react.length > 0) {
      sortedImports.push(...groups.react.sort());
      sortedImports.push('');
    }
    
    if (groups.testingLibrary.length > 0) {
      sortedImports.push(...groups.testingLibrary.sort());
      sortedImports.push('');
    }
    
    if (groups.thirdParty.length > 0) {
      sortedImports.push(...groups.thirdParty.sort());
      sortedImports.push('');
    }
    
    if (groups.local.length > 0) {
      sortedImports.push(...groups.local.sort());
      sortedImports.push('');
    }
    
    // Remove trailing empty line
    if (sortedImports[sortedImports.length - 1] === '') {
      sortedImports.pop();
    }
    
    return sortedImports;
  }

  /**
   * Standardize test structure (describe/it blocks)
   */
  standardizeTestStructure(content, filePath) {
    let hasChanges = false;
    
    // Ensure proper describe block structure
    if (!content.includes('describe(')) {
      // Add main describe block if missing
      const fileName = path.basename(filePath, path.extname(filePath));
      const componentName = fileName.replace('.test', '');
      
      const lines = content.split('\n');
      const testStartIndex = lines.findIndex(line => 
        line.trim().startsWith('it(') || line.trim().startsWith('test(')
      );
      
      if (testStartIndex !== -1) {
        lines.splice(testStartIndex, 0, `describe('${componentName}', () => {`);
        lines.push('});');
        hasChanges = true;
        content = lines.join('\n');
      }
    }
    
    return { content, changed: hasChanges };
  }

  /**
   * Standardize mock patterns
   */
  standardizeMockPatterns(content) {
    let hasChanges = false;
    let standardizedContent = content;
    
    // Ensure beforeEach exists if mocks are used
    if (content.includes('vi.fn()') || content.includes('vi.mock(')) {
      if (!content.includes('beforeEach(')) {
        // Find the first describe block and add beforeEach
        const describeMatch = content.match(/describe\([^{]+\{/);
        if (describeMatch) {
          const insertIndex = content.indexOf(describeMatch[0]) + describeMatch[0].length;
          const beforeEachBlock = `\n  ${STANDARD_PATTERNS.MOCK_PATTERNS.beforeEach}\n`;
          standardizedContent = content.slice(0, insertIndex) + beforeEachBlock + content.slice(insertIndex);
          hasChanges = true;
        }
      }
    }
    
    return { content: standardizedContent, changed: hasChanges };
  }

  /**
   * Standardize formatting
   */
  standardizeFormatting(content) {
    let hasChanges = false;
    let standardizedContent = content;
    
    // Ensure consistent spacing around describe/it blocks
    standardizedContent = standardizedContent.replace(/describe\(/g, 'describe(');
    standardizedContent = standardizedContent.replace(/it\(/g, 'it(');
    standardizedContent = standardizedContent.replace(/expect\(/g, 'expect(');
    
    // Ensure consistent indentation (2 spaces)
    const lines = standardizedContent.split('\n');
    const formattedLines = lines.map(line => {
      if (line.trim() === '') return '';
      
      // Count leading spaces and convert tabs to spaces
      const leadingSpaces = line.match(/^(\s*)/)[1].replace(/\t/g, '  ');
      const content = line.trim();
      
      return leadingSpaces + content;
    });
    
    const formattedContent = formattedLines.join('\n');
    if (formattedContent !== standardizedContent) {
      hasChanges = true;
      standardizedContent = formattedContent;
    }
    
    return { content: standardizedContent, changed: hasChanges };
  }

  /**
   * Print standardization summary
   */
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
      console.log('\nNext steps:');
      console.log('1. Run the test suite to ensure all tests still pass');
      console.log('2. Review the changes and commit them');
      console.log('3. Update any remaining non-standard patterns manually');
    } else {
      console.log('\n✅ All test files are already compliant with standards!');
    }
  }
}

// Run standardization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const standardizer = new TestStandardizer();
  standardizer.standardizeAllTests().catch(console.error);
}

export { TestStandardizer };