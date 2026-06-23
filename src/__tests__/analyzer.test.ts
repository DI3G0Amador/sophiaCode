import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { analyzeWorkspaceLocally, formatAnalysisReport } from '../fs/analyzer.js';

describe('Local Static Analyzer (fs/analyzer.ts)', () => {
  const testWorkspace = path.join(__dirname, 'temp-analyzer-test');

  beforeAll(async () => {
    // Setup clean temp workspace
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });

    // 1. Create a dummy package.json
    const packageJsonContent = {
      name: 'test-project',
      dependencies: {
        'puppeteer': '^22.0.0',
        'dotenv': '^16.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0'
      }
    };
    await fs.writeFile(
      path.join(testWorkspace, 'package.json'), 
      JSON.stringify(packageJsonContent, null, 2), 
      'utf-8'
    );

    // 2. Create a dummy typescript file with imports and JSDoc
    const tsFileContent = `
/**
 * This is a test file description.
 * It has multiple lines.
 */
import puppeteer from 'puppeteer';
import { myHelper } from './helper.js';

console.log('Testing');
`;
    await fs.writeFile(path.join(testWorkspace, 'test-file.ts'), tsFileContent, 'utf-8');
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  it('should analyze package.json and extract known tech stack', async () => {
    const analysis = await analyzeWorkspaceLocally(testWorkspace, ['test-file.ts']);
    
    expect(analysis.techStack).toContain('puppeteer (Browser Automation / Web Scraping)');
    expect(analysis.techStack).toContain('dotenv (Environment Configuration)');
  });

  it('should analyze code files, extracting imports and top-level comments', async () => {
    const analysis = await analyzeWorkspaceLocally(testWorkspace, ['test-file.ts']);
    const fileReport = analysis.files.find(f => f.filePath === 'test-file.ts');

    expect(fileReport).toBeDefined();
    expect(fileReport?.imports).toContain('puppeteer');
    // It should exclude relative imports like './helper.js'
    expect(fileReport?.imports).not.toContain('./helper.js');
    expect(fileReport?.description).toBe('This is a test file description. It has multiple lines.');
  });

  it('should generate a highly compact formatted report string', async () => {
    const analysis = await analyzeWorkspaceLocally(testWorkspace, ['test-file.ts']);
    const reportStr = formatAnalysisReport(analysis);

    expect(reportStr).toContain('=== LOCAL ARCHITECTURAL REPORT ===');
    expect(reportStr).toContain('test-file.ts');
    expect(reportStr).toContain('Imports: puppeteer');
    expect(reportStr).toContain('Desc: This is a test file description.');
  });
});
