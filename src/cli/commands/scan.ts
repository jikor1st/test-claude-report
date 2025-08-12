import { Command } from 'commander';
import { join } from 'path';
import readline from 'readline/promises';
import { getClaudeProjectsPath, loadConfig } from '../utils/config';
import { scanProjects, ensureProjectReportDir, loadProjectMetadata, saveProjectMetadata } from '../utils/scanner';
import { analyzeSession, saveDailyReport } from '../utils/analyzer';
import type { ProjectMetadata, SessionReport } from '../../shared/types';

export const scanCommand = new Command('scan')
  .description('Claude 프로젝트 스캔 및 AI 분석')
  .option('-p, --project <name>', '특정 프로젝트 스캔')
  .option('--no-ai', 'AI 분석 비활성화 (AI 없이는 리포트가 생성되지 않음)')
  .option('--limit <n>', '분석할 최대 세션 수', '10')
  .action(async (options) => {
    let rl: readline.Interface | null = null;
    
    try {
      const config = await loadConfig();
      if (!config) {
        console.error('❌ 설정을 찾을 수 없습니다. 먼저 "npm run claude-report init"를 실행하세요.');
        process.exit(1);
      }

      const claudeProjectsPath = await getClaudeProjectsPath();
      console.log(`📂 프로젝트 스캔 중: ${claudeProjectsPath}\n`);

      const projects = await scanProjects(claudeProjectsPath);
      
      if (projects.length === 0) {
        console.log('프로젝트를 찾을 수 없습니다.');
        return;
      }

      let selectedProject: string;

      if (options.project) {
        selectedProject = options.project;
      } else {
        // readline 인터페이스를 필요할 때만 생성
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        console.log('사용 가능한 프로젝트:');
        projects.forEach((project, index) => {
          console.log(`${index + 1}. ${project}`);
        });

        const choice = await rl.question('\n프로젝트 번호를 선택하세요: ');
        const projectIndex = parseInt(choice) - 1;

        if (projectIndex < 0 || projectIndex >= projects.length) {
          console.error('잘못된 선택입니다.');
          rl.close();
          return;
        }

        selectedProject = projects[projectIndex];
      }

      console.log(`\n🔍 프로젝트 분석 중: ${selectedProject}`);
      
      const projectReportDir = await ensureProjectReportDir(selectedProject);
      const projectPath = join(claudeProjectsPath, selectedProject);
      
      // Load or create metadata
      let metadata = await loadProjectMetadata(projectReportDir);
      if (!metadata) {
        metadata = {
          projectName: selectedProject,
          lastAnalyzed: new Date().toISOString(),
          analyzedSessions: [],
          totalReports: 0
        };
      }

      // 실제 프로젝트 분석
      const { analyzeProject } = await import('../utils/analyzer');
      console.log(`  프로젝트 경로: ${projectPath}`);
      
      // AI 분석이 기본값 (--no-ai 옵션이 없으면 true)
      const useAI = options.ai !== false;
      
      if (useAI) {
        console.log('  🤖 AI 분석 모드 활성화');
      } else {
        console.log('  ⚠️  AI 분석이 비활성화되었습니다. 리포트가 생성되지 않습니다.');
      }
      
      const groupedSessions = await analyzeProject(projectPath, { 
        useAI,
        limit: parseInt(options.limit),
        analyzedSessions: metadata.analyzedSessions
      });
      
      if (groupedSessions.size === 0) {
        console.log('  ⚠️  분석할 세션을 찾을 수 없습니다.');
        if (rl) rl.close();
        return;
      }
      
      // 날짜별로 리포트 저장
      let totalSessionsAnalyzed = 0;
      const reportDates: string[] = [];
      
      for (const [date, sessions] of groupedSessions) {
        console.log(`  ${date}: ${sessions.length}개 세션 분석 중...`);
        await saveDailyReport(projectReportDir, date, sessions);
        totalSessionsAnalyzed += sessions.length;
        reportDates.push(date);
        
        // 메타데이터에 세션 ID 추가
        metadata.analyzedSessions.push(...sessions.map(s => s.sessionId));
      }
      
      // Update metadata
      metadata.lastAnalyzed = new Date().toISOString();
      metadata.totalReports = groupedSessions.size;
      await saveProjectMetadata(projectReportDir, metadata);

      console.log(`\n✅ 분석 완료!`);
      console.log(`📊 총 ${totalSessionsAnalyzed}개 세션 분석`);
      console.log(`📅 ${reportDates.length}개 일일 리포트 생성`);
      console.log(`💾 리포트 저장 위치: ${join(projectReportDir, 'reports/')}`);
      
      if (rl) rl.close();
    } catch (error) {
      console.error('❌ 스캔 중 오류 발생:', error);
      if (rl) rl.close();
      process.exit(1);
    }
  });