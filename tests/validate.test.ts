import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runValidateCommand } from '../src/commands/validate.js';
import { saveProjectConfig, saveTask, readTaskSubtasks } from '../src/core/fs/writer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock clack prompts
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
    spinner: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    })),
    select: vi.fn().mockResolvedValue('task-01-test-task'),
    confirm: vi.fn().mockResolvedValue(true),
    text: vi.fn().mockResolvedValue('1h 30m'),
    isCancel: vi.fn(() => false),
  };
});

// Mock jiraServer
vi.mock('../src/core/mcp/jiraServer.js', () => {
  return {
    isJiraConfigured: vi.fn().mockResolvedValue(true),
    getJiraMyself: vi.fn().mockResolvedValue({
      accountId: 'test-account-id',
      displayName: 'Test Developer',
      emailAddress: 'test@example.com',
    }),
    assignJiraIssue: vi.fn().mockResolvedValue(undefined),
    addJiraWorklog: vi.fn().mockResolvedValue(undefined),
    transitionJiraIssueByName: vi.fn().mockResolvedValue(true),
  };
});

describe('Task Validation and Closure Command', () => {
  const testWorkspace = path.join(__dirname, 'temp-validate-workspace');

  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  it('should run validation command, interact with mock prompts & Jira, and complete local subtasks', async () => {
    // 1. Initialize project config and context files
    const config = {
      provider: 'openai',
      modelName: 'gpt-4',
      temperature: 0.7,
      jira: {
        url: 'https://test-domain.atlassian.net',
        email: 'test@example.com',
        token: 'test-token',
        projectKey: 'TEST',
      },
    };
    await saveProjectConfig(testWorkspace, config);

    // Create required context files
    const contextDir = path.join(testWorkspace, 'sophiAgents', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(path.join(contextDir, 'architecture.md'), '# Architecture');
    await fs.writeFile(path.join(contextDir, 'coding-patterns.md'), '# Coding Patterns');

    // 2. Create mock task
    const taskIndex = '01';
    const taskSlug = 'test-task';
    const planContent = '# Action Plan\n- Step 1';
    const subtasks = [
      { id: 'sub-1', title: 'Subtask 1', done: false },
      { id: 'sub-2', title: 'Subtask 2', done: false },
    ];
    await saveTask(testWorkspace, taskIndex, taskSlug, planContent, subtasks);

    // Write a mock jira.json inside task folder
    const taskDir = path.join(
      testWorkspace,
      'sophiAgents',
      'tasks',
      `task-${taskIndex}-${taskSlug}`
    );
    await fs.writeFile(
      path.join(taskDir, 'jira.json'),
      JSON.stringify({ issueKey: 'TEST-123', id: '10001', self: 'https://test.self' }, null, 2)
    );

    // 3. Run validation command
    await runValidateCommand(testWorkspace);

    // 4. Assert local subtasks are all completed (done: true)
    const updatedSubtasks = await readTaskSubtasks(testWorkspace, `task-${taskIndex}-${taskSlug}`);
    expect(updatedSubtasks.length).toBe(2);
    expect(updatedSubtasks[0].done).toBe(true);
    expect(updatedSubtasks[1].done).toBe(true);
  });
});
