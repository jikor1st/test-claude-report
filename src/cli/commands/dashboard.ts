import { Command } from 'commander';
import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

export const dashboardCommand = new Command('dashboard')
  .description('Start the web dashboard')
  .option('-p, --port <number>', 'Port to run the dashboard on', '3000')
  .option('--api-port <number>', 'Port to run the API server on', '3001')
  .action(async (options) => {
    try {
      console.log(`🚀 Starting Claude Report Dashboard...`);
      
      // Check if we're running from npm package or local development
      const isPackaged = __dirname.includes('node_modules');
      const packageRoot = isPackaged 
        ? join(__dirname, '..', '..', '..')  // Go up from dist/cli/commands to package root
        : process.cwd();
      
      // Determine the correct paths
      const serverPath = isPackaged 
        ? join(__dirname, '..', '..', 'server', 'index.js')  // Use compiled JS
        : 'src/server/index.ts';  // Use source TS
      
      const webPath = isPackaged
        ? join(__dirname, '..', '..', 'web')  // Serve compiled web files
        : process.cwd();  // Use vite dev server
      
      // Start API server
      console.log(`📡 Starting API server on port ${options.apiPort}...`);
      const apiCommand = isPackaged ? 'node' : 'tsx';
      const apiProcess = spawn(apiCommand, [serverPath], {
        cwd: packageRoot,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT: options.apiPort }
      });

      // Start web server
      console.log(`🎨 Starting web interface on port ${options.port}...`);
      let webProcess: ChildProcess;
      
      if (isPackaged) {
        // Serve the built web files
        const express = require('express');
        const app = express();
        app.use(express.static(webPath));
        app.get('*', (req: any, res: any) => {
          res.sendFile(join(webPath, 'index.html'));
        });
        const server = app.listen(options.port, () => {
          console.log(`✨ Dashboard running at http://localhost:${options.port}`);
        });
        
        // Create a fake process object for consistency
        webProcess = {
          kill: () => server.close(),
          on: (event: string, handler: any) => {}
        } as any;
      } else {
        // Use vite for development
        webProcess = spawn('npx', ['vite', '--port', options.port], {
          cwd: packageRoot,
          stdio: 'inherit',
          shell: true
        });
      }

      const cleanup = () => {
        console.log('\n🛑 Stopping services...');
        webProcess.kill('SIGINT');
        apiProcess.kill('SIGINT');
        process.exit(0);
      };

      if (!isPackaged) {
        webProcess.on('error', (error) => {
          console.error('❌ Failed to start dashboard:', error);
          cleanup();
        });

        webProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Dashboard process exited with code ${code}`);
            cleanup();
          }
        });
      }

      apiProcess.on('error', (error) => {
        console.error('❌ Failed to start API server:', error);
        cleanup();
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