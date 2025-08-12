export interface Config {
  claudeProjectsPath: string;
  createdAt: string;
  lastUpdated: string;
}

export interface SessionReport {
  sessionId: string;
  date: string;
  title: string;
  summary: string;
  mdxContent: string;
  keyTopics: string[];
  codeChanges: {
    filesModified: string[];
    linesAdded: number;
    linesRemoved: number;
  };
  duration: string;
  status: "completed" | "in-progress" | "error";
  aiInsights?: {
    keyInsights: string[];
    codeQuality: {
      strengths: string[];
      improvements: string[];
    };
    timeline: {
      mainTasks: string[];
      completedGoals: string[];
      challenges: string[];
    };
  };
}

export interface DailyReport {
  date: string;
  sessions: SessionReport[];
  totalSessions: number;
  summary: string;
}

export interface ProjectMetadata {
  projectId?: string;
  projectName: string;
  projectPath?: string;
  createdAt?: string;
  lastAnalyzed: string;
  lastActivity?: string;
  analyzedSessions: string[];
  totalReports: number;
  totalSessions?: number;
  statistics?: {
    totalDevelopmentTime: string;
    averageSessionDuration: string;
    totalLinesWritten: number;
    totalFilesCreated: number;
    frequentTechnologies: Array<{
      name: string;
      count: number;
    }>;
  };
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  lastActivity: string;
  totalReports: number;
  status: "active" | "idle";
  unanalyzedCount?: number;
}