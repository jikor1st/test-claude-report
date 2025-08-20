import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { initCommand } from './init';
import { scanCommand } from './scan';
import { dashboardCommand } from './dashboard';

export const quickStartCommand = new Command('quick-start')
  .description('Quick start - Initialize, scan, and launch dashboard')
  .option('-p, --project <name>', 'Specific project to scan')
  .option('--limit <number>', 'Limit the number of sessions to analyze', '10')
  .action(async (options) => {
    console.log('🚀 Claude Report Analyzer - Quick Start\n');
    
    try {
      // Step 1: Initialize (check if already initialized)
      const configPath = join(process.cwd(), '.env');
      let needsInit = false;
      
      try {
        await fs.access(configPath);
        console.log('✅ Configuration found');
      } catch {
        needsInit = true;
      }
      
      if (needsInit) {
        console.log('📝 Initializing configuration...');
        // Run init command
        const initProcess = spawn('node', [__filename, 'init'], {
          stdio: 'inherit'
        });
        
        await new Promise((resolve, reject) => {
          initProcess.on('close', (code) => {
            if (code === 0) resolve(undefined);
            else reject(new Error('Init failed'));
          });
        });
      }
      
      // Step 2: Scan projects
      console.log('\n📊 Scanning projects...');
      const scanArgs = ['node', __filename, 'scan'];
      
      if (options.project) {
        scanArgs.push('--project', options.project);
      }
      if (options.limit) {
        scanArgs.push('--limit', options.limit);
      }
      
      const scanProcess = spawn(scanArgs[0], scanArgs.slice(1), {
        stdio: 'inherit'
      });
      
      await new Promise((resolve, reject) => {
        scanProcess.on('close', (code) => {
          if (code === 0) resolve(undefined);
          else reject(new Error('Scan failed'));
        });
      });
      
      // Step 3: Launch dashboard
      console.log('\n🎨 Launching dashboard...');
      console.log('   Dashboard will open at http://localhost:3000');
      console.log('   Press Ctrl+C to stop\n');
      
      const dashboardProcess = spawn('node', [__filename, 'dashboard'], {
        stdio: 'inherit'
      });
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        dashboardProcess.kill('SIGINT');
        process.exit(0);
      });
      
      await new Promise((resolve) => {
        dashboardProcess.on('close', resolve);
      });
      
    } catch (error) {
      console.error('\n❌ Quick start failed:', error);
      process.exit(1);
    }
  });