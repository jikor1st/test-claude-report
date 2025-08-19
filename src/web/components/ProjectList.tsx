import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Clock, FileText, AlertCircle, RefreshCw, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import type { Project } from '../types';
import { api } from '../utils/api';
import { cn } from '../lib/utils';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await api.getProjects();
      
      // 각 프로젝트의 세션 정보도 가져오기
      const projectsWithDetails = await Promise.all(
        data.map(async (project: Project) => {
          try {
            const sessions = await api.getProjectSessions(project.id);
            return {
              ...project,
              unanalyzedCount: sessions.unanalyzedCount || 0
            };
          } catch {
            return { ...project, unanalyzedCount: 0 };
          }
        })
      );
      
      setProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('프로젝트를 불러오는데 실패했습니다. API 서버가 실행중인지 확인해주세요.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProjects(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">프로젝트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button 
              onClick={() => loadProjects()} 
              className="mt-2 inline-flex items-center gap-1 text-sm text-destructive hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">프로젝트 목록</h2>
          <p className="text-muted-foreground">
            Claude Code 프로젝트를 선택하여 대화 세션을 분석할 수 있습니다
          </p>
        </div>
        <button
          onClick={() => handleRefresh()}
          disabled={isRefreshing}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const hasUnanalyzed = (project.unanalyzedCount ?? 0) > 0;
          const hasReports = project.totalReports > 0;
          const isCompletelyAnalyzed = hasReports && !hasUnanalyzed;
          
          return (
            <div
              key={project.id}
              className={cn(
                "group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                hasUnanalyzed && "border-yellow-200 bg-yellow-50/50",
                isCompletelyAnalyzed && "border-blue-200 bg-blue-50/30"
              )}
            >
              {hasUnanalyzed && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                  {project.unanalyzedCount}
                </div>
              )}
              {isCompletelyAnalyzed && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
              
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "rounded-lg p-2",
                    hasUnanalyzed 
                      ? "bg-yellow-100 text-yellow-600" 
                      : isCompletelyAnalyzed 
                        ? "bg-blue-100 text-blue-600"
                        : "bg-primary/10 text-primary"
                  )}>
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-none tracking-tight">
                      {project.name}
                    </h3>
                    <div className="mt-1">
                      {hasUnanalyzed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                          <Sparkles className="h-3 w-3" />
                          분석 필요
                        </span>
                      )}
                      {isCompletelyAnalyzed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          <CheckCircle className="h-3 w-3" />
                          분석 완료
                        </span>
                      )}
                      {!hasReports && !hasUnanalyzed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          <Clock className="h-3 w-3" />
                          미분석
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground">{project.totalReports}</span> 개의 리포트
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>마지막 활동: {new Date(project.lastActivity).toLocaleDateString('ko-KR')}</span>
                </div>
                {hasUnanalyzed && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">{project.unanalyzedCount}개의 새로운 세션</span>
                  </div>
                )}
                {isCompletelyAnalyzed && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">모든 세션 분석 완료</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Link
                  to={`/project/${project.id}`}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-center text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    hasUnanalyzed
                      ? "bg-yellow-600 text-white hover:bg-yellow-700"
                      : isCompletelyAnalyzed
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {hasUnanalyzed ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      분석하기
                    </>
                  ) : isCompletelyAnalyzed ? (
                    <>
                      <FileText className="h-4 w-4" />
                      리포트 보기
                    </>
                  ) : (
                    <>
                      <FolderOpen className="h-4 w-4" />
                      프로젝트 상세 보기
                    </>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">프로젝트가 없습니다</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Claude Code 프로젝트를 분석하려면 먼저 스캔 명령을 실행하세요
          </p>
          <div className="mt-4">
            <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm">
              npm run claude-report scan
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;