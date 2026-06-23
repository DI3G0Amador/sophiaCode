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

  // Command: start (placeholder)
  program
    .command('start')
    .description('Start the AI agent execution context (coming soon)')
    .action(() => {
      console.log('🚀 The "start" command is under development. Coming soon!');
    });

  // Command: map (placeholder)
  program
    .command('map')
    .description('Remap the directory structure tree (coming soon)')
    .action(() => {
      console.log('🗺️ The "map" command is under development. Coming soon!');
    });

  // Command: edit (placeholder)
  program
    .command('edit')
    .description('Edit agent instructions and rules interactively (coming soon)')
    .action(() => {
      console.log('✏️ The "edit" command is under development. Coming soon!');
    });

  return program;
}
