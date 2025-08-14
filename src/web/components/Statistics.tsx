import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Activity, Tag, AlertTriangle, CheckCircle, Target, Lightbulb, Calendar, Layers, Package, GitPullRequest, GitMerge } from 'lucide-react';
import type { GlobalStatistics } from '../../shared/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">통계 대시보드</h1>
            <p className="text-gray-600">
              {statistics.dateRange.start && statistics.dateRange.end
                ? `${statistics.dateRange.start} ~ ${statistics.dateRange.end}`
                : '데이터 수집 중...'}
            </p>
          </div>
          
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">프로젝트:</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{statistics.totalProjects}</span>
          </div>
          <p className="text-gray-600">총 프로젝트</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-8 w-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{statistics.totalSessions}</span>
          </div>
          <p className="text-gray-600">총 세션</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Layers className="h-8 w-8 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">{statistics.totalReports}</span>
          </div>
          <p className="text-gray-600">총 리포트</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">
              {statistics.timeline.dailyActivity.length}
            </span>
          </div>
          <p className="text-gray-600">활동 일수</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
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
                  flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
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
                <div className="space-y-3">
                  {statistics.insights.topInsights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-800">{insight.insight}</p>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span>빈도: {insight.frequency}</span>
                          <span>프로젝트: {insight.projects.length}개</span>
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
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex flex-wrap gap-3">
                  {statistics.keyTopics?.map((topic, index) => {
                    const sizeClass = index < 3 ? 'text-lg font-semibold' : 
                                     index < 8 ? 'text-base font-medium' : 
                                     'text-sm';
                    const colorClass = COLORS[index % COLORS.length];
                    
                    return (
                      <div
                        key={topic.topic}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border ${sizeClass}`}
                        style={{ borderColor: colorClass, color: colorClass }}
                      >
                        <Tag className="h-4 w-4" />
                        <span>{topic.topic}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
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
                <h4 className="text-base font-medium mb-4">일별 활동</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={statistics.timeline.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sessionCount" stroke="#3b82f6" name="세션 수" />
                    <Line type="monotone" dataKey="projectCount" stroke="#10b981" name="프로젝트 수" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">가장 활발한 날</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.timeline.dailyActivity.reduce((max, day) => 
                      day.sessionCount > (max?.sessionCount || 0) ? day : max, 
                      statistics.timeline.dailyActivity[0]
                    )?.date || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {statistics.timeline.dailyActivity.reduce((max, day) => 
                      day.sessionCount > (max?.sessionCount || 0) ? day : max, 
                      statistics.timeline.dailyActivity[0]
                    )?.sessionCount || 0} 세션
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">평균 일일 세션</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.timeline.dailyActivity.length > 0
                      ? Math.round(statistics.totalSessions / statistics.timeline.dailyActivity.length)
                      : 0}
                  </p>
                  <p className="text-sm text-green-700 mt-1">세션/일</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">활동 기간</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {statistics.timeline.dailyActivity.length}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">일</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}