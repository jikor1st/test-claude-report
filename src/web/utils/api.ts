const API_URL = 'http://localhost:3001/api';

export const api = {
  async getProjects() {
    const response = await fetch(`${API_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async getProjectDetails(projectId: string) {
    const encodedProjectId = encodeURIComponent(projectId);
    const url = `${API_URL}/projects/${encodedProjectId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch project details');
    }
    return response.json();
  },

  async getReport(projectId: string, date: string) {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await fetch(`${API_URL}/projects/${encodedProjectId}/reports/${date}`);
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  },

  async analyzeProject(projectId: string, options: { useAI?: boolean; limit?: number } = {}) {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await fetch(`${API_URL}/projects/${encodedProjectId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error('Failed to start analysis');
    return response.json();
  },

  async getProjectStatus(projectId: string) {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await fetch(`${API_URL}/projects/${encodedProjectId}/status`);
    if (!response.ok) throw new Error('Failed to fetch project status');
    return response.json();
  },

  async getAllAnalysisStatus() {
    const response = await fetch(`${API_URL}/analysis-status`);
    if (!response.ok) throw new Error('Failed to fetch analysis statuses');
    return response.json();
  },

  async getProjectSessions(projectId: string) {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await fetch(`${API_URL}/projects/${encodedProjectId}/sessions`);
    if (!response.ok) throw new Error('Failed to fetch project sessions');
    return response.json();
  },

  async analyzeByDate(projectId: string, date: string, options: { useAI?: boolean } = {}) {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await fetch(`${API_URL}/projects/${encodedProjectId}/analyze-by-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date, ...options }),
    });
    if (!response.ok) throw new Error('Failed to start date analysis');
    return response.json();
  },
};