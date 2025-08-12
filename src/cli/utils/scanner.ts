import { promises as fs } from 'fs';
import { join } from 'path';
import type { ProjectMetadata } from '../../shared/types';
import { safeStringify } from '../../shared/utils';

export async function scanProjects(claudeProjectsPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(claudeProjectsPath, { withFileTypes: true });
    const projects = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    return projects;
  } catch (error) {
    console.error(`Error scanning projects directory: ${error}`);
    return [];
  }
}

export async function loadProjectMetadata(projectPath: string): Promise<ProjectMetadata | null> {
  try {
    const metadataPath = join(projectPath, 'metadata.json');
    const data = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(data) as ProjectMetadata;
    
    // 기존 리포트에서 분석된 세션 ID들을 추가로 수집하고 리포트 개수 재계산
    try {
      const reportsDir = join(projectPath, 'reports');
      const reportFiles = await fs.readdir(reportsDir);
      
      const allAnalyzedSessions = new Set(metadata.analyzedSessions || []);
      let reportCount = 0;
      
      for (const reportFile of reportFiles) {
        if (reportFile.endsWith('.json')) {
          reportCount++;
          const reportPath = join(reportsDir, reportFile);
          const reportData = await fs.readFile(reportPath, 'utf-8');
          const report = JSON.parse(reportData) as { sessions?: Array<{ sessionId: string }> };
          
          if (report.sessions) {
            report.sessions.forEach(session => {
              allAnalyzedSessions.add(session.sessionId);
            });
          }
        }
      }
      
      metadata.analyzedSessions = Array.from(allAnalyzedSessions);
      metadata.totalReports = reportCount; // 실제 파일 개수로 업데이트
    } catch {
      // 리포트 디렉토리가 없거나 읽기 실패 시 무시
      if (!metadata.analyzedSessions) {
        metadata.analyzedSessions = [];
      }
    }
    
    return metadata;
  } catch (error) {
    return null;
  }
}

export async function saveProjectMetadata(projectPath: string, metadata: ProjectMetadata): Promise<void> {
  const metadataPath = join(projectPath, 'metadata.json');
  await fs.writeFile(metadataPath, safeStringify(metadata, 2));
}

export async function ensureProjectReportDir(projectName: string): Promise<string> {
  const reportDir = join(process.cwd(), 'reports', 'projects', projectName);
  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(join(reportDir, 'reports'), { recursive: true });
  return reportDir;
}