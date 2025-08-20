#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { dashboardCommand } from './commands/dashboard';
import { quickStartCommand } from './commands/quick-start';

const program = new Command();

program
  .name('claude-report')
  .description('Analyze and visualize Claude Code conversation sessions')
  .version('1.0.3');

program.addCommand(initCommand);
program.addCommand(scanCommand);
program.addCommand(dashboardCommand);
program.addCommand(quickStartCommand);

program.parse();