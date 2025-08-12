import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { Config } from '../../shared/types';
import { safeStringify } from '../../shared/utils';

const CONFIG_DIR = join(process.cwd(), 'reports');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(join(CONFIG_DIR, 'projects'), { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create config directory: ${error}`);
  }
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(configData) as Config;
  } catch (error) {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, safeStringify(config, 2));
}

export async function getClaudeProjectsPath(): Promise<string> {
  // 환경 변수로 오버라이드 가능
  if (process.env.CLAUDE_PROJECTS_PATH) {
    return process.env.CLAUDE_PROJECTS_PATH;
  }
  
  const config = await loadConfig();
  if (config?.claudeProjectsPath) {
    return config.claudeProjectsPath;
  }
  return join(homedir(), '.claude', 'projects');
}