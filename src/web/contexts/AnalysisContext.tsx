import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { api } from '../utils/api';

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

interface AnalysisState {
  [projectId: string]: AnalysisStatus;
}

interface AnalysisContextType {
  analysisState: AnalysisState;
  refreshStatus: () => Promise<void>;
  isProjectAnalyzing: (projectId: string) => boolean;
  getProjectStatus: (projectId: string) => AnalysisStatus | undefined;
  isDateAnalyzing: (projectId: string, date: string) => boolean;
  getAnalyzingDates: (projectId: string) => Set<string>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 서버에서 분석 상태 가져오기
  const refreshStatus = async () => {
    try {
      const statuses = await api.getAllAnalysisStatus();
      setAnalysisState(statuses);
    } catch (error) {
      console.error('Failed to fetch analysis status:', error);
    }
  };

  // 컴포넌트 마운트 시 상태 조회 시작
  useEffect(() => {
    refreshStatus();
    
    // 3초마다 상태 업데이트 (더 빠른 반응성)
    intervalRef.current = setInterval(() => {
      refreshStatus();
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isProjectAnalyzing = (projectId: string): boolean => {
    const status = analysisState[projectId];
    return status?.status === 'analyzing';
  };

  const getProjectStatus = (projectId: string): AnalysisStatus | undefined => {
    return analysisState[projectId];
  };

  const isDateAnalyzing = (projectId: string, date: string): boolean => {
    const key = `${projectId}:${date}`;
    const status = analysisState[key];
    return status?.status === 'analyzing';
  };

  const getAnalyzingDates = (projectId: string): Set<string> => {
    const analyzingDates = new Set<string>();
    Object.entries(analysisState).forEach(([key, status]) => {
      if (key.startsWith(`${projectId}:`) && status.status === 'analyzing') {
        const date = key.split(':')[1];
        if (date) {
          analyzingDates.add(date);
        }
      }
    });
    return analyzingDates;
  };

  return (
    <AnalysisContext.Provider value={{ 
      analysisState, 
      refreshStatus, 
      isProjectAnalyzing,
      getProjectStatus,
      isDateAnalyzing,
      getAnalyzingDates
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
}