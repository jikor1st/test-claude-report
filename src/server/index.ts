import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { getClaudeProjectsPath, loadConfig } from '../cli/utils/config';
import { scanProjects, loadProjectMetadata } from '../cli/utils/scanner';
import { loadDailyReport } from '../cli/utils/analyzer';
import type { Project, DailyReport, ProjectMetadata, GlobalStatistics, SessionReport } from '../shared/types';

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

// Get original session data
app.get('/api/projects/:id/sessions/:sessionId/raw', async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const decodedId = decodeURIComponent(id);
    const decodedSessionId = decodeURIComponent(sessionId);
    
    console.log(`[RAW DATA API] Request for project: ${decodedId}, session: ${decodedSessionId}`);
    
    const claudeProjectsPath = await getClaudeProjectsPath();
    const projectPath = join(claudeProjectsPath, decodedId);
    
    console.log(`[RAW DATA API] Project path: ${projectPath}`);
    
    // Find session file
    const { findSessionFiles, parseSessionFile } = await import('../cli/utils/sessionAnalyzer');
    const sessionFiles = await findSessionFiles(projectPath);
    
    console.log(`[RAW DATA API] Found ${sessionFiles.length} session files`);
    
    // Find the specific session file
    let targetFile: string | null = null;
    for (const filePath of sessionFiles) {
      const fileName = basename(filePath);
      console.log(`[RAW DATA API] Checking file: ${fileName} against sessionId: ${decodedSessionId}`);
      if (fileName === decodedSessionId || fileName.includes(decodedSessionId)) {
        targetFile = filePath;
        console.log(`[RAW DATA API] Found matching file: ${targetFile}`);
        break;
      }
    }
    
    if (!targetFile) {
      console.log(`[RAW DATA API] No matching file found for sessionId: ${decodedSessionId}`);
      console.log(`[RAW DATA API] Available files:`, sessionFiles.map(f => basename(f)));
      return res.status(404).json({ 
        error: 'Session file not found',
        sessionId: decodedSessionId,
        availableFiles: sessionFiles.map(f => basename(f))
      });
    }
    
    // Parse session file to get raw conversation data
    const session = await parseSessionFile(targetFile);
    if (!session) {
      console.log(`[RAW DATA API] Failed to parse session file: ${targetFile}`);
      return res.status(500).json({ error: 'Failed to parse session file' });
    }
    
    console.log(`[RAW DATA API] Successfully parsed session with ${session.messages.length} messages`);
    
    res.json({
      sessionId: session.id,
      name: session.name,
      created: session.created,
      updated: session.updated,
      messages: session.messages
    });
  } catch (error) {
    console.error('[RAW DATA API] Error fetching raw session data:', error);
    res.status(500).json({ error: 'Failed to fetch session data' });
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

// Get global statistics from all projects
app.get('/api/statistics', async (req, res) => {
  try {
    const { projectId } = req.query;
    const reportsDir = join(process.cwd(), 'reports', 'projects');
    
    // Check if reports directory exists
    const dirExists = await fs.access(reportsDir).then(() => true).catch(() => false);
    if (!dirExists) {
      return res.json({
        totalProjects: 0,
        totalSessions: 0,
        totalReports: 0,
        dateRange: { start: '', end: '' },
        technicalStack: { languages: [], frameworks: [], tools: [] },
        codeQuality: { totalStrengths: [], totalImprovements: [] },
        taskAnalysis: { mainTasks: [], completedGoals: [], challenges: [] },
        insights: { topInsights: [], commonPatterns: [] },
        timeline: { dailyActivity: [], weeklyActivity: [] }
      });
    }

    // Get all project directories
    const allProjectDirs = await fs.readdir(reportsDir);
    const validProjectDirs: string[] = [];
    for (const dir of allProjectDirs) {
      const stats = await fs.stat(join(reportsDir, dir));
      if (stats.isDirectory()) {
        validProjectDirs.push(dir);
      }
    }
    
    // Filter projects if projectId is specified
    let projectDirs = validProjectDirs;
    if (projectId && typeof projectId === 'string') {
      const decodedProjectId = decodeURIComponent(projectId);
      projectDirs = projectDirs.filter(dir => dir === decodedProjectId);
    }
    
    const statistics: GlobalStatistics = {
      totalProjects: 0,
      totalSessions: 0,
      totalReports: 0,
      projectList: validProjectDirs,
      selectedProject: projectId as string | undefined,
      dateRange: { start: '', end: '' },
      keyTopics: [],
      codeQuality: {
        totalStrengths: [],
        totalImprovements: []
      },
      taskAnalysis: {
        mainTasks: [],
        completedGoals: [],
        challenges: []
      },
      insights: {
        topInsights: [],
        commonPatterns: []
      },
      timeline: {
        dailyActivity: [],
        weeklyActivity: []
      }
    };

    // Collect data from all projects
    const topicCount = new Map<string, { count: number; projects: Set<string> }>();
    const strengthCount = new Map<string, number>();
    const improvementCount = new Map<string, number>();
    const taskCount = new Map<string, { count: number; projects: Set<string> }>();
    const issueMap = new Map<string, { count: number; projects: Set<string>; solutions: Map<string, number> }>();
    const solutionMap = new Map<string, { count: number; issues: Set<string> }>();
    const insightCount = new Map<string, { frequency: number; projects: Set<string> }>();
    const dailyActivityMap = new Map<string, { sessionCount: number; projectSet: Set<string> }>();
    
    let earliestDate = '';
    let latestDate = '';

    for (const projectDir of projectDirs) {
      const projectPath = join(reportsDir, projectDir);
      const stats = await fs.stat(projectPath);
      
      if (!stats.isDirectory()) continue;
      
      statistics.totalProjects++;
      
      // Load project metadata
      const metadata = await loadProjectMetadata(projectPath);
      if (!metadata) continue;
      
      // Load all reports for this project
      const reportsPath = join(projectPath, 'reports');
      const reportExists = await fs.access(reportsPath).then(() => true).catch(() => false);
      
      if (reportExists) {
        const reportFiles = await fs.readdir(reportsPath);
        const jsonReports = reportFiles.filter(f => f.endsWith('.json'));
        
        for (const reportFile of jsonReports) {
          const date = reportFile.replace('.json', '');
          const report = await loadDailyReport(projectPath, date);
          
          if (report) {
            statistics.totalReports++;
            statistics.totalSessions += report.sessions.length;
            
            // Update date range
            if (!earliestDate || date < earliestDate) earliestDate = date;
            if (!latestDate || date > latestDate) latestDate = date;
            
            // Update daily activity
            const activity = dailyActivityMap.get(date) || { sessionCount: 0, projectSet: new Set() };
            activity.sessionCount += report.sessions.length;
            activity.projectSet.add(projectDir);
            dailyActivityMap.set(date, activity);
            
            // Process each session
            for (const session of report.sessions) {
              // Extract key topics from session
              if (session.keyTopics && Array.isArray(session.keyTopics)) {
                for (const topic of session.keyTopics) {
                  const existing = topicCount.get(topic) || { count: 0, projects: new Set() };
                  existing.count++;
                  existing.projects.add(projectDir);
                  topicCount.set(topic, existing);
                }
              }
              
              if (session.aiInsights) {
                
                // Code quality
                if (session.aiInsights.codeQuality) {
                  session.aiInsights.codeQuality.strengths.forEach(strength => {
                    strengthCount.set(strength, (strengthCount.get(strength) || 0) + 1);
                  });
                  session.aiInsights.codeQuality.improvements.forEach(improvement => {
                    improvementCount.set(improvement, (improvementCount.get(improvement) || 0) + 1);
                  });
                }
                
                // Tasks and Issues/Solutions
                if (session.aiInsights.timeline) {
                  // Main tasks
                  session.aiInsights.timeline.mainTasks.forEach(task => {
                    const existing = taskCount.get(task) || { count: 0, projects: new Set() };
                    existing.count++;
                    existing.projects.add(projectDir);
                    taskCount.set(task, existing);
                  });
                  
                  // Extract issues and solutions from challenges and completed goals
                  // Challenges are treated as issues
                  if (session.aiInsights.timeline.challenges) {
                    session.aiInsights.timeline.challenges.forEach(challenge => {
                      const existing = issueMap.get(challenge) || { 
                        count: 0, 
                        projects: new Set(), 
                        solutions: new Map() 
                      };
                      existing.count++;
                      existing.projects.add(projectDir);
                      
                      // Try to find related solutions from completed goals
                      if (session.aiInsights.timeline.completedGoals) {
                        session.aiInsights.timeline.completedGoals.forEach(goal => {
                          existing.solutions.set(goal, (existing.solutions.get(goal) || 0) + 1);
                          
                          // Track solution globally
                          const solExisting = solutionMap.get(goal) || { count: 0, issues: new Set() };
                          solExisting.count++;
                          solExisting.issues.add(challenge);
                          solutionMap.set(goal, solExisting);
                        });
                      }
                      
                      issueMap.set(challenge, existing);
                    });
                  }
                }
                
                // Insights
                if (session.aiInsights.keyInsights) {
                  session.aiInsights.keyInsights.forEach(insight => {
                    const existing = insightCount.get(insight) || { frequency: 0, projects: new Set() };
                    existing.frequency++;
                    existing.projects.add(projectDir);
                    insightCount.set(insight, existing);
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Calculate percentages and format results
    const totalTopicRefs = Array.from(topicCount.values()).reduce((a, b) => a.count + b.count, 0);
    
    statistics.dateRange = { start: earliestDate, end: latestDate };
    
    // Sort and format key topics
    statistics.keyTopics = Array.from(topicCount.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        percentage: totalTopicRefs > 0 ? Math.round((data.count / totalTopicRefs) * 100) : 0,
        projects: Array.from(data.projects)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    // Code quality top items
    statistics.codeQuality.totalStrengths = Array.from(strengthCount.entries())
      .map(([description, count]) => ({ description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    statistics.codeQuality.totalImprovements = Array.from(improvementCount.entries())
      .map(([description, count]) => ({ description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Task analysis
    statistics.taskAnalysis.mainTasks = Array.from(taskCount.entries())
      .map(([task, data]) => ({
        task,
        count: data.count,
        projects: Array.from(data.projects)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    
    // Issues and their solutions
    statistics.taskAnalysis.issues = Array.from(issueMap.entries())
      .map(([issue, data]) => ({
        issue,
        count: data.count,
        projects: Array.from(data.projects),
        solutions: Array.from(data.solutions.entries())
          .map(([solution, frequency]) => ({ solution, frequency }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Common solutions
    statistics.taskAnalysis.commonSolutions = Array.from(solutionMap.entries())
      .map(([solution, data]) => ({
        solution,
        count: data.count,
        relatedIssues: Array.from(data.issues).slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Insights
    statistics.insights.topInsights = Array.from(insightCount.entries())
      .map(([insight, data]) => ({
        insight,
        frequency: data.frequency,
        projects: Array.from(data.projects)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    // Timeline
    statistics.timeline.dailyActivity = Array.from(dailyActivityMap.entries())
      .map(([date, data]) => ({
        date,
        sessionCount: data.sessionCount,
        projectCount: data.projectSet.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Ensure projectList is included
    statistics.projectList = validProjectDirs;
    
    res.json(statistics);
  } catch (error) {
    console.error('Error generating statistics:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});