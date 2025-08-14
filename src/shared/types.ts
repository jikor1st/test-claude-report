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

export interface GlobalStatistics {
  totalProjects: number;
  totalSessions: number;
  totalReports: number;
  projectList?: string[];
  selectedProject?: string;
  dateRange: {
    start: string;
    end: string;
  };
  keyTopics: Array<{
    topic: string;
    count: number;
    percentage: number;
    projects: string[];
  }>;
  codeQuality: {
    totalStrengths: Array<{
      description: string;
      count: number;
    }>;
    totalImprovements: Array<{
      description: string;
      count: number;
    }>;
    averageQualityScore?: number;
  };
  taskAnalysis: {
    mainTasks: Array<{
      task: string;
      count: number;
      projects: string[];
    }>;
    issues: Array<{
      issue: string;
      count: number;
      projects: string[];
      solutions: Array<{
        solution: string;
        frequency: number;
      }>;
    }>;
    commonSolutions: Array<{
      solution: string;
      count: number;
      relatedIssues: string[];
    }>;
  };
  insights: {
    topInsights: Array<{
      insight: string;
      frequency: number;
      projects: string[];
    }>;
    commonPatterns: string[];
  };
  timeline: {
    dailyActivity: Array<{
      date: string;
      sessionCount: number;
      projectCount: number;
    }>;
    weeklyActivity: Array<{
      week: string;
      sessionCount: number;
      projectCount: number;
    }>;
  };
}