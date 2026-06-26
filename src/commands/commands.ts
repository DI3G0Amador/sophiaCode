import { Command } from 'commander';
import { runInitFlow } from '../core/orchestrator.js';
import { runMvpCommand } from './mvp.js';
import { runTaskCommand } from './task.js';
import { runDevCommand } from './dev.js';
import { runSkillCommand } from './skill.js';
import { runBridgeCommand } from './bridge.js';
import { runValidateCommand } from './validate.js';
import { runJiraConfigFlow } from './jira.js';
import { ensureLanguageResolved } from '../core/i18n.js';

/**
 * Configures the commands for the CLI using Commander.
 */
export function setupCommands(): Command {
  const program = new Command();

  program
    .name('sophiacode')
    .description('SophiaCode CLI - AI Agent Workspace Architect')
    .version('1.0.0');

  // Command: init
  program
    .command('init')
    .description('Initialize sophiAgents configuration and run sophiaContext gap discovery')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runInitFlow(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during initialization:', error);
        process.exit(1);
      }
    });

  // Command: mvp
  program
    .command('mvp')
    .description('Design and specify a Minimum Viable Product context using interactive prompts')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runMvpCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during MVP creation:', error);
        process.exit(1);
      }
    });

  // Command: task
  program
    .command('task')
    .description('Break down an MVP specification into planned tasks and checklists')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runTaskCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during task planning:', error);
        process.exit(1);
      }
    });

  // Command: dev
  program
    .command('dev')
    .description('Modo Engenheiro - Interactive checklist and next subtask guidance')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runDevCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during engineering mode execution:', error);
        process.exit(1);
      }
    });

  // Command: skill
  program
    .command('skill')
    .description('Initialize MCP server configs or local automation templates')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runSkillCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during skill setup:', error);
        process.exit(1);
      }
    });

  // Command: bridge
  program
    .command('bridge')
    .description(
      'Configure other developer tools (Claude Code, Cursor, OpenCode, Codex) to read sophiAgents context'
    )
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runBridgeCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during bridge setup:', error);
        process.exit(1);
      }
    });

  // Command: jira-mcp
  program
    .command('jira-mcp')
    .description('Start the built-in Jira MCP Server')
    .action(async () => {
      try {
        const basePath = process.cwd();
        const { startJiraMcpServer } = await import('../core/mcp/jiraServer.js');
        startJiraMcpServer(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during Jira MCP server startup:', error);
        process.exit(1);
      }
    });

  // Command: validate
  program
    .command('validate')
    .description('Validate and close tasks with Jira integration')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runValidateCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during task validation:', error);
        process.exit(1);
      }
    });

  // Command: jira
  program
    .command('jira')
    .description('Configure Jira Cloud integration settings interactively')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        await runJiraConfigFlow(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during Jira configuration:', error);
        process.exit(1);
      }
    });

  // Command: chat
  program
    .command('chat')
    .description('Start natural language chat interface to interact with SophiaCode')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await ensureLanguageResolved();
        const { runChatCommand } = await import('./chat.js');
        await runChatCommand(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during chat initialization:', error);
        process.exit(1);
      }
    });

  return program;
}
