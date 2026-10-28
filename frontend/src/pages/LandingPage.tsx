import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Bot,
  BrainCircuit,
  ShieldCheck,
  BellRing,
  CheckCircle,
  FileText,
  UploadCloud,
  ChevronRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Nova</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/meetings"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Meetings
          </Link>
          <Link
            to="/tasks"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Action Items
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
          >
            Launch App
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-20 text-center flex flex-col items-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111726] border border-[#1E293B] text-xs text-slate-300 mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Open Source • Multi-Agent LangGraph + Gemini + FastAPI</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Headline matching image 5 */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Meetings end. <br />
          <span className="text-[#14b8a6]">Follow-ups </span>
          <span className="text-orange-500">don&apos;t.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
          A LangGraph multi-agent engine that analyzes meeting audio and video recordings,
          extracts action items with confidence scores, assigns owners, and autonomously tracks follow-ups —
          until every task is done.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-xl hover:bg-slate-100 hover:shadow-white/10 active:scale-95 transition-all"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4 text-slate-900" />
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#111726] hover:bg-[#161F33] text-slate-200 border border-[#222E42] font-semibold text-sm active:scale-95 transition-all"
          >
            <UploadCloud className="w-4 h-4 text-orange-400" />
            <span>Upload Audio File</span>
          </button>
        </div>

        {/* 4 Stat Badges matching image 5 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6 shadow-2xl">
          <div className="text-center p-2">
            <div className="text-2xl font-bold text-white mb-1">200 MB</div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Max Audio Size
            </div>
          </div>

          <div className="text-center p-2 border-l border-[#1E293B]/60">
            <div className="text-2xl font-bold text-emerald-400 mb-1">4</div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              LangGraph Agents
            </div>
          </div>

          <div className="text-center p-2 border-l border-[#1E293B]/60">
            <div className="text-2xl font-bold text-orange-400 mb-1">0.70</div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              HITL Threshold
            </div>
          </div>

          <div className="text-center p-2 border-l border-[#1E293B]/60">
            <div className="text-2xl font-bold text-cyan-400 mb-1">15+</div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              API Endpoints
            </div>
          </div>
        </div>

        {/* Multi-Agent Architecture Showcase */}
        <div className="mt-20 text-left w-full max-w-4xl">
          <div className="text-xs uppercase font-bold tracking-wider text-orange-400 mb-2 text-center">
            Agentic AI Workflow
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            How Nova Coordinates Four Autonomous Agents
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#0E1422] border border-[#1E293B] hover:border-orange-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  A1
                </div>
                <h3 className="font-semibold text-slate-200">Supervisor Agent</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspects meeting media or transcripts, plans required execution steps, decomposes
                tasks, handles recoverable errors, and routes workflow state.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0E1422] border border-[#1E293B] hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  A2
                </div>
                <h3 className="font-semibold text-slate-200">Meeting Extraction Agent</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transcribes media via Gemini, creates concise executive summaries, identifies unanimous
                decisions, and extracts action items with verbatim transcript quotes.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0E1422] border border-[#1E293B] hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  A3
                </div>
                <h3 className="font-semibold text-slate-200">Assignment Agent</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Matches owners against participant lists, evaluates evidence confidence scores, and
                conditionally routes low-confidence items (&lt; 0.70) to Human Review.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0E1422] border border-[#1E293B] hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                  A4
                </div>
                <h3 className="font-semibold text-slate-200">Follow-Up Agent</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Periodically scans pending tasks, drafts intelligent follow-up reminders using Gemini,
                verifies completion status, and tracks reminder dispatch counts.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1B2333] py-6 text-center text-xs text-slate-500">
        Nova — Autonomous Meeting Follow-Up System • Powered by Google Gemini & LangGraph
      </footer>
    </div>
  );
};
