import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Bot,
  Zap,
  Calendar
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
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsData } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading metrics and charts...</p>
      </div>
    );
  }

  const taskCompletionData = [
    { name: 'Completed', value: data?.completed_tasks || 0, color: '#10b981' },
    { name: 'Pending', value: data?.pending_tasks || 0, color: '#f97316' },
  ];

  const priorityData = [
    { name: 'High', count: data?.tasks_by_priority.high || 0, color: '#ef4444' },
    { name: 'Medium', count: data?.tasks_by_priority.medium || 0, color: '#f59e0b' },
    { name: 'Low', count: data?.tasks_by_priority.low || 0, color: '#10b981' },
  ];

  const reviewVolumeData = [
    { name: 'Approved', count: data?.approved_reviews || 0, color: '#10b981' },
    { name: 'Pending Review', count: data?.pending_reviews || 0, color: '#f59e0b' },
    { name: 'Rejected', count: data?.rejected_reviews || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-6 h-6 text-orange-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System Analytics</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Aggregated insights into meeting throughput, agent accuracy, action item completion, and review volume.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-400 mb-1">Task Completion Rate</div>
          <div className="text-3xl font-extrabold text-emerald-400">{data?.completion_rate ?? 0}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data?.completed_tasks ?? 0} of {data?.total_tasks ?? 0} items finished
          </div>
        </div>

        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-400 mb-1">Agent Reliability</div>
          <div className="text-3xl font-extrabold text-cyan-400">{data?.agent_success_rate ?? 100}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-agent stage execution</div>
        </div>

        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-400 mb-1">Avg AI Processing Time</div>
          <div className="text-3xl font-extrabold text-white">
            {data?.avg_processing_time_seconds ? `${data.avg_processing_time_seconds}s` : '0s'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">End-to-end LangGraph run</div>
        </div>

        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-5">
          <div className="text-xs font-medium text-slate-400 mb-1">Human Review Volume</div>
          <div className="text-3xl font-extrabold text-amber-400">
            {(data?.pending_reviews ?? 0) + (data?.approved_reviews ?? 0) + (data?.rejected_reviews ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{data?.pending_reviews ?? 0} currently pending</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Ratio */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Task Completion Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            {data && data.total_tasks > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskCompletionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No action items recorded yet.</div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Completed ({data?.completed_tasks})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300">Pending ({data?.pending_tasks})</span>
            </div>
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Tasks by Priority</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  cursor={{ fill: '#141B2B' }}
                  contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Human Review Resolution */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Human-in-the-Loop Outcomes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewVolumeData} layout="vertical" margin={{ left: 15, right: 30 }}>
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} width={100} />
                <Tooltip
                  cursor={{ fill: '#141B2B' }}
                  contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {reviewVolumeData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meeting Uploads Over Time */}
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Meeting Processing History</h2>
          <div className="h-64">
            {data && data.meeting_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.meeting_trends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161F33', borderColor: '#2E3D59', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No chronological meeting history yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
