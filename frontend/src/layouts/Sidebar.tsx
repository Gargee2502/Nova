import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  UploadCloud,
  CheckSquare,
  ShieldAlert,
  Activity,
  BarChart3,
  Settings,
  Sparkles,
  Bot,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export const Sidebar: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<number>(0);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const reviews = await api.getReviews('pending');
        setPendingReviews(reviews.length);
        const health = await api.getHealth();
        if (health.gemini?.model) {
          setGeminiModel(health.gemini.model);
        }
      } catch {
        // quiet fallback
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/meetings', label: 'Meetings', icon: Video },
    { to: '/upload', label: 'Upload Meeting', icon: UploadCloud, highlight: true },
    { to: '/tasks', label: 'Action Items', icon: CheckSquare },
    {
      to: '/review',
      label: 'Human Review',
      icon: ShieldAlert,
      badge: pendingReviews > 0 ? pendingReviews : undefined,
    },
    { to: '/activity', label: 'Agent Activity', icon: Activity },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090D16] border-r border-[#1B2333] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Logo and Brand */}
        <div className="p-5 border-b border-[#1B2333]">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">Nova</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Agentic AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">Meeting Follow-Up System</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
                  } ${item.highlight ? 'font-semibold text-orange-400/90' : ''}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-[#1B2333]">
        <div className="bg-[#0E1422] border border-[#1E293B] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">LangGraph Agents</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-auto" />
          </div>
          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="text-slate-200 font-mono truncate max-w-[110px]">{geminiModel}</span>
            </div>
            <div className="flex justify-between">
              <span>HITL Cutoff:</span>
              <span className="text-orange-400 font-mono">0.70</span>
            </div>
          </div>
          <NavLink
            to="/"
            className="mt-2.5 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 hover:text-orange-400 transition-colors"
          >
            <span>Landing Page</span>
            <ExternalLink className="w-3 h-3" />
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
