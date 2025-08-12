import { Command } from 'commander';
import { join } from 'path';
import { homedir } from 'os';
import readline from 'readline/promises';
import { saveConfig, loadConfig } from '../utils/config';
import type { Config } from '../../shared/types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export const initCommand = new Command('init')
  .description('Claude Report Analyzer 초기 설정')
  .action(async () => {
    try {
      console.log('🚀 Claude Report Analyzer 초기화 중...\n');

      const existingConfig = await loadConfig();
      if (existingConfig) {
        const overwrite = await rl.question(
          '설정이 이미 존재합니다. 덮어쓰시겠습니까? (y/n): '
        );
        if (overwrite.toLowerCase() !== 'y') {
          console.log('설정이 변경되지 않았습니다.');
          rl.close();
          return;
        }
      }

      const defaultPath = join(homedir(), '.claude', 'projects');
      const claudeProjectsPath = await rl.question(
        `Claude 프로젝트 폴더 경로를 입력하세요 (기본값: ${defaultPath}): `
      );

      const finalPath = claudeProjectsPath.trim() || defaultPath;

      const config: Config = {
        claudeProjectsPath: finalPath,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await saveConfig(config);

      console.log('\n✅ 설정이 성공적으로 저장되었습니다!');
      console.log(`📁 Claude 프로젝트 경로: ${finalPath}`);
      console.log(`📁 리포트 저장 위치: ${join(process.cwd(), 'reports')}`);
      
      rl.close();
    } catch (error) {
      console.error('❌ Error during initialization:', error);
      rl.close();
      process.exit(1);
    }
  });