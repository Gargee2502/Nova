import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { api } from '../services/api';
import { ReviewItem } from '../types';

export const HumanReview: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit before approval state
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('medium');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getReviews('pending');
      setReviews(data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (review: ReviewItem) => {
    try {
      await api.approveReview(review.id, {
        title: review.suggested_title,
        assignee: review.suggested_assignee,
        due_date: review.suggested_due_date,
        priority: review.suggested_priority,
      });
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    } catch (err) {
      alert('Approval failed.');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      await api.rejectReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert('Rejection failed.');
    }
  };

  const openEditModal = (review: ReviewItem) => {
    setEditingReview(review);
    setEditTitle(review.suggested_title);
    setEditAssignee(review.suggested_assignee || '');
    setEditDueDate(review.suggested_due_date || '');
    setEditPriority(review.suggested_priority || 'medium');
  };

  const submitEditedApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    try {
      await api.approveReview(editingReview.id, {
        title: editTitle,
        assignee: editAssignee,
        due_date: editDueDate,
        priority: editPriority,
      });
      setReviews((prev) => prev.filter((r) => r.id !== editingReview.id));
      setEditingReview(null);
    } catch (err) {
      alert('Failed to approve review.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Human Review Queue
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Inspect, adjust, or discard AI-extracted action items that fell below the confidence
          threshold (0.70) or had ambiguous assignees.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading pending reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center bg-[#0B0F17] border border-[#1B2333] rounded-2xl p-8 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-200">Review Queue is Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All extracted items have satisfied the confidence threshold or been approved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0B0F17] border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl"
            >
              {/* Title & Source Meeting */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-white">{rev.suggested_title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Link
                      to={`/meetings/${rev.meeting_id}`}
                      className="text-orange-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>From: {rev.meeting_title || 'Meeting'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400">
                    Confidence: {Math.round(rev.confidence * 100)}%
                  </span>
                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.round(rev.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Review Reason Alert */}
              <div className="p-3.5 rounded-xl bg-[#211606] border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Reason for Review: </span>
                  <span>{rev.reason_for_review}</span>
                </div>
              </div>

              {/* Transcript Evidence Quote */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Supporting Transcript Evidence:
                </span>
                <div className="bg-[#080C14] border border-[#182335] rounded-xl p-3 text-xs text-slate-300 italic">
                  &ldquo;{rev.supporting_evidence}&rdquo;
                </div>
              </div>

              {/* Metadata tags */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Suggested Owner: <strong className="text-slate-200">{rev.suggested_assignee || 'None'}</strong></span>
                </span>
                <span>•</span>
                <span>Suggested Due: <strong className="text-slate-200">{rev.suggested_due_date || 'None'}</strong></span>
                <span>•</span>
                <span className="uppercase text-[10px] font-semibold text-amber-400">
                  Priority: {rev.suggested_priority}
                </span>
              </div>

              {/* Approval Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#182335]">
                <button
                  onClick={() => openEditModal(rev)}
                  className="px-3.5 py-2 rounded-lg bg-[#141C2E] hover:bg-[#1C273E] text-slate-300 border border-[#232F47] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit &amp; Approve</span>
                </button>

                <button
                  onClick={() => handleReject(rev.id)}
                  className="px-3.5 py-2 rounded-lg bg-[#331414] hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleApprove(rev)}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Quick Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit and Approve Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Edit Before Approving</h2>
            <p className="text-xs text-slate-400">
              Refine the task title or assignee before promoting this item into an active task.
            </p>

            <form onSubmit={submitEditedApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
                <input
                  type="text"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  placeholder="Enter responsible team member name"
                  className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="text"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    placeholder="e.g. 2026-11-20 or Next Friday"
                    className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20"
                >
                  Approve as Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
