import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadJiraCredentials } from '../src/core/mcp/jiraServer.js';
import { saveProjectConfig } from '../src/core/fs/writer.js';
import * as p from '@clack/prompts';
import { runJiraConfigFlow } from '../src/commands/jira.js';

const tempHome = path.join(__dirname, 'temp-jira-home');
vi.spyOn(os, 'homedir').mockReturnValue(tempHome);

vi.mock('@clack/prompts', () => {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    log: {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    select: vi.fn(),
    text: vi.fn(),
    password: vi.fn(),
    isCancel: vi.fn(() => false),
  };
});

describe('Jira Integration Module', () => {
  const testWorkspace = path.join(__dirname, 'temp-jira-workspace');

  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
    await fs.rm(tempHome, { recursive: true, force: true });
    await fs.mkdir(tempHome, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should load Jira credentials from project config when environment vars are not present', async () => {
    const config = {
      jira: {
        url: 'https://test-domain.atlassian.net',
        email: 'test@example.com',
        token: 'test-token',
      },
    };
    await saveProjectConfig(testWorkspace, config);

    // Temporarily clear environment variables to test config file loading
    const origUrl = process.env.JIRA_URL;
    const origEmail = process.env.JIRA_EMAIL;
    const origToken = process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;

    try {
      const creds = await loadJiraCredentials(testWorkspace);
      expect(creds.url).toBe(config.jira.url);
      expect(creds.email).toBe(config.jira.email);
      expect(creds.token).toBe(config.jira.token);
    } finally {
      // Restore variables
      process.env.JIRA_URL = origUrl;
      process.env.JIRA_EMAIL = origEmail;
      process.env.JIRA_API_TOKEN = origToken;
    }
  });

  it('should run configuration flow and save settings locally', async () => {
    // 1. Create required context files for checkConfigExist
    const contextDir = path.join(testWorkspace, 'sophiAgents', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(path.join(contextDir, 'architecture.md'), '# Architecture');
    await fs.writeFile(path.join(contextDir, 'coding-patterns.md'), '# Coding Patterns');

    // 2. Set up prompt responses
    const textMock = vi.mocked(p.text);
    const selectMock = vi.mocked(p.select);
    const passwordMock = vi.mocked(p.password);

    // Prompt call sequence:
    // 1st text: url
    // 2nd text: email
    // password: token
    // 3rd text: projectKey
    textMock
      .mockResolvedValueOnce('https://local-domain.atlassian.net') // URL
      .mockResolvedValueOnce('local@example.com') // Email
      .mockResolvedValueOnce('MYPROJ'); // Project Key

    passwordMock.mockResolvedValueOnce('local-token-xyz'); // Token

    selectMock.mockResolvedValueOnce('local'); // Scope selection

    // 3. Run flow
    await runJiraConfigFlow(testWorkspace);

    // 4. Verify local config contains all values
    const configData = await fs.readFile(
      path.join(testWorkspace, 'sophiAgents', 'config.json'),
      'utf-8'
    );
    const config = JSON.parse(configData);

    expect(config.jira).toEqual({
      url: 'https://local-domain.atlassian.net',
      email: 'local@example.com',
      token: 'local-token-xyz',
      projectKey: 'MYPROJ',
    });
  });

  it('should run configuration flow and save settings globally', async () => {
    // Make sure workspace context files are already there (from previous test)
    const textMock = vi.mocked(p.text);
    const selectMock = vi.mocked(p.select);
    const passwordMock = vi.mocked(p.password);

    // Mock prompt sequence for global
    textMock
      .mockResolvedValueOnce('https://global-domain.atlassian.net') // URL
      .mockResolvedValueOnce('global@example.com') // Email
      .mockResolvedValueOnce('GLOBALPROJ'); // Project Key

    passwordMock.mockResolvedValueOnce('global-token-abc'); // Token

    selectMock.mockResolvedValueOnce('global'); // Scope selection

    // Run flow
    await runJiraConfigFlow(testWorkspace);

    // Verify local config has project key and URL, but no token or email
    const localConfigData = await fs.readFile(
      path.join(testWorkspace, 'sophiAgents', 'config.json'),
      'utf-8'
    );
    const localConfig = JSON.parse(localConfigData);

    expect(localConfig.jira.projectKey).toBe('GLOBALPROJ');
    expect(localConfig.jira.url).toBe('https://global-domain.atlassian.net');
    expect(localConfig.jira.token).toBeUndefined();
    expect(localConfig.jira.email).toBeUndefined();

    // Verify global config has URL, email, token
    const globalConfigPath = path.join(tempHome, '.sophiacode', 'config.json');
    const globalConfigData = await fs.readFile(globalConfigPath, 'utf-8');
    const globalConfig = JSON.parse(globalConfigData);

    expect(globalConfig.jira).toEqual({
      url: 'https://global-domain.atlassian.net',
      email: 'global@example.com',
      token: 'global-token-abc',
    });
  });
});
