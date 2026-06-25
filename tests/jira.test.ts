import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { loadJiraCredentials } from '../src/core/mcp/jiraServer.js';
import { saveProjectConfig } from '../src/core/fs/writer.js';

describe('Jira Integration Module', () => {
  const testWorkspace = path.join(__dirname, 'temp-jira-workspace');

  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
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
});
