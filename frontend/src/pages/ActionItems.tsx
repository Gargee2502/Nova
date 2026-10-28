import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Send,
  Trash2,
  ArrowRight,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { api } from '../services/api';
import { Task } from '../types';

export const ActionItems: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks({
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: searchQuery.trim() || undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasks();
  };

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      alert('Could not update status.');
    }
  };

  const handleSendReminder = async (taskId: string) => {
    try {
      const res = await api.triggerReminder(taskId);
      alert(`Reminder sent via Follow-Up Agent!\nSubject: ${res.subject}`);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to dispatch reminder');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditAssignee(task.assignee || '');
    setEditDueDate(task.due_date || '');
    setEditPriority(task.priority || 'medium');
  };

  const saveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const updated = await api.updateTask(editingTask.id, {
        title: editTitle,
        assignee: editAssignee,
        due_date: editDueDate,
        priority: editPriority,
      });
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      setEditingTask(null);
    } catch (err) {
      alert('Failed to save changes');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (window.confirm('Delete this action item?')) {
      try {
        await api.deleteTask(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (err) {
        alert('Could not delete task.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Action Items</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Track and manage extracted tasks, assignees, deadlines, and automated follow-ups.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, or assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#0E1422] border border-[#1E293B] p-1 rounded-lg">
            {['all', 'pending', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161F33]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0E1422] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500/50"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading action items...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center bg-[#0B0F17] border border-[#1B2333] rounded-2xl p-8 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-semibold text-slate-200">No action items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tasks will appear here automatically when meetings are processed by the multi-agent workflow.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#0B0F17] hover:bg-[#0E1422] border border-[#1B2333] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              {/* Task Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      task.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-600 hover:border-orange-500'
                    }`}
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <h3
                    className={`font-semibold text-sm sm:text-base truncate ${
                      task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-100'
                    }`}
                  >
                    {task.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pl-7">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-200 font-medium">{task.assignee || 'Unassigned'}</span>
                  </span>
                  <span>•</span>
                  <span>Due: {task.due_date || 'Pending'}</span>
                  <span>•</span>
                  <span
                    className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                      task.priority === 'high'
                        ? 'bg-red-500/10 text-red-400'
                        : task.priority === 'medium'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span>•</span>
                  <Link
                    to={`/meetings/${task.meeting_id}`}
                    className="text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <span>Source Meeting</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                <button
                  onClick={() => handleSendReminder(task.id)}
                  disabled={task.status === 'completed'}
                  className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1A253D] text-slate-300 hover:text-white border border-[#232F47] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                  title="Send follow-up reminder"
                >
                  <Send className="w-3 h-3 text-cyan-400" />
                  <span>Remind ({task.reminders_sent})</span>
                </button>

                <button
                  onClick={() => openEditModal(task)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Edit task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Edit Action Item</h2>

            <form onSubmit={saveEditTask} className="space-y-4">
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
                  className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="text"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    placeholder="e.g. 2026-11-15 or Next Monday"
                    className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
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
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
