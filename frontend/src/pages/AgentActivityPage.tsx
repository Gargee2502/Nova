import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AgentActivity } from '../types';

export const AgentActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivities(
        undefined,
        agentFilter === 'all' ? undefined : agentFilter
      );
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [agentFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Agent Activity &amp; Audit Log
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time trace of LangGraph agent executions, state transitions, tool invocations, and decisions.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1422] hover:bg-[#161F33] text-slate-300 border border-[#1E293B] text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#0E1422] border border-[#1E293B] p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'all', label: 'All Agents' },
          { id: 'Supervisor Agent', label: 'Supervisor' },
          { id: 'Meeting Extraction Agent', label: 'Extraction' },
          { id: 'Assignment Agent', label: 'Assignment' },
          { id: 'Follow-Up Agent', label: 'Follow-Up' },
          { id: 'Human Reviewer', label: 'Human Reviewer' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAgentFilter(item.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              agentFilter === item.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161F33]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Audit Log Stream */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading agent activity records...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-16 text-center bg-[#0B0F17] border border-[#1B2333] rounded-2xl p-8 space-y-3">
          <Bot className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-semibold text-slate-200">No agent activity logged</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Agent events will be recorded here automatically when meetings are processed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="bg-[#0B0F17] border border-[#1B2333] rounded-xl p-4 sm:p-5 space-y-2 text-xs transition-all hover:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      act.status === 'completed'
                        ? 'bg-emerald-400'
                        : act.status === 'started'
                        ? 'bg-amber-400 animate-ping'
                        : act.status === 'routed'
                        ? 'bg-cyan-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="font-bold text-sm text-slate-100">{act.action}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono font-semibold bg-[#121A2C] text-orange-400 border border-orange-500/20">
                    {act.agent_name}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>{new Date(act.started_at).toLocaleString()}</span>
                  <span
                    className={`px-2 py-0.5 rounded uppercase font-semibold text-[10px] ${
                      act.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : act.status === 'routed'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : act.status === 'started'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              </div>

              {/* Input / Output details */}
              {act.input_summary && (
                <div className="text-slate-400 pl-4 border-l border-slate-700">
                  <span className="font-semibold text-slate-300">Input: </span>
                  <span>{act.input_summary}</span>
                </div>
              )}

              {act.output_summary && (
                <div className="text-slate-300 pl-4 border-l border-emerald-500/50">
                  <span className="font-semibold text-emerald-400">Output: </span>
                  <span>{act.output_summary}</span>
                </div>
              )}

              {act.error_details && (
                <div className="text-red-400 pl-4 border-l border-red-500/50">
                  <span className="font-semibold">Error: </span>
                  <span>{act.error_details}</span>
                </div>
              )}

              {act.meeting_id && (
                <div className="pt-2 text-[11px]">
                  <Link
                    to={`/meetings/${act.meeting_id}`}
                    className="text-orange-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>View associated meeting</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
