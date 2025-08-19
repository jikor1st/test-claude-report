# my-test-analyzer

Claude Report Analyzer Project

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dashboard
npm run dashboard

# Scan and analyze projects
npm run scan -- --project my-project

# Analyze current project
npm run analyze
```

## 📁 Project Structure

```
my-test-analyzer/
├── package.json
├── .env              # Configuration
├── .gitignore
├── README.md
└── reports/          # Generated reports will be stored here
    └── projects/
```

## 🔧 Configuration

Edit `.env` file to configure:
- `CLAUDE_PROJECTS_PATH`: Path to Claude projects
- `ANTHROPIC_API_KEY`: API key for AI analysis (optional)

## 📖 Documentation

Visit [claude-report-analyzer](https://www.npmjs.com/package/claude-report-analyzer) for full documentation.
