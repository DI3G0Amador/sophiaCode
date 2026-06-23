#!/usr/bin/env node

import 'dotenv/config';
import { setupCommands } from './commands/commands.js';

// Initialize and parse the command-line arguments
const program = setupCommands();
program.parse(process.argv);
