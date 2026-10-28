import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Bot,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsData, Meeting, Task, AgentActivity } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [aData, mData, tData, actData] = await Promise.all([
          api.getAnalytics(),
          api.getMeetings(undefined, undefined),
          api.getTasks({ status: 'pending' }),
          api.getActivities(undefined, undefined),
        ]);
        setAnalytics(aData);
        setRecentMeetings(mData.slice(0, 5));
        setUpcomingTasks(tData.slice(0, 5));
        setActivities(actData.slice(0, 6));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading Nova dashboard metrics...</p>
      </div>
    );
  }

  // Priority chart data
  const priorityData = analytics
    ? [
        { name: 'High', count: analytics.tasks_by_priority.high, color: '#ef4444' },
        { name: 'Medium', count: analytics.tasks_by_priority.medium, color: '#f59e0b' },
        { name: 'Low', count: analytics.tasks_by_priority.low, color: '#10b981' },
      ]
    : [];

  const taskCompletionPie = [
    { name: 'Completed', value: analytics?.completed_tasks || 0, color: '#10b981' },
    { name: 'Pending', value: analytics?.pending_tasks || 0, color: '#f97316' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time status of multi-agent meeting transcription, action items, and automated follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Process New Meeting</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Meetings */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Total Meetings</div>
            <div className="text-2xl font-bold text-white">{analytics?.total_meetings ?? 0}</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{analytics?.successful_meetings ?? 0} Processed</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Action Items */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Pending Tasks</div>
            <div className="text-2xl font-bold text-orange-400">{analytics?.pending_tasks ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting completion</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Completed Tasks</div>
            <div className="text-2xl font-bold text-emerald-400">{analytics?.completed_tasks ?? 0}</div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {analytics?.completion_rate ?? 0}% Completion
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Human Review Queue */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Needs Human Review</div>
            <div className="text-2xl font-bold text-amber-400">{analytics?.pending_reviews ?? 0}</div>
            <div className="text-[11px] text-amber-400/80 mt-1">Low-confidence &lt; 0.70</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Agent Success Rate */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Agent Reliability</div>
            <div className="text-2xl font-bold text-cyan-400">{analytics?.agent_success_rate ?? 100}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Autonomous runs</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Completion Donut */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Task Completion Ratio</h2>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="h-52 flex items-center justify-center">
            {analytics && analytics.total_tasks > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskCompletionPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskCompletionPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 text-center">No tasks recorded yet.</div>
            )}
          </div>

          <div className="flex justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Completed ({analytics?.completed_tasks})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300">Pending ({analytics?.pending_tasks})</span>
            </div>
          </div>
        </div>

        {/* Tasks by Priority Bar Chart */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Action Items by Priority</h2>
            <span className="text-xs text-slate-400">Total: {analytics?.total_tasks ?? 0}</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  cursor={{ fill: '#141B2B' }}
                  contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables and Recent Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Meetings */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Meetings</h2>
            <Link to="/meetings" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMeetings.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No meetings uploaded yet. Start by uploading an audio recording.
            </div>
          ) : (
            <div className="space-y-3">
              {recentMeetings.map((m) => (
                <Link
                  key={m.id}
                  to={`/meetings/${m.id}`}
                  className="block p-3 rounded-lg bg-[#121827] hover:bg-[#162035] border border-[#1E293B] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-200 truncate">{m.title}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        m.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : m.status === 'processing'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : m.status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{m.participants.length} participants</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Live Agent Activity Feed */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Agent Workflow Activity</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <Link to="/activity" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              <span>Audit Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No recent agent events recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-[#121827] border border-[#1E293B] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-orange-400">{a.agent_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200 font-medium">{a.action}</div>
                  {a.output_summary && <div className="text-slate-400 text-[11px] mt-1">{a.output_summary}</div>}
                  {a.error_details && <div className="text-red-400 text-[11px] mt-1">{a.error_details}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
