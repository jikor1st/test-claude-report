import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  FolderOpen, 
  ChevronRight, 
  Search,
  Sparkles,
  CheckCircle,
  Clock,
  Menu,
  X,
  ChevronLeft,
  Grid3x3,
  List
} from 'lucide-react';
import ClaudeLogo from './ClaudeLogo';
import { Project } from '../../shared/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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
        fixed top-0 left-0 h-full bg-white shadow-xl z-40 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <ClaudeLogo className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Claude Report</h1>
                <p className="text-xs text-gray-500">AI 세션 분석</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="p-4 space-y-1">
            {mainNavItems.map(({ path, label, icon: Icon }) => {
              const isActive = isMainNavActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Projects Section */}
          <div className="flex-1 flex flex-col border-t border-gray-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">프로젝트</h2>
                <FolderOpen className="h-4 w-4 text-gray-400" />
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
              <div className="space-y-1 max-h-[calc(100vh-400px)] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                  </p>
                ) : (
                  filteredProjects.map(project => {
                    const status = getProjectStatus(project);
                    const StatusIcon = status.icon;
                    const isSelected = selectedProjectId === project.id;
                    
                    return (
                      <div key={project.id} className="relative group">
                        <button
                          onClick={() => navigate(`/project/${project.id}`)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg transition-all
                            ${isSelected 
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm' 
                              : 'hover:bg-gray-50'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`p-1 rounded flex-shrink-0 ${status.bg}`}>
                                <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                              </div>
                              <span 
                                className={`text-sm truncate ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                                title={project.name}
                              >
                                {project.name}
                              </span>
                            </div>
                            <ChevronRight className={`
                              h-3.5 w-3.5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                              ${isSelected ? 'opacity-100' : ''}
                            `} />
                          </div>
                          {project.unanalyzedSessionsCount > 0 && (
                            <div className="mt-1 flex items-center gap-1 pl-7">
                              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                              <span className="text-xs text-yellow-600">
                                {project.unanalyzedSessionsCount} 새 세션
                              </span>
                            </div>
                          )}
                        </button>
                        
                        {/* Hover Tooltip for full name */}
                        {project.name.length > 20 && (
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                            <div className={`
                              bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg
                              opacity-0 group-hover:opacity-100 transition-opacity duration-200
                              whitespace-nowrap max-w-xs
                              ${!isOpen ? 'hidden' : ''}
                            `}>
                              <div className="font-medium">{project.name}</div>
                              {project.totalReports > 0 && (
                                <div className="text-gray-300 mt-1">
                                  {project.totalReports} 리포트 · {project.totalSessions || 0} 세션
                                </div>
                              )}
                              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={fetchProjects}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              새로고침
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

export default Sidebar;