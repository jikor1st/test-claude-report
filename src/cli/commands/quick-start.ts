import { Command } from 'commander';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

export const quickStartCommand = new Command('start')
  .description('Quick start - Create project and run dashboard immediately')
  .argument('[project-name]', 'Name of the project', 'my-claude-analyzer')
  .option('--skip-install', 'Skip npm install (if already installed)')
  .action(async (projectName, options) => {
    try {
      const projectPath = join(process.cwd(), projectName);
      
      // Check if project exists
      let projectExists = false;
      try {
        await fs.access(projectPath);
        projectExists = true;
      } catch {
        // Project doesn't exist
      }
      
      if (!projectExists) {
        // Create new project
        console.log(`🚀 Creating new project: ${projectName}`);
        
        await fs.mkdir(projectPath, { recursive: true });
        
        // Create minimal package.json
        const packageJson = {
          name: projectName,
          version: "1.0.0",
          description: "Claude Report Analyzer Project",
          scripts: {
            "dashboard": "claude-report-analyzer dashboard",
            "scan": "claude-report-analyzer scan",
            "analyze": "claude-report-analyzer scan --project ."
          },
          dependencies: {
            "claude-report-analyzer": "latest"
          }
        };
        
        await fs.writeFile(
          join(projectPath, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
        
        // Create .env
        const envContent = `CLAUDE_PROJECTS_PATH=${process.env.HOME}/.claude/projects\n`;
        await fs.writeFile(join(projectPath, '.env'), envContent);
        
        // Create reports directory
        await fs.mkdir(join(projectPath, 'reports', 'projects'), { recursive: true });
        
        console.log('✅ Project created!');
      } else {
        console.log(`📁 Using existing project: ${projectName}`);
      }
      
      // Install dependencies if needed
      if (!options.skipInstall) {
        console.log('📦 Installing dependencies...');
        
        const installProcess = spawn('npm', ['install'], {
          cwd: projectPath,
          stdio: 'inherit',
          shell: true
        });
        
        await new Promise((resolve, reject) => {
          installProcess.on('close', (code) => {
            if (code === 0) {
              resolve(code);
            } else {
              reject(new Error(`Installation failed with code ${code}`));
            }
          });
        });
        
        console.log('✅ Dependencies installed!');
      }
      
      // Start dashboard
      console.log('\n🎨 Starting dashboard...');
      console.log('📌 Dashboard URL: http://localhost:3000');
      console.log('📌 API URL: http://localhost:3001');
      console.log('📌 Press Ctrl+C to stop\n');
      
      const dashboardProcess = spawn('npx', ['claude-report-analyzer', 'dashboard'], {
        cwd: projectPath,
        stdio: 'inherit',
        shell: true
      });
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping dashboard...');
        dashboardProcess.kill('SIGINT');
        setTimeout(() => process.exit(0), 100);
      });
      
      process.on('SIGTERM', () => {
        dashboardProcess.kill('SIGTERM');
        process.exit(0);
      });
      
      dashboardProcess.on('close', (code) => {
        console.log('Dashboard stopped');
        process.exit(code || 0);
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });