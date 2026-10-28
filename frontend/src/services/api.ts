import axios from 'axios';
import {
  Meeting,
  Task,
  ReviewItem,
  AgentActivity,
  AnalyticsData,
  AppSettings,
  HealthStatus
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

export const api = {
  // System Health
  async getHealth(): Promise<HealthStatus> {
    const res = await apiClient.get<HealthStatus>('/health');
    return res.data;
  },

  // Meetings
  async uploadMeeting(formData: FormData, onProgress?: (pct: number) => void): Promise<Meeting> {
    const res = await apiClient.post<Meeting>('/meetings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      },
    });
    return res.data;
  },

  async getMeetings(status?: string, search?: string): Promise<Meeting[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const res = await apiClient.get<Meeting[]>('/meetings', { params });
    return res.data;
  },

  async getMeeting(id: string): Promise<Meeting> {
    const res = await apiClient.get<Meeting>(`/meetings/${id}`);
    return res.data;
  },

  async getMeetingTranscript(id: string): Promise<{ transcript: string; has_transcript: boolean }> {
    const res = await apiClient.get(`/meetings/${id}/transcript`);
    return res.data;
  },

  async processMeeting(id: string): Promise<{ status: string; message: string }> {
    const res = await apiClient.post(`/meetings/${id}/process`);
    return res.data;
  },

  async getMeetingStatus(id: string): Promise<{ status: string; error_message?: string; tasks_count: number; reviews_count: number }> {
    const res = await apiClient.get(`/meetings/${id}/status`);
    return res.data;
  },

  async deleteMeeting(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/meetings/${id}`);
    return res.data;
  },

  // Tasks
  async getTasks(params?: { status?: string; priority?: string; assignee?: string; meeting_id?: string; search?: string }): Promise<Task[]> {
    const res = await apiClient.get<Task[]>('/tasks', { params });
    return res.data;
  },

  async getTask(id: string): Promise<Task> {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await apiClient.patch<Task>(`/tasks/${id}`, updates);
    return res.data;
  },

  async triggerReminder(id: string, email?: string): Promise<{ success: boolean; reminders_sent: number; subject: string; body: string }> {
    const res = await apiClient.post(`/tasks/${id}/remind`, null, {
      params: email ? { email } : undefined,
    });
    return res.data;
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/tasks/${id}`);
    return res.data;
  },

  // Human Review
  async getReviews(status: string = 'pending', meeting_id?: string): Promise<ReviewItem[]> {
    const params: Record<string, string> = { status };
    if (meeting_id) params.meeting_id = meeting_id;
    const res = await apiClient.get<ReviewItem[]>('/reviews', { params });
    return res.data;
  },

  async approveReview(id: string, payload?: { title?: string; assignee?: string; due_date?: string; priority?: string }): Promise<{ success: boolean; task: Task }> {
    const res = await apiClient.post(`/reviews/${id}/approve`, payload);
    return res.data;
  },

  async rejectReview(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.post(`/reviews/${id}/reject`);
    return res.data;
  },

  // Agent Activities
  async getActivities(meeting_id?: string, agent_name?: string): Promise<AgentActivity[]> {
    const params: Record<string, string> = {};
    if (meeting_id) params.meeting_id = meeting_id;
    if (agent_name) params.agent_name = agent_name;
    const res = await apiClient.get<AgentActivity[]>('/activities', { params });
    return res.data;
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await apiClient.get<AnalyticsData>('/analytics');
    return res.data;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await apiClient.get<AppSettings>('/settings');
    return res.data;
  },

  async updateSettings(payload: Partial<AppSettings>): Promise<{ success: boolean; settings: Partial<AppSettings> }> {
    const res = await apiClient.patch('/settings', payload);
    return res.data;
  },

  // Global Search
  async search(query: string): Promise<{ meetings: Meeting[]; tasks: Task[]; reviews: ReviewItem[] }> {
    const res = await apiClient.get('/search', { params: { q: query } });
    return res.data;
  },
};
