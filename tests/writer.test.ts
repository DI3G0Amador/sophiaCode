import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  checkConfigExist,
  saveDocumentation,
  readMapFile,
  writeMapFile,
  saveProjectConfig,
  readProjectConfig,
  saveRootBridgedFiles,
} from '../src/core/fs/writer.js';

describe('Writer Module (fs/writer.ts)', () => {
  const testWorkspace = path.join(__dirname, 'temp-test-workspace');

  // Setup: Ensure we clean up any pre-existing temp test folders
  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
  });

  // Teardown: Clean up the temp directory after all tests in this file run
  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  it('should return false if config folder and files do not exist', async () => {
    const exists = await checkConfigExist(testWorkspace);
    expect(exists).toBe(false);
  });

  it('should save documentation files and return true on existence check', async () => {
    const mapContent = '# My Project MAP';
    const agentsContent = '# My Project Agents Guidelines';

    // Save
    await saveDocumentation(testWorkspace, mapContent, agentsContent);

    // Verify folder and files exist
    const exists = await checkConfigExist(testWorkspace);
    expect(exists).toBe(true);

    // Verify the saved content is correct
    const savedMap = await readMapFile(testWorkspace);
    expect(savedMap).toBe(mapContent);
  });

  it('should overwrite MAP.md content using writeMapFile', async () => {
    const newMapContent = '# Updated Project MAP';

    await writeMapFile(testWorkspace, newMapContent);

    const savedMap = await readMapFile(testWorkspace);
    expect(savedMap).toBe(newMapContent);
  });

  it('should save and read config.json correctly', async () => {
    const configData = {
      provider: 'gemini',
      modelName: 'gemini-2.5-flash',
      temperature: 0.2,
      contextStrategy: 'full-context',
    };

    await saveProjectConfig(testWorkspace, configData);

    const readData = await readProjectConfig(testWorkspace);
    expect(readData).toEqual(configData);
  });

  it('should create new CLAUDE.md and AGENTS.md files in the root if they do not exist and are selected', async () => {
    const claudeContent = '# CLAUDE.md file';
    const agentsContent = '# AGENTS.md file';

    await saveRootBridgedFiles(testWorkspace, claudeContent, agentsContent, ['claude', 'opencode']);

    const readClaude = await fs.readFile(path.join(testWorkspace, 'CLAUDE.md'), 'utf-8');
    const readAgents = await fs.readFile(path.join(testWorkspace, 'AGENTS.md'), 'utf-8');

    expect(readClaude).toBe(claudeContent);
    expect(readAgents).toBe(agentsContent);
  });

  it('should only create CLAUDE.md and not AGENTS.md if only claude is selected', async () => {
    // Clean up first
    await fs.rm(path.join(testWorkspace, 'CLAUDE.md'), { force: true });
    await fs.rm(path.join(testWorkspace, 'AGENTS.md'), { force: true });

    const claudeContent = '# CLAUDE.md file';
    const agentsContent = '# AGENTS.md file';

    await saveRootBridgedFiles(testWorkspace, claudeContent, agentsContent, ['claude']);

    const readClaude = await fs.readFile(path.join(testWorkspace, 'CLAUDE.md'), 'utf-8');
    expect(readClaude).toBe(claudeContent);

    // AGENTS.md should not exist
    await expect(fs.access(path.join(testWorkspace, 'AGENTS.md'))).rejects.toThrow();
  });

  it('should prepend redirection notice to existing CLAUDE.md and AGENTS.md to preserve existing custom files when selected', async () => {
    const customClaude = '# Existing custom Claude commands\n- build: npm run compile';
    const claudePath = path.join(testWorkspace, 'CLAUDE.md');

    // Overwrite the test file with custom content
    await fs.writeFile(claudePath, customClaude, 'utf-8');

    // Run redirection logic
    await saveRootBridgedFiles(testWorkspace, '# Claude redirect', '# Agents redirect', [
      'claude',
      'opencode',
    ]);

    // Verify it was prepended
    const content = await fs.readFile(claudePath, 'utf-8');
    expect(content).toContain('SophiaCode Redirection');
    expect(content).toContain('This project uses **SophiaCode**');
    expect(content).toContain(customClaude); // Existing content preserved!
  });
});
