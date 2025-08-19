import { promises as fs } from 'fs';
import { appendFileSync } from 'fs';
import { join } from 'path';
import type { SessionReport, DailyReport } from '../../shared/types';
import { findSessionFiles, parseSessionFile, analyzeSessionContent, groupSessionsByDate } from './sessionAnalyzer';
import { safeStringify } from '../../shared/utils';

export async function analyzeProject(
  projectPath: string, 
  options: { 
    useAI?: boolean; 
    limit?: number; 
    analyzedSessions?: string[]; 
    sessionFilter?: (filePath: string) => boolean 
  } = {}
): Promise<Map<string, SessionReport[]>> {
  // AI 분석이 필수가 되도록 기본값 설정
  const useAI = options.useAI !== false; // 기본값 true
  
  if (!useAI) {
    console.log('⚠️  AI 분석이 비활성화되었습니다. AI 분석 없이는 리포트가 생성되지 않습니다.');
    return new Map();
  }
  
  // 프로젝트 내 모든 세션 파일 찾기
  const sessionFiles = await findSessionFiles(projectPath);
  console.log(`Found ${sessionFiles.length} session files`);
  
  // 이미 분석된 세션 제외
  const analyzedSet = new Set(options.analyzedSessions || []);
  
  // 디버깅용 파일 로그
  await fs.appendFile('analyzer-debug.log', `
[${new Date().toISOString()}] analyzeProject called
analyzedSessions received: ${JSON.stringify(options.analyzedSessions || [])}
analyzedSet size: ${analyzedSet.size}
sessionFiles count: ${sessionFiles.length}
`);
  
  let unanalyzedFiles = sessionFiles.filter(filePath => {
    const sessionId = filePath.split('/').pop() || '';
    const isAnalyzed = analyzedSet.has(sessionId);
    
    // 디버깅용 상세 로그
    appendFileSync('analyzer-debug.log', 
      `Checking ${sessionId}: ${isAnalyzed ? 'ANALYZED' : 'NEW'}\n`
    );
    
    return !isAnalyzed;
  });
  
  // Apply session filter if provided
  if (options.sessionFilter) {
    unanalyzedFiles = unanalyzedFiles.filter(options.sessionFilter);
  }
  
  console.log(`  📊 이미 분석된 세션: ${analyzedSet.size}개`);
  console.log(`  🆕 새로 분석할 세션: ${unanalyzedFiles.length}개`);
  
  if (unanalyzedFiles.length === 0) {
    console.log('  ✅ 모든 세션이 이미 분석되었습니다.');
    return new Map();
  }
  
  // limit 적용
  const filesToAnalyze = options.limit 
    ? unanalyzedFiles.slice(0, options.limit)
    : unanalyzedFiles;
    
  if (options.limit && unanalyzedFiles.length > options.limit) {
    console.log(`  📌 Limiting analysis to first ${options.limit} new sessions`);
  }
  
  // 각 세션 파일 분석
  const sessions: SessionReport[] = [];
  
  for (const filePath of filesToAnalyze) {
    const session = await parseSessionFile(filePath);
    if (session) {
      // AI 분석 시작
      console.log(`  📍 AI 분석 시작: ${session.name}`);
      try {
        const { analyzeWithClaudeCode } = await import('./claudeApi');
        const { loadMdTemplate, fillMdTemplate } = await import('./templates/mdTemplates');
        // 2단계 분석 포함된 결과 받기
        const aiAnalysisResult = await analyzeWithClaudeCode(session);
        
        if (aiAnalysisResult) {
          console.log(`  ✅ AI 분석 완료: ${session.name}`);
          
          // 템플릿 타입 가져오기 (analyzeWithClaudeCode에서 반환된 템플릿 타입 사용)
          const analysisData = aiAnalysisResult as any;
          const aiAnalysis = analysisData.analysis || analysisData;
          const templateType = analysisData.templateType;
          
          // MD 템플릿 로드 및 적용 (2단계 분석으로 강화된 데이터 사용)
          let mdxContent: string;
          if (templateType) {
            console.log(`  📝 MD 템플릿 적용: ${templateType}`);
            console.log(`  🔍 2단계 분석 데이터 포함됨`);
            const mdTemplate = await loadMdTemplate(templateType);
            mdxContent = fillMdTemplate(mdTemplate, aiAnalysis, session);
          } else {
            // 폴백: 기본 형식 사용
            const title = aiAnalysis.title || '제목 없음';
            const summary = aiAnalysis.summary || '요약 없음';
            const keyInsights = aiAnalysis.keyInsights || [];
            const languages = aiAnalysis.technicalDetails?.languages || [];
            const frameworks = aiAnalysis.technicalDetails?.frameworks || [];
            
            mdxContent = `# ${title}\n\n## 요약\n${summary}\n\n## 주요 인사이트\n${keyInsights.map((insight: string) => `- ${insight}`).join('\n')}\n\n## 사용된 기술\n${[...languages, ...frameworks].map((tech: string) => `- ${tech}`).join('\n')}`;
          }
          
          // AI 분석 결과로만 리포트 생성
          const report: SessionReport = {
            sessionId: session.id,
            date: new Date(session.created).toISOString().split('T')[0],
            title: aiAnalysis.title || '제목 없음',
            summary: aiAnalysis.summary || '요약 없음',
            mdxContent,
            keyTopics: [...(aiAnalysis.technicalDetails?.languages || []), ...(aiAnalysis.technicalDetails?.frameworks || [])],
            codeChanges: {
              filesModified: [], // AI 분석에서는 파일 목록을 제공하지 않음
              linesAdded: 0,
              linesRemoved: 0
            },
            duration: '알 수 없음', // AI 분석에서는 duration을 제공하지 않음
            status: 'completed' as const,
            aiInsights: {
              keyInsights: aiAnalysis.keyInsights || [],
              codeQuality: aiAnalysis.codeQuality || { strengths: [], improvements: [] },
              timeline: aiAnalysis.timeline || { mainTasks: [], completedGoals: [], challenges: [] }
            }
          };
          
          sessions.push(report);
        } else {
          console.log(`  ❌ AI 분석 실패: ${session.name} - 이 세션은 건너뜁니다.`);
        }
      } catch (error) {
        console.error(`  ⚠️  AI 분석 오류:`, error);
      }
    }
  }
  
  // 날짜별로 그룹화
  const groupedSessions = await groupSessionsByDate(sessions);
  return groupedSessions;
}

export async function analyzeSession(sessionPath: string): Promise<SessionReport> {
  // 기존 모의 구현 유지 (폴백용)
  const sessionId = sessionPath.split('/').pop() || 'unknown';
  const date = new Date().toISOString().split('T')[0];
  
  return {
    sessionId,
    date,
    title: `Session ${sessionId}`,
    summary: `분석된 세션 ${sessionId}`,
    mdxContent: `# Session ${sessionId}\n\n세션 내용이 여기에 표시됩니다.`,
    keyTopics: ['development', 'claude', 'analysis'],
    codeChanges: {
      filesModified: [],
      linesAdded: 0,
      linesRemoved: 0
    },
    duration: '0시간 0분',
    status: 'completed'
  };
}

export async function saveDailyReport(projectPath: string, date: string, sessions: SessionReport[]): Promise<void> {
  const reportPath = join(projectPath, 'reports', `${date}.json`);
  
  const dailyReport: DailyReport = {
    date,
    sessions,
    totalSessions: sessions.length,
    summary: `${sessions.length}개의 세션 분석 완료`
  };
  
  await fs.writeFile(reportPath, safeStringify(dailyReport, 2));
}

export async function loadDailyReport(projectPath: string, date: string): Promise<DailyReport | null> {
  try {
    const reportPath = join(projectPath, 'reports', `${date}.json`);
    const data = await fs.readFile(reportPath, 'utf-8');
    return JSON.parse(data) as DailyReport;
  } catch (error) {
    return null;
  }
}

// 개별 세션을 기존 리포트에 추가하는 함수
export async function addSessionToReport(projectReportDir: string, session: SessionReport): Promise<void> {
  const reportPath = join(projectReportDir, 'reports', `${session.date}.json`);
  await fs.mkdir(join(projectReportDir, 'reports'), { recursive: true });
  
  let report: DailyReport;
  
  // 기존 리포트가 있으면 로드
  const existingReport = await loadDailyReport(projectReportDir, session.date);
  
  if (existingReport) {
    // 중복 세션 체크 - sessionId로 확인
    const sessionIndex = existingReport.sessions.findIndex(s => s.sessionId === session.sessionId);
    if (sessionIndex >= 0) {
      // 기존 세션 업데이트 (재분석의 경우)
      existingReport.sessions[sessionIndex] = session;
      console.log(`  🔄 기존 세션 업데이트: ${session.sessionId}`);
    } else {
      // 새 세션 추가
      existingReport.sessions.push(session);
      console.log(`  ➕ 새 세션 추가: ${session.sessionId}`);
    }
    existingReport.totalSessions = existingReport.sessions.length;
    existingReport.summary = `${existingReport.sessions.length}개의 세션 분석 완료`;
    report = existingReport;
  } else {
    // 새 리포트 생성
    report = {
      date: session.date,
      sessions: [session],
      totalSessions: 1,
      summary: `1개의 세션 분석 완료`
    };
  }
  
  await fs.writeFile(reportPath, safeStringify(report, 2));
}

// 개별 세션 분석 및 즉시 리포트 저장
export async function analyzeSingleSession(
  projectPath: string,
  sessionFilePath: string,
  projectReportDir: string
): Promise<SessionReport | null> {
  const session = await parseSessionFile(sessionFilePath);
  if (!session) return null;
  
  console.log(`  📍 AI 분석 시작: ${session.name}`);
  try {
    const { analyzeWithClaudeCode } = await import('./claudeApi');
    // 2단계 분석 포함된 결과 받기
    const aiAnalysisResult = await analyzeWithClaudeCode(session);
    
    if (aiAnalysisResult) {
      console.log(`  ✅ AI 분석 완료: ${session.name}`);
      
      const analysisData = aiAnalysisResult as any;
      const aiAnalysis = analysisData.analysis || analysisData;
      const templateType = analysisData.templateType;
      
      // MD 템플릿 로드 및 적용 (2단계 분석으로 강화된 데이터 사용)
      const { loadMdTemplate, fillMdTemplate } = await import('./templates/mdTemplates');
      let mdxContent: string;
      
      if (templateType) {
        console.log(`  📝 MD 템플릿 적용: ${templateType}`);
        const mdTemplate = await loadMdTemplate(templateType);
        mdxContent = fillMdTemplate(mdTemplate, aiAnalysis, session);
      } else {
        const title = aiAnalysis.title || '제목 없음';
        const summary = aiAnalysis.summary || '요약 없음';
        const keyInsights = aiAnalysis.keyInsights || [];
        const languages = aiAnalysis.technicalDetails?.languages || [];
        const frameworks = aiAnalysis.technicalDetails?.frameworks || [];
        
        mdxContent = `# ${title}\n\n## 요약\n${summary}\n\n## 주요 인사이트\n${keyInsights.map((insight: string) => `- ${insight}`).join('\n')}\n\n## 사용된 기술\n${[...languages, ...frameworks].map((tech: string) => `- ${tech}`).join('\n')}`;
      }
      
      // AI 분석 결과로 리포트 생성
      const report: SessionReport = {
        sessionId: session.id,
        date: new Date(session.created).toISOString().split('T')[0],
        title: aiAnalysis.title || '제목 없음',
        summary: aiAnalysis.summary || '요약 없음',
        mdxContent,
        keyTopics: [...(aiAnalysis.technicalDetails?.languages || []), ...(aiAnalysis.technicalDetails?.frameworks || [])],
        codeChanges: {
          filesModified: [],
          linesAdded: 0,
          linesRemoved: 0
        },
        duration: '알 수 없음',
        status: 'completed' as const,
        aiInsights: {
          keyInsights: aiAnalysis.keyInsights || [],
          codeQuality: aiAnalysis.codeQuality || { strengths: [], improvements: [] },
          timeline: aiAnalysis.timeline || { mainTasks: [], completedGoals: [], challenges: [] }
        }
      };
      
      // 즉시 리포트에 저장
      await addSessionToReport(projectReportDir, report);
      console.log(`  💾 리포트 저장 완료: ${report.date}`);
      
      return report;
    } else {
      console.log(`  ❌ AI 분석 실패: ${session.name}`);
      return null;
    }
  } catch (error) {
    console.error(`  ⚠️  AI 분석 오류:`, error);
    return null;
  }
}