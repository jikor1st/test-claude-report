import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, Tag, AlertTriangle, CheckCircle, Target, Lightbulb, Calendar, Layers, Package, GitPullRequest, GitMerge, TrendingUp, ArrowUpRight, Filter } from 'lucide-react';
import type { GlobalStatistics } from '../../shared/types';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#ef4444'];

export default function Statistics() {
  const [statistics, setStatistics] = useState<GlobalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'tasks' | 'timeline'>('overview');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (selectedProject !== 'all') {
      fetchStatistics(selectedProject);
    } else {
      fetchStatistics();
    }
  }, [selectedProject]);

  const fetchStatistics = async (projectId?: string) => {
    try {
      setLoading(true);
      const url = projectId 
        ? `http://localhost:3001/api/statistics?projectId=${encodeURIComponent(projectId)}`
        : 'http://localhost:3001/api/statistics';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">전체 통계 분석</h1>
            <p className="text-gray-500">
              {statistics.dateRange.start && statistics.dateRange.end
                ? `${new Date(statistics.dateRange.start).toLocaleDateString('ko-KR')} ~ ${new Date(statistics.dateRange.end).toLocaleDateString('ko-KR')}`
                : '데이터 수집 중...'}
            </p>
          </div>
          
          {/* Project Selector */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-sm font-medium bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">전체 프로젝트</option>
              {statistics.projectList?.map(project => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{statistics.totalProjects}</p>
            <p className="text-sm text-gray-600 mt-1">총 프로젝트</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{statistics.totalSessions}</p>
            <p className="text-sm text-gray-600 mt-1">총 세션</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Layers className="h-5 w-5 text-pink-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-pink-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{statistics.totalReports}</p>
            <p className="text-sm text-gray-600 mt-1">총 리포트</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {statistics.timeline.dailyActivity.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">활동 일수</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-100">
          <nav className="flex p-1">
            {[
              { id: 'overview', label: '인사이트', icon: Lightbulb },
              { id: 'topics', label: '주요 토픽', icon: Tag },
              { id: 'tasks', label: 'Issues & Solutions', icon: Target },
              { id: 'timeline', label: '타임라인', icon: Calendar }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all
                  ${activeTab === id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'}
                `}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab - Insights */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {selectedProject !== 'all' ? `${selectedProject} 프로젝트 인사이트` : '전체 프로젝트 인사이트'}
                </h3>
                <div className="grid gap-4">
                  {statistics.insights.topInsights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="group relative overflow-hidden bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                      <div className="relative flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium">{insight.insight}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <TrendingUp className="h-3 w-3" />
                              {insight.frequency}회
                            </span>
                            <span className="text-gray-500">
                              {insight.projects.length}개 프로젝트
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key Topics Tab */}
          {activeTab === 'topics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {selectedProject !== 'all' ? `${selectedProject} 프로젝트 주요 토픽` : '전체 프로젝트 주요 토픽'}
                </h3>
              </div>
              
              {/* Topic Cloud Style Display */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                <div className="flex flex-wrap gap-3">
                  {statistics.keyTopics?.map((topic, index) => {
                    const sizeClass = index < 3 ? 'text-base font-bold px-5 py-3' : 
                                     index < 8 ? 'text-sm font-semibold px-4 py-2' : 
                                     'text-xs font-medium px-3 py-2';
                    const colorClass = COLORS[index % COLORS.length];
                    
                    return (
                      <div
                        key={topic.topic}
                        className={`inline-flex items-center gap-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all cursor-pointer group ${sizeClass}`}
                        style={{ 
                          borderWidth: '2px',
                          borderColor: colorClass + '40',
                          backgroundColor: colorClass + '08'
                        }}
                      >
                        <Tag className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" style={{ color: colorClass }} />
                        <span style={{ color: colorClass }}>{topic.topic}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" 
                          style={{ backgroundColor: colorClass + '20', color: colorClass }}>
                          {topic.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Topic Details List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {statistics.keyTopics?.slice(0, 10).map((topic, index) => (
                  <div key={topic.topic} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{topic.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{topic.count}</span>
                        <span className="text-sm text-gray-500">({topic.percentage}%)</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {topic.projects.length === 1 
                        ? `${topic.projects[0]} 프로젝트`
                        : `${topic.projects.length}개 프로젝트에서 사용`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Tab - Issues & Solutions */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {selectedProject !== 'all' ? `${selectedProject} 프로젝트 Issues & Solutions` : '전체 프로젝트 Issues & Solutions'}
                </h3>
              </div>

              {/* Issues with Solutions */}
              <div>
                <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  주요 Issues와 해결 방법
                </h4>
                <div className="space-y-4">
                  {statistics.taskAnalysis.issues?.slice(0, 8).map((issue, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <GitPullRequest className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">
                            {issue.issue}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <span className="font-semibold">{issue.count}</span>회 발생
                            </span>
                            <span>
                              {issue.projects.length === 1 
                                ? issue.projects[0] 
                                : `${issue.projects.length}개 프로젝트`}
                            </span>
                          </div>
                          
                          {issue.solutions && issue.solutions.length > 0 && (
                            <div className="border-t pt-3">
                              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <GitMerge className="h-4 w-4 text-green-500" />
                                해결 방법:
                              </div>
                              <div className="space-y-1">
                                {issue.solutions.map((sol, solIndex) => (
                                  <div key={solIndex} className="flex items-start gap-2 text-sm text-gray-600 pl-5">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span className="flex-1">{sol.solution}</span>
                                    {sol.frequency > 1 && (
                                      <span className="text-xs text-gray-500">({sol.frequency}회)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Solutions */}
              <div>
                <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  자주 사용된 해결 방법
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {statistics.taskAnalysis.commonSolutions?.slice(0, 10).map((solution, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {solution.solution}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {solution.count}회 적용 
                            {solution.relatedIssues.length > 0 && (
                              <span className="text-gray-500">
                                {' · '}관련 Issue {solution.relatedIssues.length}개
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Tasks (Compact) */}
              <div>
                <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  주요 작업
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {statistics.taskAnalysis.mainTasks.slice(0, 6).map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-800 truncate flex-1">{task.task}</span>
                      <span className="text-sm font-semibold text-blue-600 ml-2">{task.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {selectedProject !== 'all' ? `${selectedProject} 프로젝트 타임라인` : '전체 프로젝트 타임라인'}
                </h3>
                <h4 className="text-base font-medium mb-4">일별 활동 추이</h4>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={statistics.timeline.dailyActivity}>
                      <defs>
                        <linearGradient id="colorSession" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorProject" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} fontSize={12} stroke="#9CA3AF" />
                      <YAxis fontSize={12} stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Area type="monotone" dataKey="sessionCount" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSession)" name="세션 수" />
                      <Area type="monotone" dataKey="projectCount" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorProject)" name="프로젝트 수" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-300 rounded-full blur-2xl opacity-20" />
                  <div className="relative">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      가장 활발한 날
                    </h4>
                    <p className="text-2xl font-bold text-blue-700">
                      {new Date(statistics.timeline.dailyActivity.reduce((max, day) => 
                        day.sessionCount > (max?.sessionCount || 0) ? day : max, 
                        statistics.timeline.dailyActivity[0]
                      )?.date || '').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) || 'N/A'}
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      {statistics.timeline.dailyActivity.reduce((max, day) => 
                        day.sessionCount > (max?.sessionCount || 0) ? day : max, 
                        statistics.timeline.dailyActivity[0]
                      )?.sessionCount || 0} 세션 기록
                    </p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-300 rounded-full blur-2xl opacity-20" />
                  <div className="relative">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      평균 일일 세션
                    </h4>
                    <p className="text-2xl font-bold text-purple-700">
                      {statistics.timeline.dailyActivity.length > 0
                        ? Math.round(statistics.totalSessions / statistics.timeline.dailyActivity.length)
                        : 0}
                    </p>
                    <p className="text-sm text-purple-600 mt-2">세션/일</p>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5 border border-pink-200">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-pink-300 rounded-full blur-2xl opacity-20" />
                  <div className="relative">
                    <h4 className="font-semibold text-pink-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      활동 기간
                    </h4>
                    <p className="text-2xl font-bold text-pink-700">
                      {statistics.timeline.dailyActivity.length}
                    </p>
                    <p className="text-sm text-pink-600 mt-2">일간 활동</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}