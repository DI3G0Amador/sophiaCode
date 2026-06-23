#!/usr/bin/env node

import 'dotenv/config';
import { setupCommands } from './commands/commands.js';
import { runInteractiveDashboard } from './commands/dashboard.js';

const basePath = process.cwd();

if (process.argv.length <= 2) {
  try {
    await runInteractiveDashboard(basePath);
  } catch (error) {
    console.error('An unexpected error occurred in the dashboard:', error);
    process.exit(1);
  }
} else {
  // Initialize and parse the command-line arguments
  const program = setupCommands();
  program.parse(process.argv);
}
