import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Search,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  ArrowRight,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Meeting } from '../types';

export const MeetingsList: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.getMeetings(
        statusFilter === 'all' ? undefined : statusFilter,
        searchQuery.trim() || undefined
      );
      setMeetings(data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMeetings();
  };

  const handleDeleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting and its extracted action items?')) {
      try {
        await api.deleteMeeting(id);
        setMeetings((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        alert('Failed to delete meeting');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Meetings</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Browse recordings, transcripts, summaries, and agent-extracted follow-ups.
          </p>
        </div>

        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs rounded-lg shadow-md shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Meeting</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search meeting title, summary, or participant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-[#0E1422] border border-[#1E293B] p-1 rounded-lg overflow-x-auto">
          {['all', 'completed', 'processing', 'uploaded', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161F33]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="py-16 text-center bg-[#0B0F17] border border-[#1B2333] rounded-2xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-200">No meetings found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No results match your search '${searchQuery}'. Try clearing your filter.`
              : 'Upload an audio or video file to trigger the multi-agent transcription & summary workflow.'}
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium text-xs hover:bg-orange-600 transition-colors"
          >
            <span>Upload your first meeting</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <Link
              key={m.id}
              to={`/meetings/${m.id}`}
              className="group bg-[#0B0F17] hover:bg-[#0F1524] border border-[#1B2333] hover:border-orange-500/30 rounded-xl p-5 flex flex-col justify-between transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-200 group-hover:text-white text-sm line-clamp-1">
                    {m.title}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
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

                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {m.summary || 'Ready for AI transcription and action item extraction.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1B2333] flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(m.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteMeeting(m.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
