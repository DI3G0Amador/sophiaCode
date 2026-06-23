import { Command } from 'commander';
import { runInitFlow } from '../core/orchestrator.js';

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
    .description('Initialize sophiAgents configuration inside the workspace')
    .action(async () => {
      try {
        const basePath = process.cwd();
        await runInitFlow(basePath);
      } catch (error) {
        console.error('An unexpected error occurred during initialization:', error);
        process.exit(1);
      }
    });

  // Command: mvp (placeholder)
  program
    .command('mvp')
    .description('Design and specify a Minimum Viable Product context (coming soon)')
    .action(() => {
      console.log('📦 The "mvp" command is under development. Coming soon!');
    });

  // Command: task (placeholder)
  program
    .command('task')
    .description('Manage agent backlog tasks and checklists (coming soon)')
    .action(() => {
      console.log('📋 The "task" command is under development. Coming soon!');
    });

  // Command: skill (placeholder)
  program
    .command('skill')
    .description('Configure specific behavioral rules and tools for agents (coming soon)')
    .action(() => {
      console.log('🛠️ The "skill" command is under development. Coming soon!');
    });

  // Command: dev (placeholder)
  program
    .command('dev')
    .description('Run local dev server with active agent watchers (coming soon)')
    .action(() => {
      console.log('💻 The "dev" command is under development. Coming soon!');
    });

  return program;
}
