import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BarChart3, ChartBar, Home, Activity } from 'lucide-react';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ReportViewer from './components/ReportViewer';
import Statistics from './components/Statistics';
import { AnalysisProvider } from './contexts/AnalysisContext';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: '프로젝트', icon: Home },
    { path: '/statistics', label: '통계', icon: ChartBar },
  ];

  return (
    <nav className="flex gap-1 ml-auto">
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path || 
                        (path === '/' && location.pathname.startsWith('/project'));
        return (
          <Link
            key={path}
            to={path}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${isActive 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
            `}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function App() {
  return (
    <AnalysisProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto flex h-16 items-center px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Claude 리포트 분석기</h1>
                  <p className="text-xs text-muted-foreground">Claude Code 대화 세션 분석 도구</p>
                </div>
              </div>
              <Navigation />
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<ProjectList />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/project/:id/report/:date" element={<ReportViewer />} />
            </Routes>
          </main>
        </div>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AnalysisProvider>
  );
}

export default App;