import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import ReportViewer from './components/ReportViewer';
import Statistics from './components/Statistics';
import { AnalysisProvider } from './contexts/AnalysisContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AnalysisProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          
          <div className="md:ml-64 transition-all duration-300">
            <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
              <div className="container mx-auto px-4 xl:px-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/project/:id" element={<ProjectDetail />} />
                  <Route path="/project/:id/report/:date" element={<ReportViewer />} />
                </Routes>
              </div>
            </main>
          </div>
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