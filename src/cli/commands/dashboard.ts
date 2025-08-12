import { Command } from 'commander';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

export const dashboardCommand = new Command('dashboard')
  .description('Start the web dashboard')
  .option('-p, --port <number>', 'Port to run the dashboard on', '3000')
  .option('--api-port <number>', 'Port to run the API server on', '3001')
  .action(async (options) => {
    try {
      console.log(`🚀 Starting Claude Report Dashboard...`);
      
      // Start API server
      console.log(`📡 Starting API server on port ${options.apiPort}...`);
      const apiProcess = spawn('tsx', ['src/server/index.ts'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT: options.apiPort }
      });

      // Start Vite dev server
      console.log(`🎨 Starting web interface on port ${options.port}...`);
      const viteProcess = spawn('npx', ['vite', '--port', options.port], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true
      });

      const cleanup = () => {
        console.log('\n🛑 Stopping services...');
        viteProcess.kill('SIGINT');
        apiProcess.kill('SIGINT');
        process.exit(0);
      };

      viteProcess.on('error', (error) => {
        console.error('❌ Failed to start dashboard:', error);
        cleanup();
      });

      apiProcess.on('error', (error) => {
        console.error('❌ Failed to start API server:', error);
        cleanup();
      });

      viteProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Dashboard process exited with code ${code}`);
          cleanup();
        }
      });

      apiProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`API server process exited with code ${code}`);
          cleanup();
        }
      });

      // Handle graceful shutdown
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

    } catch (error) {
      console.error('❌ Error starting dashboard:', error);
      process.exit(1);
    }
  });