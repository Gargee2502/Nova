export interface Meeting {
  id: string;
  title: string;
  filename: string;
  file_path?: string;
  file_size: number;
  media_type: 'audio' | 'video';
  duration_seconds?: number;
  participants: string[];
  owner_name?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed' | 'partial_success';
  error_message?: string;
  transcript?: string;
  summary?: string;
  key_points: string[];
  decisions: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  assignee?: string;
  due_date?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'cancelled';
  confidence: number;
  evidence?: string;
  reminders_sent: number;
  last_reminded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewItem {
  id: string;
  meeting_id: string;
  meeting_title?: string;
  suggested_title: string;
  suggested_assignee?: string;
  suggested_due_date?: string;
  suggested_priority: 'high' | 'medium' | 'low';
  confidence: number;
  reason_for_review: string;
  supporting_evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
}

export interface AgentActivity {
  id: string;
  meeting_id?: string;
  agent_name: string;
  action: string;
  status: 'started' | 'completed' | 'failed' | 'routed';
  input_summary?: string;
  output_summary?: string;
  error_details?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface AnalyticsData {
  total_meetings: number;
  successful_meetings: number;
  failed_meetings: number;
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  agent_success_rate: number;
  avg_processing_time_seconds: number;
  tasks_by_priority: {
    high: number;
    medium: number;
    low: number;
  };
  recent_activities: AgentActivity[];
  meeting_trends: Array<{ date: string; count: number }>;
}

export interface AppSettings {
  confidence_threshold: number;
  gemini_model: string;
  max_upload_size_mb: number;
  is_gemini_configured: boolean;
  is_mongodb_configured: boolean;
  db_status_message: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  gemini: {
    configured: boolean;
    model: string;
  };
  database: {
    connected: boolean;
    status: string;
  };
  confidence_threshold: number;
  max_upload_size_mb: number;
}
