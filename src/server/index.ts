import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getClaudeProjectsPath, loadConfig } from '../cli/utils/config';
import { scanProjects, loadProjectMetadata } from '../cli/utils/scanner';
import { loadDailyReport } from '../cli/utils/analyzer';
import type { Project, DailyReport, ProjectMetadata } from '../shared/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 분석 상태 저장소 (메모리 기반)
interface AnalysisStatus {
  projectId: string;
  status: 'analyzing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

const analysisStore = new Map<string, AnalysisStatus>();

// AI 분석 엔드포인트
app.post('/api/analyze/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`AI 분석 요청: ${sessionId}`);
    
    // Claude API 모듈 가져오기
    const { analyzeWithClaudeCode } = await import('../cli/utils/claudeApi');
    
    // 세션 데이터 찾기 (간단한 구현)
    // 실제로는 세션 ID로 정확한 세션 파일을 찾아야 함
    const session = {
      id: sessionId,
      name: sessionId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: [] // 실제 구현 시 세션 파일에서 로드
    };
    
    // AI 분석 수행
    const analysisResult = await analyzeWithClaudeCode(session);
    
    if (analysisResult) {
      // TODO: 분석 결과를 리포트에 저장
      res.json({ 
        success: true, 
        message: 'AI 분석이 완료되었습니다.',
        result: analysisResult
      });
    } else {
      res.status(500).json({ 
        error: 'AI 분석에 실패했습니다. Claude Code가 실행 중인지 확인해주세요.' 
      });
    }
  } catch (error) {
    console.error('AI 분석 오류:', error);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const claudeProjectsPath = await getClaudeProjectsPath();
    const projectNames = await scanProjects(claudeProjectsPath);
    
    const projects: Project[] = await Promise.all(
      projectNames.map(async (name) => {
        const projectReportDir = join(process.cwd(), 'reports', 'projects', name);
        const metadata = await loadProjectMetadata(projectReportDir);
        
        return {
          id: name,
          name: name,
          lastActivity: metadata?.lastAnalyzed || new Date().toISOString(),
          totalReports: metadata?.totalReports || 0,
          status: metadata ? 'active' : 'idle'
        };
      })
    );
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project details with reports
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    const projectReportDir = join(process.cwd(), 'reports', 'projects', decodedId);
    
    const metadata = await loadProjectMetadata(projectReportDir);
    
    // 메타데이터가 없는 경우 기본값 생성
    const projectMetadata: ProjectMetadata = metadata || {
      projectId: decodedId,
      projectName: decodedId,
      projectPath: join(await getClaudeProjectsPath(), decodedId),
      createdAt: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      analyzedSessions: [],
      totalReports: 0,
      totalSessions: 0,
      statistics: {
        totalDevelopmentTime: '0시간',
        averageSessionDuration: '0분',
        totalLinesWritten: 0,
        totalFilesCreated: 0,
        frequentTechnologies: []
      },
      tags: []
    };
    
    // Get all report files
    const reportsDir = join(projectReportDir, 'reports');
    let reportFiles: string[] = [];
    
    try {
      const files = await fs.readdir(reportsDir);
      reportFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
    } catch (error) {
      // Reports directory might not exist yet
      reportFiles = [];
    }
    
    const reports = await Promise.all(
      reportFiles.map(async (file) => {
        const date = file.replace('.json', '');
        const report = await loadDailyReport(projectReportDir, date);
        return report;
      })
    );
    
    res.json({
      metadata: projectMetadata,
      reports: reports.filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// Get project sessions by date
app.get('/api/projects/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    const claudeProjectsPath = await getClaudeProjectsPath();
    const projectPath = join(claudeProjectsPath, decodedId);
    
    // Check if project exists
    const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!projectExists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Load metadata to get analyzed sessions
    const projectReportDir = join(process.cwd(), 'reports', 'projects', decodedId);
    const metadata = await loadProjectMetadata(projectReportDir);
    const analyzedSessions = new Set(metadata?.analyzedSessions || []);
    
    // Find all session files
    const { findSessionFiles, parseSessionFile } = await import('../cli/utils/sessionAnalyzer');
    const sessionFiles = await findSessionFiles(projectPath);
    
    // Group sessions by date
    const sessionsByDate: Record<string, { total: number; analyzed: number; unanalyzed: number; sessions: any[] }> = {};
    
    for (const filePath of sessionFiles) {
      const sessionId = filePath.split('/').pop() || '';
      const session = await parseSessionFile(filePath);
      
      if (session) {
        const date = new Date(session.created).toISOString().split('T')[0];
        
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = {
            total: 0,
            analyzed: 0,
            unanalyzed: 0,
            sessions: []
          };
        }
        
        const isAnalyzed = analyzedSessions.has(sessionId);
        sessionsByDate[date].total++;
        if (isAnalyzed) {
          sessionsByDate[date].analyzed++;
        } else {
          sessionsByDate[date].unanalyzed++;
        }
        
        sessionsByDate[date].sessions.push({
          id: sessionId,
          name: session.name,
          created: session.created,
          analyzed: isAnalyzed
        });
      }
    }
    
    res.json({
      projectId: decodedId,
      sessionsByDate,
      totalSessions: sessionFiles.length,
      analyzedCount: analyzedSessions.size,
      unanalyzedCount: sessionFiles.length - analyzedSessions.size
    });
  } catch (error) {
    console.error('Error fetching project sessions:', error);
    res.status(500).json({ error: 'Failed to fetch project sessions' });
  }
});

// Get specific report
app.get('/api/projects/:id/reports/:date', async (req, res) => {
  try {
    const { id, date } = req.params;
    const decodedId = decodeURIComponent(id);
    const projectReportDir = join(process.cwd(), 'reports', 'projects', decodedId);
    
    const report = await loadDailyReport(projectReportDir, date);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Get analysis status
app.get('/api/projects/:id/status', (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id);
  const status = analysisStore.get(decodedId);
  
  if (!status) {
    return res.json({ status: 'idle' });
  }
  
  // 24시간 이상 지난 분석은 제거
  const startTime = new Date(status.startedAt).getTime();
  const now = new Date().getTime();
  const hoursPassed = (now - startTime) / (1000 * 60 * 60);
  
  if (hoursPassed > 24) {
    analysisStore.delete(id);
    return res.json({ status: 'idle' });
  }
  
  res.json(status);
});

// Get all analysis statuses
app.get('/api/analysis-status', (req, res) => {
  const statuses: Record<string, AnalysisStatus> = {};
  
  analysisStore.forEach((status, projectId) => {
    // 24시간 이상 지난 분석은 제거
    const startTime = new Date(status.startedAt).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - startTime) / (1000 * 60 * 60);
    
    if (hoursPassed <= 24) {
      statuses[projectId] = status;
    } else {
      analysisStore.delete(projectId);
    }
  });
  
  res.json(statuses);
});

// Analyze sessions by date
app.post('/api/projects/:id/analyze-by-date', async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    const { date, useAI = true } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: '날짜를 지정해주세요' });
    }
    
    const claudeProjectsPath = await getClaudeProjectsPath();
    const projectPath = join(claudeProjectsPath, decodedId);
    
    // Check if already analyzing
    const analysisKey = `${decodedId}:${date}`;
    const currentStatus = analysisStore.get(analysisKey);
    if (currentStatus && currentStatus.status === 'analyzing') {
      return res.status(409).json({ 
        error: '이미 해당 날짜의 분석이 진행 중입니다',
        status: currentStatus 
      });
    }
    
    // 분석 시작 상태 저장
    analysisStore.set(analysisKey, {
      projectId: decodedId,
      status: 'analyzing',
      startedAt: new Date().toISOString(),
      progress: {
        current: 0,
        total: 0,
        message: `${date} 세션 분석을 시작하는 중...`
      }
    });
    
    // Start analysis in background
    const { analyzeSingleSession } = await import('../cli/utils/analyzer');
    const { ensureProjectReportDir, saveProjectMetadata, loadProjectMetadata } = await import('../cli/utils/scanner');
    const { findSessionFiles, parseSessionFile } = await import('../cli/utils/sessionAnalyzer');
    
    // Find sessions for the specific date
    const sessionFiles = await findSessionFiles(projectPath);
    const projectReportDir = await ensureProjectReportDir(decodedId);
    let metadata = await loadProjectMetadata(projectReportDir) || {
      projectName: decodedId,
      lastAnalyzed: new Date().toISOString(),
      analyzedSessions: [],
      totalReports: 0
    };
    
    const analyzedSet = new Set(metadata.analyzedSessions || []);
    const dateSessionFiles: string[] = [];
    
    // Filter sessions by date
    for (const filePath of sessionFiles) {
      const sessionId = filePath.split('/').pop() || '';
      if (!analyzedSet.has(sessionId)) {
        const session = await parseSessionFile(filePath);
        if (session) {
          const sessionDate = new Date(session.created).toISOString().split('T')[0];
          if (sessionDate === date) {
            dateSessionFiles.push(filePath);
          }
        }
      }
    }
    
    if (dateSessionFiles.length === 0) {
      analysisStore.set(analysisKey, {
        projectId: decodedId,
        status: 'completed',
        startedAt: analysisStore.get(analysisKey)?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        progress: {
          current: 0,
          total: 0,
          message: `${date}에 분석할 새로운 세션이 없습니다`
        }
      });
      
      return res.json({
        message: `${date}에 분석할 새로운 세션이 없습니다`,
        projectId: decodedId,
        date,
        status: 'no-sessions',
        sessionsAnalyzed: 0
      });
    }
    
    // 세션별로 개별 분석 및 즉시 리포트 저장
    let totalSessionsAnalyzed = 0;
    const analyzedSessionIds: string[] = [];
    
    // 진행률 업데이트
    analysisStore.set(analysisKey, {
      projectId: decodedId,
      status: 'analyzing',
      startedAt: analysisStore.get(analysisKey)?.startedAt || new Date().toISOString(),
      progress: {
        current: 0,
        total: dateSessionFiles.length,
        message: `${date} - ${dateSessionFiles.length}개 세션 분석 중...`
      }
    });
    
    // 각 세션을 개별적으로 분석
    for (let i = 0; i < dateSessionFiles.length; i++) {
      const filePath = dateSessionFiles[i];
      const sessionId = filePath.split('/').pop() || '';
      
      try {
        const report = await analyzeSingleSession(projectPath, filePath, projectReportDir);
        
        if (report) {
          totalSessionsAnalyzed++;
          analyzedSessionIds.push(sessionId);
          
          // 진행률 업데이트
          analysisStore.set(analysisKey, {
            projectId: decodedId,
            status: 'analyzing',
            startedAt: analysisStore.get(analysisKey)?.startedAt || new Date().toISOString(),
            progress: {
              current: i + 1,
              total: dateSessionFiles.length,
              message: `${date} - ${i + 1}/${dateSessionFiles.length} 세션 분석 완료`
            }
          });
        }
      } catch (error) {
        console.error(`Error analyzing session ${sessionId}:`, error);
      }
    }
    
    // 메타데이터에 세션 ID 추가
    if (analyzedSessionIds.length > 0) {
      metadata.analyzedSessions.push(...analyzedSessionIds);
      // 실제 리포트 파일 개수를 확인하여 totalReports 업데이트
      try {
        const reportsDir = join(projectReportDir, 'reports');
        const reportFiles = await fs.readdir(reportsDir);
        const reportCount = reportFiles.filter(f => f.endsWith('.json')).length;
        metadata.totalReports = reportCount;
      } catch {
        // 에러 시에는 기존 방식으로 카운트
        metadata.totalReports = (metadata.totalReports || 0) + 1;
      }
    }
    
    // Update metadata
    metadata.lastAnalyzed = new Date().toISOString();
    await saveProjectMetadata(projectReportDir, metadata);
    
    // 분석 완료 상태 저장
    analysisStore.set(analysisKey, {
      projectId: decodedId,
      status: 'completed',
      startedAt: analysisStore.get(analysisKey)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: {
        current: totalSessionsAnalyzed,
        total: totalSessionsAnalyzed,
        message: `${date} - ${totalSessionsAnalyzed}개 세션 분석 완료`
      }
    });
    
    res.json({ 
      message: '분석이 완료되었습니다',
      projectId: decodedId,
      date,
      status: 'completed',
      sessionsAnalyzed: totalSessionsAnalyzed
    });
  } catch (error) {
    console.error('Error during date analysis:', error);
    
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    const { date } = req.body;
    const analysisKey = `${decodedId}:${date}`;
    
    // 분석 실패 상태 저장
    analysisStore.set(analysisKey, {
      projectId: decodedId,
      status: 'failed',
      startedAt: analysisStore.get(analysisKey)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다'
    });
    
    res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
});

// Trigger project analysis
app.post('/api/projects/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);
    const { useAI = true, limit = 10 } = req.body;
    const claudeProjectsPath = await getClaudeProjectsPath();
    const projectPath = join(claudeProjectsPath, decodedId);
    
    // Check if already analyzing
    const currentStatus = analysisStore.get(decodedId);
    if (currentStatus && currentStatus.status === 'analyzing') {
      return res.status(409).json({ 
        error: '이미 분석이 진행 중입니다',
        status: currentStatus 
      });
    }
    
    // Check if project exists
    const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!projectExists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 분석 시작 상태 저장
    analysisStore.set(decodedId, {
      projectId: decodedId,
      status: 'analyzing',
      startedAt: new Date().toISOString(),
      progress: {
        current: 0,
        total: 0,
        message: '분석을 시작하는 중...'
      }
    });
    
    // Start analysis in background
    const { analyzeProject, saveDailyReport } = await import('../cli/utils/analyzer');
    const { ensureProjectReportDir, saveProjectMetadata, loadProjectMetadata } = await import('../cli/utils/scanner');
    
    // Ensure report directory exists
    const projectReportDir = await ensureProjectReportDir(decodedId);
    
    // Load or create metadata
    let metadata = await loadProjectMetadata(projectReportDir);
    
    // 디버깅용 로그를 파일로 저장
    const debugLog = `
[${new Date().toISOString()}] Loading metadata from: ${projectReportDir}
Metadata found: ${metadata ? 'Yes' : 'No'}
Analyzed sessions count: ${metadata?.analyzedSessions?.length || 0}
Analyzed sessions: ${JSON.stringify(metadata?.analyzedSessions || [])}
`;
    await fs.appendFile('api-debug.log', debugLog);
    
    if (!metadata) {
      metadata = {
        projectName: id,
        lastAnalyzed: new Date().toISOString(),
        analyzedSessions: [],
        totalReports: 0
      };
    }
    
    // 실제 프로젝트 분석 수행
    console.log(`Analyzing project: ${projectPath}`);
    if (useAI) {
      console.log(`🤖 AI 분석 모드 활성화 (limit: ${limit})`);
    }
    // 추가 디버깅 로그
    await fs.appendFile('api-debug.log', `
[${new Date().toISOString()}] Before analyzeProject:
analyzedSessions passed: ${JSON.stringify(metadata.analyzedSessions)}
useAI: ${useAI}, limit: ${limit}
`);
    
    const groupedSessions = await analyzeProject(projectPath, { 
      useAI, 
      limit,
      analyzedSessions: metadata.analyzedSessions
    });
    
    if (groupedSessions.size === 0) {
      // 세션을 찾지 못한 경우 상세 정보 제공
      const projectFiles = await fs.readdir(projectPath);
      console.log('Project directory contents:', projectFiles);
      
      // 분석 실패 상태 저장
      analysisStore.set(id, {
        projectId: id,
        status: 'failed',
        startedAt: analysisStore.get(id)?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: '분석할 세션 파일을 찾을 수 없습니다'
      });
      
      return res.json({ 
        message: '분석할 세션 파일을 찾을 수 없습니다',
        projectId: id,
        status: 'no-sessions',
        sessionsAnalyzed: 0,
        reportsCreated: 0,
        reportDates: [],
        details: {
          projectPath,
          filesInProject: projectFiles.length,
          hint: 'Claude 세션 파일은 .json, .jsonl, .txt 형식이며, messages 배열을 포함해야 합니다.'
        }
      });
    }
    
    // 날짜별로 리포트 저장
    let totalSessionsAnalyzed = 0;
    const reportDates: string[] = [];
    
    for (const [date, sessions] of groupedSessions) {
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
    
    // 분석 완료 상태 저장
    analysisStore.set(id, {
      projectId: id,
      status: 'completed',
      startedAt: analysisStore.get(id)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: {
        current: totalSessionsAnalyzed,
        total: totalSessionsAnalyzed,
        message: `${totalSessionsAnalyzed}개 세션 분석 완료`
      }
    });
    
    res.json({ 
      message: '분석이 완료되었습니다',
      projectId: id,
      status: 'completed',
      sessionsAnalyzed: totalSessionsAnalyzed,
      reportsCreated: groupedSessions.size,
      reportDates: reportDates
    });
  } catch (error) {
    console.error('Error during analysis:', error);
    
    // 분석 실패 상태 저장
    const { id } = req.params;
    analysisStore.set(id, {
      projectId: id,
      status: 'failed',
      startedAt: analysisStore.get(id)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다'
    });
    
    res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});