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
}
export interface DailyReport {
    date: string;
    sessions: SessionReport[];
    totalSessions: number;
    summary: string;
}
export interface ProjectMetadata {
    projectName: string;
    lastAnalyzed: string;
    analyzedSessions: string[];
    totalReports: number;
}
export interface Project {
    id: string;
    name: string;
    lastActivity: string;
    totalReports: number;
    status: "active" | "idle";
}
//# sourceMappingURL=types.d.ts.map