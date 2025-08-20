import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  FolderOpen, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Sparkles,
  CheckCircle,
  Clock,
  Menu,
  X,
  Grid3x3,
  List,
  Eye,
  EyeOff
} from 'lucide-react';
import ClaudeLogo from './ClaudeLogo';
import { Project } from '../../shared/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SidebarNew: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [showFullNames, setShowFullNames] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Extract project ID from URL if on project detail page
    const match = location.pathname.match(/^\/project\/([^/]+)/);
    if (match) {
      setSelectedProjectId(match[1]);
    } else {
      setSelectedProjectId(null);
    }
  }, [location]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProjectStatus = (project: Project) => {
    if (project.unanalyzedSessionsCount > 0) {
      return { icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-50' };
    } else if (project.totalReports > 0) {
      return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
    } else {
      return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' };
    }
  };

  const mainNavItems = [
    { path: '/', label: '대시보드', icon: Home },
    { path: '/statistics', label: '전체 통계', icon: BarChart3 },
  ];

  const isMainNavActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/statistics' && location.pathname === '/statistics') return true;
    return false;
  };

  // 프로젝트 이름 축약 함수
  const formatProjectName = (name: string, maxLength: number = 25) => {
    if (showFullNames || name.length <= maxLength) return name;
    
    // 카멜케이스나 언더스코어로 구분된 단어들을 추출
    const words = name.split(/(?=[A-Z])|[_-\s]/);
    
    // 각 단어의 첫 글자를 대문자로 만들어 약어 생성
    if (words.length > 2) {
      const acronym = words
        .filter(w => w.length > 0)
        .map(w => w[0].toUpperCase())
        .join('');
      
      if (acronym.length <= 5) {
        return `${acronym} (${name.substring(0, 15)}...)`;
      }
    }
    
    return name.substring(0, maxLength) + '...';
  };

  const sidebarWidth = isExpanded ? 'w-80' : 'w-16';

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg md:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-40 transition-all duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarWidth}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-3 ${!isExpanded && 'justify-center'}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex-shrink-0">
                  <ClaudeLogo className="h-6 w-6 text-white" />
                </div>
                {isExpanded && (
                  <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900">Claude Report</h1>
                    <p className="text-xs text-gray-500">AI 세션 분석</p>
                  </div>
                )}
              </div>
              {isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="사이드바 축소"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors w-full"
                title="사이드바 확장"
              >
                <ChevronRight className="h-4 w-4 text-gray-500 mx-auto" />
              </button>
            )}
          </div>

          {/* Main Navigation */}
          <nav className="p-3 space-y-1">
            {mainNavItems.map(({ path, label, icon: Icon }) => {
              const isActive = isMainNavActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  title={!isExpanded ? label : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${!isExpanded && 'justify-center'}
                  `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {isExpanded && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Projects Section */}
          <div className="flex-1 flex flex-col border-t border-gray-200 overflow-hidden">
            {isExpanded ? (
              <div className="flex flex-col h-full p-3">
                {/* Header with View Options */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">프로젝트</h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowFullNames(!showFullNames)}
                      className={`p-1 rounded transition-colors ${showFullNames ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                      title={showFullNames ? "이름 축약" : "전체 이름 표시"}
                    >
                      {showFullNames ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-1 rounded transition-colors ${viewMode === 'compact' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      title="컴팩트 보기"
                    >
                      <List className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      title="리스트 보기"
                    >
                      <Grid3x3 className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="프로젝트 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                    </p>
                  ) : viewMode === 'compact' ? (
                    // Compact View - 한 줄에 최대한 많은 정보
                    <div className="space-y-0.5">
                      {filteredProjects.map(project => {
                        const status = getProjectStatus(project);
                        const StatusIcon = status.icon;
                        const isSelected = selectedProjectId === project.id;
                        
                        return (
                          <button
                            key={project.id}
                            onClick={() => navigate(`/project/${project.id}`)}
                            className={`
                              w-full text-left px-2 py-1.5 rounded transition-all flex items-center gap-2
                              ${isSelected 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'hover:bg-gray-50 text-gray-700'}
                            `}
                            title={project.name}
                          >
                            <StatusIcon className={`h-3 w-3 flex-shrink-0 ${status.color}`} />
                            <span className="text-xs truncate flex-1">
                              {formatProjectName(project.name, 30)}
                            </span>
                            {project.unanalyzedSessionsCount > 0 && (
                              <span className="text-xs text-yellow-600 bg-yellow-100 px-1 rounded">
                                {project.unanalyzedSessionsCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // List View - 자세한 정보와 줄바꿈 허용
                    <div className="space-y-2">
                      {filteredProjects.map(project => {
                        const status = getProjectStatus(project);
                        const StatusIcon = status.icon;
                        const isSelected = selectedProjectId === project.id;
                        
                        return (
                          <div key={project.id} className="relative group">
                            <button
                              onClick={() => navigate(`/project/${project.id}`)}
                              className={`
                                w-full text-left px-3 py-3 rounded-lg transition-all
                                ${isSelected 
                                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm border border-blue-200' 
                                  : 'hover:bg-gray-50 border border-transparent'}
                              `}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`p-1 rounded flex-shrink-0 mt-0.5 ${status.bg}`}>
                                  <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm leading-5 break-words ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                    {showFullNames ? project.name : formatProjectName(project.name, 35)}
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                    <span>{project.totalReports} 리포트</span>
                                    <span>{project.totalSessions || 0} 세션</span>
                                  </div>
                                  {project.unanalyzedSessionsCount > 0 && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                                      <span className="text-xs text-yellow-600 font-medium">
                                        {project.unanalyzedSessionsCount}개 새 세션 분석 대기
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Collapsed view - only show icons
              <div className="p-2">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="프로젝트 목록"
                >
                  <FolderOpen className="h-4 w-4 text-gray-600 mx-auto" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-3 border-t border-gray-200 ${!isExpanded && 'text-center'}`}>
            <button
              onClick={fetchProjects}
              className={`text-sm text-gray-500 hover:text-gray-700 transition-colors ${isExpanded ? 'w-full' : ''}`}
              title="새로고침"
            >
              {isExpanded ? '새로고침' : '↻'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default SidebarNew;