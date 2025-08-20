import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, FileText, Calendar, Activity, Loader2, BarChart3, Play, Sparkles, List, CalendarDays, AlertCircle, CheckCircle, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import SessionCalendar from './SessionCalendar';
import ReportList from './ReportList';
import type { ProjectMetadata, DailyReport, SessionReport } from '../types';
import { api } from '../utils/api';
import { cn } from '../lib/utils';
import { useAnalysis } from '../contexts/AnalysisContext';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateReport, setSelectedDateReport] = useState<DailyReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clickedDates, setClickedDates] = useState<Set<string>>(new Set());
  const { refreshStatus, getAnalyzingDates, getProjectStatus } = useAnalysis();

  useEffect(() => {
    if (id) {
      loadProjectData(id);
      loadSessionData(id);
    }
  }, [id]);

  // 선택된 날짜의 리포트 로드
  useEffect(() => {
    if (selectedDate && reports.length > 0) {
      const report = reports.find(r => r.date === selectedDate);
      setSelectedDateReport(report || null);
    } else {
      setSelectedDateReport(null);
    }
  }, [selectedDate, reports]);

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProjectDetails(projectId);
      setMetadata(data.metadata);
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      setError(`프로젝트 상세 정보를 불러오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      toast.error('프로젝트 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (projectId: string) => {
    try {
      const data = await api.getProjectSessions(projectId);
      setSessionData(data);
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  const handleDateSelect = (date: string, data: any) => {
    setSelectedDate(date);
  };

  const handleAnalyzeDate = async (date: string) => {
    if (!id) return;
    
    const analyzingDates = getAnalyzingDates(id);
    if (analyzingDates.has(date)) return;

    // 클릭된 날짜로 표시
    setClickedDates(prev => new Set(prev).add(date));
    
    // 토스트 알림 표시
    const toastId = toast.loading(`${date} 세션 분석을 시작하는 중...`);

    try {
      // 즉시 UI 상태 업데이트
      await refreshStatus();
      
      const result = await api.analyzeByDate(id, date, { useAI: true });
      
      // 상태 새로고침
      await refreshStatus();
      
      if (result.status === 'completed' && result.sessionsAnalyzed > 0) {
        // 데이터 새로고침
        await loadProjectData(id);
        await loadSessionData(id);
        
        // 성공 후 클릭 상태 제거
        setClickedDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(date);
          return newSet;
        });
        
        toast.success(`${date} - ${result.sessionsAnalyzed}개 세션 분석 완료!`, {
          id: toastId,
        });
      } else if (result.status === 'no-sessions') {
        toast.error(`${date}에 분석할 새로운 세션이 없습니다.`, {
          id: toastId,
        });
      }
    } catch (error) {
      console.error('Error analyzing date:', error);
      toast.error(`${date} 분석 중 오류가 발생했습니다.`, {
        id: toastId,
      });
      
      // 에러 발생 시에도 상태 새로고침
      await refreshStatus();
      
      // 에러 시 클릭 상태 제거
      setClickedDates(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadProjectData(id!),
        loadSessionData(id!),
        refreshStatus()
      ]);
      toast.success('데이터를 새로고침했습니다.');
    } catch (error) {
      toast.error('새로고침 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 분석 대기 중인 날짜들 가져오기
  const getUnanalyzedDates = () => {
    if (!sessionData) return [];
    return Object.entries(sessionData.sessionsByDate)
      .filter(([_, data]: [string, any]) => data.unanalyzed > 0)
      .map(([date, data]: [string, any]) => ({
        date,
        total: data.total,
        unanalyzed: data.unanalyzed
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };
  
  // 분석 진행 상태 확인을 위한 훅
  useEffect(() => {
    const analyzingDates = getAnalyzingDates(id || '');
    const projectStatus = getProjectStatus(id || '');
    
    // 분석이 진행 중인 경우 진행률 토스트 업데이트
    analyzingDates.forEach(date => {
      const status = getProjectStatus(`${id}:${date}`);
      if (status?.progress) {
        const percent = Math.round((status.progress.current / status.progress.total) * 100);
        // 진행률 표시 (필요시 주석 해제)
        // toast.loading(`${date}: ${percent}% 완료 (${status.progress.current}/${status.progress.total})`, {
        //   id: `progress-${date}`,
        // });
      }
    });
  }, [getAnalyzingDates, getProjectStatus, id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">프로젝트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || '프로젝트를 찾을 수 없습니다'}</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          프로젝트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const unanalyzedDates = getUnanalyzedDates();

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          프로젝트 목록
        </Link>
        
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{metadata.projectName}</h1>
              <p className="text-muted-foreground">Claude Code 프로젝트 분석 리포트</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">분석 리포트</span>
              </div>
              <p className="text-2xl font-bold">{metadata.totalReports || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">생성된 리포트</p>
            </div>
            
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">분석 완료</span>
              </div>
              <p className="text-2xl font-bold">{metadata.analyzedSessions?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">세션 분석 완료</p>
            </div>
            
            {sessionData && (
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">분석 대기</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{sessionData.unanalyzedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">새로운 세션</p>
              </div>
            )}
            
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">마지막 분석</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(metadata.lastAnalyzed).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 분석 대기 세션 섹션 */}
      {unanalyzedDates.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  분석 대기 중인 세션
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {unanalyzedDates.length}개 날짜에 총 {unanalyzedDates.reduce((sum, d) => sum + d.unanalyzed, 0)}개의 새로운 세션이 있습니다
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {unanalyzedDates.slice(0, 6).map(({ date, total, unanalyzed }) => (
                <div key={date} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex-1">
                    <p className="font-medium">{date}</p>
                    <p className="text-sm text-muted-foreground">
                      {unanalyzed}개 세션 분석 필요
                    </p>
                    {(() => {
                      const status = getProjectStatus(`${id}:${date}`);
                      if (status && status.status === 'analyzing' && status.progress) {
                        return (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{status.progress.current}/{status.progress.total}</span>
                              <span>{Math.round((status.progress.current / status.progress.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(status.progress.current / status.progress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <button
                    onClick={() => handleAnalyzeDate(date)}
                    disabled={getAnalyzingDates(id!).has(date) || clickedDates.has(date)}
                    className="p-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-colors disabled:opacity-50 ml-3 relative"
                    title={getAnalyzingDates(id!).has(date) ? "분석 중..." : "분석 시작"}
                  >
                    {(getAnalyzingDates(id!).has(date) || clickedDates.has(date)) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            {unanalyzedDates.length > 6 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                그 외 {unanalyzedDates.length - 6}개 날짜에 더 많은 세션이 있습니다
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">세션 분석 및 리포트</h2>
            <p className="text-sm text-muted-foreground">날짜를 선택하여 세션을 확인하고 리포트를 볼 수 있습니다</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === 'calendar' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gray-100 hover:bg-gray-200"
              )}
            >
              <CalendarDays className="h-4 w-4 inline mr-1" />
              캘린더
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === 'list' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gray-100 hover:bg-gray-200"
              )}
            >
              <List className="h-4 w-4 inline mr-1" />
              리스트
            </button>
          </div>
        </div>

        <div className="p-6">
          {viewMode === 'calendar' ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {sessionData && (
                  <SessionCalendar
                    projectId={id!}
                    sessionsByDate={sessionData.sessionsByDate}
                    onDateSelect={handleDateSelect}
                    analyzingDates={getAnalyzingDates(id!)}
                  />
                )}
              </div>
              
              <div className="space-y-4">
                {selectedDate && sessionData?.sessionsByDate[selectedDate] && (
                  <div className="space-y-4">
                    {/* 날짜 정보 카드 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {selectedDate}
                      </h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">전체 세션:</span>
                          <span className="font-medium">{sessionData.sessionsByDate[selectedDate].total}개</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">분석 완료:</span>
                          <span className="font-medium text-green-600">{sessionData.sessionsByDate[selectedDate].analyzed}개</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">분석 필요:</span>
                          <span className="font-medium text-yellow-600">{sessionData.sessionsByDate[selectedDate].unanalyzed}개</span>
                        </div>
                      </div>
                      
                      {sessionData.sessionsByDate[selectedDate].unanalyzed > 0 && (
                        <button
                          onClick={() => handleAnalyzeDate(selectedDate)}
                          disabled={getAnalyzingDates(id!).has(selectedDate) || clickedDates.has(selectedDate)}
                          className={cn(
                            "w-full rounded-md px-4 py-2 text-sm font-medium transition-all",
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "flex items-center justify-center gap-2",
                            (getAnalyzingDates(id!).has(selectedDate) || clickedDates.has(selectedDate)) && "scale-95"
                          )}
                        >
                          {(getAnalyzingDates(id!).has(selectedDate) || clickedDates.has(selectedDate)) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              분석 중...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              이 날짜 분석하기
                            </>
                          )}
                        </button>
                      )}
                      
                      {sessionData.sessionsByDate[selectedDate].unanalyzed === 0 && 
                       sessionData.sessionsByDate[selectedDate].analyzed > 0 && (
                        <div className="text-center text-sm text-green-600 font-medium">
                          <CheckCircle className="h-5 w-5 inline mr-1" />
                          모든 세션 분석 완료
                        </div>
                      )}
                    </div>

                    {/* 해당 날짜의 리포트 표시 */}
                    {selectedDateReport && (
                      <div className="bg-white rounded-lg border p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          분석 리포트
                        </h4>
                        <div className="space-y-3">
                          {selectedDateReport.sessions.map((session: SessionReport) => (
                            <Link
                              key={session.sessionId}
                              to={`/project/${id}/report/${selectedDate}#${session.sessionId}`}
                              className="block p-3 rounded-lg border hover:border-primary transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm line-clamp-1">{session.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {session.summary}
                                  </p>
                                  {session.keyTopics && session.keyTopics.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {session.keyTopics.slice(0, 3).map((topic, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                              </div>
                            </Link>
                          ))}
                        </div>
                        <Link
                          to={`/project/${id}/report/${selectedDate}`}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                        >
                          전체 리포트 보기
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                
                {!selectedDate && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">캘린더에서 날짜를 선택하세요</p>
                    <p className="text-xs mt-2 text-gray-400">
                      분석된 리포트가 있다면 바로 확인할 수 있습니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ReportList projectId={id!} reports={reports} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;