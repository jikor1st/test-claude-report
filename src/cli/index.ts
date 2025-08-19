#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { dashboardCommand } from './commands/dashboard';
import { createCommand } from './commands/create';
import { quickStartCommand } from './commands/quick-start';

const program = new Command();

program
  .name('claude-report')
  .description('Analyze and visualize Claude Code conversation sessions')
  .version('1.2.1');

// Add commands (quick start first for ease of use)
program.addCommand(quickStartCommand);
program.addCommand(createCommand);
program.addCommand(dashboardCommand);
program.addCommand(scanCommand);
program.addCommand(initCommand);

program.parse();