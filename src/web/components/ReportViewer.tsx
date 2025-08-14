import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Code2, FileText, Tag, CheckCircle, AlertCircle, Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCheck, ToggleLeft, ToggleRight, Download, FileDown, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { DailyReport, SessionReport } from '../types';
import { api } from '../utils/api';
import { cn } from '../lib/utils';
import { generateMarkdownFromReport, downloadMarkdown } from '../utils/exportUtils';
import { generatePDFFromReport } from '../utils/pdfExportUtils';

interface RawSessionData {
  sessionId: string;
  name: string;
  created: string;
  updated: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

const ReportViewer: React.FC = () => {
  const { id, date } = useParams<{ id: string; date: string }>();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<RawSessionData | null>(null);
  const [loadingRawData, setLoadingRawData] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id && date) {
      loadReport(id, date);
    }
  }, [id, date]);

  useEffect(() => {
    if (showRawData && !rawData && selectedSession && id) {
      fetchRawData();
    }
  }, [showRawData, selectedSession]);

  const fetchRawData = async () => {
    if (!selectedSession || !id) return;
    
    setLoadingRawData(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/sessions/${encodeURIComponent(selectedSession.sessionId)}/raw`);
      
      if (!response.ok) {
        throw new Error('원본 데이터를 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setRawData(data);
    } catch (err) {
      console.error('Error fetching raw data:', err);
    } finally {
      setLoadingRawData(false);
    }
  };

  const handleExportMarkdown = (all: boolean) => {
    if (!report) return;
    
    if (all) {
      const markdown = generateMarkdownFromReport(report);
      const filename = `${id}_${date}_full_report.md`;
      downloadMarkdown(markdown, filename);
    } else if (selectedSession) {
      const markdown = generateMarkdownFromReport(report, selectedSession);
      const filename = `${id}_${date}_${selectedSession.sessionId}.md`;
      downloadMarkdown(markdown, filename);
    }
    setShowExportMenu(false);
  };

  const handleExportPDF = async (all: boolean) => {
    if (!report) return;
    
    setExporting(true);
    try {
      if (all) {
        await generatePDFFromReport(report);
      } else if (selectedSession) {
        await generatePDFFromReport(report, selectedSession);
      }
    } catch (error) {
      console.error('PDF 생성 실패:', error);
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const loadReport = async (projectId: string, reportDate: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReport(projectId, reportDate);
      setReport(data);
      if (data.sessions.length > 0) {
        setSelectedSession(data.sessions[0]);
        // 첫 번째 세션은 기본적으로 확장
        setExpandedSessions(new Set([data.sessions[0].sessionId]));
      }
    } catch (error) {
      console.error('Error loading report:', error);
      setError('리포트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'in-progress':
        return '진행 중';
      default:
        return '오류';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">리포트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || '리포트를 찾을 수 없습니다'}</p>
        <Link to={`/project/${id}`} className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          프로젝트로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/project/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          프로젝트 상세
        </Link>
        
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">
              {new Date(report.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })} 리포트
            </h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                내보내기
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white border border-gray-200 z-10">
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">현재 세션</div>
                    <button
                      onClick={() => handleExportMarkdown(false)}
                      disabled={!selectedSession}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      마크다운 (.md)
                    </button>
                    <button
                      onClick={() => handleExportPDF(false)}
                      disabled={!selectedSession}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF (.pdf)
                    </button>
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    
                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">전체 리포트</div>
                    <button
                      onClick={() => handleExportMarkdown(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      마크다운 (.md)
                    </button>
                    <button
                      onClick={() => handleExportPDF(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF (.pdf)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">{report.summary}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card sticky top-20">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">세션 목록 ({report.sessions.length})</h2>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {report.sessions.map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => {
                    setSelectedSession(session);
                    setRawData(null);
                    setShowRawData(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b transition-colors",
                    "hover:bg-accent/50",
                    selectedSession?.sessionId === session.sessionId && "bg-accent border-l-2 border-l-primary"
                  )}
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium line-clamp-1">{session.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <span>AI 분석</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedSession && (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-xl font-bold">{selectedSession.title}</h2>
                </div>
                <p className="text-muted-foreground">{selectedSession.summary}</p>
              </div>
              

              {selectedSession.keyTopics.length > 0 && (
                <div className="border-b px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">주요 토픽</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.keyTopics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              {/* AI Insights 섹션 - 메인 섹션으로 이동 */}
              {selectedSession.aiInsights && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      <h3 className="text-lg font-semibold">AI 분석 결과</h3>
                    </div>
                    <button
                      onClick={() => setShowRawData(!showRawData)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    >
                      {showRawData ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {showRawData ? 'AI 분석 보기' : '원본 대화 보기'}
                    </button>
                  </div>
                  
                  {/* 주요 인사이트 */}
                  {selectedSession.aiInsights.keyInsights && selectedSession.aiInsights.keyInsights.length > 0 && (
                    <div className="mb-6 bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        주요 인사이트
                      </h4>
                      <div className="space-y-2">
                        {selectedSession.aiInsights.keyInsights.map((insight, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-medium">•</span>
                            <span className="text-gray-700">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 코드 품질 분석 */}
                  {selectedSession.aiInsights.codeQuality && (
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {selectedSession.aiInsights.codeQuality.strengths && selectedSession.aiInsights.codeQuality.strengths.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            강점
                          </h4>
                          <div className="space-y-2">
                            {selectedSession.aiInsights.codeQuality.strengths.map((strength, index) => (
                              <div key={index} className="text-sm text-green-700">
                                • {strength}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedSession.aiInsights.codeQuality.improvements && selectedSession.aiInsights.codeQuality.improvements.length > 0 && (
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            개선사항
                          </h4>
                          <div className="space-y-2">
                            {selectedSession.aiInsights.codeQuality.improvements.map((improvement, index) => (
                              <div key={index} className="text-sm text-yellow-700">
                                • {improvement}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 타임라인 */}
                  {selectedSession.aiInsights.timeline && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-3">작업 타임라인</h4>
                      <div className="space-y-4">
                        {selectedSession.aiInsights.timeline.mainTasks && selectedSession.aiInsights.timeline.mainTasks.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">주요 작업</h5>
                            <div className="space-y-2">
                              {selectedSession.aiInsights.timeline.mainTasks.map((task, index) => (
                                <div key={index} className="flex items-start gap-3 text-sm">
                                  <CheckCheck className="h-4 w-4 text-primary mt-0.5" />
                                  <span className="text-gray-700">{task}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedSession.aiInsights.timeline.challenges && selectedSession.aiInsights.timeline.challenges.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">해결한 문제</h5>
                            <div className="space-y-2">
                              {selectedSession.aiInsights.timeline.challenges.map((challenge, index) => (
                                <div key={index} className="flex items-start gap-3 text-sm">
                                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                                  <span className="text-gray-700">{challenge}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-6 border-t">
                <h3 className="text-lg font-semibold mb-4">{showRawData ? '원본 대화 내용' : '상세 내용'}</h3>
                
                {/* 원본 데이터 표시 */}
                {showRawData ? (
                  <div className="rounded-lg bg-gray-50 p-6">
                    {loadingRawData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">원본 데이터 로딩 중...</span>
                      </div>
                    ) : rawData ? (
                      <div className="space-y-4 max-h-[800px] overflow-y-auto">
                        {rawData.messages.map((message, index) => (
                          <div 
                            key={index} 
                            className={cn(
                              "p-4 rounded-lg",
                              message.role === 'user' 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'bg-white border border-gray-200'
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "font-semibold",
                                message.role === 'user' ? 'text-blue-700' : 'text-green-700'
                              )}>
                                {message.role === 'user' ? '💬 사용자' : '🤖 Claude'}
                              </span>
                              {message.timestamp && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.timestamp).toLocaleString('ko-KR')}
                                </span>
                              )}
                            </div>
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        원본 데이터를 불러올 수 없습니다.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-6">
                    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-pre:bg-slate-950 prose-pre:text-slate-50">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md text-sm"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={`${className} bg-slate-100 px-1 py-0.5 rounded text-sm`} {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full divide-y divide-border">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-2 text-left text-sm font-medium bg-muted">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="px-4 py-2 text-sm border-t">{children}</td>
                          ),
                        }}
                      >
                        {selectedSession.mdxContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;