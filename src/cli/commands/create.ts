import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export const createCommand = new Command('create')
  .description('Create a new Claude Report Analyzer project')
  .argument('[project-name]', 'Name of the project', 'claude-report-project')
  .action(async (projectName) => {
    try {
      // Handle current directory case
      const isCurrentDir = projectName === '.';
      const projectPath = isCurrentDir ? process.cwd() : join(process.cwd(), projectName);
      const displayName = isCurrentDir ? 'current directory' : projectName;
      
      console.log(`🚀 Setting up Claude Report Analyzer in ${displayName}`);
      
      // Check if directory exists (only for non-current directory)
      if (!isCurrentDir) {
        try {
          await fs.access(projectPath);
          console.error(`❌ Directory ${projectName} already exists!`);
          process.exit(1);
        } catch {
          // Directory doesn't exist, good to proceed
          await fs.mkdir(projectPath, { recursive: true });
        }
      }
      
      // Check if package.json already exists in current directory
      if (isCurrentDir) {
        try {
          await fs.access(join(projectPath, 'package.json'));
          console.log('📦 Found existing package.json, merging settings...');
          
          // Read existing package.json
          const existingPackageJson = JSON.parse(
            await fs.readFile(join(projectPath, 'package.json'), 'utf-8')
          );
          
          // Merge scripts and dependencies
          existingPackageJson.scripts = {
            ...existingPackageJson.scripts,
            "dashboard": "claude-report dashboard",
            "scan": "claude-report scan",
            "analyze": "claude-report scan --project ."
          };
          
          existingPackageJson.dependencies = {
            ...existingPackageJson.dependencies,
            "claude-report-analyzer": "latest"
          };
          
          // Write merged package.json
          await fs.writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify(existingPackageJson, null, 2)
          );
        } catch {
          // No existing package.json, create new one
          const newPackageName = projectPath.split('/').pop() || 'claude-report-project';
          const packageJson = {
            name: newPackageName,
            version: "1.0.0",
            description: "Claude Report Analyzer Project",
            scripts: {
              "dashboard": "claude-report dashboard",
              "scan": "claude-report scan",
              "analyze": "claude-report scan --project ."
            },
            dependencies: {
              "claude-report-analyzer": "latest"
            }
          };
          
          await fs.writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
          );
        }
      } else {
        // Create new package.json for new directory
        const packageJson = {
          name: projectName,
          version: "1.0.0",
          description: "Claude Report Analyzer Project",
          scripts: {
            "dashboard": "claude-report dashboard",
            "scan": "claude-report scan",
            "analyze": "claude-report scan --project ."
          },
          dependencies: {
            "claude-report-analyzer": "latest"
          }
        };
        
        await fs.writeFile(
          join(projectPath, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      }
      
      // Create .env file if it doesn't exist
      try {
        await fs.access(join(projectPath, '.env'));
        console.log('📋 .env file already exists, skipping...');
      } catch {
        const envContent = `# Claude Projects Path
CLAUDE_PROJECTS_PATH=${process.env.HOME}/.claude/projects

# Claude API Key (optional, for AI analysis)
# ANTHROPIC_API_KEY=your-api-key-here
`;
        await fs.writeFile(join(projectPath, '.env'), envContent);
        console.log('✅ Created .env file');
      }
      
      // Create .gitignore if it doesn't exist
      try {
        await fs.access(join(projectPath, '.gitignore'));
        console.log('📋 .gitignore file already exists, skipping...');
      } catch {
        const gitignoreContent = `node_modules/
dist/
.env
reports/
*.log
.DS_Store
`;
        await fs.writeFile(join(projectPath, '.gitignore'), gitignoreContent);
        console.log('✅ Created .gitignore file');
      }
      
      // Create README if it doesn't exist
      const readmeFileName = 'README-claude-report.md';
      const readmeProjectName = isCurrentDir ? projectPath.split('/').pop() || 'Claude Report Project' : projectName;
      const readmeContent = `# ${readmeProjectName}

Claude Report Analyzer Project

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start dashboard
npm run dashboard

# Scan and analyze projects
npm run scan -- --project my-project

# Analyze current project
npm run analyze
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName}/
├── package.json
├── .env              # Configuration
├── .gitignore
├── README.md
└── reports/          # Generated reports will be stored here
    └── projects/
\`\`\`

## 🔧 Configuration

Edit \`.env\` file to configure:
- \`CLAUDE_PROJECTS_PATH\`: Path to Claude projects
- \`ANTHROPIC_API_KEY\`: API key for AI analysis (optional)

## 📖 Documentation

Visit [claude-report-analyzer](https://www.npmjs.com/package/claude-report-analyzer) for full documentation.
`;
      
      await fs.writeFile(join(projectPath, readmeFileName), readmeContent);
      console.log(`✅ Created ${readmeFileName}`);
      
      // Create reports directory
      await fs.mkdir(join(projectPath, 'reports', 'projects'), { recursive: true });
      
      console.log(`
✅ Project created successfully!

📁 Project location: ${projectPath}
`);
      
      // 자동 설치 옵션
      console.log('\n📦 Installing dependencies...\n');
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
      
      console.log('\n✨ Dependencies installed successfully!\n');
      
      // 자동 실행 여부 묻기
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('🚀 Start dashboard now? (Y/n): ', (answer: string) => {
          rl.close();
          resolve(answer.toLowerCase());
        });
      });
      
      if (answer === '' || answer === 'y' || answer === 'yes') {
        console.log('\n🎨 Starting dashboard...\n');
        console.log('📌 Press Ctrl+C to stop the server\n');
        
        // 대시보드 실행
        const dashboardProcess = spawn('npm', ['run', 'dashboard'], {
          cwd: projectPath,
          stdio: 'inherit',
          shell: true
        });
        
        // Ctrl+C 처리
        process.on('SIGINT', () => {
          console.log('\n\n🛑 Stopping dashboard...');
          dashboardProcess.kill('SIGINT');
          process.exit(0);
        });
        
        dashboardProcess.on('close', (code) => {
          process.exit(code || 0);
        });
      } else {
        console.log(`
📝 To start the dashboard later:
  cd ${projectName}
  npm run dashboard
`);
      }
      
    } catch (error) {
      console.error('❌ Error creating project:', error);
      process.exit(1);
    }
  });