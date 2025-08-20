import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  FileText, 
  Users,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Code,
  GitBranch,
  Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Statistics as StatisticsType, Project } from '../../shared/types';

const Dashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsResponse, projectsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/statistics'),
        fetch('http://localhost:3001/api/projects')
      ]);
      
      const statsData = await statsResponse.json();
      const projectsData = await projectsResponse.json();
      
      // Transform GlobalStatistics to match the expected format
      const transformedStats = {
        totalProjects: statsData.totalProjects || 0,
        totalSessions: statsData.totalSessions || 0,
        totalReports: statsData.totalReports || 0,
        topTopics: statsData.keyTopics || [],
        timeline: statsData.timeline || { dailyActivity: [], averageDailySessions: 0 },
        keyInsights: statsData.insights?.topInsights || [],
        issuesSolutions: statsData.issuesSolutions || []
      };
      
      setStatistics(transformedStats);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Set default values on error
      setStatistics({
        totalProjects: 0,
        totalSessions: 0,
        totalReports: 0,
        topTopics: [],
        timeline: { dailyActivity: [], averageDailySessions: 0 },
        keyInsights: [],
        issuesSolutions: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  // Calculate additional metrics
  const totalSessions = projects.reduce((acc, p) => acc + (p.totalSessions || 0), 0);
  const totalReports = projects.reduce((acc, p) => acc + (p.totalReports || 0), 0);
  const activeProjects = projects.filter(p => p.unanalyzedSessionsCount > 0).length;
  const completionRate = totalSessions > 0 ? (totalReports / totalSessions * 100).toFixed(1) : '0';

  // Prepare chart data
  const topTopicsData = (statistics.topTopics || []).slice(0, 5).map(topic => ({
    name: topic.topic,
    value: topic.count,
    percentage: topic.percentage
  }));

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  const timelineData = (statistics.timeline?.dailyActivity || []).slice(-7).map(day => ({
    date: new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    sessions: day.sessionCount
  }));

  const projectActivityData = projects.slice(0, 5).map(project => ({
    name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
    reports: project.totalReports,
    unanalyzed: project.unanalyzedSessionsCount
  }));

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-1">Claude 세션 분석 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'all'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {period === 'week' ? '1주' : period === 'month' ? '1개월' : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">전체 프로젝트</p>
              <p className="text-3xl font-bold mt-2">{statistics.totalProjects}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">+{activeProjects} 활성</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <GitBranch className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">총 세션</p>
              <p className="text-3xl font-bold mt-2">{totalSessions}</p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm">{totalReports} 분석됨</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Code className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm">분석률</p>
              <p className="text-3xl font-bold mt-2">{completionRate}%</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">향상 중</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">평균 세션</p>
              <p className="text-3xl font-bold mt-2">{statistics.timeline?.averageDailySessions || 0}</p>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">일일 평균</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">활동 타임라인</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sessions" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSessions)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">주요 토픽</h3>
            <Zap className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={topTopicsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {topTopicsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">프로젝트별 활동</h3>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="reports" fill="#10B981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="unanalyzed" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">최근 인사이트</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {(statistics.keyInsights || []).slice(0, 5).map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  index === 0 ? 'bg-blue-500' : 
                  index === 1 ? 'bg-purple-500' : 
                  index === 2 ? 'bg-pink-500' : 
                  index === 3 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{insight.insight}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {insight.projects.slice(0, 2).join(', ')}
                    {insight.projects.length > 2 && ` 외 ${insight.projects.length - 2}개`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues & Solutions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">주요 이슈 및 해결방법</h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(statistics.issuesSolutions || []).slice(0, 6).map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">이슈</span>
                <span className="text-xs text-gray-500">{item.count}회</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-2">{item.issue}</p>
              <div className="border-t pt-2">
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">해결</span>
                <p className="text-xs text-gray-600 mt-2">{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;