import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Bot,
  Calendar,
  Send,
  Edit2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Meeting, Task, ReviewItem, AgentActivity } from '../types';

export const MeetingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const loadAllDetails = async () => {
    if (!id) return;
    try {
      const [m, t, r, a] = await Promise.all([
        api.getMeeting(id),
        api.getTasks({ meeting_id: id }),
        api.getReviews('all', id),
        api.getActivities(id),
      ]);
      setMeeting(m);
      setTasks(t);
      setReviews(r);
      setActivities(a);
      if (m.status === 'processing') {
        setProcessing(true);
      } else {
        setProcessing(false);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDetails();
  }, [id]);

  // Polling while processing
  useEffect(() => {
    if (!processing || !id) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await api.getMeetingStatus(id);
        if (statusData.status !== 'processing') {
          setProcessing(false);
          loadAllDetails();
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [processing, id]);

  const handleProcessAI = async () => {
    if (!id) return;
    setProcessing(true);
    setStatusMessage('Initiating LangGraph multi-agent workflow...');
    try {
      await api.processMeeting(id);
      setStatusMessage('Workflow running: Extraction & Assignment agents active...');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Processing failed.');
      setProcessing(false);
    }
  };

  const handleTaskStatusToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(taskId, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      alert('Could not update task status');
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const res = await api.approveReview(reviewId);
      // Refresh to pull new task
      loadAllDetails();
    } catch (err) {
      alert('Approval failed.');
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      await api.rejectReview(reviewId);
      loadAllDetails();
    } catch (err) {
      alert('Rejection failed.');
    }
  };

  const handleSendReminder = async (taskId: string) => {
    try {
      const res = await api.triggerReminder(taskId);
      alert(`Follow-up dispatched!\nSubject: ${res.subject}`);
      loadAllDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to dispatch reminder');
    }
  };

  const toggleLog = (taskId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading meeting data...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Meeting not found</h2>
        <Link to="/meetings" className="text-xs text-orange-400 hover:underline">
          Return to meetings list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Back Navigation matching image 1 */}
      <div>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        {/* Title and Metadata */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {meeting.title}
          </h1>
          <button className="text-slate-500 hover:text-slate-300">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{new Date(meeting.created_at).toLocaleString()}</span>
          </span>
          <span>•</span>
          <span>{meeting.duration_seconds ? `${Math.round(meeting.duration_seconds / 60)} min` : '10 min'}</span>
          <span>•</span>
          <span className="uppercase text-[11px] font-semibold text-emerald-400">ENGLISH</span>
          {meeting.owner_name && (
            <>
              <span>•</span>
              <span>Owner: <strong className="text-slate-200">{meeting.owner_name}</strong></span>
            </>
          )}
        </div>
      </div>

      {/* AI Processing Callout Banner matching image 1 */}
      <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              {processing ? 'Multi-Agent Processing in Progress...' : 'Ready for AI Analysis'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {statusMessage || 'Extract decisions and action items from this transcript with LangGraph & Gemini.'}
            </div>
          </div>
        </div>

        <button
          onClick={handleProcessAI}
          disabled={processing}
          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all self-start sm:self-auto"
        >
          {processing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Agents Running...</span>
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              <span>Process with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Full Transcript Section matching image 1 */}
      {meeting.transcript && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Full Transcript</span>
          </div>

          <div className="bg-[#080C14] border border-[#1B2436] rounded-2xl p-6 text-sm text-slate-300 leading-relaxed max-h-80 overflow-y-auto select-text font-normal shadow-inner">
            {meeting.transcript}
          </div>
        </div>
      )}

      {/* Summary Section */}
      {meeting.summary && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Executive Summary</h2>
          <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl p-6 text-sm text-slate-300 leading-relaxed">
            {meeting.summary}
          </div>
        </div>
      )}

      {/* Decisions Section matching image 4 */}
      {meeting.decisions && meeting.decisions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Decisions ({meeting.decisions.length})</span>
          </div>

          <div className="space-y-2.5">
            {meeting.decisions.map((decision, idx) => (
              <div
                key={idx}
                className="bg-[#0B0F17] border border-[#182335] hover:border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-200">{decision}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items & Reviews matching image 3 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Action Items &amp; Follow-Ups ({tasks.length + reviews.filter((r) => r.status === 'pending').length})
          </h2>
          <Link to="/tasks" className="text-xs text-orange-400 hover:underline">
            Manage all tasks
          </Link>
        </div>

        {/* 1. Pending Human Reviews for this meeting */}
        {reviews
          .filter((r) => r.status === 'pending')
          .map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0B0F17] border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-lg shadow-amber-500/5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-sm sm:text-base text-slate-100 leading-snug">
                  {rev.suggested_title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase shrink-0">
                  Needs Review
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{rev.suggested_assignee || 'Unassigned'}</span>
                </span>
                <span>•</span>
                <span>Due: {rev.suggested_due_date || 'Unspecified'}</span>
              </div>

              {/* Low confidence banner matching image 3 */}
              <div className="p-3.5 rounded-xl bg-[#211606] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Low confidence ({Math.round(rev.confidence * 100)}%) — {rev.reason_for_review}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleApproveReview(rev.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectReview(rev.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#331414] hover:bg-red-900/60 text-red-300 font-semibold text-xs border border-red-500/30 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Supporting Evidence */}
              <div className="text-[11px] text-slate-400 italic">
                &ldquo;{rev.supporting_evidence}&rdquo;
              </div>
            </div>
          ))}

        {/* 2. Confirmed Active Tasks */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-5 space-y-4 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                className={`font-semibold text-sm sm:text-base leading-snug ${
                  task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-100'
                }`}
              >
                {task.title}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}
              >
                {task.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-200 font-medium">{task.assignee || 'Unassigned'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Reminders: {task.reminders_sent}</span>
              </span>
              <span>•</span>
              <span>Due: {task.due_date || 'Pending'}</span>
              <span>•</span>
              <span className="text-emerald-400">Confidence: {Math.round(task.confidence * 100)}%</span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => handleTaskStatusToggle(task.id, task.status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  task.status === 'completed'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                }`}
              >
                {task.status === 'completed' ? 'Mark Pending' : 'Mark Done'}
              </button>

              <button
                onClick={() => handleSendReminder(task.id)}
                disabled={task.status === 'completed'}
                className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1A253D] text-slate-300 hover:text-white border border-[#232F47] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3 h-3 text-cyan-400" />
                <span>Send Reminder</span>
              </button>
            </div>

            {/* Expandable Agent Activity Log accordion matching image 3 */}
            <div className="pt-2 border-t border-[#182335]">
              <button
                onClick={() => toggleLog(task.id)}
                className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Agent Activity Log</span>
                {expandedLogs[task.id] ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {expandedLogs[task.id] && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#080C14] border border-[#182335] space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200">Created: </span>
                      <span className="text-slate-400">
                        Extracted from meeting with confidence {task.confidence.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(task.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {task.evidence && (
                    <div className="text-[11px] text-slate-400 pl-5 italic">
                      Supporting Quote: &ldquo;{task.evidence}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
