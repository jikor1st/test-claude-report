export interface ClaudeAnalysisResult {
  title: string;
  summary: string;
  keyInsights: string[];
  technicalDetails?: {
    languages?: string[];
    frameworks?: string[];
    toolsUsed?: string[];
  };
  codeQuality?: {
    strengths: string[];
    improvements: string[];
  };
  timeline?: {
    mainTasks: string[];
    completedGoals: string[];
    challenges: string[];
  };
  
  // Template-specific fields (extended properties)
  [key: string]: any;
}

export interface ClaudeAnalysisResponse {
  analysis: ClaudeAnalysisResult;
  templateType: string;
}